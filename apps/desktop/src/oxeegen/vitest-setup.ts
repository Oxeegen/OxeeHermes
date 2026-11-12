/**
 * Upstream tests import the locale catalogs directly (`import { en } from
 * '@/i18n/en'`) to build their expectations, while the app renders those
 * catalogs through the Oxeegen rewrite (see ./rebrand.ts). Serve the tests the
 * same rewritten catalogs so expectations match what users see. Mocks declared
 * in a setup file apply to every test file of the project.
 */
import { vi } from 'vitest'

import type * as Library from './library'
import { rebrandTranslations } from './rebrand'

const rebranded = async (load: () => Promise<Record<string, unknown>>) => rebrandTranslations(await load())

vi.mock('@/i18n/en', async importOriginal => rebranded(importOriginal))
vi.mock('@/i18n/zh', async importOriginal => rebranded(importOriginal))
vi.mock('@/i18n/zh-hant', async importOriginal => rebranded(importOriginal))
vi.mock('@/i18n/ja', async importOriginal => rebranded(importOriginal))
vi.mock('@/i18n/ar', async importOriginal => rebranded(importOriginal))
vi.mock('@/i18n/ru', async importOriginal => rebranded(importOriginal))
vi.mock('@/i18n/fr', async importOriginal => rebranded(importOriginal))
vi.mock('@/i18n/de', async importOriginal => rebranded(importOriginal))
vi.mock('@/i18n/es', async importOriginal => rebranded(importOriginal))

// Upstream update tests drive applyUpdates() end to end with no one to answer the Oxeegen
// "install and restart?" question; they get a yes. update-confirm.test.ts covers the dialog.
vi.mock('@/oxeegen/update-confirm', () => ({ confirmUpdateRestart: async () => true }))

// Upstream tests must not read the live Oxeegen library from GitHub, from the catalogs or from
// the startup check: whatever it holds would join their lists. They get an empty library, never
// read; library*.test.ts* cover it.
vi.mock('@/oxeegen/library', async importOriginal => ({
  ...(await importOriginal<typeof Library>()),
  useLibraryEntries: () => [],
  startLibraryRefresh: () => {}
}))
