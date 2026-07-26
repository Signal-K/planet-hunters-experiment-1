import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_STATE, loadState, normalizeAndRepair, normalizeState, type PartialSave } from './game-state'

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
