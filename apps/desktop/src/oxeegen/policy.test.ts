import { describe, expect, it } from 'vitest'

import { sharedMetricsOfferPending } from '@/store/shared-metrics'

import { baseUrlForRegion, OXEEGEN, OXEEGEN_REGIONS, regionForBaseUrl } from './config'
import { isVisibleSettingsView } from './settings-policy'

describe('Oxeegen regions', () => {
  it('round-trips every region through its endpoint', () => {
    for (const region of OXEEGEN_REGIONS) {
      expect(regionForBaseUrl(baseUrlForRegion(region.id))).toBe(region.id)
      expect(regionForBaseUrl(`${region.baseUrl}/`)).toBe(region.id)
    }
  })

  it('does not claim an endpoint that is not an Oxeegen region', () => {
    expect(regionForBaseUrl('https://api.openai.com/v1')).toBeNull()
    expect(regionForBaseUrl(null)).toBeNull()
  })

  it('defaults to a region that exists', () => {
    expect(OXEEGEN_REGIONS.map(r => r.id)).toContain(OXEEGEN.defaultRegion)
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
