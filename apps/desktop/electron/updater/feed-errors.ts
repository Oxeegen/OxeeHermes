/**
 * Oxee Hermes: why an electron-updater feed check failed, as a code the renderer words
 * (src/oxeegen/update-errors.ts). The raw error (a GitHub 404 page, response headers
 * with session cookies) goes to the log only, never to the screen.
 */
export type FeedErrorCode = 'feed-unreachable' | 'no-release'

// electron-updater's codes for "the feed answered, but there is nothing to install".
const NO_RELEASE_CODES = new Set([
  'ERR_UPDATER_CHANNEL_FILE_NOT_FOUND',
  'ERR_UPDATER_INVALID_RELEASE_FEED',
  'ERR_UPDATER_LATEST_VERSION_NOT_FOUND',
  'ERR_UPDATER_NO_PUBLISHED_VERSIONS'
])

export const FEED_ERROR_MESSAGES: Record<FeedErrorCode, string> = {
  'feed-unreachable': 'The update server could not be reached.',
  'no-release': 'No Oxee Hermes release is published yet.'
}

/** A 404 (no repo, private repo, no release) or an empty feed is "no release"; the rest is "unreachable". */
export function classifyFeedError(error: unknown): FeedErrorCode {
  const { code, statusCode } = (error ?? {}) as { code?: unknown; statusCode?: unknown }

  return statusCode === 404 || (typeof code === 'string' && NO_RELEASE_CODES.has(code)) ? 'no-release' : 'feed-unreachable'
}
