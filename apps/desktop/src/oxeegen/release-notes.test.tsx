import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n/context'

import { InstalledReleaseNotes } from './installed-release-notes'
import { localizedNotesBody, releaseTagFor } from './release-notes'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('release notes of the installed version', () => {
  it('only a release version has a tag to read', () => {
    expect(releaseTagFor('1.2.0')).toBe('v1.2.0')
    expect(releaseTagFor('v1.3.0-rc.1')).toBe('v1.3.0-rc.1')
    expect(releaseTagFor('0.0.0')).toBeNull()
    expect(releaseTagFor('git.96b59ce.dirty')).toBeNull()
    expect(releaseTagFor(null)).toBeNull()
  })

  it('shows the GitHub release notes of the installed version, with a link to the release', async () => {
    const fetch = vi.fn(async () =>
      Response.json({
        body: '## Highlights\n\n- Chloé reads answers aloud',
        html_url: 'https://github.com/Oxeegen/OxeeHermes/releases/tag/v1.2.0',
        name: 'Oxee Hermes 1.2.0'
      })
    )
    vi.stubGlobal('fetch', fetch)

    render(<InstalledReleaseNotes appVersion="1.2.0" />)

    expect(await screen.findByText("What's new in 1.2.0")).toBeTruthy()
    expect(await screen.findByText(/Chloé reads answers aloud/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'View on GitHub' }).getAttribute('href')).toBe(
      'https://github.com/Oxeegen/OxeeHermes/releases/tag/v1.2.0'
    )
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/Oxeegen/OxeeHermes/releases/tags/v1.2.0',
      expect.anything()
    )
  })

  it('says the notes are unavailable when GitHub has no such release', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))

    render(<InstalledReleaseNotes appVersion="1.4.0" />)

    expect(await screen.findByText(/notes of this version are not available/)).toBeTruthy()
  })

  it('stays out of a commit or dev build', () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)

    const { container } = render(<InstalledReleaseNotes appVersion="0.0.0" />)

    expect(container.innerHTML).toBe('')
    expect(fetch).not.toHaveBeenCalled()
  })

  const translated = [
    '- Release notes follow the app language',
    '',
    '<!-- oxee-notes:fr',
    '- Les notes de version suivent la langue de l’app',
    '-->'
  ].join('\n')

  it('picks the translation of the UI language, its base language, else the English body', () => {
    expect(localizedNotesBody(translated, 'fr')).toBe('- Les notes de version suivent la langue de l’app')
    expect(localizedNotesBody(translated, 'fr-CA')).toBe('- Les notes de version suivent la langue de l’app')
    expect(localizedNotesBody(translated, 'de')).toBe('- Release notes follow the app language')
    expect(localizedNotesBody(translated, 'en')).toBe('- Release notes follow the app language')
  })

  it('shows the French notes in a French UI, never the hidden blocks in an English one', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ body: translated, name: 'Oxee Hermes 1.5.0' })))

    render(
      <I18nProvider configClient={null} initialLocale="fr">
        <InstalledReleaseNotes appVersion="1.5.0" />
      </I18nProvider>
    )

    expect(await screen.findByText('Nouveautés de la version 1.5.0')).toBeTruthy()
    expect(await screen.findByText(/Les notes de version suivent la langue/)).toBeTruthy()
    expect(screen.queryByText(/Release notes follow/)).toBeNull()
    cleanup()

    render(
      <I18nProvider configClient={null} initialLocale="en">
        <InstalledReleaseNotes appVersion="1.5.0" />
      </I18nProvider>
    )

    expect(await screen.findByText(/Release notes follow the app language/)).toBeTruthy()
    expect(screen.queryByText(/oxee-notes|Les notes de version/)).toBeNull()
  })
})
