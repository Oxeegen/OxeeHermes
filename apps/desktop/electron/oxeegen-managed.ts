import { existsSync } from 'node:fs'
import path from 'node:path'

/**
 * Oxee Hermes ships its policy as a managed scope (hermes_cli/managed_scope.py):
 * `oxeegen/managed/config.yaml` pins the provider, model, voice routing and the
 * provider allowlist, and the backend cannot change those keys. Point every
 * process this app spawns at it through HERMES_MANAGED_DIR.
 *
 * Candidates in order: the bundled payload's repo (shipped builds), then the
 * source checkout (dev). The first that holds a config.yaml wins. Always set,
 * even when the user's environment names another directory: a system
 * `/etc/hermes` or an official install's override must never govern this app.
 */
export function oxeegenManagedDir(roots: ReadonlyArray<null | string | undefined>): null | string {
  for (const root of roots) {
    const dir = root ? path.join(root, 'oxeegen', 'managed') : null

    if (dir && existsSync(path.join(dir, 'config.yaml'))) {
      return dir
    }
  }

  return null
}
