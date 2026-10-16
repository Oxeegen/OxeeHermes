import { describe, expect, it } from 'vitest'

import { rebrandText, rebrandTranslations } from './rebrand'

describe('rebrandText', () => {
  it.each([
    ['Ask Hermes…', 'Ask Oxee Hermes…'],
    ['Update Hermes Desktop to continue.', 'Update Oxee Hermes to continue.'],
    ['Welcome to Hermes Agent', 'Welcome to Oxee Hermes'],
    ['HERMES AGENT', 'OXEE HERMES'],
    ["Hermes's memory", "Oxee Hermes's memory"],
    ['Hermes (default)', 'Oxee Hermes (default)'],
    ['Restart Hermes.', 'Restart Oxee Hermes.'],
    ['"Hermes"', '"Oxee Hermes"'],
    ['auf dem Remote-Hermes statt', 'auf dem Remote-Oxee Hermes statt'],
    ['This Hermes desktop app was installed by Nix.', 'This Oxee Hermes app was installed by Nix.']
  ])('rewrites %j', (input, expected) => {
    expect(rebrandText(input)).toBe(expected)
  })

  it.each([
    'run `hermes setup`',
    '~/.hermes/config.yaml',
    'HERMES_HOME',
    'hermes://open',
    'HermesBots roster',
    'Oxee Hermes is ready',
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

    expect(out.title).toBe('Oxee Hermes')
    expect(out.nested.greet('Ana')).toBe('Oxee Hermes says hi to Ana')
    expect(out.list).toEqual(['Oxee Hermes', 'other'])
    expect(out.count).toBe(3)
  })
})
