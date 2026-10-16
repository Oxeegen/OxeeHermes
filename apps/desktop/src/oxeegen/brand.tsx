import { cn } from '@/lib/utils'
import { useTheme } from '@/themes'

const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`

// Sources in oxeegen/assets/wordmark, copied by oxeegen/scripts/apply-desktop-assets.cjs.
const wordmark = (dark: boolean) => asset(dark ? 'oxee-desktop-wordmark-dark.svg' : 'oxee-desktop-wordmark.svg')

/**
 * Oxee Desktop wordmark in the titlebar, right of the sidebar toggle: the full
 * wordmark over an open sidebar, the icon alone once it is collapsed.
 */
export function OxeeTitlebarBrand({ sidebarOpen }: { sidebarOpen: boolean }) {
  const dark = useTheme().renderedMode === 'dark'

  const src = sidebarOpen ? wordmark(dark) : asset(dark ? 'oxeegen-icon-dark.svg' : 'oxeegen-icon.svg')

  return (
    <img
      alt="Oxee Desktop"
      className={cn('pointer-events-none ml-1.5 h-[1.125rem] shrink-0 select-none', !sidebarOpen && 'w-[1.125rem]')}
      data-oxee-brand={sidebarOpen ? 'wordmark' : 'icon'}
      draggable={false}
      src={src}
    />
  )
}

/** The wordmark over an empty chat, in place of upstream's display lettering. */
export function OxeeIntroWordmark() {
  const dark = useTheme().renderedMode === 'dark'

  return (
    <img
      alt="Oxee Desktop"
      className="mx-auto mb-4 h-auto w-[min(22rem,80%)] select-none"
      data-oxee-brand="intro"
      draggable={false}
      src={wordmark(dark)}
    />
  )
}
