import os from 'node:os'
import path from 'node:path'

import { app, net } from 'electron'

import { DeltaClient } from './oxeegen-delta-client'

/** The delta client of a packaged Windows app; null elsewhere (dev runs, macOS). */
export function createDeltaClient(feedBaseUrl: string, log: (message: string) => void): DeltaClient | null {
  if (!app.isPackaged || process.platform !== 'win32') {
    return null
  }

  return new DeltaClient({
    installDir: path.dirname(process.execPath),
    exeName: path.basename(process.execPath),
    resourcesPath: process.resourcesPath,
    userData: app.getPath('userData'),
    tempDir: os.tmpdir(),
    appVersion: app.getVersion(),
    feedBaseUrl,
    pid: process.pid,
    fetch: (url: string): Promise<Response> => net.fetch(url),
    log,
    quit: (): void => app.quit()
  })
}
