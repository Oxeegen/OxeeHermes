/**
 * Files-tree icons: VS Code resolution over the vendored Material Icon Theme,
 * loaded lazily with upstream's codicons as the placeholder.
 */
import { render, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FileIcon } from './file-icon'
import { fileSvg, folderSvg } from './registry'

const icon = (name: string) => {
  const svg = fileSvg(name)

  expect(svg).toContain('<svg')

  return svg
}

describe('Material file icons', () => {
  it('resolves exact names, then the longest extension, then the generic file', () => {
    expect(icon('package.json')).not.toBe(icon('data.json'))
    expect(icon('types.d.ts')).not.toBe(icon('index.ts'))
    expect(icon('Index.TS')).toBe(icon('index.ts'))
    expect(icon('notes.unknown-ext')).toBe(icon('LICENSE-nothing-matches'))
  })

  it('gives known folders their own icon and an expanded variant', () => {
    expect(folderSvg('src', false)).not.toBe(folderSvg('random-folder', false))
    expect(folderSvg('src', true)).not.toBe(folderSvg('src', false))
    expect(folderSvg('random-folder', true)).not.toBe(folderSvg('random-folder', false))
  })

  it('renders the colour SVG once the icon set has loaded', async () => {
    const { container } = render(<FileIcon kind="file" name="main.py" />)

    await waitFor(() => expect(container.querySelector('[data-file-icon="file"] svg')).not.toBeNull())
  })
})
