#!/usr/bin/env node
// The GitHub release body of a version: the English notes (<version>.md), then each translation
// found next to it (<version>.<lang>.md) as an HTML comment, hidden on github.com and picked by
// Settings > About in the matching UI language (apps/desktop/src/oxeegen/release-notes.ts).
//
//   node oxeegen/scripts/release-notes-body.mjs oxeegen/release-notes/0.8.1.md > body.md
import fs from 'node:fs'
import path from 'node:path'

const notesFile = process.argv[2]

if (!notesFile || !fs.existsSync(notesFile)) {
  console.error('usage: release-notes-body.mjs <notes/X.Y.Z.md>')
  process.exit(2)
}

const dir = path.dirname(notesFile)
const stem = path.basename(notesFile, '.md')
const translation = new RegExp(`^${stem.replace(/\./g, '\\.')}\\.([a-z]{2}(?:-[a-z]+)?)\\.md$`, 'i')
const parts = [fs.readFileSync(notesFile, 'utf8').trim()]

for (const name of fs.readdirSync(dir).sort()) {
  const lang = name.match(translation)?.[1]

  if (!lang) {
    continue
  }

  const text = fs.readFileSync(path.join(dir, name), 'utf8').trim()

  if (text.includes('-->')) {
    console.error(`${name} contains "-->", which would end its hidden block early`)
    process.exit(1)
  }

  parts.push(`<!-- oxee-notes:${lang.toLowerCase()}\n${text}\n-->`)
}

process.stdout.write(`${parts.join('\n\n')}\n`)
