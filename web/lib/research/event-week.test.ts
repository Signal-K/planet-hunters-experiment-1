import { describe, expect, it } from 'vitest'
import { countdown, eventPanel } from './event-week'

describe('Community research event panel (SSL-775)', () => {
  it('previews the next shower, counts down to a live peak, and keeps an ended one for a week', () => {
    const before = eventPanel(Date.parse('2026-09-10T12:00:00Z'))!
    expect(before).toMatchObject({ id: 'orionids', phase: 'upcoming' })
    expect(before.startAt).toBe(Date.parse('2026-10-02T00:00:00Z'))
    // The Leonids ended on 30 Nov: for a week the panel keeps them, with the Geminids next.
    expect(eventPanel(Date.parse('2026-12-02T12:00:00Z'))).toMatchObject({ id: 'leonids', phase: 'ended', next: { name: 'Geminids', startsInDays: 2 } })

    const live = eventPanel(Date.parse('2026-11-16T12:00:00Z'))!
    expect(live).toMatchObject({ id: 'leonids', phase: 'live' })
    expect(live.peakAt).toBe(Date.parse('2026-11-17T12:00:00Z'))
    expect(countdown(live.peakAt - Date.parse('2026-11-16T09:00:00Z'))).toBe('1d 3h')

    const after = eventPanel(Date.parse('2026-12-20T12:00:00Z'))!
    expect(after).toMatchObject({ id: 'geminids', phase: 'ended' })
    expect(after.next?.name).toBe('Quadrantids')
  })

  it('reads the Orionids peak from its exact time', () => {
    expect(eventPanel(Date.parse('2026-10-10T00:00:00Z'))!.peakAt).toBe(Date.parse('2026-10-22T00:00:00Z'))
  })
})
