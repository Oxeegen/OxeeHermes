import type { DesktopTheme, DesktopThemeColors, DesktopThemeTypography } from '@/themes/types'

/**
 * Oxeegen — the default desktop theme of Oxeegen Hermes.
 *
 * Neutrals are the zinc ramp the other Oxee apps use (ink #18181B, paper
 * #F4F4F5); the accent family is Oxeegen violet. Light carries the brand seed
 * #5E4AF5 (white text on it clears AA); dark lifts it to #8E80FF so the accent
 * still reads on near-black chrome, with dark ink on top like upstream's dark
 * accents. Soft surfaces are violet tints of the same seeds.
 *
 * Built by a factory (called from themes/presets.ts) so this file never imports
 * presets at module scope — presets imports us, and a cycle would leave the
 * shared typography / terminal palettes uninitialised.
 */
const light: DesktopThemeColors = {
  background: '#ffffff',
  foreground: '#18181b',
  card: '#fafafa',
  cardForeground: '#18181b',
  muted: '#f4f4f5',
  mutedForeground: '#71717a',
  popover: '#ffffff',
  popoverForeground: '#18181b',
  primary: '#5e4af5',
  primaryForeground: '#ffffff',
  secondary: '#ebe8fe',
  secondaryForeground: '#18181b',
  accent: '#f1effe',
  accentForeground: '#18181b',
  border: '#e4e4e7',
  input: '#ffffff',
  ring: '#5e4af5',
  midground: '#5e4af5',
  midgroundForeground: '#ffffff',
  composerRing: '#5e4af5',
  destructive: '#dc2626',
  destructiveForeground: '#ffffff',
  sidebarBackground: '#fafafa',
  sidebarBorder: '#e4e4e7',
  userBubble: '#ece9fe',
  userBubbleBorder: '#e4e4e7'
}

const dark: DesktopThemeColors = {
  background: '#18181b',
  foreground: '#f4f4f5',
  card: '#111113',
  cardForeground: '#f4f4f5',
  muted: '#232327',
  mutedForeground: '#a1a1aa',
  popover: '#1f1f23',
  popoverForeground: '#f4f4f5',
  primary: '#8e80ff',
  primaryForeground: '#121214',
  secondary: '#2a2552',
  secondaryForeground: '#f4f4f5',
  accent: '#231f3f',
  accentForeground: '#f4f4f5',
  border: '#2e2e33',
  input: '#18181b',
  ring: '#8e80ff',
  midground: '#8e80ff',
  midgroundForeground: '#121214',
  composerRing: '#8e80ff',
  destructive: '#f87171',
  destructiveForeground: '#121214',
  sidebarBackground: '#111113',
  sidebarBorder: '#2e2e33',
  userBubble: '#251f4d',
  userBubbleBorder: '#2e2e33'
}

export const OXEEGEN_THEME_NAME = 'oxeegen'

export function createOxeegenTheme(base: DesktopTheme, typography: DesktopThemeTypography): DesktopTheme {
  return {
    name: OXEEGEN_THEME_NAME,
    label: 'Oxeegen',
    description: 'Oxeegen violet on zinc neutrals',
    colors: light,
    darkColors: dark,
    typography: {
      fontSans: `Geist, ${typography.fontSans}`,
      fontMono: typography.fontMono
    },
    terminal: base.terminal,
    darkTerminal: base.darkTerminal
  }
}
