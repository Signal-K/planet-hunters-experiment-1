import { describe, expect, it } from 'vitest'
import {
  DAILY_PRICE_MAX_MULTIPLIER,
  DAILY_PRICE_MIN_MULTIPLIER,
  aestDateKey,
  clientLevel,
  previousDateKey,
  resolveDailyEconomy,
  type DailyEconomyInput,
} from './DailyEconomySystem'

const input: DailyEconomyInput = {
  snapshotDate: '2026-09-03',
  clients: [
    {
      id: 'helios', name: 'Helios Propulsion Depot', experience: 4,
      demandProfile: [{ materialId: 'platinum', unitsPerBuild: 2 }, { materialId: 'refined-platinum', unitsPerBuild: 1 }],
    },
    {
      id: 'ferrum', name: 'Ferrum Orbital Construction', experience: 0,
      demandProfile: [{ materialId: 'iron', unitsPerBuild: 3 }],
    },
  ],
  materials: [
    { id: 'platinum', name: 'Platinum', kind: 'raw', referencePrice: 100 },
    { id: 'refined-platinum', name: 'Refined Platinum', kind: 'refined', referencePrice: 220 },
    { id: 'iron', name: 'Iron', kind: 'raw', referencePrice: 40 },
    { id: 'refined-iron', name: 'Refined Iron', kind: 'refined', referencePrice: 72 },
  ],
  completedBuildEvents: [
    { eventId: 'build-001', clientId: 'helios', completedOn: '2026-09-02', kind: 'player-built-client-work' },
    { eventId: 'build-002', clientId: 'helios', completedOn: '2026-09-02', kind: 'player-built-client-work' },
    { eventId: 'build-future', clientId: 'ferrum', completedOn: '2026-09-03', kind: 'player-built-client-work' },
  ],
}

describe('DailyEconomySystem', () => {
  it('awards client experience only from completed player-built client work and resolves levels', () => {
    const snapshot = resolveDailyEconomy(input)
    const helios = snapshot.clients.find(client => client.clientId === 'helios')
    const ferrum = snapshot.clients.find(client => client.clientId === 'ferrum')

    expect(helios).toMatchObject({ experienceBefore: 4, experienceAwarded: 2, experienceAfter: 6, levelBefore: 1, levelAfter: 2 })
    expect(ferrum).toMatchObject({ experienceBefore: 0, experienceAwarded: 0, experienceAfter: 0, levelBefore: 1, levelAfter: 1 })
    expect(snapshot.completedBuildEventIds).toEqual(['build-001', 'build-002'])
  })

  it('is deterministic, bounded, and includes raw and refined demand explanations', () => {
    const first = resolveDailyEconomy(input)
    const second = resolveDailyEconomy(input)
    expect(second).toEqual(first)

    for (const quote of Object.values(first.prices)) {
      expect(quote.multiplier).toBeGreaterThanOrEqual(DAILY_PRICE_MIN_MULTIPLIER)
      expect(quote.multiplier).toBeLessThanOrEqual(DAILY_PRICE_MAX_MULTIPLIER)
    }
    expect(first.prices.platinum).toMatchObject({ kind: 'raw', demandClientIds: ['helios'] })
    expect(first.prices['refined-platinum']).toMatchObject({ kind: 'refined', demandClientIds: ['helios'] })
    expect(first.prices.platinum?.explanation).toContain('Helios Propulsion Depot plans')
    expect(first.prices['refined-iron']?.explanation).toBe('No client construction demand for Refined Iron today.')
  })

  it('returns the published snapshot on a same-day retry and catches up missed work days', () => {
    const published = resolveDailyEconomy(input)
    const retry = resolveDailyEconomy({ ...input, publishedSnapshot: published, completedBuildEvents: [] })
    expect(retry).toBe(published)

    const catchup = resolveDailyEconomy({
      ...input,
      snapshotDate: '2026-09-06',
      publishedSnapshot: published,
      completedBuildEvents: [
        ...input.completedBuildEvents,
        { eventId: 'build-003', clientId: 'ferrum', completedOn: '2026-09-04', kind: 'player-built-client-work' },
        { eventId: 'build-004', clientId: 'ferrum', completedOn: '2026-09-05', kind: 'player-built-client-work' },
      ],
    })
    expect(catchup.processedWorkAfterDate).toBe('2026-09-02')
    expect(catchup.processedWorkThroughDate).toBe('2026-09-05')
    expect(catchup.completedBuildEventIds).toEqual(['build-003', 'build-004', 'build-future'])
    expect(catchup.clients.find(client => client.clientId === 'ferrum')?.experienceAwarded).toBe(3)
  })

  it('rejects duplicate events and events that are not completed player-built client work', () => {
    expect(() => resolveDailyEconomy({ ...input, completedBuildEvents: [
      input.completedBuildEvents[0]!, input.completedBuildEvents[0]!,
    ] })).toThrow('Duplicate build completion event build-001')
    expect(() => resolveDailyEconomy({ ...input, completedBuildEvents: [
      { eventId: 'wrong-kind', clientId: 'helios', completedOn: '2026-09-02', kind: 'other-work' as 'player-built-client-work' },
    ] })).toThrow('not player-built client work')
  })

  it('uses calendar-safe AEST date helpers and a five-build level cadence', () => {
    expect(aestDateKey(new Date('2026-09-02T13:59:00.000Z'))).toBe('2026-09-02')
    expect(aestDateKey(new Date('2026-09-02T14:01:00.000Z'))).toBe('2026-09-03')
    expect(previousDateKey('2026-03-01')).toBe('2026-02-28')
    expect(clientLevel(0)).toBe(1)
    expect(clientLevel(5)).toBe(2)
  })
})
