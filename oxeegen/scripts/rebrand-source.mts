/**
 * Rewrites the upstream product name in hardcoded UI strings of the desktop
 * app (string literals, template text, JSX text). Re-run after every upstream
 * merge; it is idempotent.
 *
 *   node oxeegen/scripts/rebrand-source.mts          # apply + list changes
 *   node oxeegen/scripts/rebrand-source.mts --check  # exit 1 if anything is left
 *
 * Never touched: comments, identifiers, import/export specifiers, object keys,
 * element-access keys, regex literals, and src/i18n (rebranded at runtime, see
 * apps/desktop/src/oxeegen/rebrand.ts). The word rule itself lives in
 * rebrand.ts so the runtime and this script cannot drift.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { rebrandText } from '../../apps/desktop/src/oxeegen/rebrand.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const ts = createRequire(path.join(ROOT, 'apps/desktop/package.json'))('typescript')

const ROOTS = ['apps/desktop/src', 'apps/desktop/electron', 'apps/shared/src']
const SKIP_DIRS = new Set(['node_modules', 'dist', 'i18n', 'oxeegen'])
const EXTRA_FILES = ['apps/desktop/index.html']

const check = process.argv.includes('--check')

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)

    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) {
        yield* walk(full)
      }
    } else if (/\.(ts|tsx|mts|cts)$/.test(entry) && !entry.endsWith('.d.ts') && !entry.startsWith('oxeegen-')) {
      // oxeegen-* files are fork-owned (they may name upstream products on purpose).
      yield full
    }
  }
}

// Identity fields carry machine names (`appNamePascal: 'Hermes'`), not copy.
const IDENTITY_KEY = /(?:Pascal|^appId|^cliName|ExecutableName)$/

function isKeyPosition(node: any): boolean {
  const parent = node.parent

  if (!parent) {
    return false
  }

  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) || ts.isExternalModuleReference(parent)) {
    return true
  }

  if (ts.isLiteralTypeNode(parent) && ts.isImportTypeNode(parent.parent)) {
    return true
  }

  if (
    (ts.isPropertyAssignment(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isEnumMember(parent)) &&
    parent.name === node
  ) {
    return true
  }

  if (ts.isPropertyAssignment(parent) && parent.initializer === node && IDENTITY_KEY.test(parent.name.getText())) {
    return true
  }

  if (ts.isElementAccessExpression(parent) && parent.argumentExpression === node) {
    return true
  }

  // `env.TERM_PROGRAM = 'Hermes'`: an environment value is an identifier for
  // whatever reads it, not copy.
  return (
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    parent.right === node &&
    ts.isPropertyAccessExpression(parent.left) &&
    /^env$/i.test(parent.left.expression.getText())
  )
}

const TEXT_KINDS = new Set([
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.JsxText
])

/** `// oxeegen-keep` on the node's line or the line above leaves it verbatim:
 *  the escape hatch for data no rule can tell from copy. */
function isKept(sf: any, source: string, node: any): boolean {
  const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line
  const lines = sf.getLineStarts()
  const from = lines[Math.max(0, line - 1)]
  const to = lines[line + 1] ?? source.length

  return source.slice(from, to).includes('oxeegen-keep')
}

/** Rewrites only the pattern body, so the closing `/` delimiter does not read as
 *  a glued path separator and block the match. */
function rebrandRegex(raw: string): string {
  const end = raw.lastIndexOf('/')

  return `/${rebrandText(raw.slice(1, end))}${raw.slice(end)}`
}

interface Change {
  file: string
  line: number
  before: string
  after: string
}

const changes: Change[] = []

function rebrandFile(file: string) {
  const source = readFileSync(file, 'utf8')

  if (!/\bHermes\b|\bHERMES (?:AGENT|DESKTOP)\b/.test(source)) {
    return
  }

  const kind = file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind)
  const edits: Array<{ start: number; end: number; text: string }> = []

  // Tests assert on the copy with regexes too; production regexes match text
  // from elsewhere (the backend) and must keep the upstream wording.
  const isTest = /\.(test|spec)\.[cm]?tsx?$/.test(file) || file.includes(`${path.sep}e2e${path.sep}`)

  const visit = (node: any) => {
    const rewritable = TEXT_KINDS.has(node.kind) || (isTest && node.kind === ts.SyntaxKind.RegularExpressionLiteral)

    if (rewritable && !isKeyPosition(node) && !isKept(sf, source, node)) {
      const start = node.getStart(sf)
      const raw = source.slice(start, node.end)
      const next = node.kind === ts.SyntaxKind.RegularExpressionLiteral ? rebrandRegex(raw) : rebrandText(raw)

      if (next !== raw) {
        edits.push({ start, end: node.end, text: next })
        changes.push({
          file: path.relative(ROOT, file),
          line: sf.getLineAndCharacterOfPosition(start).line + 1,
          before: raw.trim(),
          after: next.trim()
        })
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sf)

  if (edits.length && !check) {
    let out = source

    for (const edit of edits.sort((a, b) => b.start - a.start)) {
      out = out.slice(0, edit.start) + edit.text + out.slice(edit.end)
    }

    writeFileSync(file, out)
  }
}

for (const root of ROOTS) {
  for (const file of walk(path.join(ROOT, root))) {
    rebrandFile(file)
  }
}

// index.html: only the visible <title>
for (const rel of EXTRA_FILES) {
  const file = path.join(ROOT, rel)
  const source = readFileSync(file, 'utf8')
  const out = source.replace(/<title>([^<]*)<\/title>/, (_, title) => `<title>${rebrandText(title)}</title>`)

  if (out !== source) {
    changes.push({ file: rel, line: 0, before: '<title>', after: '<title> rebranded' })

    if (!check) {
      writeFileSync(file, out)
    }
  }
}

for (const c of changes) {
  console.log(`${c.file}:${c.line}  ${c.before}\n    → ${c.after}`)
}

console.log(`\n${changes.length} string(s) ${check ? 'still carry the upstream name' : 'rebranded'}.`)

if (check && changes.length) {
  process.exit(1)
}
