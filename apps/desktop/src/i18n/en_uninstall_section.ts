import type { UninstallSectionTranslations } from './types_uninstall_section'

// Settings > About > Uninstall, composed by en.ts as `settings.uninstallSection`.
export const enUninstallSection: UninstallSectionTranslations = {
  dangerZone: 'Danger zone',
  checkingInstalled: 'Checking what’s installed…',
  uninstallHermes: 'Uninstall Hermes',
  managedBody: 'This install is managed by your system, so Hermes cannot remove itself.',
  dataKept: path => `Your config, chats, and secrets live in ${path}. Removing the app does not delete them.`,
  openAppsSettings: 'Open Apps settings',
  nativeRemoval: {
    nix: 'This Hermes app was installed by Nix. Uninstall it the same way you installed it: remove hermes-agent from your flake or profile, then rebuild.',
    external:
      'Another package manager installed this Hermes app. Uninstall it with that package manager, the same way you installed it.',
    windows: 'To uninstall, go to Windows Settings → Apps → Installed apps.',
    mac: (bundle, folder) => `Quit the app and drag ${bundle} from ${folder} to the Trash.`,
    macDefault: 'Quit the app and drag the Hermes app from Applications to the Trash.',
    appImage: path => `Delete the AppImage file at ${path}.`,
    appDir: path => `Delete the app directory at ${path}.`,
    linux: 'Delete the Hermes AppImage (or app directory) from wherever you saved it.'
  },
  chooseHowMuch:
    'Choose how much to remove. The app closes to finish the job; reopen the installer any time to come back.',
  confirmUninstall: 'Confirm uninstall',
  confirmBody: what => `This removes ${what}. This can’t be undone.`,
  appLabel: 'App:',
  couldNotStart: 'Uninstall could not start.',
  uninstalling: 'Uninstalling…',
  yesUninstall: 'Yes, uninstall',
  options: {
    gui: {
      title: 'Uninstall Chat GUI only',
      description: 'Remove this desktop app. The Hermes agent, your config, and chats all stay.',
      consequence: 'the desktop Chat GUI (this app and its data)'
    },
    lite: {
      title: 'Uninstall GUI + agent, keep my data',
      description: 'Remove the app and the Hermes agent, but keep config, chats, and secrets for a future reinstall.',
      consequence: 'the Chat GUI and the Hermes agent (config, chats, and secrets are kept)'
    },
    full: {
      title: 'Uninstall everything',
      description: 'Remove the app, the agent, and all user data — config, chats, scheduled jobs, secrets, logs.',
      consequence: 'EVERYTHING — the Chat GUI, the Hermes agent, and all of your config, chats, secrets, and logs'
    }
  }
}
