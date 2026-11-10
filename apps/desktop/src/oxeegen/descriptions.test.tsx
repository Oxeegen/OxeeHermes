import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { I18nProvider } from '@/i18n/context'

import { descriptionKey, OxeeDescription, shardOf, translateDescription } from './descriptions'

const frenchOf = async (text: string): Promise<string | undefined> => {
  const key = descriptionKey(text)
  const shard = (await import(`./descriptions/fr/${shardOf(key)}.json`)) as { default: Record<string, string> }

  return shard.default[key]
}

afterEach(cleanup)

// plugins/disk-cleanup/plugin.yaml, a bundled plugin the French table must cover.
const DISK_CLEANUP =
  'Auto-track and clean up ephemeral files (test scripts, temp outputs, cron logs) created during Hermes sessions. ' +
  'Runs via plugin hooks — no agent action required.'

describe('skill and plugin descriptions in the UI language', () => {
  it('keys a description like oxeegen/scripts/descriptions.py does', () => {
    // Same vectors as tests/scripts/test_oxeegen_descriptions.py.
    expect(descriptionKey('Plan your day.')).toBe('xfyem5zllw')
    expect(descriptionKey('  Multi\n line\tdescription  ')).toBe('m5d2bql848')
    expect(descriptionKey('Café — naïve 🚀 emoji')).toBe('275lot0za54')
    expect(['xfyem5zllw', 'm5d2bql848', '275lot0za54'].map(shardOf)).toEqual(['0', '8', '4'])
  })

  it('a description rewritten since its translation, or never translated, stays in English', () => {
    const table: Record<string, string> = { [descriptionKey('Plan your day.')]: 'Planifiez votre journée.' }
    const lookup = (key: string) => table[key]

    expect(translateDescription('Plan  your\nday.', lookup)).toBe('Planifiez votre journée.')
    expect(translateDescription('Plan your week.', lookup)).toBe('Plan your week.')
    expect(translateDescription('Plan your day.', () => undefined)).toBe('Plan your day.')
  })

  it('shows a bundled plugin description in French, and in English for an English UI', async () => {
    const french = await frenchOf(DISK_CLEANUP)
    expect(french).toBeTruthy()

    render(
      <I18nProvider configClient={null} initialLocale="fr">
        <OxeeDescription text={DISK_CLEANUP} />
      </I18nProvider>
    )
    expect(await screen.findByText(french!)).toBeTruthy()
    cleanup()

    render(
      <I18nProvider configClient={null} initialLocale="en">
        <OxeeDescription text={DISK_CLEANUP} />
      </I18nProvider>
    )
    expect(screen.getByText(DISK_CLEANUP)).toBeTruthy()
  })
})
