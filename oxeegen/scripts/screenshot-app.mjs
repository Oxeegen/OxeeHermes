// Launches the built desktop (apps/desktop/dist) against the isolated dev home
// (.dev-home, see oxeegen/README.md) and saves branding screenshots to
// oxeegen/screenshots/. Run from an activated shell:
//
//   export HERMES_HOME=$PWD/.dev-home HERMES_RUNTIME_DIR=$PWD/.dev-home/tools
//   source ./activate && node oxeegen/scripts/screenshot-app.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { _electron as electron } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DESKTOP = path.join(ROOT, 'apps/desktop')
const HOME = path.join(ROOT, '.dev-home')
const SHOTS = path.join(ROOT, 'oxeegen/screenshots')

fs.mkdirSync(SHOTS, { recursive: true })

// A provider that resolves (so the app reaches the chat surface) but is never called.
const config = path.join(HOME, 'config.yaml')

if (!fs.existsSync(config)) {
  fs.writeFileSync(config, 'model:\n  provider: custom\n  base_url: http://127.0.0.1:9/v1\n  default: oxeegen-preview\n')
}

const env = { ...process.env }
delete env.WAYLAND_DISPLAY // WSLg: Electron only finds the X11 socket

const app = await electron.launch({
  executablePath: path.join(DESKTOP, 'node_modules/electron/dist/electron'),
  args: [DESKTOP, '--no-sandbox', '--disable-gpu'],
  env: {
    ...env,
    HERMES_HOME: HOME,
    HERMES_DESKTOP_USER_DATA_DIR: path.join(HOME, 'desktop-user-data'),
    HERMES_DESKTOP_HERMES: path.join(ROOT, '.hermes/bin/hermes'),
    HERMES_DESKTOP_SKIP_PROTOCOL_REGISTRATION: '1',
    HERMES_DESKTOP_SKIP_QUIT_CONFIRM: '1'
  }
})

const page = await app.firstWindow()
const shot = name => page.screenshot({ path: path.join(SHOTS, `${name}.png`) })

try {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.waitForSelector('[data-slot="composer-root"]', { timeout: 180_000 })
  // The connecting veil sits over the shell until the backend answers.
  await page.waitForFunction(() => !document.querySelector('[class*="z-(--z-connecting)"]'), undefined, {
    timeout: 240_000
  })
  await page.waitForTimeout(3000)
  await shot('main-light')

  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForTimeout(1000)
  await shot('main-dark')
  await page.emulateMedia({ colorScheme: 'light' })

  await page.getByRole('button', { name: 'Open settings' }).click()
  await page.waitForTimeout(1500)
  await shot('settings')

  await page.getByText('About', { exact: true }).last().click()
  await page.waitForTimeout(1500)
  await shot('settings-about')

  const bare = await page.evaluate(() =>
    [...document.body.innerText.matchAll(/(?<!Oxeegen )\bHermes\b.{0,40}/g)].map(m => m[0])
  )
  console.log(bare.length ? `bare "Hermes" still visible:\n  ${bare.join('\n  ')}` : 'no bare "Hermes" visible')
} catch (error) {
  await shot('failure')
  throw error
} finally {
  await app.close()
}
