import { describe, expect, it } from 'vitest'

import { buildStampPayload } from '../../scripts/write-build-stamp.mjs'
import type { InstallStamp } from '../install-stamp'

import { ExternalStrategy } from './external'

import { resolveUpdaterMechanism } from './index'

const base = { commit: 'c'.repeat(40), branch: 'main', builtAt: '2026-11-20T00:00:00Z', dirty: false, source: 'ci' }

const runtime = {
  repoDir: 'app',
  toolsDir: 'tools',
  storePython: 'tools/python/python.exe',
  sitePackages: 'venv/Lib/site-packages',
  commands: { hermes: 'bin/hermes.exe' }
}

function stampFor(pkg: 'msi' | 'nsis'): InstallStamp {
  const env = { HERMES_DESKTOP_VARIANT: 'bundled', HERMES_DESKTOP_PACKAGE: pkg, HERMES_PAYLOAD_TAG: 'v0.8.6' }

  return buildStampPayload(base, env, 'win32', { runtime }) as InstallStamp
}

describe('Oxee Hermes .msi updates', () => {
  it('the administrator updates a .msi install: no check, no download, the card says so', async () => {
    const stamp = stampFor('msi')
    expect(resolveUpdaterMechanism({ platform: 'win32', updateMechanism: stamp.updateMechanism, source: stamp.source })).toBe('external')

    const strategy = new ExternalStrategy(stamp, 'win32')
    expect(await strategy.check()).toMatchObject({ supported: false, reason: 'administrator-managed' })
    expect(await strategy.apply()).toMatchObject({ ok: false, error: 'administrator-managed' })
  })

  it('the setup.exe still updates itself from GitHub', () => {
    const stamp = stampFor('nsis')
    expect(resolveUpdaterMechanism({ platform: 'win32', updateMechanism: stamp.updateMechanism, source: stamp.source })).toBe('electron-updater')
  })
})
