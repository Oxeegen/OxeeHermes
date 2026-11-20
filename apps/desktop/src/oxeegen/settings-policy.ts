/**
 * Which Settings views Oxee Hermes shows. Hidden views drop out of the nav,
 * the router enum (so any `?tab=<hidden>` deep link falls back to the Oxeegen
 * page), the settings search and the command palette.
 *
 * Billing belongs to Nous services. Providers is not offered: the managed
 * scope allows no provider but Oxeegen, whose key the Oxeegen page holds. Web
 * Access (serving the Webapp to other devices) is not offered. Model and
 * Advanced are shown: the managed scope still pins the main model.
 * Plugins stays: a model-provider plugin cannot route inference elsewhere.
 * Passwords and credentials (vault) stays: it keeps the user's own logins
 * (local, Bitwarden, 1Password). Gateways stays: it is how other Hermes on the
 * network are added (remote URL + token, SSH), with Hermes Cloud — a Nous
 * service — removed (OXEEGEN_HERMES_CLOUD).
 */
import { OXEEGEN } from './config'

export const OXEEGEN_SETTINGS_VIEW = 'oxeegen'

const HIDDEN_SETTINGS_VIEWS: ReadonlySet<string> = new Set(['billing', 'providers', 'web-access'])

/** `view` may carry query tails (`providers&pview=keys`); only the tab counts. */
export function isVisibleSettingsView(view: string): boolean {
  return !HIDDEN_SETTINGS_VIEWS.has(view.split('&')[0] ?? view)
}

/**
 * The model menus offer Oxeegen's chat models only: no "add a provider", no
 * custom model slug, no catalog editing. The backend enforces the same through
 * the provider allowlist; this keeps the doors out of sight.
 */
export const OXEEGEN_MODEL_MENU_EXTRAS = false

const DESKTOP_PLUGINS_ENABLED: ReadonlySet<string> = new Set(OXEEGEN.desktopPluginsEnabled)

/** A bundled desktop plugin's default when the user never chose: on for the oxeegen.json
 *  `desktop_plugins_enabled` list (Kanban), else upstream's own default. */
export function oxeegenPluginDefault(id: string, upstreamDefault: boolean): boolean {
  return DESKTOP_PLUGINS_ENABLED.has(id) || upstreamDefault
}

/** Hermes Cloud is Nous's hosted gateway service: never offered as a connection. */
export const OXEEGEN_HERMES_CLOUD = false

/**
 * Advanced > Terminal backend offers `local` only (constants.ts): the agent's commands run on this
 * computer, never in a container or a third-party cloud sandbox, so the image of each of those
 * backends has nothing to configure.
 */
const TERMINAL_IMAGE_FIELDS = ['terminal.daytona_image', 'terminal.docker_image', 'terminal.modal_image', 'terminal.singularity_image']

/**
 * Voice is chained: Oxeegen STT → Hermes → Oxeegen TTS, pinned by the managed
 * scope (gen-managed.py). The Voice conversation page and these rows would
 * only offer choices that cannot apply: another wiring (GPT-Live), another
 * provider, live transcription, turning recognition off.
 */
const HIDDEN_SETTING_FIELDS: ReadonlySet<string> = new Set([
  ...TERMINAL_IMAGE_FIELDS,
  'stt.enabled',
  'stt.openai.streaming_model',
  'stt.provider',
  'stt.streaming',
  'tts.provider',
  'voice.client_direct',
  'voice.gpt_live.instructions',
  'voice.gpt_live.voice',
  'voice.max_recording_seconds',
  'voice.voice_chat_mode'
])

const HIDDEN_CONFIG_SUBPAGES: ReadonlySet<string> = new Set(['voice:conversation'])

export function isVisibleSettingField(key: string): boolean {
  return !HIDDEN_SETTING_FIELDS.has(key)
}

export function isVisibleConfigSubpage(section: string, page: string): boolean {
  return !HIDDEN_CONFIG_SUBPAGES.has(`${section}:${page}`)
}

/**
 * Settings > Voice > Speech recognition > Transcription language. "system" is
 * resolved to the OS language by the backend (tools/transcription_tools.py),
 * which is also the default; the rest are ISO-639-1 codes. Labels: stt-language.ts.
 */
export const STT_LANGUAGES = ['system', 'fr', 'en', 'de', 'es', 'it', 'nl', 'pt', 'pl', 'ar', 'zh', 'ja']

/**
 * The voice chat engine picker (chevron by the voice button, rows in the voice
 * menu): voice is always chained Oxeegen STT -> Hermes -> Oxeegen TTS, so it
 * would offer a choice that does not exist.
 */
export const OXEEGEN_VOICE_ENGINE_PICKER = false

/** The "set the shortcut in Keyboard shortcuts" banner on every Voice page (it also names a CLI-only key). */
export const OXEEGEN_VOICE_SHORTCUT_HINT = false

/** Upstream's first-run onboarding is a chat with the model, opened before anything is configured: in
 *  Oxee Hermes nothing can answer it until the Oxeegen region and key form is filled, so the launch
 *  shows that form instead. Settings > Onboarding can still run the chat once a key is saved. */
export const OXEEGEN_FIRST_RUN_CHAT = false

/** Rows the managed scope sets: shown as their value, from oxeegen.json, with no editor. */
export const OXEEGEN_PINNED_SETTING_FIELDS: ReadonlyMap<string, { label: 'sttModel' | 'ttsModel'; value: string }> = new Map([
  ['stt.openai.model', { label: 'sttModel', value: OXEEGEN.sttModel }],
  ['tts.openai.model', { label: 'ttsModel', value: OXEEGEN.ttsModel }]
])

/** The TTS voice row: the voxee voices from oxeegen.json, grouped by gender (voice-field.tsx). */
export const OXEEGEN_VOICE_SETTING_FIELD = 'tts.openai.voice'
