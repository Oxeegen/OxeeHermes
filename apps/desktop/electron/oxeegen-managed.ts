import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Oxee Hermes ships its policy as a managed scope (hermes_cli/managed_scope.py):
 * `oxeegen/managed/config.yaml` pins the voice routing to Oxeegen and turns Nous
 * telemetry off, and the backend cannot change those keys; `defaults.yaml` next
 * to it only sets what a profile starts with (the Oxeegen model). Point every
 * process this app spawns at it through HERMES_MANAGED_DIR.
 *
 * Candidates in order: the bundled payload's repo (shipped builds), then the
 * source checkout (dev). The first that holds a config.yaml wins. Always set,
 * even when the user's environment names another directory: a system
 * `/etc/hermes` or an official install's override must never govern this app.
 */
export function oxeegenManagedRoot(roots: ReadonlyArray<null | string | undefined>): null | string {
  for (const root of roots) {
    if (root && existsSync(path.join(root, 'oxeegen', 'managed', 'config.yaml'))) {
      return root
    }
  }

  return null
}

export function oxeegenManagedDir(roots: ReadonlyArray<null | string | undefined>): null | string {
  const root = oxeegenManagedRoot(roots)

  return root ? path.join(root, 'oxeegen', 'managed') : null
}

/**
 * The machine configuration an administrator deploys (by hand, or the .msi's
 * OXEEGEN_REGION / OXEEGEN_API_KEY properties): the Oxeegen region and key for
 * every user of the computer, outside the install folder so updates keep it.
 *
 *   OXEEGEN_REGION=eu
 *   OXEEGEN_EU_API_KEY=sk-...      (or OXEEGEN_API_KEY=sk-..., the key of that region)
 */
export const MACHINE_CONFIG_FILE = 'oxeegen.env'

export function machineConfigDir(platform: NodeJS.Platform, env: NodeJS.ProcessEnv): string {
  if (platform === 'win32') {
    return path.win32.join(env.ProgramData || 'C:\\ProgramData', 'Oxee Hermes')
  }

  return platform === 'darwin' ? '/Library/Application Support/Oxee Hermes' : '/etc/oxee-hermes'
}

interface RegionSpec {
  api_key_env: string
  base_url: string
}

/** The fields of plugins/model-providers/oxeegen/oxeegen.json used here. */
export interface OxeegenSpec {
  api_key_env: string
  base_url_env: string
  region_env: string
  regions: Record<string, RegionSpec>
}

export interface MachineConnection {
  apiKey: string
  region: string
}

function parseEnv(text: string): Map<string, string> {
  const values = new Map<string, string>()

  for (const raw of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.trim()
    const eq = line.indexOf('=')

    if (!line || line.startsWith('#') || eq < 1) {
      continue
    }

    const value = line.slice(eq + 1).trim()
    const quoted = value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]
    values.set(line.slice(0, eq).trim().replace(/^export\s+/, ''), quoted ? value.slice(1, -1) : value)
  }

  return values
}

/** The region and its key, or why the file is not applied. */
export function parseMachineConfig(text: string, spec: OxeegenSpec): MachineConnection | { error: string } {
  const values = parseEnv(text)
  const region = (values.get(spec.region_env) ?? '').toLowerCase()
  const regionSpec = spec.regions[region]

  if (!regionSpec) {
    return { error: `${spec.region_env} must be one of ${Object.keys(spec.regions).join(', ')}` }
  }

  const apiKey = values.get(regionSpec.api_key_env) || values.get(spec.api_key_env) || ''

  if (!apiKey) {
    return { error: `no key: set ${regionSpec.api_key_env} (or ${spec.api_key_env})` }
  }

  return { apiKey, region }
}

/**
 * The managed scope to run with: the shipped one, plus the machine's region
 * and key when an administrator set them. That combination is written to
 * `outDir` (the shipped scope is read-only in Program Files), with the key in
 * the managed `.env` (which beats the user's `.env` and refuses writes to it)
 * and `oxeegen.managed_region` in config.yaml, which tells Settings the
 * connection is the administrator's. Rewritten at every start, so an edit of
 * the machine file applies at the next launch.
 */
export function oxeegenManagedScope(options: {
  log: (message: string) => void
  machineFile: string
  outDir: string
  roots: ReadonlyArray<null | string | undefined>
}): null | string {
  const { log, machineFile, outDir, roots } = options
  const root = oxeegenManagedRoot(roots)

  if (!root) {
    return null
  }

  const shipped = path.join(root, 'oxeegen', 'managed')
  const machine = existsSync(machineFile) ? readMachineConfig(machineFile, root) : null

  if (machine && 'error' in machine) {
    log(`[oxeegen] ${machineFile} is not applied: ${machine.error}`)
  }

  if (!machine || 'error' in machine) {
    rmSync(outDir, { force: true, recursive: true })

    return shipped
  }

  const spec = readSpec(root)
  const region = spec.regions[machine.region]
  mkdirSync(outDir, { recursive: true })
  writeFileSync(
    path.join(outDir, 'config.yaml'),
    `${readFileSync(path.join(shipped, 'config.yaml'), 'utf8').trimEnd()}\n\n` +
      `# Set by the administrator in ${machineFile}.\noxeegen:\n  managed_region: ${machine.region}\n`
  )
  // defaults.yaml (the Oxeegen model a profile starts with) travels with the composed scope. Its
  // content only: a copy keeps Program Files' read-only bit and could not be replaced next launch.
  const defaults = path.join(outDir, 'defaults.yaml')
  rmSync(defaults, { force: true })
  writeFileSync(defaults, readFileSync(path.join(shipped, 'defaults.yaml')))
  const envFile = path.join(outDir, '.env')
  writeFileSync(
    envFile,
    [
      `${spec.region_env}=${machine.region}`,
      `${region.api_key_env}=${machine.apiKey}`,
      `${spec.api_key_env}=${machine.apiKey}`,
      `${spec.base_url_env}=${region.base_url}`,
      ''
    ].join('\n'),
    { mode: 0o600 }
  )
  chmodSync(envFile, 0o600)
  log(`[oxeegen] Oxeegen region and key set by the administrator (${machineFile})`)

  return outDir
}

function readSpec(root: string): OxeegenSpec {
  return JSON.parse(
    readFileSync(path.join(root, 'plugins', 'model-providers', 'oxeegen', 'oxeegen.json'), 'utf8')
  ) as OxeegenSpec
}

function readMachineConfig(file: string, root: string): MachineConnection | { error: string } {
  try {
    return parseMachineConfig(readFileSync(file, 'utf8'), readSpec(root))
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

/** Points every process the app spawns at the managed scope. Dev runs read the
 *  machine file from the checkout's `.dev-home/machine`, never the system one. */
export function applyOxeegenManagedScope(options: {
  isPackaged: boolean
  payloadRoot?: null | string
  sourceRoot: string
  userData: string
}): void {
  const { isPackaged, payloadRoot, sourceRoot, userData } = options
  const machineDir = isPackaged ? machineConfigDir(process.platform, process.env) : path.join(sourceRoot, '.dev-home', 'machine')

  const managedDir = oxeegenManagedScope({
    log: line => console.log(line),
    machineFile: path.join(machineDir, MACHINE_CONFIG_FILE),
    outDir: path.join(userData, 'oxeegen-managed'),
    roots: [payloadRoot, sourceRoot]
  })

  if (managedDir) {
    process.env.HERMES_MANAGED_DIR = managedDir
  }
}
