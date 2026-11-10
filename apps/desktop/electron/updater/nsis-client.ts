import { EventEmitter } from 'node:events'

import electronUpdater, { type AppUpdater, type UpdateInfo } from 'electron-updater'

import { channelPublicBase } from './channel-protocol'
import { MacStrategy } from './mac'
import type { MacClientDeps } from './mac-client'
import type { DeltaClient, StagedDelta } from './oxeegen-delta-client'
import { createDeltaClient } from './oxeegen-delta-electron'

export type NsisClientDeps = Omit<MacClientDeps, 'feed' | 'light'>

/** Where `updates.desktop_feed_base_url` serves the setup.exe and its latest.yml. */
export const NSIS_FEED_DIRECTORY = 'releases/win32/nsis'

type Listener = (...args: unknown[]) => void

/**
 * Oxee Hermes setup.exe (NSIS) update arm. electron-updater reads the packaged
 * app-update.yml, GitHub Releases of the Oxeegen repo (electron-builder.config.cjs),
 * unless `updates.desktop_feed_base_url` names a generic feed. It shares the macOS
 * strategy's check / download / teardown / handoff flow; only the download and the
 * install differ:
 * - when the release carries a delta from this version (oxeegen-delta-client.ts), only the
 *   changed files are downloaded, the new version is prepared beside the install while the
 *   app runs, and the restart swaps it in within seconds;
 * - otherwise the full setup.exe runs with its progress window (not /S, so the user sees
 *   the update advance), and packaging/oxeegen-installer.nsh keeps it from asking again
 *   what the user already chose (for me or for all users, folder) and relaunches the app.
 */
export function createNsisStrategy(
  deps: NsisClientDeps,
  delta: DeltaClient | null = createDeltaClient(deps.feedBaseUrl, deps.log)
): MacStrategy {
  const updater = new electronUpdater.NsisUpdater()
  const deltaEvents = new EventEmitter()
  let latest: UpdateInfo | null = null
  let staged: StagedDelta | null = null

  updater.autoDownload = false
  updater.autoInstallOnAppQuit = false
  updater.autoRunAppAfterInstall = true
  updater.allowDowngrade = false
  updater.on('error', error => deps.log(`Windows updater: ${error.message}`))

  if (deps.feedBaseUrl) {
    updater.setFeedURL({ provider: 'generic', url: `${channelPublicBase(deps.feedBaseUrl)}/${NSIS_FEED_DIRECTORY}/` })
  }

  void delta?.cleanLeftovers()

  const downloadUpdate = async (): Promise<string[]> => {
    staged = null

    if (delta && latest) {
      staged = await delta.prepare(
        latest.version,
        latest.files?.[0]?.url ?? latest.path,
        percent => deltaEvents.emit('download-progress', { percent }),
        () => deps.emitProgress({ stage: 'prepare', message: 'Preparing the Oxee Hermes update.', percent: null })
      )
    }

    return staged ? [staged.stagingDir] : updater.downloadUpdate()
  }

  const on = (event: string, listener: Listener): AppUpdater => {
    updater.on(event as 'error', listener)
    deltaEvents.on(event, listener)

    return updater
  }

  const removeListener = (event: string, listener: Listener): AppUpdater => {
    updater.removeListener(event as 'error', listener)
    deltaEvents.removeListener(event, listener)

    return updater
  }

  return new MacStrategy({
    ...deps,
    updater: {
      checkForUpdates: async () => {
        const result = await updater.checkForUpdates()
        latest = result?.updateInfo ?? null

        return result
      },
      downloadUpdate,
      quitAndInstall: () => (staged && delta ? delta.swapAndQuit(staged) : updater.quitAndInstall(false, true)),
      on: on as AppUpdater['on'],
      removeListener: removeListener as AppUpdater['removeListener']
    },
    prepareInstall: async () => undefined,
    prepareMessage: null
  })
}
