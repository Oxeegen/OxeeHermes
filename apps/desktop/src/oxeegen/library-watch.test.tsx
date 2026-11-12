import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { $notifications } from '@/store/notifications'
import { $gatewayState } from '@/store/session'
import type { SkillInfo } from '@/types/hermes'

import { $libraryCatalog, type LibraryCatalog } from './library'
import { findLibraryUpdates, frontmatterVersion, OxeegenLibraryWatch } from './library-watch'

const api = vi.hoisted(() => ({
  getSkills: vi.fn(),
  getSkillContent: vi.fn()
}))

vi.mock('@/api/skills', async importOriginal => ({ ...(await importOriginal<object>()), ...api }))

const skill = (id: string, version: string) => ({
  id,
  type: 'skill' as const,
  version,
  title: { en: id === 'document-assembler' ? 'Document Assembler' : id, fr: 'Assembleur de documents' },
  description: { en: '' },
  tags: [],
  keywords: {},
  author: 'Oxeegen',
  min_app_version: null,
  path: `skills/${id}`,
  image: ''
})

const CATALOG: LibraryCatalog = {
  format: 1,
  repository: 'Oxeegen/OxeeLibrary',
  commit: 'a'.repeat(40),
  items: [skill('document-assembler', '0.9.0'), skill('contract-review', '1.0.0'), skill('meeting-minutes', '2.0.0')]
}

const installed: SkillInfo[] = [
  { name: 'document-assembler', description: '', category: '', enabled: true, provenance: 'hub' },
  { name: 'contract-review', description: '', category: '', enabled: true, provenance: 'hub' },
  // Same name, made here: not the library's.
  { name: 'meeting-minutes', description: '', category: '', enabled: true, provenance: 'agent' }
]

const versions: Record<string, string> = {
  'document-assembler': '---\nname: document-assembler\nversion: 0.8.0\n---\n# Body',
  'contract-review': '---\nname: contract-review\nversion: "1.0.0"\n---\n'
}

api.getSkills.mockResolvedValue(installed)
api.getSkillContent.mockImplementation(async (name: string) => ({ name, path: '', content: versions[name] ?? '' }))

afterEach(() => {
  cleanup()
  $libraryCatalog.set(null)
  $gatewayState.set('idle')
  $notifications.set([])
})

describe('the Oxeegen library checked from startup', () => {
  it('reads an installed skill’s version from its SKILL.md frontmatter', () => {
    expect(frontmatterVersion('---\nname: x\nversion: 1.2.3\n---\nversion: 9.9.9')).toBe('1.2.3')
    expect(frontmatterVersion("---\nversion: '0.8.0'\n---")).toBe('0.8.0')
    expect(frontmatterVersion('# no frontmatter\nversion: 1.0.0')).toBeNull()
  })

  it('finds the hub-installed library skills the catalog holds in a newer version', async () => {
    expect(await findLibraryUpdates(CATALOG, 'fr-FR', api)).toEqual([
      { id: 'document-assembler', name: 'Assembleur de documents', installed: '0.8.0', available: '0.9.0' }
    ])
  })

  it('notifies once per version, once the backend is up', async () => {
    $libraryCatalog.set(CATALOG)
    const view = render(<OxeegenLibraryWatch />)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect($notifications.get()).toHaveLength(0)

    $gatewayState.set('open')
    await vi.waitFor(() => expect($notifications.get()).toHaveLength(1))
    expect($notifications.get()[0].message).toContain('Document Assembler 0.9.0')
    expect($notifications.get()[0].action).toBeTruthy()

    // The hourly read brings the same catalog again: no second notification.
    $notifications.set([])
    $libraryCatalog.set({ ...CATALOG })
    await new Promise(resolve => setTimeout(resolve, 0))
    view.rerender(<OxeegenLibraryWatch />)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect($notifications.get()).toHaveLength(0)
  })
})
