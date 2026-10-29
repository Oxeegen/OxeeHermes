// First launch on a home with nothing configured: the Oxeegen region and key form opens, never a
// model call (upstream's first-run chat failed there with "The AI service rejected your sign-in").
// Run through oxeegen/scripts/functional/run.sh; returns false when a check fails.
export default async ({ page, shot }) => {
  const body = () => page.evaluate(() => document.body.innerText)
  let ok = true

  try {
    await page.getByText('Connect to Oxeegen', { exact: true }).first().waitFor({ timeout: 240_000 })
    await page.waitForTimeout(15_000)
    const text = await body()
    const problems = [
      [!(await page.getByText('Server region', { exact: true }).first().isVisible()), 'no region choice'],
      [!(await page.getByPlaceholder(/sk-/).first().isVisible()), 'no API key field'],
      [/rejected your sign-in|Switch provider|Skip setup/.test(text), 'an upstream first-run chat or its error is on screen']
    ].filter(([bad]) => bad)

    for (const [, message] of problems) {
      console.log(`FAIL  first run: ${message}`)
    }

    ok = problems.length === 0
  } catch (error) {
    console.log(`FAIL  first run: the Oxeegen form never opened (${String(error.message).split('\n')[0]})`)
    ok = false
  }

  if (ok) {
    console.log('PASS  first run opens the Oxeegen region and key form, without any model call')
  } else {
    await shot('first-run')
  }

  return ok
}
