import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { InstalledReleaseNotes } from './installed-release-notes'
import { releaseTagFor } from './release-notes'

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
        html_url: 'https://github.com/oxeegen/oxee-hermes/releases/tag/v1.2.0',
        name: 'Oxee Hermes 1.2.0'
      })
    )
    vi.stubGlobal('fetch', fetch)

    render(<InstalledReleaseNotes appVersion="1.2.0" />)

    expect(await screen.findByText("What's new in 1.2.0")).toBeTruthy()
    expect(await screen.findByText(/Chloé reads answers aloud/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'View on GitHub' }).getAttribute('href')).toBe(
      'https://github.com/oxeegen/oxee-hermes/releases/tag/v1.2.0'
    )
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/oxeegen/oxee-hermes/releases/tags/v1.2.0',
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
})
