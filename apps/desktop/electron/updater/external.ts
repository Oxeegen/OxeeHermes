// updater/external.ts — the steward-owned strategy.
//
// The stamp declares 'external' when the package owner handles updates
// without an in-app check or apply action.

import type { InstallStamp } from '../install-stamp'

import type { UpdaterApplyResultWire, UpdaterStatusWire } from './index'

export const EXTERNAL_UNSUPPORTED_MESSAGE = 'Updates are managed by the package owner outside this app.'

// Oxee Hermes: on Windows only the per-machine .msi stamps a bundled app 'external'
// (write-build-stamp.mjs): the administrator deploys the next .msi, the app never updates itself.
export const ADMINISTRATOR_UPDATE_MESSAGE = 'Updates are installed by your administrator.'

export const COMMIT_BUILD_UPDATE_MESSAGE: string =
  "This build doesn't get updates. Ask the developer who gave it to you for a new build."

export class ExternalStrategy {
  constructor(
    private readonly stamp: Pick<InstallStamp, 'payload' | 'source'> | null = null,
    private readonly platform: NodeJS.Platform = process.platform
  ) {}
  readonly mechanism = 'external' as const
  readonly supported = false

  private administrator(): boolean {
    return this.platform === 'win32' && this.stamp?.payload === 'bundled' && this.stamp.source !== 'commit-build'
  }

  async check(): Promise<UpdaterStatusWire> {
    const [reason, message] =
      this.stamp?.source === 'commit-build'
        ? ['commit-build', COMMIT_BUILD_UPDATE_MESSAGE]
        : this.administrator()
          ? ['administrator-managed', ADMINISTRATOR_UPDATE_MESSAGE]
          : ['bundled-not-appinstaller', EXTERNAL_UNSUPPORTED_MESSAGE]

    return { supported: false, mechanism: 'external', reason, message, fetchedAt: Date.now() }
  }

  async apply(): Promise<UpdaterApplyResultWire> {
    if (this.stamp?.source === 'commit-build') {
      return { ok: false, mechanism: 'external', error: 'commit-build', message: COMMIT_BUILD_UPDATE_MESSAGE }
    }

    if (this.administrator()) {
      return { ok: false, mechanism: 'external', error: 'administrator-managed', message: ADMINISTRATOR_UPDATE_MESSAGE }
    }

    return { ok: true, manual: true, bundled: true, mechanism: 'external' }
  }
}
