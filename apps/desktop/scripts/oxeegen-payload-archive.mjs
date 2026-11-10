/**
 * Oxee Hermes setup.exe: ship the agent payload as ONE tar file instead of ~38,000 files.
 *
 * NSIS writes the files of its app archive one by one, and the update path first moves every
 * file of the old install aside: with Windows Defender scanning each write, an update took about
 * 19 minutes. Windows' own tar.exe extracts the same payload in about 20 seconds, so the setup
 * carries resources\agent-payload.tar and packaging/oxeegen-installer.nsh extracts it in place at
 * install time (and removes the old payload in one native call at uninstall/update time).
 *
 * Runs at the very end of afterPack (after PE sanitizing, signing and the payload digest rehash),
 * for the setup.exe only: the MSIX and macOS packages keep the plain folder.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

export const PAYLOAD_ARCHIVE = 'agent-payload.tar'

/** Windows' bsdtar (System32), present since Windows 10 1803: the same tool that extracts it. */
function windowsTar() {
  const root = process.env.SystemRoot || process.env.windir || 'C:\\Windows'
  const tar = path.join(root, 'System32', 'tar.exe')
  if (!fs.existsSync(tar)) {
    throw new Error(`[payload-archive] ${tar} not found: the setup.exe payload archive needs Windows tar`)
  }
  return tar
}

/** Replace resources/agent-payload with resources/agent-payload.tar. Returns the archive path, or null. */
export function archivePayloadForSetup(resources, env = process.env) {
  const payload = path.join(resources, 'agent-payload')
  if (env.HERMES_DESKTOP_PACKAGE !== 'nsis' || !fs.existsSync(payload)) {
    return null
  }
  const archive = path.join(resources, PAYLOAD_ARCHIVE)
  fs.rmSync(archive, { force: true })
  const started = Date.now()
  const result = spawnSync(windowsTar(), ['-cf', archive, '-C', resources, 'agent-payload'], { stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`[payload-archive] tar failed (${result.status ?? result.error})`)
  }
  fs.rmSync(payload, { recursive: true, force: true })
  const mb = Math.round(fs.statSync(archive).size / 1048576)
  console.log(`[payload-archive] agent-payload -> ${PAYLOAD_ARCHIVE} (${mb} MB) in ${Math.round((Date.now() - started) / 1000)} s`)
  return archive
}
