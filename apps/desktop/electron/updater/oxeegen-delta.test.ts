import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { buildDelta, type DeltaPlan, listTree, stageDelta, STAGING_SUFFIX, validatePlan } from './oxeegen-delta.mjs'

const identity = { product: 'OxeeHermesBundled', from: '1.0.0', to: '1.1.0', arch: 'x64' }
let scratch = ''

afterEach((): void => {
  if (scratch) {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
})

function writeTree(root: string, files: Record<string, string>): void {
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
    fs.writeFileSync(path.join(root, rel), content)
  }
}

async function readTree(root: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {}

  for (const [rel, file] of (await listTree(root)).files) {
    out[rel] = fs.readFileSync(file, 'utf8')
  }

  return out
}

const previousRelease = {
  'Oxee Hermes.exe': 'exe 1.0',
  'resources/app.asar': 'asar 1.0',
  'resources/agent-payload/manifest.json': 'manifest 1.0',
  'resources/agent-payload/venv/lib/same.py': 'unchanged library',
  'resources/agent-payload/hermes-agent/gone.py': 'removed in 1.1',
  'resources/agent-payload/tools/facts.json': 'facts 1.0'
}

const nextRelease = {
  'Oxee Hermes.exe': 'exe 1.0',
  'resources/app.asar': 'asar 1.1',
  'resources/agent-payload/manifest.json': 'manifest 1.1',
  'resources/agent-payload/venv/lib/same.py': 'unchanged library',
  'resources/agent-payload/hermes-agent/new.py': 'added in 1.1',
  'resources/agent-payload/tools/facts.json': 'facts 1.0'
}

async function setup(): Promise<{ installDir: string; stagingDir: string; plan: DeltaPlan; packFile: string }> {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'oxee-delta-'))
  const previousRoot = path.join(scratch, 'previous')
  const newRoot = path.join(scratch, 'new')
  writeTree(previousRoot, previousRelease)
  writeTree(newRoot, nextRelease)
  fs.mkdirSync(path.join(newRoot, 'resources/agent-payload/venv/empty'), { recursive: true })
  const outDir = path.join(scratch, 'out')
  const plan = await buildDelta({ ...identity, previousRoot, newRoot, outDir, workDir: path.join(scratch, 'work') })

  // The machine: the previous release as installed, then lived in.
  const installDir = path.join(scratch, 'Programs', 'Oxee Hermes')
  writeTree(installDir, {
    ...previousRelease,
    'Uninstall Oxee Hermes.exe': 'uninstaller',
    'cli/oxee-hermes.cmd': 'shim',
    'resources/agent-payload/venv/lib/__pycache__/same.cpython-312.pyc': 'runtime cache',
    'resources/agent-payload/tools/facts.json': 'facts refreshed at runtime'
  })

  return { installDir, stagingDir: installDir + STAGING_SUFFIX, plan, packFile: path.join(outDir, plan.pack.name) }
}

describe('Oxee Hermes delta update', () => {
  it('ships only what changed between the two releases', async () => {
    const { plan } = await setup()

    expect(plan.changed).toEqual(['resources/agent-payload/hermes-agent/new.py', 'resources/agent-payload/manifest.json', 'resources/app.asar'])
    expect(plan.deleted).toEqual(['resources/agent-payload/hermes-agent/gone.py'])
    expect(plan.emptyDirs).toEqual(['resources/agent-payload/venv/empty'])
  })

  it('prepares the tree a full install would leave, without touching the running install', async () => {
    const { installDir, stagingDir, plan, packFile } = await setup()
    const before = await readTree(installDir)

    const result = await stageDelta({ installDir, stagingDir, plan, packFile })

    expect(await readTree(stagingDir)).toEqual({
      ...nextRelease,
      // What the installer adds outside the payload stays.
      'Uninstall Oxee Hermes.exe': 'uninstaller',
      'cli/oxee-hermes.cmd': 'shim',
      // An unchanged file keeps the state the app gave it; the runtime cache is dropped.
      'resources/agent-payload/tools/facts.json': 'facts refreshed at runtime'
    })
    expect(fs.existsSync(path.join(stagingDir, 'resources/agent-payload/venv/empty'))).toBe(true)
    expect(await readTree(installDir)).toEqual(before)
    // Unchanged files are hard links, not copies.
    expect(fs.statSync(path.join(stagingDir, 'resources/agent-payload/venv/lib/same.py')).ino).toBe(
      fs.statSync(path.join(installDir, 'resources/agent-payload/venv/lib/same.py')).ino
    )
    expect(result).toEqual({ linked: 5, copied: 0, fromPack: 3 })
  })

  it('refuses an install that lacks a file the delta does not carry', async () => {
    const { installDir, stagingDir, plan, packFile } = await setup()
    fs.rmSync(path.join(installDir, 'resources/agent-payload/venv/lib/same.py'))

    await expect(stageDelta({ installDir, stagingDir, plan, packFile })).rejects.toThrow(/lacks 1 file/)
  })

  it('accepts only a plan for this product, version pair and architecture, with safe paths', async () => {
    const { plan } = await setup()

    expect(() => validatePlan(plan, identity)).not.toThrow()
    expect(() => validatePlan(plan, { ...identity, from: '0.9.0' })).toThrow(/does not match/)
    expect(() => validatePlan({ ...plan, files: ['../outside.txt'] }, identity)).toThrow(/unsafe path/)
  })
})
