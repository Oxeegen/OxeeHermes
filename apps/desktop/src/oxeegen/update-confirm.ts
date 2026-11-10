import { getRuntimeI18nLocale } from '@/i18n/runtime'
import { confirm } from '@/store/confirm'

import { oxeegenStrings } from './strings'
import { $updateConfirmOpen } from './update-confirm-state'

/**
 * Before an app update closes the window, say so: the installer takes a few minutes, during
 * which Oxee Hermes is gone. "Later" leaves the update available and the app running. While it is
 * asked, the Updates dialog it was started from is hidden, so the two never show at once.
 */
export async function confirmUpdateRestart(): Promise<boolean> {
  const s = oxeegenStrings(getRuntimeI18nLocale())
  $updateConfirmOpen.set(true)

  try {
    return await confirm({
      title: s.updateRestartTitle,
      description: s.updateRestartBody,
      confirmLabel: s.updateRestartConfirm,
      cancelLabel: s.updateRestartLater
    })
  } finally {
    $updateConfirmOpen.set(false)
  }
}
