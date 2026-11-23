import type { DesktopTheme, DesktopThemeColors, DesktopThemeTypography } from '@/themes/types'

/**
 * Oxeegen — the default desktop theme of Oxee Hermes (Fred's theme).
 *
 * Mono re-seeded to the Oxeegen blurple #5E4AF5, exactly as the app's own
 * accent picker computes it (`accentedTheme(mono, '#5e4af5')`), with the
 * Oxeegen Style Kit's neutrals and accents over it, plus:
 * - dark: ring / midground / composer ring carry the accent (a retint only
 *   moves the hue of Mono's zero-chroma greys, which left them grey), and
 *   the working-session arc paints in the accent instead of the stylesheet's
 *   dark-mode foreground (white) — that rule is in oxeegen.css, not in
 *   `customCSS`, which would displace a user skin's own CSS.
 *
 * The retint is frozen as hexes because the engine that computes it (themes/
 * context.tsx) imports the presets that import this file; theme.test.ts proves
 * the hexes still equal what the engine computes, so an upstream change to Mono
 * or to the retint shows up there.
 *
 * Built by a factory (called from themes/presets.ts) so this file never imports
 * presets at module scope — a cycle would leave typography uninitialised.
 */
export const OXEEGEN_THEME_NAME = 'oxeegen'
export const OXEEGEN_ACCENT = '#5e4af5'

/** `accentedTheme(mono, OXEEGEN_ACCENT)`, light. */
export const OXEEGEN_RETINT_LIGHT: DesktopThemeColors = {
  background: '#ffffff',
  foreground: '#161616',
  card: '#ffffff',
  cardForeground: '#161616',
  muted: '#f9f9f9',
  mutedForeground: '#737377',
  popover: '#ffffff',
  popoverForeground: '#161616',
  primary: '#5e4af5',
  primaryForeground: '#ffffff',
  secondary: '#e5e8ff',
  secondaryForeground: '#505050',
  accent: '#e9ebff',
  accentForeground: '#505050',
  border: '#e1e1e3',
  input: '#d5d5d8',
  ring: '#5e4af5',
  midground: '#5e4af5',
  midgroundForeground: '#ffffff',
  destructive: '#b94a3a',
  destructiveForeground: '#ffffff',
  sidebarBackground: '#f5f5f5',
  sidebarBorder: '#e1e1e3',
  userBubble: '#e9ebff',
  userBubbleBorder: '#e1e1e3'
}

/** `accentedTheme(mono, OXEEGEN_ACCENT)`, dark. */
export const OXEEGEN_RETINT_DARK: DesktopThemeColors = {
  background: '#0e0e0e',
  foreground: '#eaeaea',
  card: '#141414',
  cardForeground: '#eaeaea',
  muted: '#1e1e1e',
  mutedForeground: '#808080',
  popover: '#181818',
  popoverForeground: '#eaeaea',
  primary: '#6d65ff',
  primaryForeground: '#161616',
  secondary: '#191a2a',
  secondaryForeground: '#c8c8c8',
  accent: '#171826',
  accentForeground: '#d8d8d8',
  border: '#2a2a2a',
  input: '#2a2a2a',
  ring: '#9a9a9a',
  midground: '#9a9a9a',
  midgroundForeground: '#161616',
  destructive: '#a84040',
  destructiveForeground: '#fef2f2',
  sidebarBackground: '#0a0a0a',
  sidebarBorder: '#202020',
  userBubble: '#1d1e2c',
  userBubbleBorder: '#363636'
}

// The Oxeegen Style Kit palette (skills/creative/oxeegen-style-kit/references/oxeegen-style-guide.md
// § 1): warm neutral page / surface / ink, grid lines, brand blurple (its AA-safe tint in dark) and
// the kit's red. The accent tints (secondary, accent, user bubble) stay the retint's.
const light: DesktopThemeColors = {
  ...OXEEGEN_RETINT_LIGHT,
  background: '#f9f9f7',
  foreground: '#0b0b0b',
  card: '#fcfcfb',
  cardForeground: '#0b0b0b',
  popover: '#fcfcfb',
  popoverForeground: '#0b0b0b',
  muted: '#f3f2ee',
  // ink-2: the kit's muted #7a7873 is under AA (4.2:1) for the app's secondary text.
  mutedForeground: '#52514e',
  secondaryForeground: '#52514e',
  accentForeground: '#52514e',
  border: '#e1e0d9',
  input: '#fcfcfb',
  destructive: '#c0392b',
  sidebarBackground: '#f3f2ee',
  sidebarBorder: '#e1e0d9',
  userBubbleBorder: '#e1e0d9'
}

const dark: DesktopThemeColors = {
  ...OXEEGEN_RETINT_DARK,
  background: '#0d0d0d',
  foreground: '#f0efec',
  card: '#1a1a19',
  cardForeground: '#f0efec',
  popover: '#1a1a19',
  popoverForeground: '#f0efec',
  muted: '#232321',
  mutedForeground: '#9a988f',
  secondaryForeground: '#c3c2b7',
  accentForeground: '#c3c2b7',
  primary: '#8a7cf7',
  primaryForeground: '#0d0d0d',
  border: '#2c2c2a',
  input: '#383835',
  ring: '#8a7cf7',
  midground: '#8a7cf7',
  midgroundForeground: '#0d0d0d',
  composerRing: '#8a7cf7',
  destructive: '#f87171',
  destructiveForeground: '#0d0d0d',
  sidebarBackground: '#1a1a19',
  sidebarBorder: '#2c2c2a',
  userBubbleBorder: '#383835'
}

export function createOxeegenTheme(mono: DesktopTheme, typography: DesktopThemeTypography): DesktopTheme {
  return {
    ...mono,
    name: OXEEGEN_THEME_NAME,
    label: 'Oxeegen',
    description: 'The Oxeegen Style Kit palette',
    colors: light,
    darkColors: dark,
    typography: {
      fontSans: `Geist, ${typography.fontSans}`,
      fontMono: typography.fontMono
    }
  }
}
