import { describe, expect, it } from 'vitest'

import { rebrandText } from './rebrand'
import { translateUiText } from './ui-text'
import fr from './ui-text/fr.json'

describe('translateUiText', () => {
  const [english, french] = Object.entries(fr as Record<string, string>)[0] ?? ['', '']

  it('gives the French of a text the table holds, whatever its whitespace', () => {
    expect(english).not.toBe('')
    expect(translateUiText(english, 'fr')).toBe(french)
    expect(translateUiText(` ${english.replace(/ /g, '\n  ')} `, 'fr-FR')).toBe(french)
  })

  it('finds a text the backend sent already renamed, and renames its translation', () => {
    const [source, translation] =
      Object.entries(fr as Record<string, string>).find(([text]) => /\bHermes\b/.test(text)) ?? ['', '']

    expect(translation).toMatch(/\bHermes\b/)
    expect(translateUiText(source.replaceAll('Hermes', 'Oxee Hermes'), 'fr')).toBe(rebrandText(translation))
    expect(rebrandText(translation)).toMatch(/Oxee Hermes/)
  })

  it('keeps English for another language and for a text the table lacks', () => {
    expect(translateUiText(english, 'en')).toBe(english)
    expect(translateUiText('A text no source has', 'fr')).toBe('A text no source has')
    expect(translateUiText('', 'fr')).toBe('')
  })
})
