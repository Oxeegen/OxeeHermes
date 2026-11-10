// oxeegen-delta-client.ts — the app side of the Oxee Hermes setup.exe delta update.
//
// When the release carries a delta from the running version (CI builds one from each of the
// last few releases, oxeegen/scripts/packaged/build-deltas.mjs), the app downloads only the
// changed files, prepares the new version beside the install while the user keeps working
// (oxeegen-delta.mjs::stageDelta), and on "install and restart" quits and lets
// scripts/oxeegen-delta-swap.ps1 swap the two folders and relaunch it: seconds, where the full
// setup.exe rewrites ~39,000 files. Anything unexpected (no delta for this version, a download
// or digest error, an install that is not a per-user setup.exe one, a swap that failed once)
// returns null, and the caller takes the full setup.exe as before.

import { spawn as nodeSpawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as WebReadableStream } from 'node:stream/web'

import { wrapHandoffForDetachedConsole } from '../updater-process'

import { channelPublicBase } from './channel-protocol'
import { deltaBaseName, type DeltaPlan, sha256File, stageDelta, STAGING_SUFFIX, validatePlan } from './oxeegen-delta.mjs'
import { POWERSHELL_PATH } from './relaunch-waiter'

export const DELTA_SWAP_SCRIPT = 'oxeegen-delta-swap.ps1'
export const DELTA_FAILURE_MARKER = 'oxeegen-delta-failed.txt'
/** Where updates.desktop_feed_base_url serves the setup.exe (nsis-client.ts NSIS_FEED_DIRECTORY). */
const GENERIC_FEED_DIRECTORY = 'releases/win32/nsis'

export interface DeltaClientDeps {
  /** The folder of the running app and its executable's name. */
  installDir: string
  exeName: string
  resourcesPath: string
  userData: string
  tempDir: string
  appVersion: string
  feedBaseUrl: string
  pid: number
  fetch: (url: string) => Promise<Response>
  log: (message: string) => void
  quit: () => void
  spawn?: typeof nodeSpawn
  /** Windows' own System32 tar.exe unless given (tests). */
  tar?: string
}

export interface StagedDelta {
  plan: DeltaPlan
  stagingDir: string
}

/** "OxeeHermesBundled-Setup-1.2.0-x64.exe" -> product and arch of the delta assets. */
export function setupIdentity(setupFile: string): { product: string; arch: string } | null {
  const match = /^(.+)-Setup-[^-]+-([a-z0-9]+)\.exe$/i.exec(path.basename(setupFile))

  return match ? { product: match[1], arch: match[2] } : null
}

/** The folder URL that holds version's release assets, from the feed this app updates from. */
export function releaseAssetBase(appUpdateYml: string, feedBaseUrl: string, version: string): string | null {
  if (feedBaseUrl) {
    return `${channelPublicBase(feedBaseUrl)}/${GENERIC_FEED_DIRECTORY}/`
  }

  const field = (key: string): string | undefined =>
    new RegExp(`^${key}:\\s*['"]?([^'"\\r\\n]+?)['"]?\\s*$`, 'm').exec(appUpdateYml)?.[1]

  if (field('provider') === 'github' && field('owner') && field('repo')) {
    return `https://github.com/${field('owner')}/${field('repo')}/releases/download/v${version}/`
  }

  if (field('provider') === 'generic' && field('url')) {
    return field('url')!.replace(/\/?$/, '/')
  }

  return null
}

export class DeltaClient {
  private readonly stagingDir: string

  constructor(private readonly deps: DeltaClientDeps) {
    this.stagingDir = deps.installDir + STAGING_SUFFIX
  }

  private get failureMarker(): string {
    return path.join(this.deps.userData, DELTA_FAILURE_MARKER)
  }

  /** A previous run's leftovers: a prepared version never swapped in, an old folder not yet deleted. */
  async cleanLeftovers(): Promise<void> {
    for (const dir of [this.stagingDir, `${this.deps.installDir}.oxee-old`]) {
      await fs.promises.rm(dir, { recursive: true, force: true }).catch((error: Error) => {
        this.deps.log(`[delta] cannot remove ${dir}: ${error.message}`)
      })
    }
  }

  private async eligible(version: string): Promise<boolean> {
    const packageType = await fs.promises
      .readFile(path.join(this.deps.resourcesPath, 'package-type'), 'utf8')
      .catch(() => '')

    if (packageType.trim() !== 'nsis') {
      return false
    }

    const failed = await fs.promises.readFile(this.failureMarker, 'utf8').catch(() => '')

    if (failed.trim() === version) {
      this.deps.log(`[delta] the swap to ${version} failed once: full setup.exe`)

      return false
    }

    return true
  }

  /**
   * Downloads and prepares the delta from this version to `version`, or returns null (the caller
   * takes the full setup.exe). `setupFile` is the setup.exe name the feed announces.
   */
  async prepare(
    version: string,
    setupFile: string,
    onProgress: (percent: number) => void,
    onStaging: () => void = (): void => {}
  ): Promise<StagedDelta | null> {
    const identity = setupIdentity(setupFile)

    if (!identity || !(await this.eligible(version))) {
      return null
    }

    const appUpdateYml = await fs.promises
      .readFile(path.join(this.deps.resourcesPath, 'app-update.yml'), 'utf8')
      .catch(() => '')

    const base = releaseAssetBase(appUpdateYml, this.deps.feedBaseUrl, version)

    if (!base) {
      return null
    }

    const name = deltaBaseName(identity.product, this.deps.appVersion, version, identity.arch)
    const packFile = path.join(this.deps.tempDir, `${name}.tar.gz`)

    try {
      const response = await this.deps.fetch(`${base}${name}.json`)

      if (response.status === 404) {
        this.deps.log(`[delta] no delta from ${this.deps.appVersion} to ${version}: full setup.exe`)

        return null
      }

      if (!response.ok) {
        throw new Error(`delta plan: HTTP ${response.status}`)
      }

      const plan: unknown = await response.json()
      validatePlan(plan, { ...identity, from: this.deps.appVersion, to: version })
      await this.download(`${base}${plan.pack.name}`, packFile, plan.pack.size, onProgress)

      if ((await sha256File(packFile)) !== plan.pack.sha256) {
        throw new Error('delta pack digest mismatch')
      }

      onStaging()
      await stageDelta({
        installDir: this.deps.installDir,
        stagingDir: this.stagingDir,
        plan,
        packFile,
        tar: this.tar(),
        log: this.deps.log
      })

      return { plan, stagingDir: this.stagingDir }
    } catch (error) {
      this.deps.log(`[delta] ${error instanceof Error ? error.message : String(error)}: full setup.exe`)
      await this.cleanLeftovers()

      return null
    } finally {
      await fs.promises.rm(packFile, { force: true })
    }
  }

  private tar(): string {
    return this.deps.tar ?? path.win32.resolve(POWERSHELL_PATH, '../../../tar.exe')
  }

  private async download(url: string, file: string, size: number, onProgress: (percent: number) => void): Promise<void> {
    const response = await this.deps.fetch(url)

    if (!response.ok || !response.body) {
      throw new Error(`delta pack: HTTP ${response.status}`)
    }

    let received = 0
    const body = Readable.fromWeb(response.body as WebReadableStream)
    body.on('data', (chunk: Buffer) => {
      received += chunk.length
      onProgress(Math.min(100, (received / size) * 100))
    })
    await pipeline(body, fs.createWriteStream(file))

    if (received !== size) {
      throw new Error(`delta pack size mismatch (${received} of ${size} bytes)`)
    }
  }

  /**
   * Starts the swap script outside the install folder, then quits the app. Synchronous, like
   * electron-updater's quitAndInstall: a failure throws before the app quits.
   */
  swapAndQuit(staged: StagedDelta): void {
    const scriptDir = fs.mkdtempSync(path.join(this.deps.tempDir, 'oxee-delta-'))
    const script = path.join(scriptDir, DELTA_SWAP_SCRIPT)
    fs.copyFileSync(path.join(this.deps.resourcesPath, DELTA_SWAP_SCRIPT), script)

    // PowerShell 5.1 exits before running -File under DETACHED_PROCESS: cmd gives it a hidden
    // console and returns at once (relaunch-waiter.ts does the same).
    const wrapped = wrapHandoffForDetachedConsole(
      {
        command: POWERSHELL_PATH,
        args: [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          script,
          '-InstallDir',
          this.deps.installDir,
          '-StagedDir',
          staged.stagingDir,
          '-Version',
          staged.plan.to,
          '-ExeName',
          this.deps.exeName,
          '-FailureMarker',
          this.failureMarker,
          '-AppPid',
          String(this.deps.pid)
        ],
        scriptPath: script
      },
      []
    )

    const spawn = this.deps.spawn ?? nodeSpawn

    const child = spawn(path.win32.resolve(POWERSHELL_PATH, '../../../cmd.exe'), wrapped.args, {
      detached: wrapped.detached,
      stdio: 'ignore',
      windowsHide: true,
      // A working directory pins its folder: never the install, which the swap renames.
      cwd: this.deps.tempDir
    })

    child.unref()
    this.deps.log(`[delta] swapping in ${staged.plan.to} once the app has quit`)
    this.deps.quit()
  }
}
