import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { UpdateStatusCard } from '@/components/update-status'
import { $updateStatus } from '@/store/updates'

afterEach(() => {
  cleanup()
  $updateStatus.set(null)
})

describe('update check failures in About', () => {
  it('says no version is published when GitHub has no release, without the raw response', () => {
    $updateStatus.set({
      supported: true,
      mechanism: 'electron-updater',
      error: 'no-release',
      message: 'No Oxee Hermes release is published yet.',
      fetchedAt: Date.now()
    })

    const { container } = render(<UpdateStatusCard target="client" />)

    expect(screen.getByText('No Oxee Hermes version is published on GitHub yet.')).toBeTruthy()
    expect(container.textContent).not.toContain('no-release')
  })

  it('says GitHub cannot be reached for any other failure', () => {
    $updateStatus.set({ supported: true, mechanism: 'electron-updater', error: 'feed-unreachable', fetchedAt: Date.now() })

    render(<UpdateStatusCard target="client" />)

    expect(screen.getByText(/GitHub cannot be reached/)).toBeTruthy()
  })

  it('keeps the upstream wording for other errors', () => {
    $updateStatus.set({ supported: true, error: 'check-failed', message: 'boom', fetchedAt: Date.now() })

    render(<UpdateStatusCard target="client" />)

    expect(screen.queryByText(/GitHub/)).toBeNull()
  })
})
