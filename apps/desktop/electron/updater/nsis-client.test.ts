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

import { createNsisStrategy, NSIS_FEED_DIRECTORY } from './nsis-client'

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

  it('downloads, stops the backend, then runs the setup silently and relaunches', async () => {
    const info = { version: '1.3.0', files: [], path: '', sha512: '', releaseDate: '' }
    client.checkForUpdates.mockResolvedValue({ isUpdateAvailable: true, updateInfo: info, versionInfo: info })
    const d = deps()

    const result = await createNsisStrategy(d).apply()

    expect(client.downloadUpdate).toHaveBeenCalledOnce()
    expect(d.beforeInstall).toHaveBeenCalledOnce()
    expect(client.quitAndInstall).toHaveBeenCalledWith(true, true)
    expect(result).toMatchObject({ ok: true, handedOff: true })
    // No macOS signature step on Windows.
    expect(d.emitProgress).not.toHaveBeenCalledWith(expect.objectContaining({ stage: 'prepare' }))
  })
})
