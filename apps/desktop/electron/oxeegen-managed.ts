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
 *   BRAVE_SEARCH_API_KEY=...       (optional: web search keys for every user)
 *   FIRECRAWL_API_KEY=fc-...
 */
export const MACHINE_CONFIG_FILE = 'oxeegen.env'

/** Tool keys an administrator may set for every user, next to the Oxeegen connection. Each is
 *  read by its web provider (plugins/web/brave_free, plugins/web/firecrawl); the managed `.env`
 *  pins it, and web search autodetects its backend from the keys present. */
export const MACHINE_TOOL_KEYS = ['BRAVE_SEARCH_API_KEY', 'FIRECRAWL_API_KEY'] as const

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

/** With both web keys, search goes to Brave and page reading to Firecrawl (whose credits it saves);
 *  autodetect alone would send both to Firecrawl. A default, not a pin: Settings > Advanced > Tools
 *  writes the user's own web.search_backend / web.extract_backend over it. */
export function webSplit(toolKeys: string[]): string {
  const names = new Set(toolKeys.map(line => line.split('=')[0]))

  return names.has('BRAVE_SEARCH_API_KEY') && names.has('FIRECRAWL_API_KEY')
    ? '\n# Set by the administrator: both web keys.\nweb:\n  search_backend: brave-free\n  extract_backend: firecrawl\n'
    : ''
}

/** The tool keys the file sets (MACHINE_TOOL_KEYS), as `.env` lines; blank values are skipped. */
export function parseMachineToolKeys(text: string): string[] {
  const values = parseEnv(text)

  return MACHINE_TOOL_KEYS.flatMap(name => (values.get(name) ? [`${name}=${values.get(name)}`] : []))
}

/**
 * The managed scope to run with: the shipped one, plus the machine's region
 * and key and its tool keys (MACHINE_TOOL_KEYS) when an administrator set
 * them; the tool keys apply even without the Oxeegen connection. That
 * combination is written to
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
  const connection = machine && !('error' in machine.connection) ? machine.connection : null
  const toolKeys = machine?.toolKeys ?? []

  if (machine && 'error' in machine.connection) {
    log(`[oxeegen] the Oxeegen connection in ${machineFile} is not applied: ${machine.connection.error}`)
  }

  if (!connection && !toolKeys.length) {
    rmSync(outDir, { force: true, recursive: true })

    return shipped
  }

  mkdirSync(outDir, { recursive: true })
  const shippedConfig = readFileSync(path.join(shipped, 'config.yaml'), 'utf8').trimEnd()
  writeFileSync(
    path.join(outDir, 'config.yaml'),
    connection
      ? `${shippedConfig}\n\n# Set by the administrator in ${machineFile}.\noxeegen:\n  managed_region: ${connection.region}\n`
      : `${shippedConfig}\n`
  )
  // defaults.yaml (the Oxeegen model a profile starts with) travels with the composed scope. Its
  // content only: a copy keeps Program Files' read-only bit and could not be replaced next launch.
  const defaults = path.join(outDir, 'defaults.yaml')
  rmSync(defaults, { force: true })
  writeFileSync(defaults, `${readFileSync(path.join(shipped, 'defaults.yaml'), 'utf8').trimEnd()}\n${webSplit(toolKeys)}`)
  const envFile = path.join(outDir, '.env')
  const spec = connection ? readSpec(root) : null
  const region = spec && connection ? spec.regions[connection.region] : null
  writeFileSync(
    envFile,
    [
      ...(spec && connection && region
        ? [
            `${spec.region_env}=${connection.region}`,
            `${region.api_key_env}=${connection.apiKey}`,
            `${spec.api_key_env}=${connection.apiKey}`,
            `${spec.base_url_env}=${region.base_url}`
          ]
        : []),
      ...toolKeys,
      ''
    ].join('\n'),
    { mode: 0o600 }
  )
  chmodSync(envFile, 0o600)

  if (connection) {
    log(`[oxeegen] Oxeegen region and key set by the administrator (${machineFile})`)
  }

  if (toolKeys.length) {
    log(`[oxeegen] tool keys set by the administrator: ${toolKeys.map(line => line.split('=')[0]).join(', ')}`)
  }

  return outDir
}

function readSpec(root: string): OxeegenSpec {
  return JSON.parse(
    readFileSync(path.join(root, 'plugins', 'model-providers', 'oxeegen', 'oxeegen.json'), 'utf8')
  ) as OxeegenSpec
}

interface MachineConfig {
  connection: MachineConnection | { error: string }
  toolKeys: string[]
}

function readMachineConfig(file: string, root: string): MachineConfig {
  let text: string

  try {
    text = readFileSync(file, 'utf8')
  } catch (error) {
    return { connection: { error: error instanceof Error ? error.message : String(error) }, toolKeys: [] }
  }

  let connection: MachineConfig['connection']

  try {
    connection = parseMachineConfig(text, readSpec(root))
  } catch (error) {
    connection = { error: error instanceof Error ? error.message : String(error) }
  }

  return { connection, toolKeys: parseMachineToolKeys(text) }
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
