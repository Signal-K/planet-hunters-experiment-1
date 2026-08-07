import { describe, expect, it } from 'vitest'
import type { Player } from '@/lib/game-types'
import type { AsteroidCandidate, TessCandidate } from '@/lib/data'
import {
  deepSpaceInstrumentDigest,
  instrumentDigestDateKey,
  instrumentDigestWasNotified,
  markInstrumentDigestNotified,
  transitInstrumentDigest,
  unresolvedDeepSpaceInstrumentDigest,
  unresolvedTransitInstrumentDigest,
} from './InstrumentFeedSystem'

function candidate(id: string): TessCandidate {
  return {
    id,
    ticId: id,
    toi: id,
    host: id,
    sector: 'Sector 1',
    periodDays: 3,
    transitEpoch: 1,
    depthPpm: 1_000,
    constellation: 'Lyra',
    distanceLy: 100,
    signalToNoise: 10,
    planetRadiusEarth: 1,
  }
}

function asteroidCandidate(id: string): AsteroidCandidate {
  return {
    id,
    tempDesig: id,
    score: 80,
    discoveryDate: '2026-07-28',
    ra: 12.5,
    decl: -4.2,
    vMag: 20.1,
    hMag: 24.3,
    nObs: 6,
    arcDays: 0.4,
    lastSeenDays: 0.2,
    resolved: false,
  }
}

function player(overrides: Partial<Player> = {}): Player {
  return {
    francs: 0,
    activeMission: null,
    missionCount: 0,
    pendingLaunch: false,
    placed: [],
    placementPlots: {},
    controlBuilt: false,
    missionsDone: 4,
    freeOperations: true,
    clientMissions: {},
    clientCooldowns: {},
    researchAnnotations: 0,
    refineryBuilt: false,
    refineryQueue: [],
    refinedGoods: {},
    launchpadUpgraded: false,
    loanDebt: 0,
    loanOffered: false,
    ...overrides,
  }
}

describe('InstrumentFeedSystem', () => {
  const candidates = ['a', 'b', 'c', 'd'].map(candidate)

  it('uses one UTC date key for cadence and notification state', () => {
    expect(instrumentDigestDateKey(new Date('2026-07-30T23:59:59Z'))).toBe('2026-07-30')
    expect(instrumentDigestDateKey(new Date('2026-07-31T00:00:00Z'))).toBe('2026-07-31')
  })

  it('scales the daily digest from the highest owned instrument level', () => {
    expect(transitInstrumentDigest(candidates, player(), '2026-07-30')).toHaveLength(1)
    expect(transitInstrumentDigest(candidates, player({
      satelliteMonitoringLevel: 2,
      transitSatelliteLevel: 3,
    }), '2026-07-30')).toHaveLength(3)
  })

  it('counts only unresolved candidates in today’s deterministic digest', () => {
    const digest = transitInstrumentDigest(candidates, player({ transitSatelliteLevel: 2 }), '2026-07-30')
    const unresolved = unresolvedTransitInstrumentDigest(candidates, player({
      transitSatelliteLevel: 2,
      tessClassifications: {
        [digest[0].id]: {
          subjectId: digest[0].id,
          verdict: 'unsure',
          ranges: [],
          submittedAt: 1,
        },
      },
    }), '2026-07-30')

    expect(unresolved.map(item => item.id)).toEqual([digest[1].id])
  })

  it('persists one notification marker per instrument and UTC date', () => {
    const initial = player()
    const marked = markInstrumentDigestNotified(initial, 'transit-telescope', '2026-07-30')
    const duplicate = markInstrumentDigestNotified(marked, 'transit-telescope', '2026-07-30')
    const nextDay = markInstrumentDigestNotified(marked, 'transit-telescope', '2026-07-31')

    expect(instrumentDigestWasNotified(marked, 'transit-telescope', '2026-07-30')).toBe(true)
    expect(duplicate).toBe(marked)
    expect(nextDay.instrumentDigestNotifiedOn?.['transit-telescope']).toBe('2026-07-31')
  })

  describe('deep space (NEOCP asteroid) digest', () => {
    const asteroids = ['a', 'b', 'c', 'd'].map(asteroidCandidate)

    it('scales the daily digest from the deep space telescope level, defaulting to 1', () => {
      expect(deepSpaceInstrumentDigest(asteroids, player(), '2026-07-30')).toHaveLength(1)
      expect(deepSpaceInstrumentDigest(asteroids, player({ deepSpaceTelescopeLevel: 3 }), '2026-07-30')).toHaveLength(3)
    })

    it('counts only unresolved candidates in today’s deterministic digest', () => {
      const digest = deepSpaceInstrumentDigest(asteroids, player({ deepSpaceTelescopeLevel: 2 }), '2026-07-30')
      const unresolved = unresolvedDeepSpaceInstrumentDigest(asteroids, player({
        deepSpaceTelescopeLevel: 2,
        asteroidClassifications: {
          [digest[0].id]: {
            candidateId: digest[0].id,
            verdict: 'unsure',
            submittedAt: 1,
          },
        },
      }), '2026-07-30')

      expect(unresolved.map(item => item.id)).toEqual([digest[1].id])
    })

    it('is an independent instrument from the transit telescope digest', () => {
      const tessCandidates = ['a', 'b', 'c', 'd'].map(candidate)
      const mixedPlayer = player({ transitSatelliteLevel: 2, deepSpaceTelescopeLevel: 1 })

      expect(transitInstrumentDigest(tessCandidates, mixedPlayer, '2026-07-30')).toHaveLength(2)
      expect(deepSpaceInstrumentDigest(asteroids, mixedPlayer, '2026-07-30')).toHaveLength(1)
    })

    it('persists its own notification marker, independent of the transit telescope marker (KES-128)', () => {
      const initial = player()
      const marked = markInstrumentDigestNotified(initial, 'deep-space-telescope', '2026-07-30')
      const duplicate = markInstrumentDigestNotified(marked, 'deep-space-telescope', '2026-07-30')
      const nextDay = markInstrumentDigestNotified(marked, 'deep-space-telescope', '2026-07-31')

      expect(instrumentDigestWasNotified(marked, 'deep-space-telescope', '2026-07-30')).toBe(true)
      expect(duplicate).toBe(marked)
      expect(nextDay.instrumentDigestNotifiedOn?.['deep-space-telescope']).toBe('2026-07-31')

      // Marking the deep-space instrument must never flip the transit
      // telescope's own marker (they're separate instrumentId keys in the
      // same map) — this is the exact gap the ticket flagged.
      expect(instrumentDigestWasNotified(marked, 'transit-telescope', '2026-07-30')).toBe(false)

      const bothMarked = markInstrumentDigestNotified(marked, 'transit-telescope', '2026-07-30')
      expect(instrumentDigestWasNotified(bothMarked, 'deep-space-telescope', '2026-07-30')).toBe(true)
      expect(instrumentDigestWasNotified(bothMarked, 'transit-telescope', '2026-07-30')).toBe(true)
    })
  })
})
