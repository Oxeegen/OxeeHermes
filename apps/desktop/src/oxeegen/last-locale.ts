import { readKey, writeKey } from '@/lib/storage'

/**
 * Oxee Hermes: the language the app last showed, so the next start paints in it at once. The
 * saved `display.language` is read from the backend, which answers after the first paint: until
 * then every window showed English ("New session"…) for a moment. Only a first guess; the
 * config read still decides.
 */
const KEY = 'oxeegen:last-locale'

export const lastLocale = (): string | undefined => readKey(KEY) ?? undefined

export function rememberLocale(locale: string): void {
  writeKey(KEY, locale)
}
