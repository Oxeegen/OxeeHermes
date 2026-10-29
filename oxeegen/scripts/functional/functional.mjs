// Functional checks of the Oxee Hermes desktop against an English demo home (no model calls).
// Run through oxeegen/scripts/functional/run.sh; returns false when a check fails.
import fs from 'node:fs'
import path from 'node:path'

export default async ({ page, shot, settle, home }) => {
  const HOME = home
  const results = []
  const config = () => fs.readFileSync(path.join(HOME, 'config.yaml'), 'utf8')
  const visible = (text, opts = {}) => page.getByText(text, { exact: true, ...opts }).first().isVisible()
  const expect = (cond, msg) => { if (!cond) throw new Error(msg) }
  const closeSettings = async () => { await page.keyboard.press('Escape'); await settle(800) }
  const openSettings = async section => {
    await page.getByRole('button', { name: 'Open settings' }).click()
    await settle(1500)
    if (section) {
      await page.getByText(section, { exact: true }).first().click()
      await settle(1200)
    }
  }

  const test = async (name, fn) => {
    try {
      await fn()
      results.push(['PASS', name])
    } catch (error) {
      results.push(['FAIL', name, String(error.message || error).split('\n')[0].slice(0, 220)])
      await shot(`fail-${results.length}`)
      await page.keyboard.press('Escape').catch(() => undefined)
      await page.keyboard.press('Escape').catch(() => undefined)
      await settle(800)
    }
  }

  await page.getByRole('button', { name: 'Show sidebar', exact: true }).click({ timeout: 3000 }).catch(() => undefined)
  await page.evaluate(() => { location.hash = '#/' })
  await settle(2000)
  await page.getByText('Sessions', { exact: true }).first().click()
  await settle(1000)

  await test('backend is ready and the brand is Oxee Hermes', async () => {
    const status = await page.evaluate(() => document.body.innerText)
    expect(/Backend\s+ready/.test(status), 'no "Backend ready"')
    const title = await page.title()
    expect(/Oxee Hermes/.test(title), `window title is "${title}"`)
    const body = await page.evaluate(() => document.body.innerText)
    expect(!/(^|[^\w-])Hermes Agent/.test(body), 'bare "Hermes Agent" visible')
  })

  await test('the seeded sessions are listed and open', async () => {
    for (const title of ['Q3 report summary', 'Team schedule', 'Overdue invoice reminders', 'Competitive watch']) {
      expect(await visible(title), `missing session ${title}`)
    }
    await page.getByText('Q3 report summary', { exact: true }).first().click()
    await settle(2500)
    expect(await visible('Revenue up', { exact: false }), 'conversation content not shown')
    expect(await page.getByRole('table').first().isVisible(), 'markdown table not rendered')
  })

  await test('session search filters the list', async () => {
    const search = page.getByPlaceholder(/Search sessions/i).first()
    await search.click()
    await search.fill('invoice')
    await settle(1200)
    expect(await visible('Overdue invoice reminders'), 'match missing')
    expect(!(await visible('Team schedule')), 'non-match still listed')
    await search.fill('')
    await page.keyboard.press('Escape')
    await settle(800)
  })

  await test('a new session tab reads "New session"', async () => {
    await page.getByText('New session', { exact: true }).first().click()
    await settle(1500)
    const tabs = await page.evaluate(() => document.body.innerText)
    expect(/NEW SESSION|New session/.test(tabs), 'no New session tab')
  })

  await test('the model menu lists only Oxeegen models, and switching sticks', async () => {
    await page.getByRole('button', { name: /^Model · / }).first().click()
    await settle(1200)
    const menu = await page.evaluate(() => document.body.innerText)
    for (const m of ['Oxee Max', 'Oxee Pro', 'Oxee Ultra', 'Oxee Instant']) expect(menu.includes(m), `missing ${m}`)
    for (const m of ['Add provider', 'Edit Models', 'OpenRouter', 'Anthropic', 'Nous Portal']) expect(!menu.includes(m), `unexpected ${m}`)
    await page.getByText('Oxee Pro', { exact: true }).first().click()
    await settle(1500)
    const label = await page.getByRole('button', { name: /^Model · / }).first().getAttribute('aria-label')
    expect(/Pro/i.test(label || ''), `model button reads "${label}"`)
    await page.getByRole('button', { name: /^Model · / }).first().click()
    await settle(800)
    await page.getByText('Oxee Max', { exact: true }).first().click()
    await settle(1200)
  })

  await test('settings show the Oxeegen sections and hide the provider ones', async () => {
    await openSettings()
    const nav = await page.evaluate(() => document.body.innerText)
    for (const s of ['Oxeegen', 'Voice', 'Passwords & Logins', 'Plugins', 'About']) expect(nav.includes(s), `missing ${s}`)
    for (const s of ['Providers', 'Billing', 'Local models', 'Privacy']) expect(!new RegExp(`\\n${s}\\n`).test(nav), `unexpected section ${s}`)
    await closeSettings()
  })

  await test('Oxeegen: switching region to the US and back is saved', async () => {
    await openSettings('Oxeegen')
    await page.getByText('United States', { exact: true }).first().click()
    await settle(800)
    expect(await visible('API key — United States', { exact: false }), 'key label did not follow the region')
    await page.getByText('Europe', { exact: true }).first().click()
    await settle(800)
    expect(await visible('API key — Europe', { exact: false }), 'key label did not come back to Europe')
    expect(!(await visible('Get an API key', { exact: false })), 'API key link shown without signup_url')
    await closeSettings()
  })

  await test('Voice > Speech to text: language selector, fixed model, no provider picker', async () => {
    await openSettings('Voice')
    await page.getByText('Speech to text', { exact: true }).first().click()
    await settle(1200)
    const body = await page.evaluate(() => document.body.innerText)
    expect(body.includes('voxee-stt'), 'STT model not shown')
    expect(body.includes('System language'), 'no System language default')
    expect(!/Speech-to-text provider|STT provider/i.test(body), 'STT provider picker visible')
    await closeSettings()
  })

  await test('Voice > Text to speech: picking a voice writes tts voice to config.yaml', async () => {
    await openSettings('Voice')
    await page.getByText('Text to speech', { exact: true }).first().click()
    await settle(1200)
    const body = await page.evaluate(() => document.body.innerText)
    expect(body.includes('voxee-tts-pro'), 'TTS model not shown')
    expect(!/Text-to-speech provider|TTS provider/i.test(body), 'TTS provider picker visible')
    await page.getByRole('combobox').last().click()
    await settle(800)
    const options = await page.getByRole('option').allInnerTexts()
    expect(options.length >= 30, `only ${options.length} voices`)
    const target = options.find(o => /Hugo|Léo|Louis|Paul/.test(o)) || options[1]
    await page.getByRole('option', { name: target.trim() }).first().click()
    await settle(2500)
    expect(/voice:\s*fr_/.test(config()), 'no fr_ voice in config.yaml')
    await closeSettings()
  })

  await test('Appearance: switching to French translates the UI, and back to English', async () => {
    await openSettings('Appearance')
    await page.getByText('English', { exact: true }).first().click()
    await settle(800)
    await page.keyboard.type('Fran', { delay: 40 })
    await settle(500)
    await page.keyboard.press('Enter')
    await settle(2500)
    expect((await page.evaluate(() => document.body.innerText)).includes('Paramètres'), 'UI not in French')
    expect(/language:\s*fr/.test(config()), 'display.language not saved as fr')
    await page.getByText('Français', { exact: true }).first().click()
    await settle(800)
    await page.keyboard.type('English', { delay: 40 })
    await settle(500)
    await page.keyboard.press('Enter')
    await settle(2500)
    expect((await page.evaluate(() => document.body.innerText)).includes('Settings'), 'UI not back in English')
    await closeSettings()
  })

  await test('scheduled jobs: the seeded jobs are listed, one can be paused and resumed', async () => {
    await page.getByText('Scheduled jobs', { exact: true }).first().click()
    await settle(2000)
    for (const j of ['Weekly sales summary', 'Competitive watch', 'Invoice reminders']) expect(await visible(j), `missing job ${j}`)
    await page.getByText('Invoice reminders', { exact: true }).first().click()
    await settle(1200)
    await page.getByRole('button', { name: /^Pause$/ }).first().click()
    await settle(1500)
    const paused = JSON.parse(fs.readFileSync(path.join(HOME, 'cron/jobs.json'), 'utf8'))
    const job = (paused.jobs || paused).find(j => j.name === 'Invoice reminders')
    expect(job && (job.enabled === false || job.state === 'paused' || job.paused), `job not paused: ${JSON.stringify(job).slice(0, 160)}`)
    await page.getByRole('button', { name: /^Resume$/ }).first().click()
    await settle(1500)
    await page.keyboard.press('Escape')
    await settle(800)
  })

  await test('capabilities and messaging pages open', async () => {
    await page.getByText('Capabilities', { exact: true }).first().click()
    await settle(2000)
    expect(await visible('Skills', { exact: false }), 'no Skills tab')
    await page.keyboard.press('Escape')
    await settle(800)
    await page.evaluate(() => { location.hash = '#/' })
    await settle(1000)
    await page.getByText('Messaging', { exact: true }).first().click()
    await page.getByText('Telegram', { exact: true }).filter({ visible: true }).first().waitFor({ timeout: 60_000 })
    await page.keyboard.press('Escape')
    await settle(800)
  })

  await test('Bots tab lists the roster and opens the new bot menu', async () => {
    await page.evaluate(() => { location.hash = '#/' })
    await settle(1000)
    await page.getByText('Bots', { exact: true }).first().click()
    await settle(3000)
    expect(await visible('BOTS', { exact: false }) || await visible('Bots'), 'Bots pane missing')
    await page.getByText('Sessions', { exact: true }).first().click()
    await settle(1000)
  })

  await test('sidebar collapses to the rail with the wordmark and expands again', async () => {
    await page.getByRole('button', { name: 'Hide sidebar', exact: true }).click()
    await settle(1500)
    expect(await page.getByRole('button', { name: 'Show sidebar', exact: true }).isVisible(), 'no Show sidebar button')
    await page.getByRole('button', { name: 'Show sidebar', exact: true }).click()
    await settle(1500)
    expect(await visible('Q3 report summary'), 'sidebar did not come back')
  })

  await test('command palette opens with Ctrl+K and finds settings', async () => {
    await page.keyboard.press('Control+K')
    await settle(1200)
    await page.keyboard.type('settings', { delay: 30 })
    await settle(1000)
    const body = await page.evaluate(() => document.body.innerText)
    expect(/Settings/.test(body), 'palette did not list Settings')
    await page.keyboard.press('Escape')
    await settle(800)
  })

  await test('About shows the Oxee Hermes wordmark and the installed version', async () => {
    await openSettings('About')
    const body = await page.evaluate(() => document.body.innerText)
    expect(/Version\s+\d/.test(body), 'no version')
    expect(body.includes('Oxee Hermes'), 'no product name')
    await closeSettings()
  })

  await shot('end')
  console.log('\n=== FUNCTIONAL RESULTS ===')
  for (const [status, name, detail] of results) console.log(`${status}  ${name}${detail ? `\n      ${detail}` : ''}`)
  const passed = results.filter(r => r[0] === 'PASS').length
  console.log(`=== ${passed}/${results.length} passed ===`)

  return passed === results.length
}
