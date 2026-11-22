import { describe, expect, it } from 'vitest'

import { ENUM_OPTIONS } from '@/app/settings/constants'
import { sectionFieldEntries } from '@/app/settings/helpers'
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
  it.each(['billing', 'web-access', 'providers&pview=accounts'])('hides %s', view =>
    expect(isVisibleSettingsView(view)).toBe(false)
  )

  it.each(['config:model', 'config:advanced', 'providers', 'providers&pview=keys', 'providers&pview=custom-endpoints', 'oxeegen', 'config:chat', 'config:voice', 'config:browser', 'keys', 'sessions', 'about', 'gateway', 'connections', 'vault', 'plugins'])('keeps %s', view =>
    expect(isVisibleSettingsView(view)).toBe(true)
  )
})

describe('Oxeegen terminal backend', () => {
  it('offers only local, and Advanced shows no container or sandbox image', () => {
    const keys = ['terminal.backend', 'terminal.docker_image', 'terminal.singularity_image', 'terminal.modal_image', 'terminal.daytona_image']
    const schema = Object.fromEntries(keys.map(key => [key, { type: 'string' }]))

    const advanced = sectionFieldEntries(schema as Parameters<typeof sectionFieldEntries>[0], {}).get('advanced') ?? []

    expect(advanced.map(([key]) => key).filter(key => key.startsWith('terminal.'))).toEqual(['terminal.backend'])
    expect(ENUM_OPTIONS['terminal.backend']).toEqual(['local'])
  })
})

describe('Oxeegen privacy', () => {
  it('never offers to share metrics with Nous, even for an undecided profile', () => {
    expect(sharedMetricsOfferPending({ decided: false } as Parameters<typeof sharedMetricsOfferPending>[0])).toBe(false)
  })
})

describe('Oxeegen desktop plugins', () => {
  it('Kanban is on until the user switches it off, and an explicit choice wins', async () => {
    const { $pluginDecisions, pluginActive } = await import('@/contrib/plugins-store')

    $pluginDecisions.set({})
    expect(pluginActive('kanban', false)).toBe(true)
    expect(pluginActive('radio', false)).toBe(false)

    $pluginDecisions.set({ kanban: false })
    expect(pluginActive('kanban', false)).toBe(false)
    $pluginDecisions.set({})
  })
})
