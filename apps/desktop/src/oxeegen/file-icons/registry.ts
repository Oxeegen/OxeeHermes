/**
 * Material Icon Theme lookup (vendored in ./material-icon-theme, MIT — see its
 * LICENSE.txt). Loaded as ONE lazy chunk by file-icon.tsx: the 1,251 SVGs and
 * the manifest stay out of the main bundle until a file tree is shown.
 *
 * Resolution mirrors VS Code: exact file name, then the longest matching
 * extension (`.d.ts` beats `.ts`), then the theme's file/folder defaults.
 * Expanded folders use their `-open` variant.
 */
import manifest from './material-icon-theme/material-icons.json'

interface Manifest {
  fileExtensions: Record<string, string>
  fileNames: Record<string, string>
  folderNames: Record<string, string>
  folderNamesExpanded: Record<string, string>
  iconDefinitions: Record<string, { iconPath?: string }>
}

const theme = manifest as unknown as Manifest

const raw = import.meta.glob<string>('./material-icon-theme/icons/*.svg', {
  eager: true,
  import: 'default',
  query: '?raw'
})

const svgByFile = new Map<string, string>()

for (const [path, svg] of Object.entries(raw)) {
  // Pin the box to the host span so every icon renders at the requested size.
  svgByFile.set(path.slice(path.lastIndexOf('/') + 1), svg.replace('<svg ', '<svg style="width:100%;height:100%;display:block" '))
}

function iconSvg(id: string | undefined): string | undefined {
  const iconPath = id ? theme.iconDefinitions[id]?.iconPath : undefined

  return iconPath ? svgByFile.get(iconPath.slice(iconPath.lastIndexOf('/') + 1)) : undefined
}

const byName = (table: Record<string, string>, name: string) => table[name] ?? table[name.toLowerCase()]

function fileIconId(name: string): string | undefined {
  const exact = byName(theme.fileNames, name)

  if (exact) {
    return exact
  }

  const parts = name.toLowerCase().split('.')

  for (let i = 1; i < parts.length; i++) {
    const id = theme.fileExtensions[parts.slice(i).join('.')]

    if (id) {
      return id
    }
  }

  return undefined
}

export function fileSvg(name: string): string {
  return iconSvg(fileIconId(name)) ?? iconSvg('file') ?? ''
}

export function folderSvg(name: string, open: boolean): string {
  const exact = byName(theme.folderNames, name)
  const fallback = iconSvg(open ? 'folder-open' : 'folder') ?? ''

  if (!exact) {
    return fallback
  }

  if (!open) {
    return iconSvg(exact) ?? fallback
  }

  return iconSvg(byName(theme.folderNamesExpanded, name) ?? `${exact}-open`) ?? iconSvg(exact) ?? fallback
}
