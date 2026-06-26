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
        contractorMissions: {},
        contractorCooldowns: {},
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

  it('repairs mission route state when hydrated mission context is missing', () => {
    const normalized = normalizeAndRepair({
      screen: 'fab',
      missionId: null,
      targetId: 'mars',
    })

    expect(normalized.screen).toBe('missions')
    expect(normalized.targetId).toBeNull()
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
})
