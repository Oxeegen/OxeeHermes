#!/usr/bin/env node
/**
 * The install test's side of a delta update (windows-install-test.ps1), with the app's own code:
 *
 *   node apply-delta.mjs prepare --install-dir <dir> --plan <plan.json> --pack <pack.tar.gz>
 *     prepares "<dir>.oxee-update" exactly as electron/updater/oxeegen-delta-client.ts does
 *     (the app may be running);
 *   node apply-delta.mjs verify --install-dir <dir> --plan <plan.json> --since <epoch ms>
 *     after the swap: every file of the new version is there, the removed ones are gone, and the
 *     payload holds nothing else but what the relaunched app wrote since the swap started.
 */
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'

import { listTree, PAYLOAD_PREFIX, stageDelta, STAGING_SUFFIX } from '../../../apps/desktop/electron/updater/oxeegen-delta.mjs'

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { 'install-dir': { type: 'string' }, plan: { type: 'string' }, pack: { type: 'string' }, since: { type: 'string' } }
})
const installDir = path.resolve(values['install-dir'])
const plan = JSON.parse(fs.readFileSync(values.plan, 'utf8'))
const tar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')

if (positionals[0] === 'prepare') {
  const started = Date.now()
  await stageDelta({ installDir, stagingDir: installDir + STAGING_SUFFIX, plan, packFile: path.resolve(values.pack), tar, log: console.log })
  console.log(`prepared in ${Math.round((Date.now() - started) / 1000)} s`)
} else if (positionals[0] === 'verify') {
  const installed = (await listTree(installDir)).files
  const problems = []
  const missing = plan.files.filter(rel => !installed.has(rel))
  if (missing.length) problems.push(`${missing.length} file(s) of ${plan.to} missing, e.g. ${missing[0]}`)
  const expected = new Set(plan.files)
  // The relaunched app writes its own files (caches, .hermes/bin): only older ones are strays.
  const since = Number(values.since ?? 0)
  const stray = [...installed.keys()].filter(
    rel => rel.startsWith(PAYLOAD_PREFIX) && !expected.has(rel) && fs.statSync(installed.get(rel)).mtimeMs < since
  )
  if (stray.length) problems.push(`${stray.length} payload file(s) not in ${plan.to}, e.g. ${stray[0]}`)
  const gone = plan.deleted.filter(rel => installed.has(rel) && rel.startsWith(PAYLOAD_PREFIX))
  if (gone.length) problems.push(`${gone.length} removed file(s) still there, e.g. ${gone[0]}`)
  if (problems.length) {
    console.log(problems.join('\n'))
    process.exit(1)
  }
  console.log(`the install holds the ${plan.files.length} files of ${plan.to}`)
} else {
  throw new Error('usage: apply-delta.mjs prepare|verify ...')
}
