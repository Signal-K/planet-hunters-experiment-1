import { describe, expect, it } from 'vitest'
import { buildDailyEconomyInput } from './DailyEconomyInput'
import { resolveDailyEconomy, type DailyEconomySnapshot } from './DailyEconomySystem'
import { economyArrival, economyArrivalSummary } from './EconomyArrival'

const day = (date: string, publishedSnapshot?: DailyEconomySnapshot, builds = 0) => resolveDailyEconomy(buildDailyEconomyInput({
  snapshotDate: date as DailyEconomySnapshot['snapshotDate'],
  publishedSnapshot,
  savedStates: [{ player: { clientBuildEvents: Array.from({ length: builds }, (_, i) => ({
    eventId: `build-${date}-${i}`, clientId: 'atlas-aggregate', completedOn: publishedSnapshot?.snapshotDate ?? date, kind: 'player-built-client-work',
  })) } }],
}))

describe('economyArrival', () => {
  it('stays silent on the first board and on the same board', () => {
    const first = day('2026-10-27')
    expect(economyArrival(undefined, first)).toBeNull()
    expect(economyArrival(first, first)).toBeNull()
  })

  it('reports the biggest price moves and level-ups since the last board seen', () => {
    const first = day('2026-10-27')
    const second = day('2026-10-28', first, 5)
    const arrival = economyArrival(first, second)
    expect(arrival).not.toBeNull()
    expect(arrival!.fromDate).toBe('2026-10-27')
    expect(arrival!.toDate).toBe('2026-10-28')
    expect(arrival!.moves.length).toBeGreaterThan(0)
    expect(arrival!.moves.length).toBeLessThanOrEqual(2)
    expect(Math.abs(arrival!.moves[0].changePct)).toBeGreaterThanOrEqual(Math.abs(arrival!.moves.at(-1)!.changePct))
    expect(arrival!.levelUps.map(client => client.clientId)).toContain('atlas-aggregate')
    expect(economyArrivalSummary(arrival!)).toMatch(/reached level \d/)
  })
})
