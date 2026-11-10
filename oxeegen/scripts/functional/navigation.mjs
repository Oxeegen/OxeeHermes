// Navigation sweep: every route and every Settings section and subpage of the Oxee Hermes desktop,
// found by walking the UI rather than listed by hand, so new upstream screens are covered too.
// Each screen must render (no crash overlay, no uncaught error, no error-boundary log), show
// content, and carry no upstream product name. A screenshot of every screen lands in the out dir.
// Run through oxeegen/scripts/functional/run.sh; returns false when a screen fails.
const ROUTES = [
  '#/',
  '#/capabilities?tab=skills',
  '#/capabilities?tab=plugins',
  '#/capabilities?tab=connectors',
  '#/capabilities?tab=tools',
  '#/messaging',
  '#/webhooks',
  '#/artifacts',
  '#/cron',
  '#/kanban',
  '#/profiles',
  '#/agents',
  '#/command-center',
  '#/session-import'
]

// Third-party catalog text (Nous plugin and skill feeds) legitimately names Hermes and Nous.
const CATALOG_SCREENS = /capabilities/

// "Oxee Hermes" is ours; a bare "Hermes" word (not part of a path, flag or identifier) or a
// Nous product name is an upstream string that escaped the rebrand.
function brandingLeaks(text) {
  const stripped = text.replace(/Oxee Hermes/g, '')
  const leaks = []
  const bare = stripped.match(/(^|[^\w./@-])Hermes(?![\w./-])[^\n]{0,40}/)
  if (bare) leaks.push(`"Hermes${bare[0].split('Hermes')[1]}"`)
  const nous = stripped.match(/Nous (Portal|Research|Subscription)[^\n]{0,30}/)
  if (nous) leaks.push(`"${nous[0]}"`)
  return leaks
}

export default async ({ page, shot, settle }) => {
  const failures = []
  let errors = []
  page.on('pageerror', error => errors.push(`pageerror: ${String(error.message).split('\n')[0]}`))
  page.on('console', message => {
    if (message.type() === 'error' && /error-boundary|Uncaught|Unhandled/.test(message.text())) {
      errors.push(`console: ${message.text().split('\n')[0].slice(0, 200)}`)
    }
  })

  const crashed = () => page.evaluate(() => Boolean(document.querySelector('[class*="z-(--z-crash)"]')))
  let shots = 0

  const check = async (name, { catalog = false } = {}) => {
    await settle(1800)
    const problems = []
    if (await crashed()) problems.push('crash overlay on screen')
    const text = await page.evaluate(() => document.body.innerText)
    if (text.trim().length < 40) problems.push('blank screen')
    if (!catalog) problems.push(...brandingLeaks(text).map(leak => `upstream name ${leak}`))
    problems.push(...errors)
    errors = []
    await shot(`nav-${String(++shots).padStart(3, '0')}-${name.replace(/[^\w]+/g, '-').slice(0, 60)}`)
    if (problems.length) {
      failures.push(`${name}: ${problems.join('; ')}`)
      // A crash overlay hides the app: reset it so the sweep goes on.
      if (await crashed()) await page.reload().then(() => settle(8000))
    }
  }

  await page.getByRole('button', { name: /^(Show sidebar|Afficher la barre latérale)$/ }).click({ timeout: 2000 }).catch(() => undefined)

  for (const route of ROUTES) {
    await page.evaluate(hash => { location.hash = hash }, route)
    await check(`route ${route}`, { catalog: CATALOG_SCREENS.test(route) })
    await page.keyboard.press('Escape').catch(() => undefined)
  }

  // A stored session and Bot Mode.
  await page.evaluate(() => { location.hash = '#/' })
  await settle(1000)
  await page.getByRole('tab', { name: /^SESSIONS$/i }).first().click().catch(() => undefined)
  await page.getByRole('tab', { name: /^BOTS$/i }).first().click().catch(() => undefined)
  await check('Bot Mode')
  await page.getByRole('tab', { name: /^SESSIONS$/i }).first().click().catch(() => undefined)

  // Settings: walk the left column of the dialog, opening every section and every subpage it reveals.
  await page.getByRole('button', { name: /^(Open settings|Ouvrir les paramètres)$/ }).first().click()
  await settle(1500)
  // Each entry of the settings nav (aside[data-tour="overlay-nav"]); opening a section reveals its
  // subpages there, which the loop then visits too. Keyed by data-tour when present, else by label.
  const navEntries = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('aside[data-tour="overlay-nav"] button')]
        .filter(b => b.innerText.trim() && b.getBoundingClientRect().width > 0)
        .map(b => ({ key: b.getAttribute('data-tour') || b.innerText.trim(), label: b.innerText.trim().split('\n')[0] }))
    )

  const visited = new Set()
  for (let pass = 0; pass < 200; pass++) {
    const next = (await navEntries()).find(entry => !visited.has(entry.key))
    if (!next) break
    visited.add(next.key)
    const nav = page.locator('aside[data-tour="overlay-nav"] button')
    const button = next.key.startsWith('nav-') ? page.locator(`aside[data-tour="overlay-nav"] button[data-tour="${next.key}"]`) : nav.filter({ hasText: next.label }).first()
    await button.first().click().catch(() => undefined)
    await check(`settings › ${next.label}`)
  }
  if (visited.size < 15) failures.push(`settings: only ${visited.size} entries found in the left column`)
  await page.keyboard.press('Escape')

  console.log(`\n=== NAVIGATION: ${shots} screens, ${visited.size} settings entries ===`)
  for (const failure of failures) console.log(`FAIL  ${failure}`)
  if (!failures.length) console.log('PASS  every screen renders, with no crash, error or upstream name')

  return failures.length === 0
}
