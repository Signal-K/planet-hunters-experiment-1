import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_STATE, loadState, mergeRemoteState, normalizeAndRepair, normalizeState, type PartialSave } from './game-state'
import type { GameState } from './game-types'
import { MISSIONS, TARGETS } from './data'

describe('game state hydration normalization', () => {
  let storage: Map<string, string>

  beforeEach(() => {
    storage = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value) },
      removeItem: (key: string) => { storage.delete(key) },
    })
    vi.stubGlobal('window', {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('backfills progression fields for older saves', () => {
    const olderSave: PartialSave = {
      screen: 'hub',
      player: {
        francs: 9_500_000_000,
        activeMission: null,
        missionCount: 1,
        pendingLaunch: false,
        placed: ['launchpad'],
        placementPlots: { launchpad: 0 },
        controlBuilt: false,
        missionsDone: 0,
        freeOperations: false,
        clientMissions: {},
        clientCooldowns: {},
        researchAnnotations: 0,
        refineryBuilt: false,
        refineryQueue: [],
        refinedGoods: {},
        launchpadUpgraded: false,
        loanDebt: 0,
        loanOffered: false,
      },
      missionId: null,
      targetId: null,
      rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
      lastCargo: null,
      tutorial: true,
      doneSteps: {},
      popup: null,
      menuOpen: false,
    }

    const normalized = normalizeState(olderSave)

    expect(normalized.player.licenseGrade).toBe('Grade I')
    expect(normalized.player.researchXP).toBe(0)
    expect(normalized.player.unlockedBlueprints).toEqual([])
    expect(normalized.player.tessClassifications).toEqual({})
    expect(normalized.player.instrumentDigestNotifiedOn).toEqual({})
    expect(normalized.player.satelliteMonitoringLevel).toBe(1)
    expect(normalized.player.transitSatelliteLevel).toBe(1)
    expect(normalized.player.francs).toBe(9_500_000_000)
  })

  it('repairs malformed progression fields from remote JSON', () => {
    const normalized = normalizeState({
      player: {
        licenseGrade: 'Grand Admiral',
        researchXP: -4.7,
        unlockedBlueprints: ['garage', '', 'garage', 'scan-array', 42],
      } as never,
    })

    expect(normalized.player.licenseGrade).toBe('Grade I')
    expect(normalized.player.researchXP).toBe(0)
    expect(normalized.player.unlockedBlueprints).toEqual(['garage', 'scan-array'])
  })

  it('floors valid Research XP and preserves valid license grade', () => {
    const normalized = normalizeState({
      player: {
        licenseGrade: 'Grade II',
        researchXP: 12.9,
        unlockedBlueprints: ['relay-mast'],
      } as PartialSave['player'],
    })

    expect(normalized.player.licenseGrade).toBe('Grade II')
    expect(normalized.player.researchXP).toBe(12)
    expect(normalized.player.unlockedBlueprints).toEqual(['relay-mast'])
  })

  it('preserves saved TESS classifications', () => {
    const normalized = normalizeState({
      player: {
        tessClassifications: {
          'tess-toi-451-b': {
            subjectId: 'tess-toi-451-b',
            verdict: 'planet',
            ranges: [{ x1: 0.68, x2: 0.76 }, { x1: 2.54, x2: 2.62 }],
            submittedAt: 1760000000000,
          },
        },
      },
    })

    expect(normalized.player.tessClassifications?.['tess-toi-451-b']?.verdict).toBe('planet')
    expect(normalized.player.tessClassifications?.['tess-toi-451-b']?.ranges).toEqual([{ x1: 0.68, x2: 0.76 }, { x1: 2.54, x2: 2.62 }])
  })

  it('persists valid instrument digest markers and drops malformed values', () => {
    const normalized = normalizeState({
      player: {
        instrumentDigestNotifiedOn: {
          'transit-telescope': '2026-07-30',
          blank: '',
          malformed: 42,
        },
      } as never,
    })

    expect(normalized.player.instrumentDigestNotifiedOn).toEqual({
      'transit-telescope': '2026-07-30',
    })
  })

  it('normalizes satellite discovery levels to at least one', () => {
    const normalized = normalizeState({
      player: {
        satelliteMonitoringLevel: 0,
        transitSatelliteLevel: 2.8,
      },
    })

    expect(normalized.player.satelliteMonitoringLevel).toBe(1)
    expect(normalized.player.transitSatelliteLevel).toBe(2)
  })

  it('repairs mission route state when hydrated mission context is missing', () => {
    const normalized = normalizeAndRepair({
      screen: 'fab',
      missionId: null,
      targetId: 'mars',
    })

    expect(normalized.screen).toBe('missions')
    expect(normalized.targetId).toBeNull()
  })

  it('keeps TESS Atlas behind Free Operations on hydration', () => {
    const normalized = normalizeAndRepair({
      screen: 'galaxy',
      player: { freeOperations: false },
    })

    expect(normalized.screen).toBe('missions')
  })

  it('preserves active transit telescope mission context on hydration', () => {
    const normalized = normalizeAndRepair({
      screen: 'debrief',
      missionId: 'story-transit-telescope-launch',
      targetId: 'earth-orbit-transit-telescope',
      lastCargo: {},
    })

    expect(normalized.screen).toBe('debrief')
    expect(normalized.missionId).toBe('story-transit-telescope-launch')
    expect(normalized.targetId).toBe('earth-orbit-transit-telescope')
  })

  it('loads normalized state from localStorage and falls back on corrupt JSON', () => {
    const storageKey = 'landnam-test-state'
    globalThis.localStorage.setItem(storageKey, JSON.stringify({
      screen: 'hub',
      player: { researchXP: 5, unlockedBlueprints: ['garage'] },
    }))

    expect(loadState(storageKey).player.researchXP).toBe(5)
    expect(loadState(storageKey).player.unlockedBlueprints).toEqual(['garage'])

    globalThis.localStorage.setItem(storageKey, '{broken')
    expect(loadState(storageKey)).toBe(DEFAULT_STATE)
    globalThis.localStorage.removeItem(storageKey)
  })

  it('migrates pre-STS-535 saves that still use "contractor"-named fields', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legacySave: any = {
      screen: 'hub',
      player: {
        contractorMissions: { 'helios-propulsion-depot': 3 },
        contractorStreaks: { 'helios-propulsion-depot': 1 },
        contractorCooldowns: { 'atlas-aggregate': 1234567890 },
        lastContractor: 'helios-propulsion-depot',
        contractorTerritories: { 'eros': ['helios-propulsion-depot'] },
        dailyContractorPool: { date: '2026-07-25', missions: [], acceptedId: null, completedIds: [] },
        contractorStructures: [{ targetId: 'eros', structureKind: 'depot', contractorId: 'helios-propulsion-depot', state: 'operational' }],
        roverDeployments: [{ roverId: 'r1', targetId: 'eros', contractorId: 'helios-propulsion-depot', timestamp: 1 }],
      },
      pendingTerritoryClaimFor: { targetId: 'eros', contractorId: 'helios-propulsion-depot' },
    }

    const normalized = normalizeState(legacySave)

    expect(normalized.player.clientMissions).toEqual({ 'helios-propulsion-depot': 3 })
    expect(normalized.player.clientStreaks).toEqual({ 'helios-propulsion-depot': 1 })
    expect(normalized.player.clientCooldowns).toEqual({ 'atlas-aggregate': 1234567890 })
    expect(normalized.player.lastClient).toBe('helios-propulsion-depot')
    expect(normalized.player.clientTerritories).toEqual({ eros: ['helios-propulsion-depot'] })
    expect(normalized.player.dailyClientPool?.date).toBe('2026-07-25')
    expect(normalized.player.clientStructures?.[0]?.clientId).toBe('helios-propulsion-depot')
    expect(normalized.player.roverDeployments?.[0]?.clientId).toBe('helios-propulsion-depot')
    expect(normalized.pendingTerritoryClaimFor?.clientId).toBe('helios-propulsion-depot')
  })
})

describe('mergeRemoteState — remote game_states record onto local state', () => {
  const M1_BUILD_HUB_MISSIONS_DONE = { 0: true, 1: true, 2: true }

  function local(overrides: PartialSave = {}): GameState {
    return normalizeAndRepair({ ...DEFAULT_STATE, ...overrides })
  }

  // The STS-576 regression. A player pressed "Reset game": local went back to
  // DEFAULT_STATE, but the remote row survived (the delete raced the persist
  // effect and lost). On the next load the monotonic guard kept the local
  // zeroed player while doneSteps fell out of the object spread from remote,
  // producing a fresh save carrying a half-finished tutorial. The coach renders
  // the first step for the current screen NOT in doneSteps, so steps 0/1/2
  // being "done" killed the coach on build, hub and missions at once.
  it('does not keep remote doneSteps when the local player wins the merge', () => {
    const merged = mergeRemoteState(local(), {
      player: { missionsDone: 0, placed: ['launchpad'], francs: 42 },
      tutorial: true,
      doneSteps: M1_BUILD_HUB_MISSIONS_DONE,
    })

    expect(merged.player.missionsDone).toBe(0)
    // Construction is monotonic even when the local onboarding checkpoint wins
    // the merge, so a saved launchpad cannot disappear after refresh/login.
    expect(merged.player.placed).toEqual(['launchpad'])
    // The whole point: doneSteps must travel with the player it describes.
    expect(merged.doneSteps).toEqual({})
  })

  it('takes remote doneSteps when the remote player wins the merge', () => {
    // missionsDone must clear FREE_OPS_START_MISSIONS_DONE (3), otherwise
    // normalizeState force-repairs tutorial back to true — during onboarding
    // the coach is always armed and hides itself by matching no step.
    const merged = mergeRemoteState(local(), {
      player: { missionsDone: 4, placed: ['launchpad', 'refinery'] },
      tutorial: false,
      doneSteps: M1_BUILD_HUB_MISSIONS_DONE,
    })

    expect(merged.player.missionsDone).toBe(4)
    expect(merged.player.placed).toEqual(['launchpad', 'refinery'])
    expect(merged.doneSteps).toEqual(M1_BUILD_HUB_MISSIONS_DONE)
    expect(merged.tutorial).toBe(false)
  })

  it('re-arms the tutorial flag if a remote record disables it mid-onboarding', () => {
    const merged = mergeRemoteState(local(), {
      player: { missionsDone: 1 },
      tutorial: false,
      doneSteps: {},
    })

    expect(merged.player.missionsDone).toBe(1)
    expect(merged.tutorial).toBe(true)
  })

  it('never regresses onboarding stage from a stale remote record', () => {
    const merged = mergeRemoteState(
      local({ player: { ...DEFAULT_STATE.player, missionsDone: 3 }, tutorial: false }),
      { player: { missionsDone: 1 }, tutorial: true, doneSteps: M1_BUILD_HUB_MISSIONS_DONE },
    )

    expect(merged.player.missionsDone).toBe(3)
    expect(merged.tutorial).toBe(false)
  })

  it('keeps local navigation when the player has already moved off the default screen', () => {
    // Real catalog ids: repairStateRoute bounces a mission/target-context
    // screen back to 'missions' when the ids don't resolve, which would mask
    // what this test is actually asserting.
    const localMission = MISSIONS[0].id
    const localTarget = TARGETS[0].id

    const merged = mergeRemoteState(
      local({ screen: 'mining', missionId: localMission, targetId: localTarget }),
      { screen: 'hub', missionId: MISSIONS[1].id, targetId: TARGETS[1].id, player: { missionsDone: 9 } },
    )

    expect(merged.screen).toBe('mining')
    expect(merged.missionId).toBe(localMission)
    expect(merged.targetId).toBe(localTarget)
    // Navigation is guarded independently of onboarding position — a further
    // ahead remote still supplies the player.
    expect(merged.player.missionsDone).toBe(9)
  })

  it('accepts remote navigation when local is still on the default screen', () => {
    const merged = mergeRemoteState(local(), {
      screen: 'hub',
      missionId: 'remote-mission',
      player: { missionsDone: 4 },
    })

    expect(merged.screen).toBe('hub')
    expect(merged.missionId).toBe('remote-mission')
  })

  it('restores a remote in-progress mission over a stale local hub save', () => {
    const mission = MISSIONS[0]
    const target = TARGETS[0]
    const merged = mergeRemoteState(local({ screen: 'hub' }), {
      screen: 'mining',
      missionId: mission.id,
      targetId: target.id,
      player: {
        activeMission: { id: mission.id, label: `${mission.title} → ${target.name}` },
        missionRunId: 'run-123',
        missionPhase: 'mining',
      },
    })

    expect(merged.screen).toBe('mining')
    expect(merged.missionId).toBe(mission.id)
    expect(merged.targetId).toBe(target.id)
    expect(merged.player.activeMission?.id).toBe(mission.id)
    expect(merged.player.missionRunId).toBe('run-123')
    expect(merged.player.missionPhase).toBe('mining')
  })

  it('restores a remote delivery unload with its wall-clock epoch and cargo', () => {
    const mission = MISSIONS.find(candidate => candidate.deliveryTargetId)!
    const startedAt = 1_700_000_123_000
    const merged = mergeRemoteState(local({ screen: 'hub' }), {
      screen: 'delivery',
      missionId: mission.id,
      targetId: mission.targetId,
      deliveryTargetId: mission.deliveryTargetId,
      lastCargo: { iron: 3 },
      player: {
        activeMission: { id: mission.id, label: mission.title },
        missionRunId: 'run-delivery',
        missionPhase: 'delivery',
        headingToDelivery: true,
        deliveryUnloadStartedAt: startedAt,
      },
    })

    expect(merged.screen).toBe('delivery')
    expect(merged.deliveryTargetId).toBe(mission.deliveryTargetId)
    expect(merged.lastCargo).toEqual({ iron: 3 })
    expect(merged.player.missionPhase).toBe('delivery')
    expect(merged.player.deliveryUnloadStartedAt).toBe(startedAt)
    expect(merged.player.headingToDelivery).toBe(true)
  })

  // The STS-601 cause-2 regression. useAuthSync refetches game_states on
  // `visibilitychange`, so every tab switch runs a merge against whatever the
  // remote row happens to hold. With both saves at the same missionsDone the
  // equal-stage branch is what decides the run's fate — if it took the remote
  // player, coming back to the tab erased an in-flight launch/transit.
  it('keeps a local in-flight run when an equal-stage remote record has none', () => {
    const mission = MISSIONS[0]
    const target = TARGETS[0]
    const startedAt = 1_700_000_000_000

    const merged = mergeRemoteState(
      local({
        screen: 'transit',
        missionId: mission.id,
        targetId: target.id,
        player: {
          ...DEFAULT_STATE.player,
          missionsDone: 2,
          activeMission: { id: mission.id, label: `${mission.title} → ${target.name}` },
          missionRunId: 'run-local-601',
          missionPhase: 'transit',
          transitStartedAt: startedAt,
        },
      }),
      // A remote row written before the run began: same stage, run fields
      // explicitly cleared — the shape that clobbers a local run if the
      // equal-stage branch ever spreads the remote player over it.
      {
        screen: 'hub',
        missionId: null,
        targetId: null,
        player: {
          missionsDone: 2,
          activeMission: null,
          missionRunId: undefined,
          missionPhase: undefined,
          transitStartedAt: null,
        },
      },
    )

    expect(merged.screen).toBe('transit')
    expect(merged.missionId).toBe(mission.id)
    expect(merged.targetId).toBe(target.id)
    expect(merged.player.activeMission?.id).toBe(mission.id)
    expect(merged.player.missionRunId).toBe('run-local-601')
    expect(merged.player.missionPhase).toBe('transit')
    // The wall-clock epoch is what stops the transit animation restarting.
    expect(merged.player.transitStartedAt).toBe(startedAt)
  })

  // STS-635: a genuine tie (equal missionsDone on both sides) must not
  // discard remote resource progress wholesale — resource-like fields take
  // the max per field/key instead of blanket local-wins.
  describe('resource max-merge on a missionsDone tie', () => {
    it('takes the higher francs value between local and remote', () => {
      const merged = mergeRemoteState(
        local({ player: { ...DEFAULT_STATE.player, missionsDone: 2, francs: 100 } }),
        { player: { missionsDone: 2, francs: 500 } },
      )
      expect(merged.player.missionsDone).toBe(2)
      expect(merged.player.francs).toBe(500)
    })

    it('keeps the local francs value when it is higher than remote', () => {
      const merged = mergeRemoteState(
        local({ player: { ...DEFAULT_STATE.player, missionsDone: 2, francs: 900 } }),
        { player: { missionsDone: 2, francs: 500 } },
      )
      expect(merged.player.francs).toBe(900)
    })

    it('merges stash and refinedGoods per-key by taking the max', () => {
      const merged = mergeRemoteState(
        local({
          player: {
            ...DEFAULT_STATE.player,
            missionsDone: 2,
            stash: { iron: 10, silicon: 2 },
            refinedGoods: { alloy: 1 },
          },
        }),
        {
          player: {
            missionsDone: 2,
            stash: { iron: 4, silicon: 8, platinum: 3 },
            refinedGoods: { alloy: 5, composite: 2 },
          },
        },
      )
      expect(merged.player.stash).toEqual({ iron: 10, silicon: 8, platinum: 3 })
      expect(merged.player.refinedGoods).toEqual({ alloy: 5, composite: 2 })
    })

    it('takes the max of researchXP, skillPoints and researchAnnotations', () => {
      const merged = mergeRemoteState(
        local({
          player: {
            ...DEFAULT_STATE.player,
            missionsDone: 2,
            researchXP: 50,
            skillPoints: 1,
            researchAnnotations: 3,
          },
        }),
        {
          player: {
            missionsDone: 2,
            researchXP: 200,
            skillPoints: 0,
            researchAnnotations: 1,
          },
        },
      )
      expect(merged.player.researchXP).toBe(200)
      expect(merged.player.skillPoints).toBe(1)
      expect(merged.player.researchAnnotations).toBe(3)
    })

    it('still unions placed/placementPlots on a tie, same as before', () => {
      const merged = mergeRemoteState(
        local({ player: { ...DEFAULT_STATE.player, missionsDone: 2, placed: ['launchpad'] } }),
        { player: { missionsDone: 2, placed: ['refinery'], placementPlots: { refinery: 2 } } },
      )
      expect(merged.player.placed.sort()).toEqual(['launchpad', 'refinery'])
      expect(merged.player.placementPlots).toEqual({ refinery: 2 })
    })

    it('falls back to local-wins on a tie for non-resource fields when neither side has updatedAt', () => {
      const merged = mergeRemoteState(
        local({ player: { ...DEFAULT_STATE.player, missionsDone: 2, refineryBuilt: false } }),
        { player: { missionsDone: 2, refineryBuilt: true } },
      )
      expect(merged.player.refineryBuilt).toBe(false)
    })

    it('prefers the newer side (by updatedAt) for non-resource fields on a tie', () => {
      const merged = mergeRemoteState(
        local({
          player: { ...DEFAULT_STATE.player, missionsDone: 2, refineryBuilt: false },
          updatedAt: 1000,
        }),
        { player: { missionsDone: 2, refineryBuilt: true }, updatedAt: 5000 },
      )
      expect(merged.player.refineryBuilt).toBe(true)
    })

    it('still takes the resource max even when the remote side wins the updatedAt tie-break', () => {
      const merged = mergeRemoteState(
        local({
          player: { ...DEFAULT_STATE.player, missionsDone: 2, francs: 900 },
          updatedAt: 1000,
        }),
        { player: { missionsDone: 2, francs: 500 }, updatedAt: 5000 },
      )
      // Remote wins the timestamp tie-break for ordinary fields, but francs
      // is a resource field and must still resolve to the max of both sides.
      expect(merged.player.francs).toBe(900)
    })
  })

  it('preserves player fields the remote record omits', () => {
    const merged = mergeRemoteState(local(), {
      player: { missionsDone: 5 },
    })

    expect(merged.player.missionsDone).toBe(5)
    // Fields absent from an older remote save must not come back undefined.
    expect(merged.player.licenseGrade).toBe(DEFAULT_STATE.player.licenseGrade)
    expect(merged.player.clientMissions).toEqual({})
  })

  it('tolerates a remote record with no player at all', () => {
    const merged = mergeRemoteState(local({ player: { ...DEFAULT_STATE.player, missionsDone: 2 } }), {
      screen: 'hub',
    })

    expect(merged.player.missionsDone).toBe(2)
    expect(merged.doneSteps).toEqual({})
  })
})

describe('structure flags are derived from `placed`', () => {
  // A save made before applyPlaceStructure started setting a flag has the
  // structure in `placed` and the flag false. The hub then kept prompting
  // "Build a Satellite Monitoring Station" for one already standing.
  it('repairs satelliteMonitoringBuilt from placed', () => {
    const s = normalizeState({ player: { placed: ['launchpad', 'satellite-monitoring-station'] } })
    expect(s.player.satelliteMonitoringBuilt).toBe(true)
  })

  it('repairs refineryBuilt and scannerBuilt the same way', () => {
    const s = normalizeState({ player: { placed: ['refinery', 'scan-station'] } })
    expect(s.player.refineryBuilt).toBe(true)
    expect(s.player.scannerBuilt).toBe(true)
  })

  it('leaves the flags false when the structure is not placed', () => {
    const s = normalizeState({ player: { placed: ['launchpad'] } })
    expect(s.player.satelliteMonitoringBuilt).toBe(false)
    expect(s.player.refineryBuilt).toBe(false)
  })

  it('keeps a flag that is set even if placed somehow lost the entry', () => {
    const s = normalizeState({ player: { placed: [], satelliteMonitoringBuilt: true } })
    expect(s.player.satelliteMonitoringBuilt).toBe(true)
  })
})
