/**
 * Oxeegen endpoints and models, read from the single source the backend plugin
 * and the managed-config generator share (plugins/model-providers/oxeegen).
 */
import raw from '../../../../plugins/model-providers/oxeegen/oxeegen.json'

export type OxeegenRegionId = keyof typeof raw.regions

export interface OxeegenRegion {
  baseUrl: string
  id: OxeegenRegionId
  label: string
}

export const OXEEGEN = {
  apiKeyEnv: raw.api_key_env,
  baseUrlEnv: raw.base_url_env,
  defaultRegion: raw.default_region as OxeegenRegionId,
  mainModel: raw.models.main,
  provider: raw.provider,
  signupUrl: raw.signup_url
} as const

export const OXEEGEN_REGIONS: readonly OxeegenRegion[] = (Object.keys(raw.regions) as OxeegenRegionId[]).map(id => ({
  baseUrl: raw.regions[id].base_url,
  id,
  label: raw.regions[id].label
}))

/** The region whose endpoint is `url`, or null for anything else (unset, hand-edited). */
export function regionForBaseUrl(url: null | string | undefined): null | OxeegenRegionId {
  const normalized = (url ?? '').trim().replace(/\/+$/, '')

  return OXEEGEN_REGIONS.find(region => region.baseUrl.replace(/\/+$/, '') === normalized)?.id ?? null
}

export function baseUrlForRegion(region: OxeegenRegionId): string {
  return raw.regions[region].base_url
}
