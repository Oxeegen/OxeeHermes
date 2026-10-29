/**
 * Oxee Hermes releases on GitHub: the repo the setup.exe and macOS updaters read
 * (electron-builder.config.cjs publish), its release pages, and the notes of one
 * release for Settings > About.
 */
export const OXEEGEN_REPOSITORY = 'Oxeegen/OxeeHermes'
export const OXEEGEN_RELEASES_URL = `https://github.com/${OXEEGEN_REPOSITORY}/releases`

export interface OxeegenReleaseNotes {
  body: string
  name: string
  publishedAt: null | string
  url: string
}

/** The release tag of an installed version: only a release (X.Y.Z) has one; commit and dev builds do not. */
export function releaseTagFor(appVersion: null | string | undefined): null | string {
  const version = (appVersion ?? '').trim().replace(/^v/, '')

  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version) && version !== '0.0.0' ? `v${version}` : null
}

// A release body carries its translations as HTML comments, hidden on github.com:
//   <!-- oxee-notes:fr
//   …French notes…
//   -->
// (written by oxeegen/scripts/release-notes-body.mjs from <version>.<lang>.md next to <version>.md).
const TRANSLATION = /<!--\s*oxee-notes:([A-Za-z-]+)\s*\n([\s\S]*?)-->/g

/** The notes in `locale` (exact, then its base language), else the body itself without its translations. */
export function localizedNotesBody(body: string, locale: null | string | undefined): string {
  const translations = new Map<string, string>()

  for (const [, lang, text] of body.matchAll(TRANSLATION)) {
    translations.set(lang.toLowerCase(), text.trim())
  }

  const wanted = (locale ?? '').toLowerCase()

  return (
    translations.get(wanted) ?? translations.get(wanted.split(/[-_]/)[0]) ?? body.replace(TRANSLATION, '').trim()
  )
}

const notes = new Map<string, Promise<null | OxeegenReleaseNotes>>()

/** The notes of release `tag`; null when GitHub has no such release or cannot be reached. */
export function fetchReleaseNotes(tag: string): Promise<null | OxeegenReleaseNotes> {
  const cached = notes.get(tag)

  if (cached) {
    return cached
  }

  const pending = fetch(`https://api.github.com/repos/${OXEEGEN_REPOSITORY}/releases/tags/${encodeURIComponent(tag)}`, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(8000)
  })
    .then(async (response): Promise<null | OxeegenReleaseNotes> => {
      if (!response.ok) {
        return null
      }

      const release = (await response.json()) as { body?: unknown; html_url?: unknown; name?: unknown; published_at?: unknown }

      return {
        body: typeof release.body === 'string' ? release.body.trim() : '',
        name: typeof release.name === 'string' && release.name ? release.name : tag,
        publishedAt: typeof release.published_at === 'string' ? release.published_at : null,
        url: typeof release.html_url === 'string' ? release.html_url : `${OXEEGEN_RELEASES_URL}/tag/${encodeURIComponent(tag)}`
      }
    })
    .catch(() => null)

  notes.set(tag, pending)
  // A miss (offline, rate limit) is retried the next time About opens.
  void pending.then(result => {
    if (!result) {
      notes.delete(tag)
    }
  })

  return pending
}
