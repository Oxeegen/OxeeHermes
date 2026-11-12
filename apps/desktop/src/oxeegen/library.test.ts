import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  $libraryCatalog,
  LIBRARY_CATALOG_URL,
  type LibraryCatalog,
  libraryEntries,
  libraryInstalled,
  meetsMinimum,
  refreshLibraryCatalog
} from './library'

const COMMIT = 'a'.repeat(40)

const CATALOG: LibraryCatalog = {
  format: 1,
  repository: 'Oxeegen/OxeeLibrary',
  commit: COMMIT,
  items: [
    {
      id: 'weekly-sales',
      type: 'skill',
      version: '1.2.0',
      title: { en: 'Weekly sales report', fr: 'Rapport de ventes hebdomadaire' },
      description: { en: 'Builds the weekly sales summary.', fr: 'Produit la synthèse hebdomadaire des ventes.' },
      tags: ['sales'],
      keywords: { en: ['revenue'], fr: ['chiffre d’affaires'] },
      author: 'Oxeegen',
      min_app_version: null,
      path: 'skills/weekly-sales',
      image: 'assets/weekly-sales.jpg'
    },
    {
      id: 'future-skill',
      type: 'skill',
      version: '1.0.0',
      title: { en: 'Future skill', fr: 'Skill future' },
      description: { en: 'Needs a newer app.', fr: 'Demande une app plus récente.' },
      tags: [],
      keywords: {},
      author: 'Oxeegen',
      min_app_version: '9.0.0',
      path: 'skills/future-skill',
      image: ''
    }
  ]
}

afterEach(() => $libraryCatalog.set(null))

describe('the Oxeegen library in the catalogs', () => {
  it('shows each skill in the UI language, with its visual and install path at the catalog commit', () => {
    const [entry] = libraryEntries(CATALOG, 'skills', 'fr-FR', '0.8.5')

    expect(entry.name).toBe('Rapport de ventes hebdomadaire')
    expect(entry.description).toBe('Produit la synthèse hebdomadaire des ventes.')
    expect(entry.installIdentifier).toBe('Oxeegen/OxeeLibrary/skills/weekly-sales')
    expect(entry.imageUrl).toBe(`https://raw.githubusercontent.com/Oxeegen/OxeeLibrary/${COMMIT}/assets/weekly-sales.jpg`)
    expect(entry.search).toContain('revenue')
    expect(libraryEntries(CATALOG, 'skills', 'de', '0.8.5')[0].name).toBe('Weekly sales report')
    expect(libraryEntries(CATALOG, 'plugins', 'fr', '0.8.5')).toEqual([])
  })

  it('leaves out what needs a newer Oxee Hermes, except on a dev build', () => {
    expect(libraryEntries(CATALOG, 'skills', 'en', '0.8.5').map(entry => entry.identifier)).toEqual(['weekly-sales'])
    expect(libraryEntries(CATALOG, 'skills', 'en', 'git.96b59ce')).toHaveLength(2)
    expect(meetsMinimum('0.10.0', '0.9.9')).toBe(true)
    expect(meetsMinimum('0.8.4', '0.8.5')).toBe(false)
  })

  it('a library skill reads as installed once a skill of its id is', () => {
    const [entry] = libraryEntries(CATALOG, 'skills', 'en', '0.8.5')
    const installed = { ...entry, id: 'installed:weekly-sales' }

    expect(libraryInstalled(entry, new Map([['weekly-sales', installed]]))).toBe(installed)
    expect(libraryInstalled({ ...entry, source: 'GitHub' }, new Map([['weekly-sales', installed]]))).toBeUndefined()
  })

  it('reads the published catalog, and keeps the last good one when GitHub fails', async () => {
    const ok = vi.fn(async () => Response.json(CATALOG))
    await refreshLibraryCatalog(ok as unknown as typeof fetch)
    expect(ok).toHaveBeenCalledWith(LIBRARY_CATALOG_URL, expect.anything())
    expect($libraryCatalog.get()?.commit).toBe(COMMIT)

    await refreshLibraryCatalog((async () => new Response('down', { status: 503 })) as unknown as typeof fetch)
    await refreshLibraryCatalog((async () => Response.json({ format: 1, commit: 'bad', items: [] })) as unknown as typeof fetch)
    expect($libraryCatalog.get()?.commit).toBe(COMMIT)
  })
})
