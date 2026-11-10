import electronUpdater from 'electron-updater'

import { channelPublicBase } from './channel-protocol'
import { MacStrategy } from './mac'
import type { MacClientDeps } from './mac-client'

export type NsisClientDeps = Omit<MacClientDeps, 'feed' | 'light'>

/** Where `updates.desktop_feed_base_url` serves the setup.exe and its latest.yml. */
export const NSIS_FEED_DIRECTORY = 'releases/win32/nsis'

/**
 * Oxee Hermes setup.exe (NSIS) update arm. electron-updater reads the packaged
 * app-update.yml, GitHub Releases of the Oxeegen repo (electron-builder.config.cjs),
 * unless `updates.desktop_feed_base_url` names a generic feed. It shares the macOS
 * strategy's check / download / teardown / handoff flow; only the install differs:
 * the setup runs with its progress window (not /S, so the user sees the update
 * advance), and packaging/oxeegen-installer.nsh keeps it from asking again what
 * the user already chose (for me or for all users, folder) and relaunches the app.
 */
export function createNsisStrategy(deps: NsisClientDeps): MacStrategy {
  const updater = new electronUpdater.NsisUpdater()

  updater.autoDownload = false
  updater.autoInstallOnAppQuit = false
  updater.autoRunAppAfterInstall = true
  updater.allowDowngrade = false
  updater.on('error', error => deps.log(`Windows updater: ${error.message}`))

  if (deps.feedBaseUrl) {
    updater.setFeedURL({ provider: 'generic', url: `${channelPublicBase(deps.feedBaseUrl)}/${NSIS_FEED_DIRECTORY}/` })
  }

  return new MacStrategy({
    ...deps,
    updater: {
      checkForUpdates: () => updater.checkForUpdates(),
      downloadUpdate: () => updater.downloadUpdate(),
      quitAndInstall: () => updater.quitAndInstall(false, true),
      on: updater.on.bind(updater),
      removeListener: updater.removeListener.bind(updater)
    },
    prepareInstall: async () => undefined,
    prepareMessage: null
  })
}
