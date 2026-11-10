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
