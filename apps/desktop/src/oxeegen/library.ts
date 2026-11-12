/**
 * Oxee Hermes: the skills and plugins Oxeegen publishes in the Oxeegen/OxeeLibrary repository,
 * shown first in Capabilities' catalogs (library-section.tsx).
 *
 * The library's CI builds catalog.json on every merge into its main branch and keeps it on the
 * repository's `catalog` branch, read here from raw.githubusercontent.com (which, unlike a release
 * download, answers the app's cross-origin fetch). It is read when the catalogs open and every
 * REFRESH_MS after, and the last good copy is kept for offline starts. A skill installs through
 * the skills hub like any GitHub skill (`Oxeegen/OxeeLibrary/skills/<id>`): pinned to a commit,
 * scanned, tracked for updates; the backend trusts that repository (tools/skills_guard.py).
 */
import { useStore } from '@nanostores/react'
import { atom } from 'nanostores'
import { useMemo } from 'react'

import type { CatalogEntry, CatalogKind } from '@/app/capabilities/catalog/catalog-data'
import { useI18n } from '@/i18n'
import { readJson, writeJson } from '@/lib/storage'
import { $desktopVersion } from '@/store/updates'

export const LIBRARY_REPOSITORY = 'Oxeegen/OxeeLibrary'
export const LIBRARY_CATALOG_URL = `https://raw.githubusercontent.com/${LIBRARY_REPOSITORY}/catalog/catalog.json`
export const LIBRARY_SOURCE = 'Oxeegen'
const REFRESH_MS = 6 * 60 * 60 * 1000
const CACHE_KEY = 'oxeegen:library-catalog'

type Localized = Partial<Record<string, string>>

export interface LibraryItem {
  id: string
  type: 'plugin' | 'skill'
  version: string
  title: Localized
  description: Localized
  tags: string[]
  keywords: Partial<Record<string, string[]>>
  author: string
  min_app_version: null | string
  path: string
  image: string
}

export interface LibraryCatalog {
  format: number
  repository: string
  commit: string
  items: LibraryItem[]
}

const isCatalog = (value: unknown): value is LibraryCatalog =>
  typeof value === 'object' &&
  value !== null &&
  (value as LibraryCatalog).format === 1 &&
  /^[0-9a-f]{40}$/.test(String((value as LibraryCatalog).commit)) &&
  Array.isArray((value as LibraryCatalog).items)

function cachedCatalog(): LibraryCatalog | null {
  const cached = readJson<unknown>(CACHE_KEY)

  return isCatalog(cached) ? cached : null
}

export const $libraryCatalog = atom<LibraryCatalog | null>(cachedCatalog())

let timer: ReturnType<typeof setInterval> | null = null

/** Read the published catalog; a failed read keeps the last good one. */
export async function refreshLibraryCatalog(fetcher: typeof fetch = fetch): Promise<void> {
  try {
    const response = await fetcher(LIBRARY_CATALOG_URL, { cache: 'no-store', credentials: 'omit' })
    const parsed: unknown = response.ok ? await response.json() : null

    if (isCatalog(parsed)) {
      $libraryCatalog.set(parsed)
      writeJson(CACHE_KEY, parsed)
    }
  } catch {
    // Offline or GitHub unreachable: the cached catalog stays on screen.
  }
}

function startLibraryRefresh(): void {
  if (timer) {
    return
  }

  void refreshLibraryCatalog()
  timer = setInterval(() => void refreshLibraryCatalog(), REFRESH_MS)
}

const versionParts = (version: string) => version.split(/[.+-]/).slice(0, 3).map(part => Number.parseInt(part, 10) || 0)

/** `version` is at least `minimum` (X.Y.Z); a dev build (no X.Y.Z) takes every item. */
export function meetsMinimum(version: null | string | undefined, minimum: null | string): boolean {
  if (!minimum || !version || !/^\d+\.\d+\.\d+/.test(version)) {
    return true
  }

  const have = versionParts(version)
  const need = versionParts(minimum)
  const index = have.findIndex((part, i) => part !== need[i])

  return index === -1 || have[index] > need[index]
}

const pick = (text: Localized, lang: string) => text[lang] || text.en || Object.values(text).find(Boolean) || ''

/** The catalog's items of one kind, as catalog entries in the UI language. */
export function libraryEntries(
  catalog: LibraryCatalog | null,
  kind: CatalogKind,
  locale: string,
  appVersion?: null | string
): CatalogEntry[] {
  if (!catalog) {
    return []
  }

  const lang = locale.toLowerCase().split(/[-_]/)[0]
  const raw = `https://raw.githubusercontent.com/${LIBRARY_REPOSITORY}/${catalog.commit}`

  return catalog.items
    .filter(item => (kind === 'plugins' ? item.type === 'plugin' : item.type === 'skill'))
    .filter(item => meetsMinimum(appVersion, item.min_app_version))
    .map(item => {
      const keywords = Object.values(item.keywords ?? {}).flat()

      return {
        id: `oxeegen:${item.id}`,
        name: pick(item.title, lang) || item.id,
        description: pick(item.description, lang),
        overview: '',
        category: item.tags[0] || 'oxeegen',
        categoryLabel: item.tags[0] || LIBRARY_SOURCE,
        source: LIBRARY_SOURCE,
        author: item.author,
        identifier: item.id,
        installIdentifier: item.type === 'skill' ? `${LIBRARY_REPOSITORY}/${item.path}` : null,
        repo: `https://github.com/${LIBRARY_REPOSITORY}`,
        sha: catalog.commit,
        subdir: item.path,
        version: item.version,
        requiresHermes: '',
        tags: item.tags,
        platforms: [],
        requirements: [],
        tools: [],
        hooks: [],
        sourceUrl: `https://github.com/${LIBRARY_REPOSITORY}/tree/${catalog.commit}/${item.path}`,
        docsUrl: null,
        imageUrl: item.image ? `${raw}/${item.image}` : null,
        stars: null,
        search: [item.id, ...Object.values(item.title), ...Object.values(item.description), ...item.tags, ...keywords, LIBRARY_SOURCE]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
      }
    })
}

export const isLibraryEntry = (entry: CatalogEntry): boolean => entry.source === LIBRARY_SOURCE

/** The installed skill a library entry stands for: skills install under their id. */
export function libraryInstalled(
  entry: CatalogEntry,
  installedByName: ReadonlyMap<string, CatalogEntry>
): CatalogEntry | undefined {
  return isLibraryEntry(entry) ? installedByName.get(entry.identifier) : undefined
}

/** Library entries of one kind, refreshed in the background, in the UI language. */
export function useLibraryEntries(kind: CatalogKind): CatalogEntry[] {
  const catalog = useStore($libraryCatalog)
  const version = useStore($desktopVersion)?.appVersion
  const { locale } = useI18n()

  startLibraryRefresh()

  return useMemo(() => libraryEntries(catalog, kind, locale, version), [catalog, kind, locale, version])
}
