import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { EnvVarInfo } from '@/types/hermes'

import { KeyField } from './credential-key-ui'

const info = (patch: Partial<EnvVarInfo>): EnvVarInfo => ({
  advanced: false,
  category: 'tool',
  description: '',
  is_password: true,
  is_set: true,
  redacted_value: 'BSA-…3456',
  tools: [],
  url: null,
  ...patch
})

const rowProps = () => ({
  edits: {},
  onClear: vi.fn(),
  onReveal: vi.fn(),
  onSave: vi.fn(),
  revealed: {},
  saving: null,
  setEdits: vi.fn()
})

afterEach(cleanup)

describe('KeyField', () => {
  it('shows a key the administrator set as read-only: focusing it never opens the editor', () => {
    const props = rowProps()
    render(<KeyField info={info({ admin_managed: true })} rowProps={props} varKey="BRAVE_SEARCH_API_KEY" />)

    fireEvent.focus(screen.getByDisplayValue('Set by your administrator'))

    expect(props.setEdits).not.toHaveBeenCalled()
  })

  it("opens the editor on the user's own key", () => {
    const props = rowProps()
    render(<KeyField info={info({})} rowProps={props} varKey="BRAVE_SEARCH_API_KEY" />)

    fireEvent.focus(screen.getByRole('textbox'))

    expect(props.setEdits).toHaveBeenCalled()
  })
})
