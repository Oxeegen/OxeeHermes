/**
 * The Oxeegen theme: Mono re-seeded to the Oxeegen accent by the app's own
 * engine, with the Oxeegen Style Kit palette and the accent carried into dark mode.
 */
import { describe, expect, it } from 'vitest'

import { accentedTheme } from '@/themes/context'
import { BUILTIN_THEMES, monoTheme } from '@/themes/presets'

import { OXEEGEN_ACCENT, OXEEGEN_RETINT_DARK, OXEEGEN_RETINT_LIGHT } from './theme'

const oxeegen = BUILTIN_THEMES.oxeegen

describe('Oxeegen theme', () => {
  // On failure after an upstream merge: Mono or the retint changed. Regenerate
  // OXEEGEN_RETINT_* from accentedTheme(monoTheme, OXEEGEN_ACCENT).
  it('is the retint the app computes for Mono + the Oxeegen accent', () => {
    const engine = accentedTheme(monoTheme, OXEEGEN_ACCENT)

    expect(OXEEGEN_RETINT_LIGHT).toEqual(engine.colors)
    expect(OXEEGEN_RETINT_DARK).toEqual(engine.darkColors)
  })

  it('carries the accent into the dark-mode rings and arc colour', () => {
    const dark = oxeegen.darkColors!

    expect([dark.ring, dark.midground, dark.composerRing]).toEqual([dark.primary, dark.primary, dark.primary])
  })

  it('wears the Oxeegen Style Kit palette in both modes', () => {
    const dark = oxeegen.darkColors!

    expect([oxeegen.colors.background, oxeegen.colors.card, oxeegen.colors.foreground]).toEqual(['#f9f9f7', '#fcfcfb', '#0b0b0b'])
    expect([dark.background, dark.card, dark.foreground]).toEqual(['#0d0d0d', '#1a1a19', '#f0efec'])
    expect([oxeegen.colors.primary, dark.primary]).toEqual([OXEEGEN_ACCENT, '#8a7cf7'])
  })
})
