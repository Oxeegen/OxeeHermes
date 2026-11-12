import type { CSSProperties, ReactNode } from 'react'

import type { CatalogCardVariant } from '@/app/capabilities/catalog/catalog-card'
import type { CatalogEntry, CatalogKind } from '@/app/capabilities/catalog/catalog-data'
import { CatalogFeaturedSlider } from '@/app/capabilities/catalog/catalog-featured-slider'

import { useOxeegenStrings } from './strings'

/** Oxee Hermes: the Oxeegen library's items, first on the Discover page of Skills and Plugins (library.ts). */
export function OxeegenLibrarySection({
  entries,
  kind,
  card
}: {
  entries: CatalogEntry[]
  kind: CatalogKind
  card: (entry: CatalogEntry, index: number, variant: CatalogCardVariant, placement?: CSSProperties) => ReactNode
}) {
  const s = useOxeegenStrings()

  if (!entries.length) {
    return null
  }

  return (
    <section data-catalog-section="oxeegen">
      <header className="catalog-section-heading">
        <div>
          <h2>{s.libraryTitle(kind)}</h2>
          <p>{s.libraryBlurb}</p>
        </div>
      </header>
      <CatalogFeaturedSlider slides={entries.map((entry, index) => card(entry, index, 'hero'))} />
    </section>
  )
}
