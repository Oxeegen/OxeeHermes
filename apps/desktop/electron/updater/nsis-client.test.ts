import { afterEach, describe, expect, it, vi } from 'vitest'

const { client } = vi.hoisted(() => ({
  client: {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    autoRunAppAfterInstall: false,
    allowDowngrade: true,
    on: vi.fn(),
    removeListener: vi.fn(),
    setFeedURL: vi.fn(),
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(async () => ['setup.exe']),
    quitAndInstall: vi.fn()
  }
}))

vi.mock('electron-updater', () => ({
  default: {
    NsisUpdater: class {
      constructor() {
        return client
      }
    }
  }
}))

vi.mock('./oxeegen-delta-electron', () => ({ createDeltaClient: () => null }))

import { createNsisStrategy, NSIS_FEED_DIRECTORY } from './nsis-client'
import type { DeltaClient } from './oxeegen-delta-client'

afterEach((): void => {
  vi.clearAllMocks()
})

function deps(feedBaseUrl = ''): Parameters<typeof createNsisStrategy>[0] {
  return {
    channel: 'stable',
    feedBaseUrl,
    appVersion: '1.2.0',
    log: vi.fn(),
    emitProgress: vi.fn(),
    beforeInstall: vi.fn(async () => undefined),
    onInstallFailure: vi.fn(async () => undefined)
  }
}

describe('Windows setup.exe updater', () => {
  it('reads the packaged GitHub feed by default and never installs or downgrades on its own', () => {
    createNsisStrategy(deps())

    expect(client.setFeedURL).not.toHaveBeenCalled()
    expect(client.autoDownload).toBe(false)
    expect(client.autoInstallOnAppQuit).toBe(false)
    expect(client.autoRunAppAfterInstall).toBe(true)
    expect(client.allowDowngrade).toBe(false)
  })

  it('reads a generic feed when updates.desktop_feed_base_url is set', () => {
    createNsisStrategy(deps('http://127.0.0.1:8765'))

    expect(client.setFeedURL).toHaveBeenCalledWith({ provider: 'generic', url: `http://127.0.0.1:8765/${NSIS_FEED_DIRECTORY}/` })
  })

  it('reports a newer GitHub release as an available update', async () => {
    const info = { version: '1.3.0', files: [], path: '', sha512: '', releaseDate: '' }
    client.checkForUpdates.mockResolvedValueOnce({ isUpdateAvailable: true, updateInfo: info, versionInfo: info })

    await expect(createNsisStrategy(deps()).check()).resolves.toMatchObject({
      supported: true,
      mechanism: 'electron-updater',
      currentVersion: '1.2.0',
      latestTag: 'v1.3.0',
      updateAvailable: true
    })
  })

  it('downloads, stops the backend, then runs the setup with its progress window and relaunches', async () => {
    const info = { version: '1.3.0', files: [], path: '', sha512: '', releaseDate: '' }
    client.checkForUpdates.mockResolvedValue({ isUpdateAvailable: true, updateInfo: info, versionInfo: info })
    const d = deps()

    const result = await createNsisStrategy(d).apply()

    expect(client.downloadUpdate).toHaveBeenCalledOnce()
    expect(d.beforeInstall).toHaveBeenCalledOnce()
    // Not /S: the user sees the update advance (packaging/oxeegen-installer.nsh asks nothing).
    expect(client.quitAndInstall).toHaveBeenCalledWith(false, true)
    expect(result).toMatchObject({ ok: true, handedOff: true })
    // No macOS signature step on Windows.
    expect(d.emitProgress).not.toHaveBeenCalledWith(expect.objectContaining({ stage: 'prepare' }))
  })

  it('turns a GitHub 404 into a short "no release" status and keeps the raw error for the log', async () => {
    const raw = Object.assign(new Error('404 "method: GET url: https://github.com/Oxeegen/OxeeHermes/releases.atom" Headers: { "set-cookie": "_gh_sess=secret" }'), {
      statusCode: 404
    })

    client.checkForUpdates.mockRejectedValueOnce(raw)
    const d = deps()

    const status = await createNsisStrategy(d).check()

    expect(status).toMatchObject({ supported: true, error: 'no-release', message: 'No Oxee Hermes release is published yet.' })
    expect(JSON.stringify(status)).not.toContain('_gh_sess')
    expect(d.log).toHaveBeenCalledWith(expect.stringContaining('_gh_sess'))
  })

  it('calls any other failure unreachable, and refuses to apply on a failed check', async () => {
    client.checkForUpdates.mockRejectedValue(Object.assign(new Error('net::ERR_INTERNET_DISCONNECTED'), { code: 'ERR_NETWORK' }))

    await expect(createNsisStrategy(deps()).check()).resolves.toMatchObject({ error: 'feed-unreachable' })
    await expect(createNsisStrategy(deps()).apply()).rejects.toThrow('could not be reached')
    expect(client.quitAndInstall).not.toHaveBeenCalled()
  })

  describe('with a delta from this version', () => {
    const setup = 'OxeeHermesBundled-Setup-1.3.0-x64.exe'
    const info = { version: '1.3.0', files: [{ url: setup, sha512: '' }], path: setup, sha512: '', releaseDate: '' }

    function fakeDelta(staged: boolean): DeltaClient & { prepare: ReturnType<typeof vi.fn>; swapAndQuit: ReturnType<typeof vi.fn> } {
      return {
        cleanLeftovers: vi.fn(async () => undefined),
        prepare: vi.fn(async (_version: string, _setup: string, onProgress: (percent: number) => void, onStaging: () => void) => {
          onProgress(50)
          onStaging()

          return staged ? { plan: { to: '1.3.0' }, stagingDir: 'C:/Programs/Oxee Hermes.oxee-update' } : null
        }),
        swapAndQuit: vi.fn()
      } as never
    }

    it('downloads only the delta, prepares it, then swaps it in instead of running the setup', async () => {
      client.checkForUpdates.mockResolvedValue({ isUpdateAvailable: true, updateInfo: info, versionInfo: info })
      const d = deps()
      const delta = fakeDelta(true)

      const result = await createNsisStrategy(d, delta).apply()

      expect(delta.prepare).toHaveBeenCalledWith('1.3.0', setup, expect.any(Function), expect.any(Function))
      expect(client.downloadUpdate).not.toHaveBeenCalled()
      expect(d.beforeInstall).toHaveBeenCalledOnce()
      expect(delta.swapAndQuit).toHaveBeenCalledWith(expect.objectContaining({ stagingDir: 'C:/Programs/Oxee Hermes.oxee-update' }))
      expect(client.quitAndInstall).not.toHaveBeenCalled()
      expect(d.emitProgress).toHaveBeenCalledWith(expect.objectContaining({ stage: 'fetch', percent: 50 }))
      expect(d.emitProgress).toHaveBeenCalledWith(expect.objectContaining({ stage: 'prepare' }))
      expect(result).toMatchObject({ ok: true, handedOff: true })
    })

    it('takes the full setup.exe when there is no usable delta', async () => {
      client.checkForUpdates.mockResolvedValue({ isUpdateAvailable: true, updateInfo: info, versionInfo: info })
      const delta = fakeDelta(false)

      await createNsisStrategy(deps(), delta).apply()

      expect(client.downloadUpdate).toHaveBeenCalledOnce()
      expect(client.quitAndInstall).toHaveBeenCalledWith(false, true)
      expect(delta.swapAndQuit).not.toHaveBeenCalled()
    })
  })
})
