import { useI18n } from '@/i18n'

import { STT_LANGUAGES } from './settings-policy'
import { useOxeegenStrings } from './strings'

/** Option labels in the UI language: "System language", then each language's own name. */
export function useSttLanguageLabels(): Record<string, string> {
  const { locale } = useI18n()
  const s = useOxeegenStrings()
  const names = new Intl.DisplayNames([locale], { type: 'language' })
  const capitalize = (name: string) => name.charAt(0).toLocaleUpperCase(locale) + name.slice(1)

  return Object.fromEntries(
    STT_LANGUAGES.map(code => [code, code === 'system' ? s.systemLanguage : capitalize(names.of(code) ?? code)])
  )
}
