import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CatalogCard } from '@/app/capabilities/catalog/catalog-card'
import { I18nProvider } from '@/i18n/context'

import { $libraryCatalog, type LibraryCatalog, libraryEntries } from './library'

const CATALOG: LibraryCatalog = {
  format: 1,
  repository: 'Oxeegen/OxeeLibrary',
  commit: 'a'.repeat(40),
  items: [
    {
      id: 'document-assembler',
      type: 'skill',
      version: '1.0.0',
      title: { en: 'Document Assembler', fr: 'Document Assembler' },
      description: { en: 'Assembles your pieces.', fr: 'Assemblez vos pièces en un livrable unique.' },
      tags: ['assemblage'],
      keywords: { en: ['table of contents'], fr: ['sommaire', 'charte graphique'] },
      author: 'Oxeegen',
      min_app_version: null,
      path: 'skills/document-assembler',
      image: 'assets/document-assembler.png'
    }
  ]
}

afterEach(() => {
  cleanup()
  $libraryCatalog.set(null)
})

function slide(onOpen = vi.fn()) {
  $libraryCatalog.set(CATALOG)
  const [entry] = libraryEntries(CATALOG, 'skills', 'fr', '0.8.5')

  const { container } = render(
    <I18nProvider configClient={null} initialLocale="fr">
      <CatalogCard
        accentIndex={0}
        action={<button type="button">Installer</button>}
        entry={entry}
        onCategory={vi.fn()}
        onOpen={onOpen}
        onSearch={vi.fn()}
        onTag={vi.fn()}
        variant="hero"
      />
    </I18nProvider>
  )

  return { container, entry }
}

describe('an Oxeegen library slide', () => {
  it('sets the copy over the visual: title, description, keywords, brand and install', () => {
    const { container } = slide()

    expect(screen.getByText('Document').className).toContain('lead')
    expect(screen.getByText('Assembler').className).toContain('last')
    expect(screen.getByText('Assemblez vos pièces en un livrable unique.')).toBeTruthy()
    expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual(['sommaire', 'charte graphique'])
    expect(screen.getByText('Bibliothèque de skills')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Installer' })).toBeTruthy()
    expect(container.querySelector<HTMLElement>('.oxee-library-hero-visual')?.style.backgroundImage).toContain(
      'assets/document-assembler.png'
    )
  })

  it('opens the detail from the title', () => {
    const onOpen = vi.fn()
    const { entry } = slide(onOpen)

    fireEvent.click(screen.getByRole('button', { name: 'Document Assembler' }))
    expect(onOpen).toHaveBeenCalledWith(entry)
  })
})
