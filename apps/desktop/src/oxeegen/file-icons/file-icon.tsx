/**
 * Colour file/folder icons (Material Icon Theme) for the files tree. The icon
 * set is a lazy chunk; until it lands the tree keeps upstream's codicons.
 */
import { useEffect, useState } from 'react'

import { Codicon } from '@/components/ui/codicon'

import type * as RegistryModule from './registry'

type Registry = typeof RegistryModule

let registry: Registry | null = null
let loading: Promise<Registry> | null = null

function loadRegistry(): Promise<Registry> {
  loading ??= import('./registry').then(module => (registry = module))

  return loading
}

function useRegistry(): Registry | null {
  const [loaded, setLoaded] = useState(registry)

  useEffect(() => {
    if (!loaded) {
      void loadRegistry().then(setLoaded)
    }
  }, [loaded])

  return loaded
}

export interface FileIconProps {
  kind: 'file' | 'folder'
  name: string
  /** Folders: expanded variant. */
  open?: boolean
  size?: string
}

export function FileIcon({ kind, name, open = false, size = '0.875rem' }: FileIconProps) {
  const icons = useRegistry()
  const svg = icons ? (kind === 'folder' ? icons.folderSvg(name, open) : icons.fileSvg(name)) : ''

  if (!svg) {
    return <Codicon name={kind === 'file' ? 'file' : open ? 'folder-opened' : 'folder'} size={size} />
  }

  return (
    <span
      aria-hidden
      className="inline-flex shrink-0"
      dangerouslySetInnerHTML={{ __html: svg }}
      data-file-icon={kind}
      style={{ height: size, width: size }}
    />
  )
}
