import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import type { ProfileScope } from '@/hermes'
import { Loader2 } from '@/lib/icons'
import { notify, notifyError } from '@/store/notifications'

import { OXEEGEN, OXEEGEN_REGIONS, type OxeegenRegionId } from './config'
import { type OxeegenConnection, readOxeegenConnection, saveOxeegenConnection } from './connection'
import { useOxeegenStrings } from './strings'

type GatewayRequester = <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>

interface OxeegenConnectionFormProps {
  onSaved?: () => Promise<void> | void
  profile?: ProfileScope
  requestGateway: GatewayRequester
  /** Label of the submit button; onboarding says "Connect", settings "Save". */
  submitLabel?: string
}

/** Region + API key: the only inference settings Oxee Desktop exposes. */
export function OxeegenConnectionForm({ onSaved, profile, requestGateway, submitLabel }: OxeegenConnectionFormProps) {
  const s = useOxeegenStrings()
  const [current, setCurrent] = useState<null | OxeegenConnection>(null)
  const [region, setRegion] = useState<OxeegenRegionId>(OXEEGEN.defaultRegion)
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<null | string>(null)

  useEffect(() => {
    let live = true

    readOxeegenConnection(profile)
      .then(connection => {
        if (live) {
          setCurrent(connection)
          setRegion(connection.region ?? OXEEGEN.defaultRegion)
        }
      })
      .catch(
        () =>
          live &&
          setCurrent({
            keys: Object.fromEntries(OXEEGEN_REGIONS.map(r => [r.id, { preview: null, set: false }])) as OxeegenConnection['keys'],
            region: null
          })
      )

    return () => {
      live = false
    }
  }, [profile])

  // A key is valid in its own region only: switching region needs that region's key.
  const regionKey = current?.keys[region]
  const keyRequired = !regionKey?.set
  const dirty = apiKey.trim().length > 0 || region !== current?.region
  const canSubmit = current !== null && !saving && (keyRequired ? apiKey.trim().length > 0 : dirty)

  const submit = async () => {
    if (keyRequired && !apiKey.trim()) {
      setError(s.apiKeyMissing)

      return
    }

    setSaving(true)
    setError(null)

    try {
      await saveOxeegenConnection({ apiKey, region }, requestGateway, profile)
      setCurrent(await readOxeegenConnection(profile))
      setApiKey('')
      notify({ kind: 'success', message: s.saved })
      await onSaved?.()
    } catch (err) {
      setError(s.saveFailed)
      notifyError(err, s.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={event => {
        event.preventDefault()
        void submit()
      }}
    >
      <div className="grid gap-1.5">
        <span className="text-sm font-medium">{s.region}</span>
        <SegmentedControl
          disabled={saving}
          onChange={setRegion}
          options={OXEEGEN_REGIONS.map(r => ({ id: r.id, label: s.regionLabel(r.id, r.label) }))}
          value={region}
        />
        <span className="text-xs text-(--ui-text-tertiary)">{s.regionHint}</span>
      </div>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium">
          {s.apiKey} — {s.regionLabel(region, OXEEGEN_REGIONS.find(r => r.id === region)?.label ?? region)}
        </span>
        <Input
          autoComplete="off"
          disabled={saving}
          onChange={event => setApiKey(event.target.value)}
          placeholder={regionKey?.set ? (regionKey.preview ?? '••••••••') : 'sk-…'}
          spellCheck={false}
          type="password"
          value={apiKey}
        />
        <span className="text-xs text-(--ui-text-tertiary)">
          {regionKey?.set ? `${s.apiKeySaved} ${s.apiKeyKeep}` : s.apiKeyHint}{' '}
          <a className="underline" href={OXEEGEN.signupUrl} rel="noreferrer" target="_blank">
            {s.getKey}
          </a>
        </span>
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div>
        <Button disabled={!canSubmit} type="submit">
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? s.saving : (submitLabel ?? s.save)}
        </Button>
      </div>
    </form>
  )
}
