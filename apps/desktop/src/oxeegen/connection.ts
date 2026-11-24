import { credentialPreview } from '@/app/settings/helpers'
import { getEnvVars, getHermesConfig, type ProfileScope, revealEnvVar, setEnvVar } from '@/hermes'
import { $setupReadyTick } from '@/store/live-sync'

import { OXEEGEN, OXEEGEN_REGIONS, oxeegenRegion, type OxeegenRegionId, parseRegion } from './config'

/**
 * The Oxeegen connection lives in `.env`: the region the user chose
 * (`OXEEGEN_REGION`) and one key per region (a key is valid in its region
 * only). The runtime and the managed scope (oxeegen/managed/config.yaml) read
 * one ACTIVE pair, `OXEEGEN_API_KEY` / `OXEEGEN_BASE_URL`, derived from the
 * region: here on save, and by the provider plugin on every backend start
 * (plugins/model-providers/oxeegen), so endpoints only ever live in oxeegen.json.
 */
export interface OxeegenRegionKey {
  preview: null | string
  set: boolean
}

export interface OxeegenConnection {
  keys: Record<OxeegenRegionId, OxeegenRegionKey>
  /** Set when the administrator set the region and key for the computer (the
   *  machine's oxeegen.env, electron/oxeegen-managed.ts): nothing to edit here. */
  managedRegion: null | OxeegenRegionId
  region: null | OxeegenRegionId
}

type GatewayRequester = <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>

const scopeProfile = (profile?: ProfileScope) => (typeof profile === 'object' && profile ? profile.profile : profile)

export async function readOxeegenConnection(profile?: ProfileScope): Promise<OxeegenConnection> {
  const [env, config] = await Promise.all([getEnvVars(scopeProfile(profile)), getHermesConfig(scopeProfile(profile) ?? undefined)])
  const managed = (config as { oxeegen?: { managed_region?: string } }).oxeegen?.managed_region

  const keys = Object.fromEntries(
    OXEEGEN_REGIONS.map(r => [
      r.id,
      { preview: credentialPreview(env[r.apiKeyEnv]?.redacted_value), set: Boolean(env[r.apiKeyEnv]?.is_set) }
    ])
  ) as Record<OxeegenRegionId, OxeegenRegionKey>

  const region = env[OXEEGEN.regionEnv]?.is_set
    ? parseRegion((await revealEnvVar(OXEEGEN.regionEnv, profile)).value)
    : null

  return { keys, managedRegion: parseRegion(managed), region }
}

/** Stores the region (and its key when given), derives the active key and
 *  endpoint, then reloads the backend's environment so the next turn uses them. */
export async function saveOxeegenConnection(
  { apiKey, region }: { apiKey?: string; region: OxeegenRegionId },
  requestGateway: GatewayRequester,
  profile?: ProfileScope
): Promise<void> {
  const target = oxeegenRegion(region)
  const typed = apiKey?.trim() ?? ''

  if (typed) {
    await setEnvVar(target.apiKeyEnv, typed, profile, { providerSetup: true })
  }

  const activeKey = typed || (await revealEnvVar(target.apiKeyEnv, profile)).value

  await setEnvVar(OXEEGEN.regionEnv, region, profile)
  await setEnvVar(OXEEGEN.baseUrlEnv, target.baseUrl, profile)
  await setEnvVar(OXEEGEN.apiKeyEnv, activeKey, profile)
  await requestGateway('reload.env').catch(() => undefined)
  // The status chip re-checks inference readiness only at seams (boot, window focus, OAuth): without
  // this it keeps the "no credentials" verdict from before the key until the window loses focus.
  $setupReadyTick.set($setupReadyTick.get() + 1)
}
