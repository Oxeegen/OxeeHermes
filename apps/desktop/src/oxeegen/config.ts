/**
 * Oxeegen endpoints and models, read from the single source the backend plugin
 * and the managed-config generator share (plugins/model-providers/oxeegen).
 */
import raw from '../../../../plugins/model-providers/oxeegen/oxeegen.json'

export type OxeegenRegionId = keyof typeof raw.regions

export interface OxeegenRegion {
  /** Each region has its own key; a key is valid in its region only. */
  apiKeyEnv: string
  baseUrl: string
  id: OxeegenRegionId
  label: string
}

export const OXEEGEN = {
  /** The ACTIVE key / endpoint the runtime reads, derived from the stored region. */
  apiKeyEnv: raw.api_key_env,
  baseUrlEnv: raw.base_url_env,
  /** What the user chose, stored in .env. */
  regionEnv: raw.region_env,
  defaultRegion: raw.default_region as OxeegenRegionId,
  mainModel: raw.models.main,
  provider: raw.provider,
  sttModel: raw.voice.stt_model,
  ttsModel: raw.voice.tts_model,
  ttsVoice: raw.voice.tts_voice,
  signupUrl: raw.signup_url
} as const

export interface OxeegenVoice {
  id: string
  name: string
  gender: 'female' | 'male'
}

/** The voxee voices Settings > Voice > Speech offers, in oxeegen.json order. */
export const OXEEGEN_VOICES: readonly OxeegenVoice[] = raw.voice.tts_voices as OxeegenVoice[]

export const OXEEGEN_REGIONS: readonly OxeegenRegion[] = (Object.keys(raw.regions) as OxeegenRegionId[]).map(id => ({
  apiKeyEnv: raw.regions[id].api_key_env,
  baseUrl: raw.regions[id].base_url,
  id,
  label: raw.regions[id].label
}))

/** The stored region id when it names a known region, else null. */
export function parseRegion(value: null | string | undefined): null | OxeegenRegionId {
  const id = (value ?? '').trim().toLowerCase()

  return OXEEGEN_REGIONS.some(region => region.id === id) ? (id as OxeegenRegionId) : null
}

export function oxeegenRegion(id: OxeegenRegionId): OxeegenRegion {
  return OXEEGEN_REGIONS.find(region => region.id === id)!
}
