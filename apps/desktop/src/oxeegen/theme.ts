import type { DesktopTheme, DesktopThemeColors, DesktopThemeTypography } from '@/themes/types'

/**
 * Oxeegen — the default desktop theme of Oxee Hermes (Fred's theme).
 *
 * Mono re-seeded to the Oxeegen blurple #5E4AF5, exactly as the app's own
 * accent picker computes it (`accentedTheme(mono, '#5e4af5')`), plus:
 * - light: Claude-Desktop-matched surfaces (warm near-white panes, pure black
 *   text, subtle grey borders), sampled by Fred;
 * - dark: ring / midground / composer ring carry the accent seed (a retint
 *   only moves the hue of Mono's zero-chroma greys, which left them grey), and
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

const light: DesktopThemeColors = {
  ...OXEEGEN_RETINT_LIGHT,
  foreground: '#000000',
  cardForeground: '#000000',
  popoverForeground: '#000000',
  background: '#fcfcfb',
  card: '#fcfcfb',
  popover: '#ffffff',
  muted: '#f2f1ef',
  mutedForeground: '#646464',
  border: '#e3e3e2',
  input: '#fcfcfb',
  sidebarBackground: '#fbfbf9',
  sidebarBorder: '#e3e3e2',
  userBubbleBorder: '#e3e3e2'
}

const dark: DesktopThemeColors = {
  ...OXEEGEN_RETINT_DARK,
  ring: OXEEGEN_RETINT_DARK.primary,
  midground: OXEEGEN_RETINT_DARK.primary,
  composerRing: OXEEGEN_RETINT_DARK.primary
}

export function createOxeegenTheme(mono: DesktopTheme, typography: DesktopThemeTypography): DesktopTheme {
  return {
    ...mono,
    name: OXEEGEN_THEME_NAME,
    label: 'Oxeegen',
    description: 'Mono with the Oxeegen blurple accent',
    colors: light,
    darkColors: dark,
    typography: {
      fontSans: `Geist, ${typography.fontSans}`,
      fontMono: typography.fontMono
    }
  }
}
