/**
 * Oxeegen fork contract — the behaviour every Oxeegen-specific surface must keep
 * after an upstream merge. A failure here means a merge dropped or bent an
 * Oxeegen hook (see oxeegen/README.md, "Hooks dans les fichiers upstream").
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { enumOptionsFor } from '@/app/settings/helpers'
import { BrandMark } from '@/components/brand-mark'
import { Intro } from '@/components/chat/intro'
import { DesktopOnboardingOverlay } from '@/components/onboarding'
import { TRANSLATIONS } from '@/i18n'
import { registerAppLocale, resolveTranslations, unregisterAppLocaleSource } from '@/i18n/registry'
import { keybindAction } from '@/lib/keybinds/actions'
import { $desktopOnboarding, type DesktopOnboardingState, type OnboardingContext } from '@/store/onboarding'
import { markOnboardingDecided } from '@/store/onboarding-presence'
import { TITLEBAR_FIXED_TOOLS, titlebarAppActionsClusterCounts } from '@/store/titlebar-app-actions'
import { BUILTIN_THEMES, DEFAULT_SKIN_NAME } from '@/themes/presets'

import { OxeeTitlebarBrand } from './brand'
import { NEW_BROWSER_TAB_ACTION } from './browser'
import { OXEEGEN, OXEEGEN_REGIONS } from './config'
import { saveOxeegenConnection } from './connection'

const hermesApi = vi.hoisted(() => ({
  env: {} as Record<string, string>,
  revealEnvVar: vi.fn(),
  setEnvVar: vi.fn()
}))

vi.mock('@/hermes', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  revealEnvVar: hermesApi.revealEnvVar,
  setEnvVar: hermesApi.setEnvVar
}))

// Same word rule as ./rebrand.ts: the capitalised name in prose, not inside an identifier.
const BARE_PRODUCT_NAME = /(?<![_/\\.\w])(?<!Oxee )Hermes\b(?![-_/\\]|\.\w)/

function strings(value: unknown, path = ''): Array<[string, string]> {
  if (typeof value === 'string') {
    return [[path, value]]
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => strings(child, path ? `${path}.${key}` : key))
  }

  return []
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('product name', () => {
  it.each(Object.keys(TRANSLATIONS))('the bundled %s catalog never shows the bare upstream name', locale => {
    const offenders = strings(TRANSLATIONS[locale as keyof typeof TRANSLATIONS]).filter(([, text]) =>
      BARE_PRODUCT_NAME.test(text)
    )

    expect(offenders).toEqual([])
  })

  it('rewrites language packs registered at runtime (plugins, backend)', () => {
    registerAppLocale('en', { translations: { 'common.save': 'Save to Hermes' } }, 'plugin:oxeegen-test')

    try {
      expect(resolveTranslations('en').common.save).toBe('Save to Oxee Hermes')
    } finally {
      unregisterAppLocaleSource('plugin:oxeegen-test')
    }
  })
})

describe('brand', () => {
  it('ships the Oxeegen theme as the default', () => {
    expect(DEFAULT_SKIN_NAME).toBe('oxeegen')
    expect(Object.keys(BUILTIN_THEMES)[0]).toBe('oxeegen')
    expect(BUILTIN_THEMES.oxeegen.colors.primary).toBe('#5e4af5')
    expect(BUILTIN_THEMES.oxeegen.typography?.fontSans).toMatch(/^Geist,/)
  })

  it('shows the Oxeegen icon as the in-app brand mark', () => {
    const { container } = render(<BrandMark />)

    expect(container.querySelector('img')?.getAttribute('src')).toMatch(/oxeegen-icon(-dark)?\.svg$/)
  })

  it('shows the wordmark over an open sidebar and the icon alone once collapsed', () => {
    const open = render(<OxeeTitlebarBrand sidebarOpen />)

    expect(open.container.querySelector('img')?.getAttribute('src')).toMatch(/oxee-hermes-wordmark(-dark)?\.svg$/)
    open.unmount()

    const collapsed = render(<OxeeTitlebarBrand sidebarOpen={false} />)

    expect(collapsed.container.querySelector('img')?.getAttribute('src')).toMatch(/oxeegen-icon(-dark)?\.svg$/)
  })

  it('greets an empty chat with the wordmark', () => {
    const { container } = render(<Intro />)

    expect(container.querySelector('[data-oxee-brand="intro"]')?.getAttribute('src')).toMatch(/oxee-hermes-wordmark(-dark)?\.svg$/)
  })
})

describe('onboarding', () => {
  beforeEach(() => markOnboardingDecided())

  it('asks for the Oxeegen region and key, and offers no other provider', () => {
    $desktopOnboarding.set({
      configured: false,
      flow: { status: 'idle' },
      mode: 'oauth',
      providers: [],
      reason: null,
      requested: true,
      firstRunSkipped: false,
      manual: false,
      localEndpoint: false,
      freeTierReady: false
    } satisfies DesktopOnboardingState)

    render(
      <DesktopOnboardingOverlay
        enabled
        profile="default"
        requestGateway={(() => new Promise(() => {})) as OnboardingContext['requestGateway']}
      />
    )

    expect(screen.getByText('Connect to Oxeegen')).toBeTruthy()

    for (const region of OXEEGEN_REGIONS) {
      expect(screen.getByText(region.label)).toBeTruthy()
    }

    expect(document.body.textContent).not.toMatch(/OpenRouter|Nous Portal|free tier|Anthropic|OpenAI/i)
  })
})

describe('region and keys', () => {
  const [eu, us] = OXEEGEN_REGIONS
  const requestGateway = vi.fn(async () => undefined) as unknown as OnboardingContext['requestGateway']

  beforeEach(() => {
    hermesApi.setEnvVar.mockResolvedValue({ ok: true })
    hermesApi.revealEnvVar.mockImplementation(async (key: string) => ({ key, value: hermesApi.env[key] ?? '' }))
  })

  const written = () => Object.fromEntries(hermesApi.setEnvVar.mock.calls.map(([key, value]) => [key, value]))

  it('stores the region id, that region key, and the derived active pair', async () => {
    await saveOxeegenConnection({ apiKey: 'sk-us', region: us.id }, requestGateway)

    expect(written()).toEqual({
      [us.apiKeyEnv]: 'sk-us',
      [OXEEGEN.regionEnv]: us.id,
      [OXEEGEN.baseUrlEnv]: us.baseUrl,
      [OXEEGEN.apiKeyEnv]: 'sk-us'
    })
    expect(requestGateway).toHaveBeenCalledWith('reload.env')
  })

  it('switching region activates that region own saved key, never the other one', async () => {
    hermesApi.env = { [eu.apiKeyEnv]: 'sk-eu', [us.apiKeyEnv]: 'sk-us' }

    await saveOxeegenConnection({ region: eu.id }, requestGateway)

    expect(written()[OXEEGEN.apiKeyEnv]).toBe('sk-eu')
    expect(written()[OXEEGEN.baseUrlEnv]).toBe(eu.baseUrl)
    expect(hermesApi.revealEnvVar).toHaveBeenCalledWith(eu.apiKeyEnv, undefined)
    expect(hermesApi.revealEnvVar).not.toHaveBeenCalledWith(us.apiKeyEnv, undefined)
  })
})

describe('voice', () => {
  it.each(['stt.provider', 'tts.provider'])('%s only offers the Oxeegen-routed provider', key => {
    expect(enumOptionsFor(key, 'openai', {})).toEqual(['openai'])
  })

  it('offers no direct-to-OpenAI live voice mode', () => {
    expect(enumOptionsFor('voice.voice_chat_mode', 'chained', {})).toEqual(['chained'])
  })
})

describe('new browser tab', () => {
  it('is a bound action with an English label', () => {
    expect(keybindAction(NEW_BROWSER_TAB_ACTION)?.defaults).toEqual(['mod+alt+l'])
    expect(TRANSLATIONS.en.keybinds.actions[NEW_BROWSER_TAB_ACTION]).toBe('New browser tab')
  })

  it('has a fixed titlebar button whose width is reserved, Simple mode included', () => {
    expect(TITLEBAR_FIXED_TOOLS).toHaveProperty('new-browser')
    expect(titlebarAppActionsClusterCounts('right', 0, 0, 'simple').right).toBe(3)
  })

  it('the titlebar button opens a blank browser tab', async () => {
    const preview = await import('@/store/preview')
    const spy = vi.spyOn(preview, 'newBrowserTab')
    const { newBrowserTab } = await import('./browser')

    expect(newBrowserTab).toBe(preview.newBrowserTab)
    spy.mockRestore()
  })
})

describe('onboarding form', () => {
  it('requires the selected region key before connecting', async () => {
    const { OxeegenConnectionForm } = await import('./connection-form')

    hermesApi.env = {}
    render(<OxeegenConnectionForm requestGateway={vi.fn() as unknown as OnboardingContext['requestGateway']} />)

    const connect = await screen.findByRole('button', { name: 'Save' })

    await waitFor(() => expect((connect as HTMLButtonElement).disabled).toBe(true))
    fireEvent.change(screen.getByPlaceholderText('sk-…'), { target: { value: 'sk-test' } })
    expect((connect as HTMLButtonElement).disabled).toBe(false)
  })
})
