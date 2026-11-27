import { describe, expect, it } from 'vitest'
import { fleetCount, mergeAgencyLaunches, personalFleetCount, recordAgencyLaunch } from './fleet'
import { agencyProgramme } from './programme'
import { communityWorlds, type AgencyCommunity } from './community'
import { addStamp } from '@/lib/research/stamps'
import { DEFAULT_STATE, normalizeAndRepair, mergeRemoteState } from '@/lib/game-state'
import { buildRuntimeCatalog, TRANSIT_TELESCOPE_MISSION_ID } from '@/lib/runtimeCatalog'
import { STATIC_CATALOG } from '@/lib/catalog'
import { collectInstrumentSignals, deepSpaceInstrumentDigest, unresolvedTransitInstrumentDigest } from '@/lib/systems/InstrumentFeedSystem'
import { STAGE_TESS_FEED as TESS_CANDIDATES, STAGE_ASTEROID_FEED as ASTEROID_CANDIDATES } from '@/lib/stage-feed'
import { getSaturnFallbackCandidates } from '@/lib/data/saturn-candidates'
const SATURN_CANDIDATES = getSaturnFallbackCandidates()

const now = Date.parse('2026-11-20T12:00:00Z')
const community: AgencyCommunity = { projects: { 'exoplanet-hunters': { contributions: 2, donatedPerDay: 1 }, 'asteroid-discovery': { contributions: 3, donatedPerDay: 1 }, 'saturn-storms': { contributions: 1, donatedPerDay: 1 }, 'deposit-survey': { contributions: 4, donatedPerDay: 0 }, 'meteor-echoes': { contributions: 0, donatedPerDay: 0 } }, surveys: { eros: ['0_0'] }, worlds: { 'exo-shared': { id: 'exo-shared', name: 'Shared world', type: 'exoplanet', orbit: 5, minerals: ['iron'], difficulty: 'L2', brief: 'Confirmed world fixture' } }, siteUnlocks: ['community-site-2026-10:observatory-instrument'] }

describe('agency launch and research loop', () => {
  it('preserves a legacy craft, counts each new sortie once and merges receipts across devices', () => {
    const first = recordAgencyLaunch({ ...DEFAULT_STATE.player, transitSatelliteLaunchedAt: now - 1000 }, 'space-telescope', 'run-1', now)
    expect(fleetCount(first, 'space-telescope')).toBe(2)
    expect(recordAgencyLaunch(first, 'space-telescope', 'run-1', now + 10)).toBe(first)
    const second = recordAgencyLaunch(first, 'saturn-satellite', 'run-2', now)
    expect(Object.keys(mergeAgencyLaunches(first.agencyLaunches, second.agencyLaunches))).toHaveLength(3)
    const donating = { ...first, agencyDonations: { 'space-telescope': true } }
    expect(personalFleetCount(donating, 'space-telescope')).toBe(1)
    expect(agencyProgramme({ ...donating, placed: ['ground-telescope'], placementPlots: { 'ground-telescope': 10 }, groundTelescopeLevels: { 'ground-telescope': 3 } }, now).find(craft => craft.id === 'ground-telescope')?.dataPerDay).toBe(3)
    const merged = mergeRemoteState({ ...DEFAULT_STATE, player: { ...second, agencyCommunity: community } }, { ...DEFAULT_STATE, player: { ...DEFAULT_STATE.player, missionsDone: 9 } })
    expect(fleetCount(merged.player, 'space-telescope')).toBe(2)
    expect(communityWorlds(merged.player.agencyCommunity)).toHaveLength(1)
  })

  it('offers another launch and the construction reward, and keeps shared-world plans on cold load', () => {
    const player = { ...DEFAULT_STATE.player, freeOperations: true, placed: ['launchpad', 'control-station'], agencyUnlocks: ['launch', 'data-hub'], transitSatelliteLaunchedAt: now, agencyCommunity: community }
    const catalog = buildRuntimeCatalog({ catalog: STATIC_CATALOG, freeOperations: true, transitSatelliteLaunchedAt: now, targetId: 'exo-shared', player, missionsDone: 5 })
    expect(catalog.missions.some(mission => mission.id === TRANSIT_TELESCOPE_MISSION_ID)).toBe(true)
    expect(catalog.missions.some(mission => mission.id === 'community-science-launch')).toBe(true)
    expect(catalog.targets.some(target => target.id === 'exo-shared')).toBe(true)
    expect(communityWorlds(community)).toHaveLength(1)
    const state = normalizeAndRepair({ ...DEFAULT_STATE, screen: 'fab', missionId: 'exo-survey-exo-shared', targetId: 'exo-shared', player })
    expect(state.screen).toBe('fab')
    expect(normalizeAndRepair({ ...state, missionId: 'service-space-telescope', targetId: 'earth-orbit-transit-telescope' }).screen).toBe('fab')
  })

  it('makes donated data usable without awarding a stamp or inventing owned craft', () => {
    const player = { ...DEFAULT_STATE.player, freeOperations: true, agencyCommunity: community }
    const signals = collectInstrumentSignals({ player, tess: TESS_CANDIDATES, asteroids: ASTEROID_CANDIDATES, saturn: SATURN_CANDIDATES, dateKey: '2026-11-20' })
    expect(signals.some(signal => signal.kind === 'transit')).toBe(true)
    expect(signals.some(signal => signal.kind === 'deep-space')).toBe(true)
    expect(signals.some(signal => signal.kind === 'saturn')).toBe(true)
    expect(fleetCount(player, 'space-telescope')).toBe(0)
    expect(player.researchStamps).toEqual({})
    expect(deepSpaceInstrumentDigest(ASTEROID_CANDIDATES, player, '2026-11-20').length).toBe(1)
  })

  it('does not refill today’s allowance after a classification, while old records do not consume it', () => {
    const player = { ...DEFAULT_STATE.player, freeOperations: true, transitSatelliteLaunchedAt: now - 1000 }
    const digest = unresolvedTransitInstrumentDigest(TESS_CANDIDATES, player, '2026-11-20')
    const done = { ...player, tessClassifications: { [digest[0].id]: { subjectId: digest[0].id, verdict: 'unsure' as const, ranges: [], submittedAt: now } } }
    expect(unresolvedTransitInstrumentDigest(TESS_CANDIDATES, done, '2026-11-20')).toHaveLength(0)
    expect(unresolvedTransitInstrumentDigest(TESS_CANDIDATES, done, '2026-11-21')).toHaveLength(1)
  })

  it('keeps the first project on one daily classification stamp while letting a launch stamp the same day', () => {
    const first = addStamp(DEFAULT_STATE.player, 'classification', now, 'saturn-storms')
    const second = addStamp(first, 'classification', now + 1000, 'exoplanet-hunters')
    expect(second).toBe(first)
    expect(second.researchStampProjects?.['2026-11-20']?.classification).toBe('saturn-storms')
    const launched = addStamp(second, 'launch', now + 2000, 'exoplanet-hunters')
    expect(launched.researchStamps?.['2026-11-20']).toEqual(['classification', 'launch'])
  })
})
