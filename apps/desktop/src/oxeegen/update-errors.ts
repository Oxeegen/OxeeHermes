import { oxeegenStrings } from './strings'

/**
 * The card line for a classified feed failure (electron/updater/feed-errors.ts), in the
 * UI language; null for any other status, which keeps upstream's wording.
 */
export function oxeegenUpdateErrorLine(status: { error?: string } | null | undefined, locale: string): null | string {
  const s = oxeegenStrings(locale)

  return status?.error === 'no-release' ? s.updateNoRelease : status?.error === 'feed-unreachable' ? s.updateUnreachable : null
}
