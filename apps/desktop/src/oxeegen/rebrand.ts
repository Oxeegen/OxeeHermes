/**
 * Oxeegen product-name rewrite — the one rule both rebrand paths share:
 *
 *  - runtime: `rebrandTranslations` runs over every resolved i18n catalog
 *    (bundled locales, plugin packs, backend `.desktop.yaml` packs), so no
 *    upstream catalog file is edited;
 *  - source: `oxeegen/scripts/rebrand-source.mts` rewrites hardcoded UI string
 *    literals with `rebrandText`, re-run after every upstream merge.
 *
 * Only the capitalised standalone word is matched. Lowercase `hermes` is
 * load-bearing (CLI, `~/.hermes`, `hermes://`, package names) and `HERMES_*`
 * env vars must survive verbatim; both are untouched by the case-sensitive,
 * word-bounded match.
 *
 * Kept free of imports and non-erasable TypeScript so Node can load it
 * directly (type stripping) from the codemod.
 */

export const PRODUCT_NAME = 'Oxee Hermes'

// A word glued to `-`, `_`, `/`, `\` or a dotted suffix is an identifier, not
// prose: `X-Hermes-Session-Token`, `Hermes.app`, `C:\Hermes\venv`. Those
// stay verbatim; a trailing sentence period (`… Hermes.`) still matches. A
// leading hyphen alone is prose (German `Remote-Hermes`): identifiers that
// start that way continue with `-` too, which NOT_BEFORE refuses.
const NOT_AFTER = String.raw`(?<![_/\\.\w])`
const NOT_BEFORE = String.raw`(?![-_/\\]|\.\w)`

const rule = (core: string, flags = 'g') => new RegExp(`${NOT_AFTER}${core}${NOT_BEFORE}`, flags)

const RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [rule(String.raw`HERMES (?:AGENT|DESKTOP)\b`), 'OXEE HERMES'],
  // "Hermes desktop app" becomes "Oxee Hermes app", not "Oxee Hermes desktop app".
  // The look-behind keeps an already rewritten "Oxee Hermes" as it is.
  [rule(String.raw`(?<!Oxee )Hermes (?:Agent|[Dd]esktop)\b`), PRODUCT_NAME],
  [rule(String.raw`(?<!Oxee )Hermes\b`), PRODUCT_NAME]
]

const MARKER = /\bHermes\b|\bHERMES (?:AGENT|DESKTOP)\b/

export function rebrandText(text: string): string {
  if (!MARKER.test(text)) {
    return text
  }

  let out = text

  for (const [pattern, replacement] of RULES) {
    out = out.replace(pattern, replacement)
  }

  return out
}

/** Deep-rewrites a translation tree: strings directly, formatter functions by
 *  wrapping their string result. Other values pass through untouched. */
export function rebrandTranslations<T>(value: T): T {
  return rebrandValue(value) as T
}

function rebrandValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return rebrandText(value)
  }

  if (typeof value === 'function') {
    const fn = value as (...args: unknown[]) => unknown

    const wrapped = (...args: unknown[]) => {
      const result = fn(...args)

      return typeof result === 'string' ? rebrandText(result) : result
    }

    // Catalog tooling compares formatter arity across locales.
    Object.defineProperty(wrapped, 'length', { value: fn.length })

    return wrapped
  }

  if (Array.isArray(value)) {
    return value.map(rebrandValue)
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}

    for (const [key, child] of Object.entries(value)) {
      out[key] = rebrandValue(child)
    }

    return out
  }

  return value
}
