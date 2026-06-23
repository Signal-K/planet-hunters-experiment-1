import type { GameState, Player } from '@/game-context'
import { MISSIONS } from '@/lib/data'

const FIRST_MISSION = MISSIONS.find(m => m.sequence === 1) ?? MISSIONS[0]
const SECOND_MISSION = MISSIONS.find(m => m.sequence === 2) ?? MISSIONS[1] ?? FIRST_MISSION
const FIRST_MINERAL = Object.keys(FIRST_MISSION.requires.minerals)[0] ?? 'iron'
const SECOND_MINERAL = Object.keys(SECOND_MISSION.requires.minerals)[0] ?? 'silicon'

const BASE_PLAYER: Player = {
  francs: 15_000_000_000,
  activeMission: null,
  missionCount: 1,
  pendingLaunch: false,
  placed: ['launchpad'],
  placementPlots: { launchpad: 0 },
  controlBuilt: false,
  missionsDone: 0,
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
}

const M1_DONE: Record<number, boolean> = { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 9: true }

export interface DevShot {
  key: string
  label: string
  hint: string
}

export interface DevGroup {
  label: string
  color: string
  shots: DevShot[]
}

export const DEV_GROUPS: DevGroup[] = [
  {
    label: 'Mission 1',
    color: '#d97150',
    shots: [
      { key: 'm1-intro',  label: 'Intro',   hint: 'Fresh start, no progress' },
      { key: 'm1-hub',    label: 'Hub',     hint: 'Launchpad built, M1 coach active' },
      { key: 'm1-fab',    label: 'Fab',     hint: 'First generated mission + Eros picked, at fab' },
      { key: 'm1-mining', label: 'Mining',  hint: 'In mining with iron target' },
      { key: 'm1-debrief',label: 'Debrief', hint: 'Post-mine debrief, 6 iron' },
    ],
  },
  {
    label: 'Mission 2',
    color: '#3fa9ff',
    shots: [
      { key: 'm2-hub',    label: 'Hub',     hint: 'SR2 unlocked, M2 coach active' },
      { key: 'm2-rocket-buy', label: 'Rocket', hint: 'Second generated mission + Eros, SR2 purchase step' },
      { key: 'm2-fab',    label: 'Fab',     hint: 'Second generated mission + Eros after SR2 purchase' },
      { key: 'm2-mining', label: 'Mining',  hint: 'In mining with second generated target' },
      { key: 'm2-market', label: 'Market',  hint: 'Second mission cargo in stash, sell screen' },
    ],
  },
]

export function resolvePreset(name: string): Partial<GameState> | null {
  switch (name) {
    // ── Mission 1 ──
    case 'm1-intro':
      return {
        screen: 'intro',
        player: { ...BASE_PLAYER, placed: [], placementPlots: {}, francs: 10_000_000_000 },
        tutorial: true, doneSteps: {},
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'm1-hub':
      return {
        screen: 'hub',
        player: { ...BASE_PLAYER, missionsDone: 0 },
        tutorial: true, doneSteps: { 0: true },
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'm1-fab':
      return {
        screen: 'fab',
        player: { ...BASE_PLAYER, missionsDone: 0 },
        tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true },
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'm1-mining':
      return {
        screen: 'mining',
        player: { ...BASE_PLAYER, missionsDone: 0, activeMission: { id: FIRST_MISSION.id, label: `${FIRST_MISSION.title} → Eros` } },
        tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'm1-debrief':
      return {
        screen: 'debrief',
        player: { ...BASE_PLAYER, missionsDone: 0, stash: { [FIRST_MINERAL]: FIRST_MISSION.requires.minerals[FIRST_MINERAL] ?? 1 } },
        tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true },
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: FIRST_MISSION.requires.minerals, popup: null,
      }

    // ── Mission 2 ──
    case 'm2-hub':
      return {
        screen: 'hub',
        player: { ...BASE_PLAYER, missionsDone: 1 },
        tutorial: true, doneSteps: M1_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'm2-rocket-buy':
      return {
        screen: 'rocket-buy',
        player: { ...BASE_PLAYER, missionsDone: 1 },
        tutorial: true, doneSteps: { ...M1_DONE, 20: true },
        missionId: SECOND_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'm2-fab':
      return {
        screen: 'fab',
        player: { ...BASE_PLAYER, missionsDone: 1, francs: BASE_PLAYER.francs - 1_300_000_000 },
        tutorial: true, doneSteps: { ...M1_DONE, 20: true, 21: true },
        missionId: SECOND_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'm2-mining':
      return {
        screen: 'mining',
        player: { ...BASE_PLAYER, missionsDone: 1, activeMission: { id: SECOND_MISSION.id, label: `${SECOND_MISSION.title} → Eros` } },
        tutorial: true, doneSteps: { ...M1_DONE, 20: true, 21: true },
        missionId: SECOND_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'm2-market':
      return {
        screen: 'market',
        player: { ...BASE_PLAYER, missionsDone: 1, stash: { [SECOND_MINERAL]: SECOND_MISSION.requires.minerals[SECOND_MINERAL] ?? 1 }, lastContractor: SECOND_MISSION.contractor },
        tutorial: false, doneSteps: M1_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: SECOND_MISSION.requires.minerals, popup: null,
      }

    default:
      return null
  }
}
