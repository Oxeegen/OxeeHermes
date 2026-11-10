import { atom } from 'nanostores'

/** True while "Install the update now?" is asked: the Updates dialog steps aside meanwhile. */
export const $updateConfirmOpen = atom(false)
