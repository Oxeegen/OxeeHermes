import { SETTINGS_ROUTE } from '@/app/routes'
import { requestRoute } from '@/store/recovery-requests'

/**
 * Oxee Hermes: the onboarding overlay only holds the Oxeegen region + key form
 * (oxeegen-onboarding.tsx), so "add a provider" opens Settings > Providers: API
 * keys for a named provider, Custom endpoints for an OpenAI-compatible URL.
 * Accounts (Nous / OAuth sign-ins) is not offered (settings-policy.ts).
 */
export function openOxeegenProviderSetup(slug = ''): void {
  const lower = slug.trim().toLowerCase()
  const custom = lower === 'custom' || lower === 'local' || lower.startsWith('custom:')

  requestRoute(`${SETTINGS_ROUTE}?tab=providers&pview=${custom ? 'custom-endpoints' : 'keys'}`)
}
