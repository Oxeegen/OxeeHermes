import type { ReactElement } from 'react'

import { ListRow } from '@/app/settings/primitives'

import { OXEEGEN_PINNED_SETTING_FIELDS } from './settings-policy'
import { useOxeegenStrings } from './strings'

/** A setting the managed scope fixes: its value as text, nothing to edit. */
export function OxeegenPinnedField({ schemaKey }: { schemaKey: string }): null | ReactElement {
  const s = useOxeegenStrings()
  const pinned = OXEEGEN_PINNED_SETTING_FIELDS.get(schemaKey)

  if (!pinned) {
    return null
  }

  return (
    <ListRow
      action={<span className="font-mono text-sm text-(--ui-text-secondary)">{pinned.value}</span>}
      data-tour={`field-${schemaKey}`}
      title={s[pinned.label]}
    />
  )
}
