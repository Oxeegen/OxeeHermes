// Launch the built Oxee Hermes desktop of this checkout against an isolated demo home and run a
// Playwright steps module on its window:
//
//   node oxeegen/scripts/functional/launch.mjs <home> <out-dir> <steps.mjs> [--lang en|fr]
//
// The steps module exports `default async ({ page, shot, settle, home }) => {}`. The app sees the
// demo home's fake user folder as HOME and working directory, so nothing of the real account
// (or of this repository) shows up. Build the app first: `cd apps/desktop && npm run build`.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { _electron as electron } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const DESKTOP = path.join(ROOT, 'apps/desktop')
const [homeArg, outArg, stepsArg] = process.argv.slice(2)
const lang = process.argv.includes('--lang') ? process.argv[process.argv.indexOf('--lang') + 1] : 'en'

if (!homeArg || !outArg || !stepsArg) {
  console.error('usage: launch.mjs <home> <out-dir> <steps.mjs> [--lang en|fr]')
  process.exit(2)
}

const HOME = path.resolve(homeArg)
const USER = path.join(HOME, 'user/Oxeegen')
const OUT = path.resolve(outArg)
fs.mkdirSync(OUT, { recursive: true })

// npm workspaces hoist electron to the root on some upstream versions.
const executablePath = [path.join(DESKTOP, 'node_modules/electron/dist/electron'), path.join(ROOT, 'node_modules/electron/dist/electron')]
  .find(candidate => fs.existsSync(candidate))
const locale = lang === 'fr' ? 'fr_FR.UTF-8' : 'en_US.UTF-8'

const env = { ...process.env }
// WSLg: Electron must fall back to X11.
delete env.WAYLAND_DISPLAY

const app = await electron.launch({
  executablePath,
  cwd: USER,
  args: [DESKTOP, '--no-sandbox', '--disable-gpu', `--lang=${lang === 'fr' ? 'fr-FR' : 'en-US'}`],
  env: {
    ...env,
    LANG: locale,
    // The demo home may live inside a git checkout; its sessions must not report that repo.
    GIT_CEILING_DIRECTORIES: path.join(HOME, 'user'),
    HOME: USER,
    HERMES_HOME: HOME,
    HERMES_DESKTOP_USER_DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'oxee-hermes-functional-ud-')),
    HERMES_DESKTOP_HERMES: path.join(ROOT, '.hermes/bin/hermes'),
    HERMES_DESKTOP_SKIP_PROTOCOL_REGISTRATION: '1',
    HERMES_DESKTOP_SKIP_QUIT_CONFIRM: '1'
  }
})

const page = await app.firstWindow()
const shot = name => page.screenshot({ path: path.join(OUT, `${name}.png`) })
const settle = ms => page.waitForTimeout(ms)
let failed = false

try {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.waitForSelector('[data-slot="composer-root"]', { timeout: 240_000 })
  await page.waitForFunction(
    () => !document.querySelector('[class*="z-(--z-onboarding)"], [class*="z-(--z-connecting)"]'),
    undefined,
    { timeout: 240_000 }
  )
  await settle(4000)
  const steps = await import(path.resolve(stepsArg))
  failed = (await steps.default({ page, shot, settle, home: HOME })) === false
} catch (error) {
  failed = true
  await shot('failure')
  console.error(error)
  console.log(await page.evaluate(() => document.body.innerText.slice(0, 3000)))
} finally {
  await app.close()
}

process.exit(failed ? 1 : 0)
