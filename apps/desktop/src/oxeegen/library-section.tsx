import { type CSSProperties, type ReactNode, useState } from 'react'

import type { CatalogCardVariant } from '@/app/capabilities/catalog/catalog-card'
import type { CatalogEntry, CatalogKind } from '@/app/capabilities/catalog/catalog-data'
import { cn } from '@/lib/utils'
import { useTheme } from '@/themes'

import { useOxeegenStrings } from './strings'

/**
 * The library's showcase: the current item's slide on the left (library-hero.tsx), and on the right
 * every item as a thumbnail of its visual and its name. The current one is highlighted, a bar fills
 * across it while it holds (oxeegen.css), and the next one comes up when the bar is full; the
 * pointer or focus inside, or a preference for reduced motion, holds it. A click picks an item.
 */
function OxeegenLibraryShowcase({
  entries,
  card,
  label
}: {
  entries: CatalogEntry[]
  card: (entry: CatalogEntry, index: number, variant: CatalogCardVariant) => ReactNode
  label: string
}) {
  const [picked, setPicked] = useState(0)
  const [held, setHeld] = useState(false)
  const index = picked % entries.length

  if (entries.length < 2) {
    return <>{card(entries[0], 0, 'hero')}</>
  }

  return (
    <div
      aria-label={label}
      aria-roledescription="carousel"
      className="oxee-library-showcase"
      data-held={held || undefined}
      onBlur={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      role="region"
    >
      <div className="oxee-library-showcase-stage" key={entries[index].id}>
        {card(entries[index], index, 'hero')}
      </div>
      <ul className="oxee-library-showcase-rail">
        {entries.map((entry, entryIndex) => (
          <li key={entry.id}>
            <button
              aria-current={entryIndex === index || undefined}
              className={cn('oxee-library-showcase-item', entryIndex === index && 'is-active')}
              onClick={() => setPicked(entryIndex)}
              type="button"
            >
              {entryIndex === index && (
                <span
                  aria-hidden
                  className="oxee-library-showcase-progress"
                  onAnimationEnd={() => setPicked(entryIndex + 1)}
                />
              )}
              <span className="oxee-library-showcase-thumb" style={entry.imageUrl ? { backgroundImage: `url("${entry.imageUrl}")` } : undefined} />
              <span className="oxee-library-showcase-name">{entry.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

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
  const dark = useTheme().renderedMode === 'dark'

  if (!entries.length) {
    return null
  }

  return (
    <section data-catalog-section="oxeegen">
      <header className="catalog-section-heading">
        <div>
          {/* Sources in oxeegen/assets/wordmark, copied by oxeegen/scripts/apply-desktop-assets.cjs. */}
          <h2>
            <img
              alt={s.libraryTitle(kind)}
              className="block h-7 w-auto select-none"
              data-oxee-brand="library"
              draggable={false}
              src={`${import.meta.env.BASE_URL}${dark ? 'oxeegen-logo-dark.png' : 'oxeegen-logo.png'}`}
            />
          </h2>
          <p>{s.libraryBlurb}</p>
        </div>
      </header>
      <OxeegenLibraryShowcase card={card} entries={entries} label={s.libraryTitle(kind)} />
    </section>
  )
}
