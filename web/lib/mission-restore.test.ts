import { describe, expect, it } from 'vitest'
import { STATIC_CATALOG } from './catalog'
import { DEFAULT_STATE, normalizeAndRepair } from './game-state'
import { buildRuntimeCatalog } from './runtimeCatalog'
import { MISSIONS, ORIONIDS_NIGHT_RUN_ID, ORIONIDS_SHOWER_TARGET_ID, RESOURCE_FOCUS_MISSION_ID, TARGETS } from './data'
import type { Mission } from './data'
import type { GameState, Screen } from './game-types'

// A save taken mid-flight must come back on the same flight after a cold reload, whatever kind of mission it is.
// Each case is one mission type: the mission id and target a run would hold in its state.
const firstTargetId = TARGETS[0].id
const bySeq = (pred: (m: Mission) => boolean) => MISSIONS.find(pred)
const aMissionOf = (label: string, m: Mission | undefined, targetId?: string) => {
  if (!m) throw new Error(`no ${label} mission in MISSIONS`)
  return { label, missionId: m.id, targetId: m.targetId ?? targetId ?? firstTargetId }
}

const player = { ...DEFAULT_STATE.player, freeOperations: true, placed: ['control-station'] }
const discovered = { 'tess-x': { ...TARGETS[0], id: 'tess-x', name: 'TESS X b' } }

const CASES = [
  aMissionOf('onboarding contract', bySeq(m => m.id.startsWith('generated-') && !m.id.startsWith('generated-s2-'))),
  aMissionOf('authored transport relay', bySeq(m => m.id === 'lnm_m3_relay_itokawa_eros')),
  aMissionOf('free ops client run', bySeq(m => m.id.startsWith('freeops-') && m.id !== 'freeops-self-directed-mining')),
  aMissionOf('self-directed mining', bySeq(m => m.id === 'freeops-self-directed-mining')),
  aMissionOf('self-directed pool run', bySeq(m => m.id.startsWith('self-directed-') && m.id !== ORIONIDS_NIGHT_RUN_ID)),
  { label: 'orionids shower run', missionId: ORIONIDS_NIGHT_RUN_ID, targetId: ORIONIDS_SHOWER_TARGET_ID },
  { label: 'resource focus haul', missionId: RESOURCE_FOCUS_MISSION_ID, targetId: firstTargetId },
  { label: 'transit telescope launch', missionId: 'story-transit-telescope-launch', targetId: 'earth-orbit-transit-telescope' },
  { label: 'saturn imager launch', missionId: 'story-saturn-imager-launch', targetId: 'earth-orbit-saturn-imager' },
  { label: 'discovered world survey', missionId: 'exo-survey-tess-x', targetId: 'tess-x' },
  { label: 'live catalog contract', missionId: 'pb-only-contract-1', targetId: 'pb-only-target-1' },
]

const SCREENS: Screen[] = ['transit', 'landing', 'mining', 'delivery', 'debrief']

function savedFlight(missionId: string, targetId: string, screen: Screen, label: string, clearIds = false): GameState {
  return {
    ...DEFAULT_STATE,
    screen,
    missionId: clearIds ? null : missionId,
    targetId: clearIds ? null : targetId,
    tutorial: false,
    player: {
      ...player,
      discoveredExoplanetTargets: discovered,
      activeMission: { id: missionId, label },
      missionPhase: screen === 'landing' ? 'landing' : screen === 'mining' ? 'mining' : screen === 'delivery' ? 'delivery' : screen === 'debrief' ? 'debrief' : 'transit',
      missionRunId: `run-${missionId}`,
    },
  } as GameState
}

describe('a flight in progress survives a reload', () => {
  for (const c of CASES) {
    for (const screen of SCREENS) {
      it(`${c.label} on ${screen}`, () => {
        const loaded = normalizeAndRepair(savedFlight(c.missionId, c.targetId, screen, `Flight → ${c.targetId}`))
        expect(loaded.screen).toBe(screen)
        expect(loaded.missionId).toBe(c.missionId)
        expect(loaded.targetId).toBe(c.targetId)
      })
    }
    it(`${c.label} is still resolvable by the runtime catalog`, () => {
      const catalog = buildRuntimeCatalog({
        catalog: STATIC_CATALOG, discoveredTargets: discovered, freeOperations: true, missionId: c.missionId, targetId: c.targetId, missionsDone: 4,
        player: { ...player, activeMission: { id: c.missionId, label: 'x' } },
      })
      // Live-catalog-only rows come from the server, so only the repo-known types are checked here.
      if (c.missionId.startsWith('pb-only')) return
      expect(catalog.missions.some(m => m.id === c.missionId)).toBe(true)
      expect(catalog.targets.some(t => t.id === c.targetId)).toBe(true)
    })
  }

  it('a run that carries its own mission and target restores them even when the catalog has rotated them away', () => {
    const mission = { ...MISSIONS[0], id: 'pb-only-contract-1', targetId: 'pb-only-target-1' }
    const target = { ...TARGETS[0], id: 'pb-only-target-1', name: 'Helios Depot' }
    const saved = savedFlight(mission.id, target.id, 'transit', 'Contract → Helios Depot', true)
    saved.player.activeMission = { id: mission.id, label: 'Contract → Helios Depot', mission, target }
    const loaded = normalizeAndRepair(JSON.parse(JSON.stringify(saved)))
    expect(loaded.missionId).toBe(mission.id)
    expect(loaded.targetId).toBe(target.id)
    expect(loaded.player.activeMission?.mission?.id).toBe(mission.id)
    expect(loaded.player.activeMission?.target?.name).toBe('Helios Depot')
  })

  it('a save that already lost its ids gets them back from the run', () => {
    const target = TARGETS[0]
    const loaded = normalizeAndRepair(savedFlight('pb-only-contract-1', 'x', 'mining', `Hauler → ${target.name}`, true))
    expect(loaded.screen).toBe('mining')
    expect(loaded.missionId).toBe('pb-only-contract-1')
    expect(loaded.targetId).toBe(target.id)
  })
})
