import { cn } from '@/lib/utils'
import { useTheme } from '@/themes'

const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`

// Sources in oxeegen/assets/wordmark, copied by oxeegen/scripts/apply-desktop-assets.cjs.
const wordmark = (dark: boolean) => asset(dark ? 'oxee-hermes-wordmark-dark.svg' : 'oxee-hermes-wordmark.svg')

/**
 * Oxee Hermes wordmark at the far left of the titlebar, the sidebar toggle to its
 * right: the full wordmark over an open sidebar, the icon alone once it is collapsed.
 */
export function OxeeTitlebarBrand({ sidebarOpen }: { sidebarOpen: boolean }) {
  const dark = useTheme().renderedMode === 'dark'

  const src = sidebarOpen ? wordmark(dark) : asset(dark ? 'oxeegen-icon-dark.svg' : 'oxeegen-icon.svg')

  return (
    <img
      alt="Oxee Hermes"
      className={cn('pointer-events-none mx-1.5 h-[1.125rem] shrink-0 select-none', !sidebarOpen && 'w-[1.125rem]')}
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
      alt="Oxee Hermes"
      className="mx-auto mb-4 h-auto w-[min(22rem,80%)] select-none"
      data-oxee-brand="intro"
      draggable={false}
      src={wordmark(dark)}
    />
  )
}

/** The wordmark atop About > Version and updates and the update dialog, in place of the icon + name. */
export function OxeeVersionWordmark() {
  const dark = useTheme().renderedMode === 'dark'

  return (
    <img
      alt="Oxee Hermes"
      className="h-auto w-[min(16rem,70%)] select-none"
      data-oxee-brand="version"
      draggable={false}
      src={wordmark(dark)}
    />
  )
}
