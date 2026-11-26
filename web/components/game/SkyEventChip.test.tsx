// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import SkyEventChip from './SkyEventChip'
import { LEONIDS_DEBRIS_PRESET } from '@/lib/data/sky-events'

vi.mock('@/lib/hooks/useDebrisEvent', () => ({
  useDebrisEvent: () => LEONIDS_DEBRIS_PRESET,
  debrisNow: () => Date.parse('2026-11-17T12:00:00Z'),
}))
vi.mock('@/lib/posthog', () => ({ captureGameEvent: vi.fn() }))

it('opens the named event on the first banner click without an intermediate popup', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const open = vi.fn()
  await act(async () => root.render(<SkyEventChip surface="base" onParticipate={open} />))
  await act(async () => (host.querySelector('[data-testid="sky-event-chip"]') as HTMLButtonElement).click())
  expect(open).toHaveBeenCalledExactlyOnceWith('leonids-2026')
  expect(host.textContent).not.toContain('VIEW EVENT')
  expect(host.textContent).not.toContain('Laser it after it lands')
  await act(async () => root.unmount())
  host.remove()
})
