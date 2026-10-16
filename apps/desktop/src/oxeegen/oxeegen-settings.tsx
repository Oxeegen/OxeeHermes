import { useStore } from '@nanostores/react'

import { useGatewayRequest } from '@/app/gateway/hooks/use-gateway-request'
import { SettingsContent, SettingsSection } from '@/app/settings/primitives'
import { KeyRound } from '@/lib/icons'
import { $settingsRequestProfile } from '@/store/settings-scope'

import { OXEEGEN } from './config'
import { OxeegenConnectionForm } from './connection-form'
import { useOxeegenStrings } from './strings'

/** Settings → Oxeegen: replaces the upstream Model and Providers sections. */
export function OxeegenSettings() {
  const s = useOxeegenStrings()
  const profile = useStore($settingsRequestProfile)
  const { requestGateway } = useGatewayRequest()

  return (
    <SettingsContent>
      <SettingsSection icon={KeyRound} meta={OXEEGEN.mainModel} title={s.title}>
        <p className="mb-4 text-sm text-(--ui-text-tertiary)">{s.intro}</p>
        <OxeegenConnectionForm profile={profile} requestGateway={requestGateway} />
      </SettingsSection>
    </SettingsContent>
  )
}
