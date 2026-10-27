import { useTheme } from '@/themes'

const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`

// Sources in oxeegen/assets/wordmark, copied by oxeegen/scripts/apply-desktop-assets.cjs.
const wordmark = (dark: boolean) => asset(dark ? 'oxee-hermes-wordmark-dark.svg' : 'oxee-hermes-wordmark.svg')

/**
 * Oxee Hermes wordmark at the far left of the titlebar while the left drawer is open,
 * the sidebar toggle on its right edge (titlebar-drawer.ts). Collapsed, the titlebar
 * keeps the toggle alone at the far left and the wordmark moves into the drawer's
 * rail, upright like its tab labels (OxeeRailWordmark).
 */
export function OxeeTitlebarBrand({ sidebarOpen }: { sidebarOpen: boolean }) {
  const dark = useTheme().renderedMode === 'dark'

  if (!sidebarOpen) {
    return null
  }

  return (
    <img
      alt="Oxee Hermes"
      className="pointer-events-none mx-1.5 h-[1.125rem] shrink-0 select-none"
      data-oxee-brand="wordmark"
      draggable={false}
      src={wordmark(dark)}
    />
  )
}

/** The wordmark atop the collapsed left drawer's rail, turned to read top-down like "SESSIONS". */
export function OxeeRailWordmark() {
  const dark = useTheme().renderedMode === 'dark'

  return (
    <div className="flex shrink-0 justify-center py-2" data-oxee-brand="rail">
      <div className="relative h-[5.5rem] w-4">
        <img
          alt="Oxee Hermes"
          className="pointer-events-none absolute top-1/2 left-1/2 h-4 w-[5.5rem] max-w-none -translate-x-1/2 -translate-y-1/2 rotate-90 select-none"
          draggable={false}
          src={wordmark(dark)}
        />
      </div>
    </div>
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
