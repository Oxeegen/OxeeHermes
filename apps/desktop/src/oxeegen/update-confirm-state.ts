import { useStore } from '@nanostores/react'
import { atom } from 'nanostores'

/** True while "Install the update now?" is asked: the Updates dialog steps aside meanwhile. */
export const $updateConfirmOpen = atom(false)

/** Whether the Updates dialog shows: open, and not behind the install question. */
export function useUpdatesDialogShown(open: boolean): boolean {
  const asking = useStore($updateConfirmOpen)

  return open && !asking
}
