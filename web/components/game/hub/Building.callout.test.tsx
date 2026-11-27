// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { Building } from './Building'

afterEach(() => vi.useRealTimers())

it('keeps the close button dismissed through fresh callout objects and opens a new prompt', async () => {
  vi.useFakeTimers()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const dismissed = vi.fn()
  const render = (id: string) => root.render(<Building kind="control-station" label="Agency hub" sub="Ready" status="ok" w={100} onClick={() => {}} callout={{ id, title: 'Signals ready', body: 'Classify them', cta: 'Classify', onCta: () => {}, onDismiss: dismissed }} />)
  try {
    await act(async () => { render('batch-1') })
    await act(async () => { vi.advanceTimersByTime(1000) })
    const popup = () => host.querySelector<HTMLElement>('[data-testid="building-control-station-callout"]')!
    expect(popup().style.visibility).toBe('visible')
    await act(async () => { host.querySelector<HTMLButtonElement>('[aria-label="Dismiss"]')!.click() })
    expect(dismissed).toHaveBeenCalledOnce()
    await act(async () => { render('batch-1') })
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(popup().style.visibility).toBe('hidden')
    await act(async () => { render('batch-2') })
    await act(async () => { vi.advanceTimersByTime(1000) })
    expect(popup().style.visibility).toBe('visible')
  } finally {
    await act(async () => root.unmount())
    host.remove()
  }
})
