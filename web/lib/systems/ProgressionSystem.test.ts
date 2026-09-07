import { describe, expect, it } from 'vitest'
import type { GameState } from '@/lib/game-types'
import { MISSIONS } from '@/lib/data'
import {
  applyGainResearchXP,
  applyAbandonMission,
  applyAcceptLoan,
  LICENSE_GRADE_XP_GATES,
  applyUnlockBlueprint,
  applyUpgradeLicenseGrade,
  TREASURY_PLAYER_ID,
} from './ProgressionSystem'
import { applyCollectScan } from './ScanSystem'
import { LOAN_PRINCIPAL, TREASURY_STARTING_BALANCE } from '@/lib/data'
import { createTreasuryState, loanOutstanding } from './TreasurySystem'

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
      clientMissions: {},
      clientStreaks: {},
      clientCooldowns: {},
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
      clientTerritories: {},
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
    const blocked = applyUpgradeLicenseGrade(makeState({ player: { researchXP: 149 } }), 'Grade II')
    expect(blocked.player.licenseGrade).toBe('Grade I')

    const gradeTwo = applyUpgradeLicenseGrade(makeState({ player: { researchXP: 150 } }), 'Grade II')
    expect(gradeTwo.player.licenseGrade).toBe('Grade II')

    const alreadyGradeTwo = { ...gradeTwo, player: { ...gradeTwo.player, researchXP: 500 } }
    const noDowngrade = applyUpgradeLicenseGrade(alreadyGradeTwo, 'Grade II')
    expect(noDowngrade).toBe(alreadyGradeTwo)
  })

  it('uses the retuned STS-492 License Grade gates through Grade III', () => {
    expect(LICENSE_GRADE_XP_GATES).toMatchObject({
      'Grade I': 0,
      'Grade II': 150,
      'Grade III': 500,
    })

    const blocked = applyUpgradeLicenseGrade(makeState({ player: { researchXP: 499, licenseGrade: 'Grade II' } }), 'Grade III')
    expect(blocked.player.licenseGrade).toBe('Grade II')

    const upgraded = applyUpgradeLicenseGrade(makeState({ player: { researchXP: 500, licenseGrade: 'Grade II' } }), 'Grade III')
    expect(upgraded.player.licenseGrade).toBe('Grade III')
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

  it('clears paused mining, rover, and delivery state when abandoning an active mission', () => {
    const state = makeState({
      screen: 'mining',
      missionId: 'generated-s1-starter-bulk-1',
      targetId: 'eros',
      player: {
        activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Iron starter order -> Eros' },
        miningCargoInProgress: { iron: 2 },
        roverMiningStartedAt: 123456,
        deliveryUnloadStartedAt: 234567,
        arrivalAt: Date.now() + 60_000,
        headingToDelivery: true,
        debriefPending: true,
        returningToEarth: true,
      },
      deliveredCargo: { iron: 2 },
    })

    const next = applyAbandonMission(state, MISSIONS)

    expect(next.screen).toBe('hub')
    expect(next.player.activeMission).toBeNull()
    expect(next.player.miningCargoInProgress).toBeUndefined()
    expect(next.player.roverMiningStartedAt).toBeUndefined()
    expect(next.player.deliveryUnloadStartedAt).toBeUndefined()
    expect(next.player.arrivalAt).toBeNull()
    expect(next.player.headingToDelivery).toBe(false)
    expect(next.player.debriefPending).toBe(false)
    expect(next.player.returningToEarth).toBe(false)
    expect(next.deliveredCargo).toBeNull()
  })
})

describe('applyAcceptLoan', () => {
  it('credits exactly the no-interest principal from the treasury and mirrors the debt', () => {
    const state = makeState({ player: { francs: 100_000 } })
    const next = applyAcceptLoan(state, 1_000)

    expect(next.player.francs).toBe(100_000 + LOAN_PRINCIPAL)
    expect(next.player.loanDebt).toBe(LOAN_PRINCIPAL)
    expect(next.player.loanOffered).toBe(true)
    expect(next.popup).toBeNull()
    expect(loanOutstanding(next.player.treasury!, TREASURY_PLAYER_ID)).toBe(LOAN_PRINCIPAL)
    expect(next.player.treasury!.balanceFrancs).toBe(TREASURY_STARTING_BALANCE - LOAN_PRINCIPAL)
  })

  it('refuses a second concurrent loan while one is outstanding', () => {
    const state = makeState({ player: { francs: 100_000 } })
    const first = applyAcceptLoan(state, 1_000)
    const second = applyAcceptLoan(first, 2_000)

    expect(second.player.francs).toBe(first.player.francs)
    expect(second.player.loanDebt).toBe(first.player.loanDebt)
  })

  it('refuses to lend more than the treasury holds', () => {
    const state = makeState({
      player: { francs: 100_000, treasury: createTreasuryState(LOAN_PRINCIPAL - 1) },
    })
    const next = applyAcceptLoan(state, 1_000)

    expect(next.player.francs).toBe(100_000)
    expect(next.player.treasury?.loans ?? {}).toEqual({})
  })
})
