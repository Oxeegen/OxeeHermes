import { getRuntimeI18nLocale } from '@/i18n/runtime'
import { confirm } from '@/store/confirm'

import { oxeegenStrings } from './strings'

/**
 * Before an app update closes the window, say so: the installer takes a few minutes, during
 * which Oxee Hermes is gone. "Later" leaves the update available and the app running.
 */
export function confirmUpdateRestart(): Promise<boolean> {
  const s = oxeegenStrings(getRuntimeI18nLocale())

  return confirm({
    title: s.updateRestartTitle,
    description: s.updateRestartBody,
    confirmLabel: s.updateRestartConfirm,
    cancelLabel: s.updateRestartLater
  })
}
