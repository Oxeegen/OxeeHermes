import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { CatalogEntry } from '@/app/capabilities/catalog/catalog-data'
import { I18nProvider } from '@/i18n/context'

import { type LibraryCatalog, libraryEntries } from './library'
import { OxeegenLibrarySection } from './library-section'

const item = (id: string, title: string) => ({
  id,
  type: 'skill' as const,
  version: '1.0.0',
  title: { en: title },
  description: { en: `${title}.` },
  tags: [],
  keywords: {},
  author: 'Oxeegen',
  min_app_version: null,
  path: `skills/${id}`,
  image: `assets/${id}.png`
})

const CATALOG: LibraryCatalog = {
  format: 1,
  repository: 'Oxeegen/OxeeLibrary',
  commit: 'a'.repeat(40),
  items: [item('document-assembler', 'Document Assembler'), item('contract-review', 'Contract review'), item('meeting-minutes', 'Meeting minutes')]
}

const slide = (entry: CatalogEntry) => <article data-testid="slide">{entry.name}</article>

afterEach(cleanup)

function showcase() {
  render(
    <I18nProvider configClient={null} initialLocale="en">
      <OxeegenLibrarySection card={slide} entries={libraryEntries(CATALOG, 'skills', 'en', '0.8.5')} kind="skills" />
    </I18nProvider>
  )
}

describe('the Oxeegen library showcase', () => {
  it('shows one slide, and every item beside it with its name; a click brings one up', () => {
    showcase()

    expect(screen.getByTestId('slide').textContent).toBe('Document Assembler')
    const rail = screen.getAllByRole('button').map(button => button.textContent)
    expect(rail).toEqual(['Document Assembler', 'Contract review', 'Meeting minutes'])

    fireEvent.click(screen.getByRole('button', { name: 'Meeting minutes' }))
    expect(screen.getByTestId('slide').textContent).toBe('Meeting minutes')
    expect(screen.getByRole('button', { name: 'Meeting minutes' }).getAttribute('aria-current')).toBe('true')
  })

  it('moves on when the current item has held its time, and wraps around after the last', () => {
    showcase()
    fireEvent.click(screen.getByRole('button', { name: 'Meeting minutes' }))

    const progress = screen.getByRole('button', { name: 'Meeting minutes' }).querySelector('.oxee-library-showcase-progress')!
    // jsdom has no CSS animations, so React listens for the prefixed name; send both.
    act(() => {
      fireEvent.animationEnd(progress)
      fireEvent(progress, new Event('webkitAnimationEnd', { bubbles: true }))
    })
    expect(screen.getByTestId('slide').textContent).toBe('Document Assembler')
  })
})
