// oxeegen-delta.mjs — Oxee Hermes delta updates for the setup.exe install: the format, the CI
// side that computes what changed between two releases, and the app side that prepares the new
// version beside the install. Shared by the app (oxeegen-delta-client.ts, through
// oxeegen-delta.d.mts) and by the CI scripts in oxeegen/scripts/packaged, which run under plain
// Node and cannot import the app's TypeScript. No Electron imports here.
//
// A delta is two release assets beside the setup.exe:
//   <Product>-Delta-<from>-to-<to>-<arch>.json     the plan: every file of the new version, the
//                                                  ones that changed, the ones that are gone
//   <Product>-Delta-<from>-to-<to>-<arch>.tar.gz   the changed files (and empty folders)
//
// The app prepares "<install>.oxee-update": unchanged files are hard links to the installed ones
// (no copy, no disk space), changed files come from the pack. Swapping the two folders is then two
// renames (scripts/oxeegen-delta-swap.ps1), done in a second once the app has quit, where the full
// setup.exe rewrites ~39,000 files. The result is the same tree the full setup.exe would leave:
// the payload holds exactly the new version's files (runtime caches such as __pycache__ are
// dropped, as an uninstall drops them), and what the installer adds outside the payload
// (uninstaller, cli shims, package-type) is kept.

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const DELTA_FORMAT = 1
export const PAYLOAD_PREFIX = 'resources/agent-payload/'
export const PAYLOAD_ARCHIVE = 'resources/agent-payload.tar'
export const STAGING_SUFFIX = '.oxee-update'

export function deltaBaseName(product, from, to, arch) {
  return `${product}-Delta-${from}-to-${to}-${arch}`
}

export function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    fs.createReadStream(file)
      .on('error', reject)
      .on('data', chunk => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
  })
}

/** Every file and folder under root, as "/"-separated paths relative to root. */
export async function listTree(root) {
  const files = new Map()
  const dirs = []
  const walk = async rel => {
    const entries = await fs.promises.readdir(path.join(root, rel), { withFileTypes: true })
    for (const entry of entries) {
      const child = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        dirs.push(child)
        await walk(child)
      } else {
        files.set(child, path.join(root, child))
      }
    }
  }
  await walk('')
  return { files, dirs }
}

async function mapLimit(items, limit, fn) {
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      await fn(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true })
    let stderr = ''
    child.stderr.on('data', chunk => {
      stderr = (stderr + chunk).slice(-2000)
    })
    child.on('error', reject)
    child.on('close', code =>
      code === 0 ? resolve() : reject(new Error(`${path.basename(command)} ${args[0]} failed (${code}): ${stderr.trim()}`))
    )
  })
}

/**
 * CI side. previousRoot and newRoot are install trees (the payload extracted, not the .tar).
 * Writes the plan and the pack into outDir and returns the plan.
 */
export async function buildDelta({ previousRoot, newRoot, product, from, to, arch, outDir, tar = 'tar', workDir }) {
  const previous = await listTree(previousRoot)
  const next = await listTree(newRoot)
  const files = [...next.files.keys()].filter(rel => rel !== PAYLOAD_ARCHIVE).sort()
  const changed = []
  let changedBytes = 0

  await mapLimit(files, 8, async rel => {
    const newFile = next.files.get(rel)
    const oldFile = previous.files.get(rel)
    const size = fs.statSync(newFile).size
    const same = oldFile && fs.statSync(oldFile).size === size && (await sha256File(oldFile)) === (await sha256File(newFile))
    if (!same) {
      changed.push(rel)
      changedBytes += size
    }
  })
  changed.sort()

  const newSet = new Set(files)
  const deleted = [...previous.files.keys()].filter(rel => !newSet.has(rel) && rel !== PAYLOAD_ARCHIVE).sort()
  const nonEmpty = new Set()
  for (const rel of files) {
    for (let dir = path.posix.dirname(rel); dir !== '.'; dir = path.posix.dirname(dir)) nonEmpty.add(dir)
  }
  const emptyDirs = next.dirs.filter(dir => !nonEmpty.has(dir)).sort()

  // The pack: the changed files at their install paths, hard-linked into a scratch folder.
  const packRoot = path.join(workDir, 'pack')
  fs.rmSync(packRoot, { recursive: true, force: true })
  for (const rel of changed) {
    const target = path.join(packRoot, rel)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    try {
      fs.linkSync(next.files.get(rel), target)
    } catch {
      fs.copyFileSync(next.files.get(rel), target)
    }
  }
  for (const dir of emptyDirs) fs.mkdirSync(path.join(packRoot, dir), { recursive: true })
  fs.mkdirSync(packRoot, { recursive: true })

  const base = deltaBaseName(product, from, to, arch)
  const packFile = path.join(outDir, `${base}.tar.gz`)
  fs.mkdirSync(outDir, { recursive: true })
  await run(tar, ['-czf', packFile, '-C', packRoot, '.'])
  fs.rmSync(packRoot, { recursive: true, force: true })

  const plan = {
    format: DELTA_FORMAT,
    product,
    from,
    to,
    arch,
    pack: { name: path.basename(packFile), size: fs.statSync(packFile).size, sha256: await sha256File(packFile) },
    changedBytes,
    files,
    changed,
    deleted,
    emptyDirs
  }
  fs.writeFileSync(path.join(outDir, `${base}.json`), JSON.stringify(plan))
  return plan
}

/** The plan fields the app relies on, checked before anything is written. */
export function validatePlan(plan, { product, from, to, arch }) {
  const ok =
    plan &&
    plan.format === DELTA_FORMAT &&
    plan.product === product &&
    plan.from === from &&
    plan.to === to &&
    plan.arch === arch &&
    Array.isArray(plan.files) &&
    Array.isArray(plan.changed) &&
    Array.isArray(plan.deleted) &&
    Array.isArray(plan.emptyDirs) &&
    typeof plan.pack?.sha256 === 'string' &&
    typeof plan.pack?.size === 'number'
  if (!ok) {
    throw new Error('delta plan does not match this install')
  }
  const unsafe = [...plan.files, ...plan.emptyDirs].find(rel => rel.startsWith('/') || rel.split('/').includes('..') || rel.includes('\\') || rel.includes(':'))
  if (unsafe) {
    throw new Error(`delta plan has an unsafe path: ${unsafe}`)
  }
}

async function linkOrCopy(source, target) {
  try {
    await fs.promises.link(source, target)
    return 'link'
  } catch {
    await fs.promises.copyFile(source, target)
    return 'copy'
  }
}

/**
 * App side: builds stagingDir, the install as the new version will have it, from installDir and
 * the downloaded pack. The running app is untouched (hard links, new folder). Throws if anything
 * the new version needs is missing; the caller then falls back to the full setup.exe.
 */
export async function stageDelta({ installDir, stagingDir, plan, packFile, tar = 'tar', log = () => {} }) {
  const started = Date.now()
  await fs.promises.rm(stagingDir, { recursive: true, force: true })
  await fs.promises.mkdir(stagingDir, { recursive: true })

  const newFiles = new Set(plan.files)
  const changed = new Set(plan.changed)
  const deleted = new Set(plan.deleted)
  const installed = (await listTree(installDir)).files
  const keep = []
  for (const rel of installed.keys()) {
    if (changed.has(rel) || deleted.has(rel)) continue
    // In the payload only the new version's files survive, as with a full install.
    if (rel.startsWith(PAYLOAD_PREFIX) && !newFiles.has(rel)) continue
    keep.push(rel)
  }
  const missing = plan.files.filter(rel => !changed.has(rel) && !installed.has(rel))
  if (missing.length) {
    throw new Error(`the install lacks ${missing.length} file(s) the delta expects, e.g. ${missing[0]}`)
  }

  const made = new Set()
  const counts = { link: 0, copy: 0 }
  await mapLimit(keep, 32, async rel => {
    const target = path.join(stagingDir, rel)
    const dir = path.dirname(target)
    if (!made.has(dir)) {
      await fs.promises.mkdir(dir, { recursive: true })
      made.add(dir)
    }
    counts[await linkOrCopy(installed.get(rel), target)]++
  })
  const linked = Date.now()

  await run(tar, ['-xzf', packFile, '-C', stagingDir])
  const absent = plan.changed.find(rel => !fs.existsSync(path.join(stagingDir, rel)))
  if (absent) {
    throw new Error(`the delta pack lacks ${absent}`)
  }
  for (const dir of plan.emptyDirs) await fs.promises.mkdir(path.join(stagingDir, dir), { recursive: true })

  log(
    `[delta] staged ${plan.to}: ${counts.link} linked, ${counts.copy} copied, ${plan.changed.length} from the pack ` +
      `(${Math.round((linked - started) / 1000)} s + ${Math.round((Date.now() - linked) / 1000)} s)`
  )
  return { linked: counts.link, copied: counts.copy, fromPack: plan.changed.length }
}
