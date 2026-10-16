import { describe, expect, it } from 'vitest'

import { sharedMetricsOfferPending } from '@/store/shared-metrics'

import { OXEEGEN, OXEEGEN_REGIONS, oxeegenRegion, parseRegion } from './config'
import { isVisibleSettingsView } from './settings-policy'

describe('Oxeegen regions', () => {
  it('parses every stored region id, case-insensitively', () => {
    for (const region of OXEEGEN_REGIONS) {
      expect(parseRegion(region.id)).toBe(region.id)
      expect(parseRegion(` ${region.id.toUpperCase()} `)).toBe(region.id)
    }
  })

  it('rejects anything that is not a region id', () => {
    expect(parseRegion('https://inference-04.oxeegen.com/v1')).toBeNull()
    expect(parseRegion(null)).toBeNull()
  })

  it('gives every region its own endpoint and its own key variable', () => {
    expect(new Set(OXEEGEN_REGIONS.map(r => r.baseUrl)).size).toBe(OXEEGEN_REGIONS.length)
    expect(new Set(OXEEGEN_REGIONS.map(r => r.apiKeyEnv)).size).toBe(OXEEGEN_REGIONS.length)
    expect(OXEEGEN_REGIONS.map(r => r.apiKeyEnv)).not.toContain(OXEEGEN.apiKeyEnv)
  })

  it('defaults to a region that exists', () => {
    expect(oxeegenRegion(OXEEGEN.defaultRegion).id).toBe(OXEEGEN.defaultRegion)
  })
})

describe('Oxeegen settings policy', () => {
  it.each(['config:model', 'config:advanced', 'providers', 'providers&pview=keys', 'billing', 'gateway', 'connections', 'plugins', 'vault'])(
    'hides %s',
    view => expect(isVisibleSettingsView(view)).toBe(false)
  )

  it.each(['oxeegen', 'config:chat', 'config:voice', 'config:browser', 'keys', 'sessions', 'about'])('keeps %s', view =>
    expect(isVisibleSettingsView(view)).toBe(true)
  )
})

describe('Oxeegen privacy', () => {
  it('never offers to share metrics with Nous, even for an undecided profile', () => {
    expect(sharedMetricsOfferPending({ decided: false } as Parameters<typeof sharedMetricsOfferPending>[0])).toBe(false)
  })
})
