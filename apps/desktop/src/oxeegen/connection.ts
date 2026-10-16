import { getEnvVars, type ProfileScope, revealEnvVar, setEnvVar } from '@/hermes'

import { baseUrlForRegion, OXEEGEN, type OxeegenRegionId, regionForBaseUrl } from './config'

/**
 * The whole Oxeegen connection is two `.env` values: the API key and the
 * region's endpoint. Provider, model, voice routing and the provider allowlist
 * are pinned by the managed scope (oxeegen/managed/config.yaml), which reads
 * both through `${…}` references.
 */
export interface OxeegenConnection {
  keySet: boolean
  keyPreview: null | string
  region: null | OxeegenRegionId
}

type GatewayRequester = <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>

export async function readOxeegenConnection(profile?: ProfileScope): Promise<OxeegenConnection> {
  const env = await getEnvVars(typeof profile === 'object' && profile ? profile.profile : profile)
  const key = env[OXEEGEN.apiKeyEnv]
  const url = env[OXEEGEN.baseUrlEnv]?.is_set ? (await revealEnvVar(OXEEGEN.baseUrlEnv, profile)).value : null

  return {
    keySet: Boolean(key?.is_set),
    keyPreview: key?.redacted_value ?? null,
    region: regionForBaseUrl(url)
  }
}

/** Writes the region (always) and the key (when given), then reloads the
 *  backend's environment so the next turn uses them. */
export async function saveOxeegenConnection(
  { apiKey, region }: { apiKey?: string; region: OxeegenRegionId },
  requestGateway: GatewayRequester,
  profile?: ProfileScope
): Promise<void> {
  await setEnvVar(OXEEGEN.baseUrlEnv, baseUrlForRegion(region), profile)

  if (apiKey?.trim()) {
    await setEnvVar(OXEEGEN.apiKeyEnv, apiKey.trim(), profile, { providerSetup: true })
  }

  await requestGateway('reload.env').catch(() => undefined)
}
