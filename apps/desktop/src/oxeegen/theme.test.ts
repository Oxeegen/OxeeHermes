/**
 * Fred's Oxeegen theme: Mono re-seeded to the Oxeegen accent by the app's own
 * engine, with his light surfaces and the accent carried into dark mode.
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

  it('uses pure black text on warm surfaces in light mode', () => {
    expect(oxeegen.colors.foreground).toBe('#000000')
    expect(oxeegen.colors.background).toBe('#fcfcfb')
    expect(oxeegen.colors.primary).toBe(OXEEGEN_ACCENT)
  })
})
