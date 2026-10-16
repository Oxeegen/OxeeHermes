import { describe, expect, it } from 'vitest'

import { rebrandText, rebrandTranslations } from './rebrand'

describe('rebrandText', () => {
  it.each([
    ['Ask Hermes…', 'Ask Oxee Desktop…'],
    ['Update Hermes Desktop to continue.', 'Update Oxee Desktop to continue.'],
    ['Welcome to Hermes Agent', 'Welcome to Oxee Desktop'],
    ['HERMES AGENT', 'OXEE DESKTOP'],
    ["Hermes's memory", "Oxee Desktop's memory"],
    ['Hermes (default)', 'Oxee Desktop (default)'],
    ['Restart Hermes.', 'Restart Oxee Desktop.'],
    ['"Hermes"', '"Oxee Desktop"'],
    ['auf dem Remote-Hermes statt', 'auf dem Remote-Oxee Desktop statt'],
    ['This Hermes desktop app was installed by Nix.', 'This Oxee Desktop app was installed by Nix.']
  ])('rewrites %j', (input, expected) => {
    expect(rebrandText(input)).toBe(expected)
  })

  it.each([
    'run `hermes setup`',
    '~/.hermes/config.yaml',
    'HERMES_HOME',
    'hermes://open',
    'HermesBots roster',
    'Oxee Desktop is ready',
    'X-Hermes-Session-Token',
    'Hermes-owned venv',
    '/Applications/Hermes.app',
    'Hermes.exe',
    'NousResearch/Hermes',
    'C:\\Hermes\\venv\\Scripts',
    'github.com/NousResearch/hermes-agent'
  ])('leaves %j alone', input => {
    expect(rebrandText(input)).toBe(input)
  })

  it('is idempotent', () => {
    const once = rebrandText('Hermes Desktop talks to Hermes')

    expect(rebrandText(once)).toBe(once)
  })
})

describe('rebrandTranslations', () => {
  it('rewrites nested strings and formatter results', () => {
    const out = rebrandTranslations({
      title: 'Hermes',
      nested: { greet: (name: string) => `Hermes says hi to ${name}` },
      list: ['Hermes Agent', 'other'],
      count: 3
    })

    expect(out.title).toBe('Oxee Desktop')
    expect(out.nested.greet('Ana')).toBe('Oxee Desktop says hi to Ana')
    expect(out.list).toEqual(['Oxee Desktop', 'other'])
    expect(out.count).toBe(3)
  })
})
