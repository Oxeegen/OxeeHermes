import { completeDesktopOnboarding, type OnboardingContext, refreshOnboarding } from '@/store/onboarding'

import { OxeegenConnectionForm } from './connection-form'
import { useOxeegenStrings } from './strings'

/**
 * The whole first-run provider setup of Oxee Hermes: region + API key.
 * Replaces the upstream picker (Nous free tier, OAuth providers, API-key
 * catalog, local endpoints) inside the onboarding overlay.
 */
export function OxeegenOnboarding({ ctx }: { ctx: OnboardingContext }) {
  const s = useOxeegenStrings()

  // The backend re-resolves with the new key; when its readiness probe cannot
  // confirm yet (endpoint unreachable, slow boot) the settings are saved all the
  // same, so let the user in — Settings → Oxeegen fixes a wrong key or region.
  const finish = async () => {
    if (!(await refreshOnboarding(ctx))) {
      completeDesktopOnboarding(true)
      ctx.onCompleted?.()
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold">{s.title}</h2>
        <p className="text-sm text-(--ui-text-tertiary)">{s.intro}</p>
      </div>
      <OxeegenConnectionForm
        onSaved={finish}
        profile={ctx.scope}
        requestGateway={ctx.requestGateway}
        submitLabel={s.connect}
      />
    </div>
  )
}
