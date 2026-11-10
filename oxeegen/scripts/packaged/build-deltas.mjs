#!/usr/bin/env node
/**
 * Oxee Hermes delta updates: one delta per previous release, beside the new setup.exe.
 *
 *   node oxeegen/scripts/packaged/build-deltas.mjs --app-dir apps/desktop/release/win-unpacked \
 *     --previous dist/previous --version 0.8.5 --out apps/desktop/release
 *
 * --previous holds the setup.exe of the last published releases (the release workflow downloads
 * the last three). Each one is unpacked with 7-Zip (the NSIS archive, then its app-64.7z, then the
 * payload tar) and compared with the new build; the plan and pack land in --out, named
 * <Product>-Delta-<from>-to-<to>-<arch>.{json,tar.gz} (apps/desktop/electron/updater/oxeegen-delta.mjs).
 * A user who skipped up to that many releases still gets a delta; older installs take the full
 * setup.exe. Runs on Windows (7-Zip and System32 tar.exe).
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'

import { buildDelta, PAYLOAD_ARCHIVE } from '../../../apps/desktop/electron/updater/oxeegen-delta.mjs'

const { values } = parseArgs({
  options: {
    'app-dir': { type: 'string' },
    previous: { type: 'string' },
    version: { type: 'string' },
    out: { type: 'string' },
    work: { type: 'string', default: path.join(process.env.RUNNER_TEMP || 'dist', 'oxee-delta-work') }
  }
})
for (const name of ['app-dir', 'previous', 'version', 'out']) {
  if (!values[name]) throw new Error(`--${name} is required`)
}

const sevenZip = ['C:\\Program Files\\7-Zip\\7z.exe'].find(file => fs.existsSync(file)) ?? '7z'
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar'

function run(command, args) {
  const result = spawnSync(command, args, { stdio: ['ignore', 'ignore', 'inherit'] })
  if (result.status !== 0) throw new Error(`${path.basename(command)} ${args.join(' ')} failed (${result.status ?? result.error})`)
}

function linkTree(from, to) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name)
    const target = path.join(to, entry.name)
    if (entry.isDirectory()) {
      fs.mkdirSync(target, { recursive: true })
      linkTree(source, target)
    } else {
      try {
        fs.linkSync(source, target)
      } catch {
        fs.copyFileSync(source, target)
      }
    }
  }
}

/** The install tree as the user's disk holds it: the payload extracted, not its tar. */
function expandPayload(root) {
  const archive = path.join(root, ...PAYLOAD_ARCHIVE.split('/'))
  if (fs.existsSync(archive)) {
    run(tar, ['-xf', archive, '-C', path.join(root, 'resources')])
    fs.rmSync(archive)
  }
}

const work = path.resolve(values.work)
fs.rmSync(work, { recursive: true, force: true })
const started = Date.now()

const newRoot = path.join(work, 'new')
fs.mkdirSync(newRoot, { recursive: true })
linkTree(path.resolve(values['app-dir']), newRoot)
// The linked tar is extracted, then only its link is removed: the build output stays intact.
expandPayload(newRoot)

const setups = fs.existsSync(values.previous)
  ? fs.readdirSync(values.previous, { recursive: true }).filter(file => /-Setup-[^-]+-[a-z0-9]+\.exe$/i.test(file))
  : []
if (!setups.length) console.log('no previous release: no delta')

for (const file of setups) {
  const match = /([^\\/]+)-Setup-([^-]+)-([a-z0-9]+)\.exe$/i.exec(file)
  const [, product, from, arch] = match
  if (from === values.version) continue
  const unpacked = path.join(work, `from-${from}`)
  run(sevenZip, ['e', '-y', `-o${unpacked}-setup`, path.join(values.previous, file), 'app-64.7z', '-r'])
  run(sevenZip, ['x', '-y', `-o${unpacked}`, path.join(`${unpacked}-setup`, 'app-64.7z')])
  fs.rmSync(`${unpacked}-setup`, { recursive: true, force: true })
  expandPayload(unpacked)

  const plan = await buildDelta({
    previousRoot: unpacked,
    newRoot,
    product,
    from,
    to: values.version,
    arch,
    outDir: path.resolve(values.out),
    workDir: work,
    tar
  })
  fs.rmSync(unpacked, { recursive: true, force: true })
  const mb = bytes => `${Math.round(bytes / 1048576)} MB`
  console.log(
    `${from} -> ${values.version}: ${plan.changed.length} of ${plan.files.length} files changed (${mb(plan.changedBytes)}), ` +
      `${plan.deleted.length} removed, pack ${mb(plan.pack.size)}`
  )
  // Where the changes are, by top folder, to see what a release really touches.
  const byArea = new Map()
  for (const rel of plan.changed) {
    const area = rel.split('/').slice(0, rel.startsWith('resources/agent-payload/') ? 4 : 2).join('/')
    byArea.set(area, (byArea.get(area) ?? 0) + 1)
  }
  for (const [area, count] of [...byArea].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`    ${String(count).padStart(6)}  ${area}`)
}

fs.rmSync(work, { recursive: true, force: true })
console.log(`deltas built in ${Math.round((Date.now() - started) / 1000)} s`)
