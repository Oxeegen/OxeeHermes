/**
 * Oxeegen fork contract — packaging, identity, isolation and assets. A failure
 * here after an upstream merge means the merge restored an upstream value that
 * would make Oxeegen Hermes share state with (or look like) the official Hermes.
 * See oxeegen/README.md.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, test } from 'vitest'

// @ts-expect-error -- plain ESM build script without declarations
import { applyBundleEnvironment, OXEEGEN_BUNDLE_ENV, oxeegenBundleEnvironment } from '../scripts/bundle-env.mjs'

import { oxeegenManagedDir } from './oxeegen-managed'

const require: NodeJS.Require = createRequire(import.meta.url)
const DESKTOP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = path.resolve(DESKTOP, '../..')
const SAVED_ENV = { ...process.env }

function freshCjs<T>(relative: string): T {
  const resolved = require.resolve(path.join(DESKTOP, relative))
  delete require.cache[resolved]
  delete require.cache[require.resolve(path.join(DESKTOP, 'product-identity.cjs'))]

  return require(resolved) as T
}

beforeEach(() => {
  for (const key of ['HERMES_DESKTOP_VARIANT', 'HERMES_PAYLOAD_TAG', 'HERMES_BUILD_COMMIT', 'GITHUB_REPOSITORY']) {
    delete process.env[key]
  }
})

afterEach(() => {
  process.env = { ...SAVED_ENV }
})

describe('product identity', () => {
  test.each([
    [undefined, 'Oxeegen Hermes', 'oxeegen-hermes'],
    ['bundled', 'Oxeegen Hermes Agent', 'oxeegen-hermes'],
    ['light', 'Oxeegen Hermes Light', 'oxeegen-hermes-light']
  ])('variant %s is named, identified and published as Oxeegen', (variant, display, cli) => {
    if (variant) {
      process.env.HERMES_DESKTOP_VARIANT = variant
    }

    const identity = freshCjs<Record<string, string>>('product-identity.cjs')

    assert.equal(identity.displayName, display)
    assert.match(identity.appId, /^com\.oxeegen\./)
    assert.match(identity.msixAppIdWithOrg, /^Oxeegen\./)
    assert.equal(identity.cliName, cli)
  })

  test('the packaged app owns its userData, lock and keychain entry (productName), scheme and update repo', () => {
    process.env.HERMES_DESKTOP_VARIANT = 'bundled'
    const config = freshCjs<Record<string, any>>('electron-builder.config.cjs')
    const identity = freshCjs<Record<string, string>>('product-identity.cjs')

    assert.equal(config.extraMetadata.productName, identity.displayName)
    assert.deepEqual(config.protocols[0].schemes, ['oxeegen-hermes'])
    assert.equal(config.linux.maintainer, 'Oxeegen')
    assert.ok(
      config.publish.some((target: Record<string, string>) => target.owner === 'oxeegen' || target.provider === 'generic'),
      'updates must never come from NousResearch'
    )
    assert.ok(!JSON.stringify(config.publish).includes('NousResearch'))
  })

  test('the dev package name is not the official one either', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(DESKTOP, 'package.json'), 'utf8'))

    assert.equal(pkg.productName, 'Oxeegen Hermes')
  })
})

describe('bundle environment (data home isolation)', () => {
  test('every build bakes its own data-dir suffix and clears inherited homes', () => {
    assert.deepEqual(oxeegenBundleEnvironment(undefined), OXEEGEN_BUNDLE_ENV)
    assert.equal(OXEEGEN_BUNDLE_ENV.HERMES_DATA_DIR_SUFFIX, '-oxeegen')
    assert.equal(OXEEGEN_BUNDLE_ENV.HERMES_HOME, null)
  })

  test("an official installer's HERMES_HOME is cleared at launch", () => {
    const env = applyBundleEnvironment({ HERMES_HOME: path.join(os.homedir(), '.hermes') }, oxeegenBundleEnvironment(undefined))

    assert.equal(env.HERMES_HOME, '')
    assert.equal(env.HERMES_DATA_DIR_SUFFIX, '-oxeegen')
  })

  test('a release request keeps the Oxeegen isolation for keys it does not name', () => {
    const merged = oxeegenBundleEnvironment(JSON.stringify({ HERMES_PREVIEW_FULL_CONNECTORS: '1' }))

    assert.equal(merged.HERMES_DATA_DIR_SUFFIX, '-oxeegen')
    assert.equal(merged.HERMES_PREVIEW_FULL_CONNECTORS, '1')
  })
})

describe('managed scope', () => {
  test('the shipped managed config exists where Electron looks for it', () => {
    assert.equal(oxeegenManagedDir([ROOT]), path.join(ROOT, 'oxeegen', 'managed'))
  })

  test('the bundled payload wins over the source checkout, and nothing is invented', () => {
    const payload = fs.mkdtempSync(path.join(os.tmpdir(), 'oxeegen-payload-'))
    fs.mkdirSync(path.join(payload, 'oxeegen', 'managed'), { recursive: true })
    fs.writeFileSync(path.join(payload, 'oxeegen', 'managed', 'config.yaml'), 'model: {}\n')

    assert.equal(oxeegenManagedDir([payload, ROOT]), path.join(payload, 'oxeegen', 'managed'))
    assert.equal(oxeegenManagedDir([null, os.tmpdir()]), null)
  })
})

describe('assets', () => {
  const generated = path.join(ROOT, 'oxeegen', 'assets', 'generated')

  test.each([
    ['assets/icon.png', 'icon.png'],
    ['assets/icon.ico', 'icon.ico'],
    ['assets/icon.icns', 'icon.icns'],
    ['assets/icon-dark.png', 'icon-dark.png'],
    ['assets/icon-mac.png', 'icon-mac.png'],
    ['packaging/dmg-volume.icns', 'icon.icns'],
    ['public/apple-touch-icon.png', 'apple-touch-icon.png']
  ])('%s is the Oxeegen icon (an upstream merge must not restore the official one)', (shipped, source) => {
    assert.ok(fs.readFileSync(path.join(DESKTOP, shipped)).equals(fs.readFileSync(path.join(generated, source))))
  })

  test('the in-app brand marks are present', () => {
    for (const file of ['public/oxeegen-icon.svg', 'public/oxeegen-icon-dark.svg']) {
      assert.ok(fs.existsSync(path.join(DESKTOP, file)), file)
    }
  })

  test('the macOS 26 icon package carries the Oxeegen fill', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(DESKTOP, 'assets/icon.icon/icon.json'), 'utf8'))

    assert.equal(manifest['fill-specializations'][0].value.solid, 'srgb:0.36863,0.29020,0.96078,1.00000')
  })
})

describe('product name in source strings', () => {
  test('no hardcoded UI string still carries the upstream name (oxeegen/scripts/rebrand-source.mts --check)', () => {
    const result = spawnSync(process.execPath, [path.join(ROOT, 'oxeegen/scripts/rebrand-source.mts'), '--check'], {
      encoding: 'utf8'
    })

    assert.equal(result.status, 0, result.stdout.split('\n').slice(-25).join('\n'))
  }, 120_000)
})
