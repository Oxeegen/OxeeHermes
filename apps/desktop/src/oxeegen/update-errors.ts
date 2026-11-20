import { oxeegenStrings } from './strings'

/**
 * The card line for a classified feed failure (electron/updater/feed-errors.ts), in the
 * UI language; null for any other status, which keeps upstream's wording.
 */
export function oxeegenUpdateErrorLine(status: { error?: string } | null | undefined, locale: string): null | string {
  const s = oxeegenStrings(locale)

  return status?.error === 'no-release' ? s.updateNoRelease : status?.error === 'feed-unreachable' ? s.updateUnreachable : null
}

/**
 * The card's view with a classified feed failure as its one line (no raw error), the
 * administrator's .msi install in the UI language (electron/updater/external.ts), else unchanged.
 */
export function oxeegenUpdateView<V extends { error?: unknown; line?: unknown; tone: string }>(
  view: V,
  status: { error?: string; reason?: string } | null | undefined,
  locale: string
): V {
  if (view.tone === 'unsupported' && status?.reason === 'administrator-managed') {
    return { ...view, line: oxeegenStrings(locale).updateByAdministrator }
  }

  const feedError = view.tone === 'error' ? oxeegenUpdateErrorLine(status, locale) : null

  return feedError ? { ...view, error: undefined, line: feedError } : view
}
