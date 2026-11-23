/**
 * Oxeegen fork contract — packaging, identity, isolation and assets. A failure
 * here after an upstream merge means the merge restored an upstream value that
 * would make Oxee Hermes share state with (or look like) the official Hermes.
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
import { withMachineConfig } from '../scripts/oxeegen-msi-project.mjs'
import { validatePreparedBuilderArgs } from '../scripts/run-electron-builder.mjs'

import { machineConfigDir, oxeegenManagedDir, oxeegenManagedScope } from './oxeegen-managed'

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
    [undefined, 'Oxee Hermes Client', 'oxee-hermes'],
    ['bundled', 'Oxee Hermes', 'oxee-hermes'],
    ['light', 'Oxee Hermes Light', 'oxee-hermes-light']
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
    assert.deepEqual(config.protocols[0].schemes, ['oxee-hermes'])
    assert.equal(config.linux.maintainer, 'Oxeegen')
    assert.ok(
      config.publish.some((target: Record<string, string>) => target.owner === 'Oxeegen' || target.provider === 'generic'),
      'updates must never come from NousResearch'
    )
    assert.ok(!JSON.stringify(config.publish).includes('NousResearch'))
  })

  test('the sideload MSIX is published by Oxeegen (local test identity unless a release certificate is set)', () => {
    delete process.env.OXEEGEN_MSIX_PUBLISHER
    process.env.HERMES_DESKTOP_VARIANT = 'bundled'
    const config = freshCjs<Record<string, any>>('electron-builder.config.cjs')

    assert.equal(config.msix.publisher, 'CN=Oxeegen Local Build, O=Oxeegen')
    assert.doesNotMatch(config.msix.publisher + config.msix.publisherDisplayName, /Nous/)
  })

  test('a release publishes to GitHub Releases of the Oxeegen repo, with the setup.exe blockmap; a commit build publishes nothing', () => {
    delete process.env.CLOUDFLARE_R2_PUBLIC_URL
    delete process.env.GITHUB_REPOSITORY
    process.env.HERMES_DESKTOP_VARIANT = 'bundled'
    delete process.env.HERMES_BUILD_COMMIT
    const release = freshCjs<Record<string, any>>('electron-builder.config.cjs')

    assert.deepEqual(release.publish, [{ provider: 'github', owner: 'Oxeegen', repo: 'OxeeHermes', channel: 'latest' }])
    assert.deepEqual(release.mac.publish, [{ provider: 'github', owner: 'Oxeegen', repo: 'OxeeHermes', channel: 'latest' }])
    assert.equal(release.nsis.differentialPackage, true)

    process.env.HERMES_BUILD_COMMIT = 'a'.repeat(40)
    const commit = freshCjs<Record<string, any>>('electron-builder.config.cjs')

    assert.equal(commit.publish, null)
    assert.equal(commit.mac.publish, null)
    assert.equal(commit.nsis.differentialPackage, false)
  })

  test('the setup.exe offers per-user or per-machine install and ships the oxee-hermes command shims', () => {
    process.env.HERMES_DESKTOP_VARIANT = 'bundled'
    const config = freshCjs<Record<string, any>>('electron-builder.config.cjs')

    assert.equal(config.nsis.oneClick, false)
    assert.equal(config.nsis.perMachine, false)
    assert.match(config.nsis.artifactName, /^OxeeHermes/)
    assert.equal(config.nsis.deleteAppDataOnUninstall, false)
    const include = fs.readFileSync(path.join(DESKTOP, config.nsis.include), 'utf8')
    const shims = include.match(/\$\{PROJECT_DIR\}\\(packaging\\[\w.-]+\.ps1)/)
    assert.ok(shims, 'the include embeds the shim script')
    assert.ok(fs.existsSync(path.join(DESKTOP, shims[1].replace('\\', '/'))))
  })

  test('the dev package name is not the official one either', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(DESKTOP, 'package.json'), 'utf8'))

    assert.equal(pkg.productName, 'Oxee Hermes')
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

describe('machine configuration (administrator region and key)', () => {
  const run = (machine: null | string) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oxeegen-machine-'))
    const machineFile = path.join(dir, 'oxeegen.env')
    const outDir = path.join(dir, 'user-data', 'oxeegen-managed')
    const logs: string[] = []

    if (machine !== null) {
      fs.writeFileSync(machineFile, machine)
    }

    const managed = oxeegenManagedScope({ log: line => logs.push(line), machineFile, outDir, roots: [ROOT] })

    return { logs, managed, outDir }
  }

  test('without the file, the shipped scope applies as is', () => {
    assert.equal(run(null).managed, path.join(ROOT, 'oxeegen', 'managed'))
  })

  test("the administrator's region and key become managed values, the endpoint from oxeegen.json", () => {
    const { logs, managed, outDir } = run('\uFEFF# set by IT\r\nOXEEGEN_REGION=US\r\nOXEEGEN_API_KEY="sk-admin"\r\n')
    const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'plugins/model-providers/oxeegen/oxeegen.json'), 'utf8'))

    assert.equal(managed, outDir)
    assert.equal(
      fs.readFileSync(path.join(outDir, '.env'), 'utf8'),
      `OXEEGEN_REGION=us\nOXEEGEN_US_API_KEY=sk-admin\nOXEEGEN_API_KEY=sk-admin\nOXEEGEN_BASE_URL=${spec.regions.us.base_url}\n`
    )
    const config = fs.readFileSync(path.join(outDir, 'config.yaml'), 'utf8')
    assert.ok(config.startsWith(fs.readFileSync(path.join(ROOT, 'oxeegen/managed/config.yaml'), 'utf8').trimEnd()))
    assert.equal(fs.readFileSync(path.join(outDir, 'defaults.yaml'), 'utf8'), fs.readFileSync(path.join(ROOT, 'oxeegen/managed/defaults.yaml'), 'utf8'))
    assert.match(config, /\noxeegen:\n {2}managed_region: us\n$/)
    assert.ok(!logs.join('\n').includes('sk-admin'))
  })

  test('a read-only install (Program Files) composes again at the next launch', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'oxeegen-readonly-'))
    for (const file of ['oxeegen/managed/config.yaml', 'oxeegen/managed/defaults.yaml', 'plugins/model-providers/oxeegen/oxeegen.json']) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
      fs.copyFileSync(path.join(ROOT, file), path.join(root, file))
      fs.chmodSync(path.join(root, file), 0o444)
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oxeegen-machine-'))
    const machineFile = path.join(dir, 'oxeegen.env')
    const outDir = path.join(dir, 'oxeegen-managed')
    fs.writeFileSync(machineFile, 'OXEEGEN_REGION=eu\nOXEEGEN_API_KEY=sk-x\n')
    const compose = () => oxeegenManagedScope({ log: () => {}, machineFile, outDir, roots: [root] })

    assert.equal(compose(), outDir)
    assert.equal(compose(), outDir)
    assert.equal(fs.readFileSync(path.join(outDir, 'defaults.yaml'), 'utf8'), fs.readFileSync(path.join(ROOT, 'oxeegen/managed/defaults.yaml'), 'utf8'))
  })

  test("a region's own key wins over the generic one", () => {
    const { outDir } = run('OXEEGEN_REGION=eu\nOXEEGEN_API_KEY=sk-generic\nOXEEGEN_EU_API_KEY=sk-eu\n')

    assert.match(fs.readFileSync(path.join(outDir, '.env'), 'utf8'), /^OXEEGEN_EU_API_KEY=sk-eu$/m)
  })

  test.each([
    ['an unknown region', 'OXEEGEN_REGION=mars\nOXEEGEN_API_KEY=sk-x\n'],
    ['no key', 'OXEEGEN_REGION=eu\n'],
    ["another region's key only", 'OXEEGEN_REGION=eu\nOXEEGEN_US_API_KEY=sk-us\n']
  ])('%s: the file is ignored, said in the log, and an earlier composition removed', (_name, text) => {
    const first = run('OXEEGEN_REGION=eu\nOXEEGEN_API_KEY=sk-x\n')
    fs.writeFileSync(path.join(first.outDir, '..', '..', 'oxeegen.env'), text)
    const logs: string[] = []

    const managed = oxeegenManagedScope({
      log: line => logs.push(line),
      machineFile: path.join(first.outDir, '..', '..', 'oxeegen.env'),
      outDir: first.outDir,
      roots: [ROOT]
    })

    assert.equal(managed, path.join(ROOT, 'oxeegen', 'managed'))
    assert.equal(fs.existsSync(first.outDir), false)
    assert.match(logs.join('\n'), /is not applied/)
  })

  test('the machine file lives outside the install folder', () => {
    assert.equal(machineConfigDir('win32', { ProgramData: 'D:\\ProgramData' }), 'D:\\ProgramData\\Oxee Hermes')
    assert.equal(machineConfigDir('win32', {}), 'C:\\ProgramData\\Oxee Hermes')
  })
})

describe('.msi machine configuration', () => {
  test('prepared packaging admits a build of the .msi alone', () => {
    assert.doesNotThrow(() => validatePreparedBuilderArgs(['--win', 'msi', '-c.extraMetadata.version=0.8.6'], { formats: ['msi'], target: 'win32-x64' }))
  })

  const template = fs.readFileSync(path.join(path.dirname(require.resolve('app-builder-lib')), '../templates/msi/template.xml'), 'utf8')

  test('the key is hidden, and so is the command line that writes it as SYSTEM after the files', () => {
    const wxs = withMachineConfig(template)

    assert.match(wxs, /<Property Id="OXEEGEN_API_KEY" Secure="yes" Hidden="yes"\/>/)
    assert.match(wxs, /<Property Id="OxeegenWriteMachineConfig" Hidden="yes"\/>/)
    assert.match(wxs, /DllEntry="WixQuietExec64" Execute="deferred" Impersonate="no" Return="check" HideTarget="yes"/)
    assert.match(wxs, /resources\\oxeegen-machine-config\.ps1/)
    assert.doesNotMatch(wxs, /<IniFile/)
    assert.equal(withMachineConfig(wxs), wxs)
  })

  test('a changed electron-builder template fails the build instead of shipping without it', () => {
    assert.throws(() => withMachineConfig('<Wix></Wix>'), /template changed/)
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
