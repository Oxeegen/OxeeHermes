// Launches the built desktop (apps/desktop/dist) against the isolated dev home
// (.dev-home, see oxeegen/README.md) and saves screenshots to
// oxeegen/screenshots/: Oxeegen onboarding, main window (light/dark), a new
// browser tab, Settings. Run from an activated shell:
//
//   export HERMES_HOME=$PWD/.dev-home HERMES_RUNTIME_DIR=$PWD/.dev-home/tools
//   source ./activate && node oxeegen/scripts/screenshot-app.mjs
//
// Each run starts from a fresh desktop profile and a .env without Oxeegen
// keys, so the onboarding shows; it then saves a placeholder key.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { _electron as electron } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DESKTOP = path.join(ROOT, 'apps/desktop')
const HOME = path.join(ROOT, '.dev-home')
const SHOTS = path.join(ROOT, 'oxeegen/screenshots')

fs.mkdirSync(SHOTS, { recursive: true })

const envFile = path.join(HOME, '.env')

if (fs.existsSync(envFile)) {
  const kept = fs
    .readFileSync(envFile, 'utf8')
    .split('\n')
    .filter(line => !/^OXEEGEN_/.test(line))
  fs.writeFileSync(envFile, kept.join('\n'))
}

const env = { ...process.env }
delete env.WAYLAND_DISPLAY // WSLg: Electron only finds the X11 socket

const app = await electron.launch({
  executablePath: path.join(DESKTOP, 'node_modules/electron/dist/electron'),
  args: [DESKTOP, '--no-sandbox', '--disable-gpu'],
  env: {
    ...env,
    HERMES_HOME: HOME,
    HERMES_DESKTOP_USER_DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'oxeegen-ud-')),
    HERMES_DESKTOP_HERMES: path.join(ROOT, '.hermes/bin/hermes'),
    HERMES_DESKTOP_SKIP_PROTOCOL_REGISTRATION: '1',
    HERMES_DESKTOP_SKIP_QUIT_CONFIRM: '1'
  }
})

const page = await app.firstWindow()
const shot = name => page.screenshot({ path: path.join(SHOTS, `${name}.png`) })
const settle = ms => page.waitForTimeout(ms)
const step = label => console.log(`[screens] ${label}`)

const visibleBareNames = () =>
  page.evaluate(() => [...document.body.innerText.matchAll(/(?<!Oxeegen )\bHermes\b.{0,40}/g)].map(m => m[0]))

try {
  await page.setViewportSize({ width: 1280, height: 800 })

  // Onboarding: region + key. A gateway still running from a previous run keeps
  // the key in memory and the app skips straight to the chat.
  // The composer mounts under the onboarding overlay, so "ready" means composer
  // AND no onboarding / connecting veil.
  const onboarding = page.getByText(/Connect to Oxeegen|Connexion à Oxeegen/)
  await page.waitForFunction(
    () =>
      /Connect to Oxeegen|Connexion à Oxeegen/.test(document.body.innerText) ||
      (document.querySelector('[data-slot="composer-root"]') &&
        !document.querySelector('[class*="z-(--z-onboarding)"], [class*="z-(--z-connecting)"]')),
    undefined,
    { timeout: 240_000 }
  )

  step(`onboarding visible: ${await onboarding.isVisible()}`)

  if (await onboarding.isVisible()) {
    await settle(1500)
    // A layout restored with a browser pane raises its first-use prompt over the onboarding.
    await page.getByRole('button', { name: /^(Not now|Pas maintenant)$/ }).click({ timeout: 3000 }).catch(() => undefined)
    await shot('onboarding')
    await page.getByText(/^(United States|États-Unis)$/).first().click()
    step('region clicked')
    await page.getByPlaceholder(/sk-/).fill('sk-oxeegen-preview')
    await settle(500)
    await shot('onboarding-filled')
    const connect = page.getByRole('button', { name: /^(Connect|Se connecter)$/ })
    await page.waitForFunction(el => !el.disabled, await connect.elementHandle(), { timeout: 15_000 })
    await connect.click()
    step('connect clicked')
  }

  await page.waitForSelector('[data-slot="composer-root"]', { timeout: 240_000 })
  await page.waitForFunction(() => !document.querySelector('[class*="z-(--z-onboarding)"], [class*="z-(--z-connecting)"]'), undefined, {
    timeout: 240_000
  })
  step('main window ready')
  await settle(3000)
  await shot('main-light')

  await page.emulateMedia({ colorScheme: 'dark' })
  await settle(1000)
  await shot('main-dark')
  await page.emulateMedia({ colorScheme: 'light' })

  // File browser (Material icons). Opens only when a workspace is set.
  const showFiles = page.getByRole('button', { name: /^(Show right sidebar|Afficher la barre latérale droite|Toggle file browser|Basculer l'explorateur de fichiers)$/ })
  if (await showFiles.first().isVisible().catch(() => false)) {
    await showFiles.first().click()
    await settle(2500)
    await shot('files-light')
    await page.emulateMedia({ colorScheme: 'dark' })
    await settle(1000)
    await shot('files-dark')
    await page.emulateMedia({ colorScheme: 'light' })
  } else {
    step('no file browser toggle (no workspace?)')
  }

  // A restored layout can reopen the browser and its first-use prompt.
  await page.getByRole('button', { name: /^(Not now|Pas maintenant)$/ }).click({ timeout: 3000 }).catch(() => undefined)
  await page.getByRole('button', { name: /New browser tab|Nouvel onglet de navigateur/ }).click()
  await settle(2000)
  await shot('browser-new-tab')
  // First browser open asks about importing the browser profile.
  await page.getByRole('button', { name: /^(Not now|Pas maintenant)$/ }).click({ timeout: 5000 }).catch(() => undefined)
  await settle(800)

  await page.getByRole('button', { name: 'Open settings' }).click()
  await settle(2000)
  await shot('settings')

  const bare = await visibleBareNames()
  console.log(bare.length ? `bare "Hermes" still visible:\n  ${bare.join('\n  ')}` : 'no bare "Hermes" visible')
} catch (error) {
  await shot('failure')
  throw error
} finally {
  await app.close()
}
