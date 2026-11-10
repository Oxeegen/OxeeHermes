/**
 * Oxee Hermes: skill and plugin descriptions in the UI language.
 *
 * Hermes shows them as their authors wrote them, in English. descriptions/<lang>.json holds their
 * translations (oxeegen/scripts/descriptions.py builds it from the bundled skills and plugins and
 * the published catalogs), keyed by a hash of the English text: a description rewritten since
 * shows in English rather than an outdated translation. Each table is split by key into small
 * files that load on first use, apart from the app's main bundle.
 */
import { useStore } from '@nanostores/react'
import { map } from 'nanostores'

import { useI18n } from '@/i18n'

type Table = Record<string, string>

/** ./descriptions/<lang>/<shard>.json, each loaded on its own when first needed. */
const LOADERS = import.meta.glob<{ default: Table }>('./descriptions/*/*.json')
/** descriptions.py SHARDS. */
const SHARDS = 16

const $tables = map<Record<string, Table>>({})
const requested = new Set<string>()

export const normalizeDescription = (text: string): string => text.replace(/\s+/g, ' ').trim()

/** cyrb53 of the normalized text, base 36 (descriptions.py description_key computes the same). */
export function descriptionKey(text: string): string {
  const value = normalizeDescription(text)
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57

  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

const baseLanguage = (locale: string): string => locale.toLowerCase().split(/[-_]/)[0]

/** The file holding `key` (descriptions.py shard_of computes the same). */
export const shardOf = (key: string): string => (parseInt(key.slice(-1), 36) % SHARDS).toString(16)

function requestShard(id: string): void {
  const load = LOADERS[`./descriptions/${id}.json`]

  if (!load || requested.has(id)) {
    return
  }

  requested.add(id)
  void load()
    .then(module => $tables.setKey(id, module.default))
    .catch(() => requested.delete(id))
}

/** `text` translated by `lookup` (its key -> translation), else `text` itself. */
export function translateDescription(text: string, lookup: (key: string) => string | undefined): string {
  return (text && lookup(descriptionKey(text))) || text
}

/** A function giving a skill or plugin description in the UI language, as soon as its file is loaded. */
export function useOxeeDescription(): (text: string) => string {
  const { locale } = useI18n()
  const lang = baseLanguage(locale)
  const loaded = useStore($tables)

  return (text: string) =>
    translateDescription(text, key => {
      const id = `${lang}/${shardOf(key)}`

      if (!loaded[id]) {
        requestShard(id)
      }

      return loaded[id]?.[key]
    })
}

/** A skill or plugin description, in the UI language when its table holds it. */
export function OxeeDescription({ text }: { text: string }) {
  return <>{useOxeeDescription()(text)}</>
}
