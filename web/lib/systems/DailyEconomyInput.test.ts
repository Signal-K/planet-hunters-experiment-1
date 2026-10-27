import { describe, expect, it } from 'vitest'
import { buildDailyEconomyInput } from './DailyEconomyInput'
import { resolveDailyEconomy } from './DailyEconomySystem'

const event = (eventId: string, clientId: string, completedOn: string) => ({ eventId, clientId, completedOn, kind: 'player-built-client-work' })

describe('buildDailyEconomyInput', () => {
  it('builds a resolvable input from saved games, skipping duplicates and unknown clients', () => {
    const shared = event('client-build:atlas-aggregate:a:b:1', 'atlas-aggregate', '2026-10-26')
    const input = buildDailyEconomyInput({
      snapshotDate: '2026-10-27',
      savedStates: [
        { player: { clientBuildEvents: [shared, event('gone', 'retired-client', '2026-10-26')] } },
        { player: { clientBuildEvents: [shared, { eventId: 'bad' }] } },
        null,
        { player: {} },
      ],
    })
    expect(input.completedBuildEvents.map(e => e.eventId)).toEqual([shared.eventId])
    expect(input.materials.some(material => material.id.includes('debris'))).toBe(false)

    const snapshot = resolveDailyEconomy(input)
    expect(snapshot.completedBuildEventIds).toEqual([shared.eventId])
    expect(snapshot.clients.find(client => client.clientId === 'atlas-aggregate')?.experienceAfter).toBeGreaterThan(0)

    const next = buildDailyEconomyInput({ snapshotDate: '2026-10-28', savedStates: [], publishedSnapshot: snapshot })
    expect(next.clients.find(client => client.id === 'atlas-aggregate')?.experience)
      .toBe(snapshot.clients.find(client => client.clientId === 'atlas-aggregate')?.experienceAfter)
    expect(() => resolveDailyEconomy(next)).not.toThrow()
  })
})
