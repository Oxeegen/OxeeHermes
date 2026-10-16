/**
 * Oxeegen branding check: boots the real app (mock inference) and the
 * no-provider onboarding, asserts no visible copy still says the bare
 * upstream product name, and saves screenshots to oxeegen/screenshots/ for
 * review.
 *
 *   npm exec playwright test e2e/oxeegen-branding.spec.ts --reporter=list
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Page } from '@playwright/test'

import { setupMockBackend, setupNoProvider, waitForAppReady, waitForOnboarding } from './fixtures'
import { expect, test } from './test'

const SHOTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../oxeegen/screenshots')

/** Visible text that still carries the upstream name without the Oxeegen prefix. */
async function bareProductNames(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const text = document.body.innerText

    return [...text.matchAll(/(?<!Oxeegen )\bHermes\b.{0,40}/g)].map(m => m[0])
  })
}

test.describe('Oxeegen branding', () => {
  // A cold backend boot alone can take most of the default 90 s.
  test.setTimeout(300_000)

  test('main window after boot', async () => {
    const fixture = await setupMockBackend()

    try {
      await waitForAppReady(fixture, 120_000)
      await fixture.page.waitForTimeout(1500)
      await fixture.page.screenshot({ path: path.join(SHOTS, 'main-light.png') })

      await fixture.page.emulateMedia({ colorScheme: 'dark' })
      await fixture.page.waitForTimeout(800)
      await fixture.page.screenshot({ path: path.join(SHOTS, 'main-system-dark.png') })

      expect(await bareProductNames(fixture.page)).toEqual([])
      expect(await fixture.page.title()).toContain('Oxee Desktop')
    } finally {
      await fixture.cleanup()
    }
  })

  test('onboarding without a provider', async () => {
    const fixture = await setupNoProvider()

    try {
      await waitForOnboarding(fixture.page, 120_000)
      await fixture.page.waitForTimeout(1500)
      await fixture.page.screenshot({ path: path.join(SHOTS, 'onboarding.png') })

      expect(await bareProductNames(fixture.page)).toEqual([])
    } finally {
      await fixture.cleanup()
    }
  })
})
