import { useStore } from '@nanostores/react'
import type { CSSProperties, ReactNode } from 'react'

import type { CatalogEntry } from '@/app/capabilities/catalog/catalog-data'
import { RowButton } from '@/components/ui/row-button'
import { useI18n } from '@/i18n'

import { $libraryCatalog } from './library'
import { useOxeegenStrings } from './strings'

/** The title on two lines: the leading words in white, the last one in the Oxeegen gradient. */
function splitTitle(name: string): [string, string] {
  const words = name.trim().split(/\s+/)

  return words.length > 1 ? [words.slice(0, -1).join(' '), words.at(-1)!] : ['', name]
}

/**
 * Oxee Hermes: an Oxeegen library item as a slide of the library's carousel (library-section.tsx).
 * Its visual fills the card; the visual's left half is left dark and empty (see OxeeLibrary's
 * schema), and the app sets the copy there: title, description, keywords, the Oxeegen logo
 * and the install button. CatalogCard hands its hero variant here for library entries.
 */
export function OxeegenLibraryHero({
  entry,
  action,
  onOpen,
  style
}: {
  entry: CatalogEntry
  action: ReactNode
  onOpen: (entry: CatalogEntry) => void
  style?: CSSProperties
}) {
  const s = useOxeegenStrings()
  const { locale } = useI18n()
  const item = useStore($libraryCatalog)?.items.find(candidate => candidate.id === entry.identifier)
  const kind = item?.type === 'plugin' ? 'plugins' : 'skills'
  const lang = locale.toLowerCase().split(/[-_]/)[0]
  const keywords = item?.keywords[lang] ?? item?.keywords.en ?? []
  const [lead, last] = splitTitle(entry.name)

  return (
    <article
      className="oxee-library-hero group relative overflow-hidden rounded-lg"
      data-catalog-card
      data-catalog-variant="hero"
      data-entry-id={entry.id}
      data-oxee-library-hero
      style={style}
    >
      {entry.imageUrl && <div aria-hidden className="oxee-library-hero-visual" style={{ backgroundImage: `url("${entry.imageUrl}")` }} />}
      <div className="oxee-library-hero-copy">
        {/* Its ::after covers the card, so any empty spot opens the detail, as on every catalog card. */}
        <RowButton
          aria-haspopup="dialog"
          aria-label={entry.name}
          className="oxee-library-hero-title text-left after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-primary focus-visible:after:-outline-offset-2"
          data-long={entry.name.length > 18 || undefined}
          onClick={() => onOpen(entry)}
        >
          {lead && <span className="oxee-library-hero-lead">{lead}</span>}
          <span className="oxee-library-hero-last">{last}</span>
        </RowButton>
        <p className="oxee-library-hero-description">{entry.description}</p>
        {keywords.length > 0 && (
          <ul className="oxee-library-hero-pills">
            {keywords.slice(0, 5).map(keyword => (
              <li key={keyword}>{keyword}</li>
            ))}
          </ul>
        )}
        <div className="oxee-library-hero-footer">
          <span className="oxee-library-hero-brand">
            <img alt="Oxeegen" draggable={false} src={`${import.meta.env.BASE_URL}oxeegen-logo-dark.png`} />
            <span>{s.libraryShelf(kind)}</span>
          </span>
          <span className="oxee-library-hero-action">{action}</span>
        </div>
      </div>
    </article>
  )
}
