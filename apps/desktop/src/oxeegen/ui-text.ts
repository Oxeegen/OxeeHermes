/**
 * Oxee Hermes: English the app receives as data (scheduled-job templates, connector and messaging
 * descriptions, toolset names, catalog categories) or that upstream writes in place, shown in the
 * UI language.
 *
 * ui-text/<lang>.json maps the English text (whitespace collapsed) to its translation; it is small
 * and ships in the main bundle, so a lookup is synchronous and works outside React too.
 * oxeegen/scripts/ui_texts.py collects the texts from their sources, lists the untranslated ones
 * and drops entries no source has any more: a text rewritten upstream shows in English until it is
 * translated again.
 */
import { useMemo } from 'react'

import { useI18n } from '@/i18n'
import { getRuntimeI18nLocale } from '@/i18n/runtime'
import type { AutomationBlueprint } from '@/types/hermes'

import { rebrandText } from './rebrand'

type Table = Record<string, string>

const TABLES = import.meta.glob<Table>('./ui-text/*.json', { eager: true, import: 'default' })

const baseLanguage = (locale: string): string => locale.toLowerCase().split(/[-_]/)[0]

/** `text` in `locale` when the table holds it, else `text`. */
export function translateUiText(text: string, locale: string): string {
  if (!text) {
    return text
  }

  const table = TABLES[`./ui-text/${baseLanguage(locale)}.json`]
  const key = text.replace(/\s+/g, ' ').trim()
  // The backend sends some texts already renamed ("Run Oxee Hermes from…"); the table keys the
  // English as upstream writes it. A translation is renamed like the rest of the app.
  const hit = table?.[key] ?? table?.[key.replaceAll('Oxee Hermes', 'Hermes')]

  return hit === undefined ? text : rebrandText(hit)
}

/** `text` in the active UI language, for module-level code. React prefers useOxeeText. */
export const oxeeTextNow = (text: string): string => translateUiText(text, getRuntimeI18nLocale())

/** A function giving `text` in the UI language; re-renders with the language. */
export function useOxeeText(): (text: string) => string {
  const { locale } = useI18n()

  return text => translateUiText(text, locale)
}

/** Scheduled-job templates with their title, description and field labels in the UI language.
 *  Option values stay as they are: they are sent back to the backend. */
export function useTranslatedBlueprints(list: AutomationBlueprint[]): AutomationBlueprint[] {
  const { locale } = useI18n()

  // Stable across renders: the cron editor resets its fields whenever the template object changes.
  return useMemo(() => {
    const tx = (text: string) => translateUiText(text, locale)

    return list.map(item => ({
      ...item,
      title: tx(item.title),
      description: tx(item.description),
      fields: item.fields.map(field => ({ ...field, label: tx(field.label), help: field.help && tx(field.help) }))
    }))
  }, [list, locale])
}
