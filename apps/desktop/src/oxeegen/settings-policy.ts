/**
 * Which Settings views Oxeegen Hermes shows. Hidden views drop out of the nav,
 * the router enum (so any `?tab=<hidden>` deep link — "Open Settings →
 * Providers", billing recovery, gateway pills — falls back to the Oxeegen
 * page), the settings search and the command palette.
 *
 * Model and Providers are replaced by the Oxeegen page; the rest would let a
 * user route inference elsewhere (gateways, plugins), belong to Nous services
 * (billing) or were dropped from the product (advanced, vault).
 */
export const OXEEGEN_SETTINGS_VIEW = 'oxeegen'

const HIDDEN_SETTINGS_VIEWS: ReadonlySet<string> = new Set([
  'billing',
  'config:advanced',
  'config:model',
  'connections',
  'gateway',
  'plugins',
  'providers',
  'vault'
])

/** `view` may carry query tails (`providers&pview=keys`); only the tab counts. */
export function isVisibleSettingsView(view: string): boolean {
  return !HIDDEN_SETTINGS_VIEWS.has(view.split('&')[0] ?? view)
}

/**
 * The model menus offer Oxeegen's chat models only: no "add a provider", no
 * custom model slug, no catalog editing. The backend enforces the same through
 * the provider allowlist; this keeps the doors out of sight.
 */
export const OXEEGEN_MODEL_MENU_EXTRAS = false
