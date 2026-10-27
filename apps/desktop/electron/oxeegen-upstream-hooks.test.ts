/**
 * Oxeegen upstream-hook guard. Each Oxeegen behaviour reaches into an upstream
 * file through a small hook; an upstream merge that resolves a conflict in
 * upstream's favour silently drops it. This test names every hook, so a merge
 * that loses one fails here with the file and the reason — re-apply the hook
 * (oxeegen/README.md, "Hooks dans les fichiers upstream") rather than editing
 * this list.
 *
 * Behaviour is pinned by the fork-behaviour / oxeegen-fork / Python tests; this
 * guard only proves the wiring is still in place, including spots those tests
 * cannot reach (CSS imports, render trees, build scripts).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

interface Hook {
  file: string
  needs: string[]
  why: string
}

const HOOKS: Hook[] = [
  // Product name
  { file: 'apps/desktop/src/i18n/catalog.ts', needs: ['rebrandTranslations('], why: 'bundled catalogs show "Oxee Hermes"' },
  { file: 'apps/desktop/src/i18n/registry.ts', needs: ['rebrandTranslations(value)'], why: 'plugin/backend language packs are rebranded' },
  { file: 'apps/desktop/vitest.config.ts', needs: ['./src/oxeegen/vitest-setup.ts'], why: 'tests see the rebranded catalogs' },
  // Brand
  { file: 'apps/desktop/src/themes/presets.ts', needs: ['createOxeegenTheme(', 'DEFAULT_SKIN_NAME = OXEEGEN_THEME_NAME'], why: 'Oxeegen theme is the default' },
  { file: 'apps/desktop/src/themes/use-skin-command.ts', needs: ["default: 'oxeegen'"], why: '/skin default lands on the Oxeegen theme' },
  { file: 'apps/desktop/src/styles.css', needs: ["@import './oxeegen/oxeegen.css'"], why: 'Geist font face' },
  { file: 'apps/desktop/src/components/brand-mark.tsx', needs: ['oxeegen-icon-dark.svg', 'oxeegen-icon.svg'], why: 'in-app logo' },
  { file: 'apps/desktop/src/themes/presets.ts', needs: ['createOxeegenTheme(monoTheme,'], why: "Oxeegen theme is Fred's Mono retint" },
  { file: 'apps/desktop/src/app/right-sidebar/files/tree.tsx', needs: ["from '@/oxeegen/file-icons/file-icon'", '<FileIcon kind="folder"', '<FileIcon kind="file"'], why: 'files tree shows Material icons' },
  // Forced configuration
  { file: 'apps/desktop/src/components/onboarding/index.tsx', needs: ['<OxeegenOnboarding ctx={ctx} />'], why: 'onboarding is region + key only' },
  { file: 'apps/desktop/src/app/settings/index.tsx', needs: ['oxeegen: OxeegenSettings', '.filter(isVisibleSettingsView)', '.filter(group => isVisibleSettingsView(group.id))', 'OXEEGEN_SETTINGS_VIEW as SettingsViewId'], why: 'Oxeegen settings page, hidden sections, deep-link fallback' },
  { file: 'apps/desktop/src/app/settings/types.ts', needs: ["| 'oxeegen'"], why: 'settings view id' },
  { file: 'apps/desktop/src/app/settings/use-settings-search.ts', needs: ['isVisibleSettingsView(entry.target.view)'], why: 'hidden sections stay out of search' },
  { file: 'apps/desktop/src/app/command-palette/index.tsx', needs: ['SECTIONS.filter(section => isVisibleSettingsView(', 'NON_CONFIG_SETTINGS.filter(entry => isVisibleSettingsView(entry.tab))'], why: 'hidden sections stay out of the palette' },
  { file: 'apps/desktop/src/app/settings/gateway-settings.tsx', needs: ['{OXEEGEN_HERMES_CLOUD && ('], why: 'Gateways: no Hermes Cloud (Nous) connection mode' },
  { file: 'apps/desktop/src/app/settings/connections-registry.tsx', needs: ["filter(kind => OXEEGEN_HERMES_CLOUD || kind !== 'cloud')"], why: 'Gateways: no Hermes Cloud connection kind' },
  { file: 'apps/desktop/src/app/shell/model-catalog-menu.tsx', needs: ['OXEEGEN_MODEL_MENU_EXTRAS && ('], why: 'model menu: no custom model / catalog editing' },
  { file: 'apps/desktop/src/components/model-picker.tsx', needs: ['OXEEGEN_MODEL_MENU_EXTRAS && ('], why: 'model picker: no "add provider" / custom model' },
  { file: 'apps/desktop/src/app/settings/constants.ts', needs: ["'stt.provider': ['openai']", "'tts.provider': ['openai']", "'voice.voice_chat_mode': ['chained']"], why: 'voice routed to Oxeegen only' },
  { file: 'apps/desktop/src/app/settings/helpers.ts', needs: ['if (!isVisibleSettingField(key)) {'], why: 'Voice: pinned STT / conversation rows hidden (page and search)' },
  { file: 'apps/desktop/src/app/settings/subpages.ts', needs: ['.filter(page => isVisibleConfigSubpage(section, page.id))'], why: 'Voice: no Voice conversation page' },
  { file: 'apps/desktop/src/app/settings/config-settings.tsx', needs: ['OXEEGEN_PINNED_SETTING_FIELDS.has(key) ? (', '<OxeegenPinnedField schemaKey={key} />'], why: 'Voice: STT model shown as its oxeegen.json value' },
  { file: 'apps/desktop/src/store/shared-metrics.ts', needs: ['export function sharedMetricsOfferPending(_consent'], why: 'no metrics offer to Nous' },
  { file: 'apps/desktop/src/app/settings/config-settings.tsx', needs: ['const showSharedMetrics = false'], why: 'no Nous sharing panel' },
  // New browser tab
  { file: 'apps/desktop/src/lib/keybinds/actions.ts', needs: ["{ id: 'view.newBrowserTab'"], why: 'new browser tab shortcut' },
  { file: 'apps/desktop/src/app/hooks/use-keybinds.ts', needs: ["'view.newBrowserTab': newBrowserTab"], why: 'new browser tab shortcut handler' },
  { file: 'apps/desktop/src/app/shell/titlebar-controls.tsx', needs: ["TITLEBAR_FIXED_TOOLS['new-browser']", 'newBrowserTab()'], why: 'new browser tab titlebar button' },
  { file: 'apps/desktop/src/app/shell/titlebar-controls.tsx', needs: ['<OxeeTitlebarBrand sidebarOpen={leftEdge.open} />'], why: 'Oxee Hermes wordmark in the titlebar' },
  { file: 'apps/desktop/src/components/chat/intro.tsx', needs: ['<OxeeIntroWordmark />'], why: 'Oxee Hermes wordmark over an empty chat' },
  { file: 'apps/desktop/src/store/titlebar-app-actions.ts', needs: ["'new-browser': {}", "['new-browser', 'settings', 'layout', 'hud']"], why: 'titlebar width reserves the button' },
  { file: 'apps/desktop/src/i18n/en.ts', needs: ["'view.newBrowserTab': 'New browser tab'"], why: 'shortcut label' },
  // Isolation from an installed official Hermes
  { file: 'apps/desktop/electron/main.ts', needs: ['oxeegenManagedDir(', "'oxee-hermes'", 'app.setAppUserModelId(PRODUCT_IDENTITY.appId)'], why: 'managed scope, own deep-link scheme, own AUMID' },
  { file: 'apps/desktop/electron/main.ts', needs: ['bundledTicketBackend() ?? ensureRuntime(', 'command: payload.storePython,'], why: 'bundled Windows gateway tickets run on the payload python (upstream bug fix)' },
  { file: 'apps/desktop/electron/notification-linux.ts', needs: ["new Variant('s', PRODUCT_IDENTITY.appId)"], why: 'Linux notifications use our desktop entry' },
  { file: 'apps/desktop/scripts/write-build-stamp.mjs', needs: ['oxeegenBundleEnvironment('], why: 'stamp carries the isolation env (CLI launcher reads it)' },
  { file: 'apps/desktop/scripts/bundle-electron-main.mjs', needs: ['oxeegenBundleEnvironment('], why: 'launch banner applies the isolation env' },
  { file: 'apps/desktop/scripts/before-build.mjs', needs: ['oxee-hermes://copilot-key/'], why: 'MSIX Copilot key uses our scheme' },
  { file: 'apps/desktop/scripts/set-exe-identity.mjs', needs: ["ProductName: 'Oxee Hermes'", 'Portions Copyright (c) 2025 Nous Research (MIT)'], why: 'Windows exe identity, MIT notice kept' },
  { file: 'apps/desktop/src/lib/update-notes.ts', needs: ["'oxeegen/oxee-hermes'"], why: 'release notes from the Oxeegen repo' },
  { file: 'scripts/build/launcher_wrapper.py', needs: ['apply_bundle_environment(repo_entry, environ)'], why: 'CLI lands in the isolated data home' },
  { file: 'hermes_cli/_launchers.py', needs: ['link_dir / f"oxee-hermes{name.removeprefix(\'hermes\')}"'], why: 'macOS CLI links never shadow `hermes`' },
  { file: 'hermes_cli/gateway.py', needs: ['def tagged_service_suffix(', 'return tagged_service_suffix("")'], why: 'own gateway service names' },
  { file: 'hermes_cli/gateway_runtime_service.py', needs: ['tagged_service_suffix('], why: 'finds our own gateway services' },
  // Lean bundle (no local engines, no uv cache, opted-out extras)
  { file: 'scripts/bundles/native.py', needs: ['not n.startswith(OXEEGEN_EXCLUDED_PREFIXES)', 'Oxeegen: no uv cache in the payload'], why: 'bundle skips local-model engines and the uv cache' },
  { file: 'scripts/bundles/native_prepared.py', needs: ['Oxeegen: no shipped uv cache'], why: 'prepared payload does not require a uv cache' },
  { file: 'scripts/bundles/desktop.py', needs: ['oxeegen_icons(desktop, icons / "apps/desktop")'], why: 'commit/canary bundles keep the Oxeegen icons (no Nous art)' },
  { file: 'pyproject.toml', needs: ['# Oxeegen: the bundle carries only what an Oxeegen-only agent uses'], why: 'unneeded extras stay out of the bundle venv' },
  { file: 'apps/desktop/electron/feature-flags.ts', needs: ["localModels: ({ argv }) => argv.includes('--local')"], why: 'Local models UI hidden (no engines shipped)' },
  { file: 'scripts/msix-shared.mjs', needs: ['process.env.OXEEGEN_MSIX_PUBLISHER ||'], why: 'MSIX published by Oxeegen' },
  // Provider allowlist
  { file: 'hermes_cli/inventory.py', needs: ['excluded_by_allowlist(cfg)'], why: 'pickers hide non-Oxeegen providers' },
  { file: 'hermes_cli/runtime_provider.py', needs: ['enforce_allowed_runtime(runtime)'], why: 'runtime refuses non-Oxeegen providers' }
]

describe('Oxeegen hooks in upstream files', () => {
  test.each(HOOKS)('$file — $why', ({ file, needs }) => {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8')
    const missing = needs.filter(snippet => !source.includes(snippet))

    expect(missing, `${file} lost its Oxeegen hook`).toEqual([])
  })

  test('the managed scope is the one generated from oxeegen.json', () => {
    const managed = fs.readFileSync(path.join(ROOT, 'oxeegen/managed/config.yaml'), 'utf8')

    expect(managed).toContain('allowed_providers: [oxeegen]')
    expect(managed).toContain('provider: oxeegen')
  })
})
