import { afterEach, describe, expect, it, vi } from 'vitest'

import { $confirmRequest, settleConfirm } from '@/store/confirm'

vi.unmock('@/oxeegen/update-confirm')

afterEach(() => settleConfirm(false))

describe('app update restart confirmation', () => {
  it('asks before closing the app, and Later cancels the update', async () => {
    const { confirmUpdateRestart } = await import('./update-confirm')

    const answer = confirmUpdateRestart()
    const request = $confirmRequest.get()

    expect(request?.title).toBe('Install the update now?')
    expect(request?.confirmLabel).toBe('Install and restart')
    expect(request?.cancelLabel).toBe('Later')
    settleConfirm(false)
    expect(await answer).toBe(false)
  })
})

describe('installing from the Updates dialog', () => {
  it('hides that dialog while asking; Later closes it, Install and restart brings it back with the progress', async () => {
    const { applyUpdates, $updateOverlayOpen } = await import('@/store/updates')
    const { $updateConfirmOpen } = await import('./update-confirm-state')
    const apply = vi.fn(async () => ({ ok: true, handedOff: true }))
    vi.stubGlobal('hermesDesktop', { updates: { apply, check: vi.fn(), onProgress: () => () => {} } })

    $updateOverlayOpen.set(true)
    const later = applyUpdates()
    expect($confirmRequest.get()?.confirmLabel).toBe('Install and restart')
    expect($updateConfirmOpen.get()).toBe(true)
    settleConfirm(false)
    expect(await later).toMatchObject({ error: 'cancelled' })
    expect($updateConfirmOpen.get()).toBe(false)
    expect($updateOverlayOpen.get()).toBe(false)
    expect(apply).not.toHaveBeenCalled()

    $updateOverlayOpen.set(true)
    const install = applyUpdates()
    expect($updateConfirmOpen.get()).toBe(true)
    settleConfirm(true)
    await install
    expect(apply).toHaveBeenCalled()
    expect($updateConfirmOpen.get()).toBe(false)
    expect($updateOverlayOpen.get()).toBe(true)

    vi.unstubAllGlobals()
    $updateOverlayOpen.set(false)
  })
})
