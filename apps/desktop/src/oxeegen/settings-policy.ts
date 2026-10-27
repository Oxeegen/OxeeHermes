/**
 * Which Settings views Oxee Hermes shows. Hidden views drop out of the nav,
 * the router enum (so any `?tab=<hidden>` deep link — "Open Settings →
 * Providers", billing recovery, gateway pills — falls back to the Oxeegen
 * page), the settings search and the command palette.
 *
 * Model and Providers are replaced by the Oxeegen page; the rest belong to Nous
 * services (billing) or were dropped from the product (advanced). Plugins stays:
 * a model-provider plugin cannot route inference elsewhere, the provider
 * allowlist of the managed scope refuses any provider but Oxeegen. Passwords and
 * credentials (vault) stays: it keeps the user's own logins (local, Bitwarden,
 * 1Password). Gateways stays: it is
 * how other Hermes on the network are added (remote URL + token, SSH), with
 * Hermes Cloud — a Nous service — removed (OXEEGEN_HERMES_CLOUD).
 */
import { OXEEGEN } from './config'

export const OXEEGEN_SETTINGS_VIEW = 'oxeegen'

const HIDDEN_SETTINGS_VIEWS: ReadonlySet<string> = new Set([
  'billing',
  'config:advanced',
  'config:model',
  'providers'
])

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

/** Hermes Cloud is Nous's hosted gateway service: never offered as a connection. */
export const OXEEGEN_HERMES_CLOUD = false

/**
 * Voice is chained: Oxeegen STT → Hermes → Oxeegen TTS, pinned by the managed
 * scope (gen-managed.py). The Voice conversation page and these rows would
 * only offer choices that cannot apply: another wiring (GPT-Live), another
 * provider, live transcription, turning recognition off.
 */
const HIDDEN_SETTING_FIELDS: ReadonlySet<string> = new Set([
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

/** The "set the shortcut in Keyboard shortcuts" banner on every Voice page (it also names a CLI-only key). */
export const OXEEGEN_VOICE_SHORTCUT_HINT = false

/** Rows the managed scope sets: shown as their value, from oxeegen.json, with no editor. */
export const OXEEGEN_PINNED_SETTING_FIELDS: ReadonlyMap<string, { label: 'sttModel' | 'ttsModel'; value: string }> = new Map([
  ['stt.openai.model', { label: 'sttModel', value: OXEEGEN.sttModel }],
  ['tts.openai.model', { label: 'ttsModel', value: OXEEGEN.ttsModel }]
])

/** The TTS voice row: the voxee voices from oxeegen.json, grouped by gender (voice-field.tsx). */
export const OXEEGEN_VOICE_SETTING_FIELD = 'tts.openai.voice'
