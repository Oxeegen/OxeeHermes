import { describe, expect, it } from 'vitest'

import { BOTS_LOCALES } from './i18n'

// Oxee Hermes: Bot Mode speaks French, not only its hosted group chats.
function leaves(tree: unknown, prefix = ''): string[] {
  return Object.entries(tree as Record<string, unknown>).flatMap(([key, value]) =>
    value && typeof value === 'object' ? leaves(value, `${prefix}${key}.`) : [`${prefix}${key}`]
  )
}

describe('French Bot Mode', () => {
  it('translates every Bot Mode string the English bundle has', () => {
    expect(leaves(BOTS_LOCALES.fr).sort()).toEqual(leaves(BOTS_LOCALES.en).sort())
  })

  it('words the roster menus, tooltips and hover texts in French', () => {
    const fr = BOTS_LOCALES.fr as unknown as {
      bot: { pinToTop: string }
      roster: { newBotOrGroup: string }
      ui: { newMenu: string; filterRoster: string; duplicating: (name: string) => string }
    }

    expect(fr.roster.newBotOrGroup).toBe('Nouveau bot ou discussion de groupe')
    expect(fr.bot.pinToTop).toBe('Épingler en haut')
    expect(fr.ui.newMenu).toBe('Nouveau…')
    expect(fr.ui.filterRoster).toBe('Filtrer la liste')
    expect(fr.ui.duplicating('Ada')).toBe('Duplication de Ada…')
  })
})
