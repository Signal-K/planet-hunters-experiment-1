import { describe, expect, it } from 'vitest'
import type { GameState } from '@/lib/game-types'
import {
  applyGainResearchXP,
  applyUnlockBlueprint,
  applyUpgradeLicenseGrade,
} from './ProgressionSystem'
import { applyCollectScan } from './ScanSystem'

type GameStateOverrides = Omit<Partial<GameState>, 'player'> & {
  player?: Partial<GameState['player']>
}

function makeState(overrides: GameStateOverrides = {}): GameState {
  const base: GameState = {
    screen: 'hub',
    player: {
      francs: 1_000,
      activeMission: null,
      missionCount: 1,
      pendingLaunch: false,
      placed: [],
      placementPlots: {},
      controlBuilt: false,
      missionsDone: 0,
      skillPoints: 0,
      unlockedSkillNodes: [],
      freeOperations: false,
      contractorMissions: {},
      contractorStreaks: {},
      contractorCooldowns: {},
      researchAnnotations: 0,
      refineryBuilt: false,
      refineryUnlocked: false,
      refineryUnlockNotified: false,
      refineryQueue: [],
      refinedGoods: {},
      launchpadUpgraded: false,
      loanDebt: 0,
      loanOffered: false,
      seen_planets: [],
      roverDeployments: [],
      contractorTerritories: {},
      licenseGrade: 'Grade I',
      researchXP: 0,
      unlockedBlueprints: [],
    },
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    menuOpen: false,
  }

  return {
    ...base,
    ...overrides,
    player: {
      ...base.player,
      ...overrides.player,
    },
  }
}

describe('research progression', () => {
  it('adds floored positive Research XP and ignores invalid gains', () => {
    const gained = applyGainResearchXP(makeState(), 12.8)
    expect(gained.player.researchXP).toBe(12)

    const unchanged = applyGainResearchXP(gained, -4)
    expect(unchanged).toBe(gained)
  })

  it('gates license grade upgrades by Research XP and prevents downgrades', () => {
    const blocked = applyUpgradeLicenseGrade(makeState({ player: { researchXP: 99 } }), 'Grade II')
    expect(blocked.player.licenseGrade).toBe('Grade I')

    const gradeTwo = applyUpgradeLicenseGrade(makeState({ player: { researchXP: 100 } }), 'Grade II')
    expect(gradeTwo.player.licenseGrade).toBe('Grade II')

    const alreadyGradeTwo = { ...gradeTwo, player: { ...gradeTwo.player, researchXP: 300 } }
    const noDowngrade = applyUpgradeLicenseGrade(alreadyGradeTwo, 'Grade II')
    expect(noDowngrade).toBe(alreadyGradeTwo)
  })

  it('unlocks a blueprint by spending Francs, Research XP, and materials once', () => {
    const state = makeState({
      player: {
        francs: 500,
        researchXP: 50,
        stash: { copper: 4, iron: 2 },
      },
    })
    const unlocked = applyUnlockBlueprint(state, 'garage', 125, 20, { copper: 3 })

    expect(unlocked.player.unlockedBlueprints).toEqual(['garage'])
    expect(unlocked.player.francs).toBe(375)
    expect(unlocked.player.researchXP).toBe(30)
    expect(unlocked.player.stash?.copper).toBe(1)

    const duplicate = applyUnlockBlueprint(unlocked, 'garage', 125, 20, { copper: 1 })
    expect(duplicate).toBe(unlocked)
  })

  it('does not unlock a blueprint when any cost is unaffordable', () => {
    const state = makeState({ player: { francs: 10, researchXP: 10, stash: { copper: 1 } } })

    expect(applyUnlockBlueprint(state, 'garage', 11)).toBe(state)
    expect(applyUnlockBlueprint(state, 'garage', 0, 11)).toBe(state)
    expect(applyUnlockBlueprint(state, 'garage', 0, 0, { copper: 2 })).toBe(state)
  })

  it('awards Research XP when a completed target scan is collected', () => {
    const state = makeState({
      player: {
        activeScan: { targetId: 'mars', completesAt: Date.now() - 1 },
        researchXP: 5,
      },
    })

    const next = applyCollectScan(state)

    expect(next.player.activeScan).toBeNull()
    expect(next.player.targetScanCounts?.mars).toBe(1)
    expect(next.player.researchXP).toBe(15)
  })
})
