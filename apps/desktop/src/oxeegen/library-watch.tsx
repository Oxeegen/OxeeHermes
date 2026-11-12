/**
 * Oxee Hermes: the Oxeegen library checked from startup. Once the backend is up, the app reads the
 * library's catalog (library.ts, then every hour) and compares it with the Oxeegen skills installed
 * here: each one the library now holds in a newer version gets a notification, once per version
 * and session, whose button updates the hub skills. Nothing updates on its own: an installed skill
 * changes what the agent does, so the user decides.
 *
 * A library skill is installed under its id with the hub's provenance; its installed version is the
 * `version` of its SKILL.md frontmatter (OxeeLibrary keeps it equal to oxeegen.yaml's). A skill
 * with no readable version is left alone rather than flagged.
 */
import { useStore } from '@nanostores/react'
import { atom } from 'nanostores'
import { useEffect } from 'react'

import { getSkillContent, getSkills } from '@/api/skills'
import { useI18n } from '@/i18n'
import { updateHubSkills } from '@/store/hub-actions'
import { notify, notifyError } from '@/store/notifications'
import { $gatewayState } from '@/store/session'
import { isMainWindow } from '@/store/windows'

import { $libraryCatalog, type LibraryCatalog, meetsMinimum, pickLocalized, startLibraryRefresh } from './library'
import { oxeegenStrings } from './strings'

export interface LibraryUpdate {
  id: string
  name: string
  installed: string
  available: string
}

/** The installed Oxeegen skills the library holds in a newer version, as last checked. */
export const $libraryUpdates = atom<LibraryUpdate[]>([])

/** The `version` of a SKILL.md's frontmatter, or null. */
export function frontmatterVersion(content: string): null | string {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)?.[1] ?? ''
  const version = /^version:\s*["']?(\d+\.\d+\.\d+)/m.exec(frontmatter)?.[1]

  return version ?? null
}

export interface LibrarySkillsApi {
  getSkills: typeof getSkills
  getSkillContent: typeof getSkillContent
}

/** The installed Oxeegen skills the catalog holds in a newer version. */
export async function findLibraryUpdates(
  catalog: LibraryCatalog,
  locale: string,
  api: LibrarySkillsApi = { getSkills, getSkillContent }
): Promise<LibraryUpdate[]> {
  const fromHub = new Set((await api.getSkills()).filter(skill => skill.provenance === 'hub').map(skill => skill.name))
  const lang = locale.toLowerCase().split(/[-_]/)[0]
  const updates: LibraryUpdate[] = []

  for (const item of catalog.items) {
    if (item.type !== 'skill' || !fromHub.has(item.id)) {
      continue
    }

    const installed = frontmatterVersion((await api.getSkillContent(item.id)).content)

    if (installed && !meetsMinimum(installed, item.version)) {
      updates.push({ id: item.id, name: pickLocalized(item.title, lang) || item.id, installed, available: item.version })
    }
  }

  return updates
}

const notified = new Set<string>()

function announce(updates: LibraryUpdate[], locale: string): void {
  const s = oxeegenStrings(locale)

  for (const update of updates) {
    const key = `${update.id}@${update.available}`

    if (notified.has(key)) {
      continue
    }

    notified.add(key)
    notify({
      id: `oxeegen-library-update:${update.id}`,
      kind: 'info',
      title: s.libraryUpdateTitle,
      message: s.libraryUpdateMessage(update.name, update.available, update.installed),
      durationMs: 0,
      action: {
        label: s.libraryUpdateAction,
        onClick: () => void updateHubSkills().catch(err => notifyError(err, s.libraryUpdateFailed))
      }
    })
  }
}

/** Runs the check whenever the backend is up and the catalog changes; renders nothing. */
export function OxeegenLibraryWatch() {
  // The main window checks (main.tsx mounts it there); others would repeat each notification.
  const ready = useStore($gatewayState) === 'open' && isMainWindow()
  const catalog = useStore($libraryCatalog)
  const { locale } = useI18n()

  useEffect(() => {
    if (ready) {
      startLibraryRefresh()
    }
  }, [ready])

  useEffect(() => {
    if (!ready || !catalog) {
      return
    }

    let current = true

    findLibraryUpdates(catalog, locale)
      .then(updates => {
        if (current) {
          $libraryUpdates.set(updates)
          announce(updates, locale)
        }
      })
      .catch(() => {
        // Backend busy or restarting: the next catalog read checks again.
      })

    return () => {
      current = false
    }
  }, [ready, catalog, locale])

  return null
}
