import { describe, expect, it } from 'vitest'

import { rebrandText, rebrandTranslations } from './rebrand'

describe('rebrandText', () => {
  it.each([
    ['Ask Hermes…', 'Ask Oxeegen Hermes…'],
    ['Update Hermes Desktop to continue.', 'Update Oxeegen Hermes to continue.'],
    ['Welcome to Hermes Agent', 'Welcome to Oxeegen Hermes'],
    ['HERMES AGENT', 'OXEEGEN HERMES'],
    ["Hermes's memory", "Oxeegen Hermes's memory"],
    ['Hermes (default)', 'Oxeegen Hermes (default)'],
    ['Restart Hermes.', 'Restart Oxeegen Hermes.'],
    ['"Hermes"', '"Oxeegen Hermes"'],
    ['auf dem Remote-Hermes statt', 'auf dem Remote-Oxeegen Hermes statt']
  ])('rewrites %j', (input, expected) => {
    expect(rebrandText(input)).toBe(expected)
  })

  it.each([
    'run `hermes setup`',
    '~/.hermes/config.yaml',
    'HERMES_HOME',
    'hermes://open',
    'HermesBots roster',
    'Oxeegen Hermes is ready',
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

    expect(out.title).toBe('Oxeegen Hermes')
    expect(out.nested.greet('Ana')).toBe('Oxeegen Hermes says hi to Ana')
    expect(out.list).toEqual(['Oxeegen Hermes', 'other'])
    expect(out.count).toBe(3)
  })
})
