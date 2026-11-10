import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { DeltaClient, type DeltaClientDeps, releaseAssetBase, setupIdentity } from './oxeegen-delta-client'
import { buildDelta, STAGING_SUFFIX } from './oxeegen-delta.mjs'

let scratch = ''

afterEach((): void => {
  if (scratch) {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
})

const SETUP = 'OxeeHermesBundled-Setup-1.1.0-x64.exe'
const BASE = 'https://github.com/Oxeegen/OxeeHermes/releases/download/v1.1.0/'

function write(root: string, files: Record<string, string>): void {
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
    fs.writeFileSync(path.join(root, rel), content)
  }
}

/** A 1.0.0 setup.exe install and a published 1.0.0 -> 1.1.0 delta, served by a fake fetch. */
async function machine(options: { packageType?: string; corruptPack?: boolean } = {}) {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'oxee-delta-client-'))
  const v1 = { 'Oxee Hermes.exe': 'exe', 'resources/app.asar': 'asar 1.0', 'resources/agent-payload/manifest.json': 'm 1.0' }
  write(path.join(scratch, 'v1'), v1)
  write(path.join(scratch, 'v2'), { ...v1, 'resources/app.asar': 'asar 1.1' })
  const published = path.join(scratch, 'published')

  const plan = await buildDelta({
    product: 'OxeeHermesBundled', from: '1.0.0', to: '1.1.0', arch: 'x64',
    previousRoot: path.join(scratch, 'v1'), newRoot: path.join(scratch, 'v2'), outDir: published, workDir: path.join(scratch, 'work')
  })

  if (options.corruptPack) {
    fs.appendFileSync(path.join(published, plan.pack.name), 'x')
    plan.pack.size += 1
    fs.writeFileSync(path.join(published, 'OxeeHermesBundled-Delta-1.0.0-to-1.1.0-x64.json'), JSON.stringify(plan))
  }

  const installDir = path.join(scratch, 'Programs', 'Oxee Hermes')
  write(installDir, { ...v1, 'resources/package-type': options.packageType ?? 'nsis', 'resources/app-update.yml': 'owner: Oxeegen\nrepo: OxeeHermes\nprovider: github\n', 'resources/oxeegen-delta-swap.ps1': '# swap' })
  const userData = path.join(scratch, 'userData')
  const tempDir = path.join(scratch, 'temp')
  fs.mkdirSync(userData)
  fs.mkdirSync(tempDir)
  const fetched: string[] = []

  const deps: DeltaClientDeps = {
    installDir,
    exeName: 'Oxee Hermes.exe',
    resourcesPath: path.join(installDir, 'resources'),
    userData,
    tempDir,
    appVersion: '1.0.0',
    feedBaseUrl: '',
    pid: 4242,
    tar: 'tar',
    log: vi.fn(),
    quit: vi.fn(),
    spawn: vi.fn(() => ({ unref: vi.fn() })) as never,
    fetch: async (url: string): Promise<Response> => {
      fetched.push(url)
      const file = path.join(published, url.slice(BASE.length))

      return fs.existsSync(file) ? new Response(fs.readFileSync(file)) : new Response('Not Found', { status: 404 })
    }
  }

  return { deps, installDir, userData, fetched }
}

describe('Oxee Hermes delta update client', () => {
  it('reads product and architecture from the setup.exe the feed announces', () => {
    expect(setupIdentity(SETUP)).toEqual({ product: 'OxeeHermesBundled', arch: 'x64' })
    expect(setupIdentity('latest.yml')).toBeNull()
  })

  it('finds the release assets on GitHub, or beside the setup.exe of a generic feed', () => {
    expect(releaseAssetBase('owner: Oxeegen\nrepo: OxeeHermes\nprovider: github\n', '', '1.1.0')).toBe(BASE)
    expect(releaseAssetBase('', 'https://updates.example.com', '1.1.0')).toBe('https://updates.example.com/releases/win32/nsis/')
    expect(releaseAssetBase('provider: generic\nurl: https://cdn.example.com/oxee\n', '', '1.1.0')).toBe('https://cdn.example.com/oxee/')
  })

  it('downloads the delta from this version and prepares the new version beside the install', async () => {
    const { deps, installDir, fetched } = await machine()
    const progress: number[] = []
    const onStaging = vi.fn()

    const staged = await new DeltaClient(deps).prepare('1.1.0', SETUP, percent => progress.push(percent), onStaging)

    expect(fetched).toEqual([`${BASE}OxeeHermesBundled-Delta-1.0.0-to-1.1.0-x64.json`, `${BASE}OxeeHermesBundled-Delta-1.0.0-to-1.1.0-x64.tar.gz`])
    expect(staged?.stagingDir).toBe(installDir + STAGING_SUFFIX)
    expect(fs.readFileSync(path.join(installDir + STAGING_SUFFIX, 'resources/app.asar'), 'utf8')).toBe('asar 1.1')
    expect(fs.readFileSync(path.join(installDir, 'resources/app.asar'), 'utf8')).toBe('asar 1.0')
    expect(progress.at(-1)).toBe(100)
    expect(onStaging).toHaveBeenCalledOnce()
    expect(fs.readdirSync(deps.tempDir)).toEqual([])
  })

  it('falls back to the full setup.exe when the release has no delta from this version', async () => {
    const { deps } = await machine()

    await expect(new DeltaClient({ ...deps, appVersion: '0.9.0' }).prepare('1.1.0', SETUP, () => {})).resolves.toBeNull()
    expect(deps.log).toHaveBeenCalledWith(expect.stringContaining('no delta from 0.9.0'))
  })

  it('falls back on a corrupted pack and leaves nothing prepared behind', async () => {
    const { deps, installDir } = await machine({ corruptPack: true })

    await expect(new DeltaClient(deps).prepare('1.1.0', SETUP, () => {})).resolves.toBeNull()
    expect(fs.existsSync(installDir + STAGING_SUFFIX)).toBe(false)
    expect(deps.log).toHaveBeenCalledWith(expect.stringContaining('digest mismatch'))
  })

  it('leaves installs that are not a setup.exe one, and a version whose swap failed once, to the full update', async () => {
    const msix = await machine({ packageType: '' })
    await expect(new DeltaClient(msix.deps).prepare('1.1.0', SETUP, () => {})).resolves.toBeNull()
    expect(msix.fetched).toEqual([])

    const failedOnce = await machine()
    fs.writeFileSync(path.join(failedOnce.userData, 'oxeegen-delta-failed.txt'), '1.1.0\r\n')
    await expect(new DeltaClient(failedOnce.deps).prepare('1.1.0', SETUP, () => {})).resolves.toBeNull()
    expect(failedOnce.fetched).toEqual([])
  })

  it('starts the swap script from a temp copy, outside the install, then quits', async () => {
    const { deps, installDir } = await machine()
    const client = new DeltaClient(deps)
    const staged = await client.prepare('1.1.0', SETUP, () => {})

    client.swapAndQuit(staged!)

    const [command, args, options] = vi.mocked(deps.spawn!).mock.calls[0] as unknown as [string, string[], { cwd: string }]
    expect(command).toMatch(/cmd\.exe$/i)
    const script = args[args.indexOf('-File') + 1]
    expect(script.startsWith(deps.tempDir)).toBe(true)
    expect(fs.readFileSync(script, 'utf8')).toBe('# swap')
    expect(args.slice(args.indexOf('-InstallDir'))).toEqual([
      '-InstallDir', installDir, '-StagedDir', installDir + STAGING_SUFFIX, '-Version', '1.1.0',
      '-ExeName', 'Oxee Hermes.exe', '-FailureMarker', path.join(deps.userData, 'oxeegen-delta-failed.txt'), '-AppPid', '4242'
    ])
    expect(options.cwd).toBe(deps.tempDir)
    expect(deps.quit).toHaveBeenCalledOnce()
  })
})
