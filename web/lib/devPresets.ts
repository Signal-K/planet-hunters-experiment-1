import type { GameState, Player } from '@/game-context'

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
  contractorCooldowns: {},
  researchAnnotations: 0,
  refineryBuilt: false,
  refineryQueue: [],
  refinedGoods: {},
  launchpadUpgraded: false,
  loanDebt: 0,
  loanOffered: false,
}

const M1_DONE: Record<number, boolean> = { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 9: true }
const M2_DONE: Record<number, boolean> = { ...M1_DONE, 20: true, 21: true }

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
      { key: 'm1-fab',    label: 'Fab',     hint: 'M1 mission + Eros picked, at fab' },
      { key: 'm1-mining', label: 'Mining',  hint: 'In mining with iron target' },
      { key: 'm1-debrief',label: 'Debrief', hint: 'Post-mine debrief, 6 iron' },
    ],
  },
  {
    label: 'Mission 2',
    color: '#3fa9ff',
    shots: [
      { key: 'm2-hub',    label: 'Hub',     hint: 'SR2 unlocked, M2 coach active' },
      { key: 'm2-fab',    label: 'Fab',     hint: 'M2 silicon + Eros, SR2 config' },
      { key: 'm2-mining', label: 'Mining',  hint: 'In mining with silicon target' },
      { key: 'm2-market', label: 'Market',  hint: '8 silicon in stash, sell screen' },
    ],
  },
  {
    label: 'Mission 3',
    color: '#70e070',
    shots: [
      { key: 'm3-hub',    label: 'Hub',     hint: 'missionsDone=2, M3 available' },
      { key: 'm3-fab',    label: 'Fab',     hint: 'M3 mission + belt target, SR2 config' },
    ],
  },
  {
    label: 'Free Ops',
    color: '#f5a623',
    shots: [
      { key: 'freeops',   label: 'Hub',     hint: 'All 3 done, full sandbox' },
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
        missionId: 'm1-iron', targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'm1-mining':
      return {
        screen: 'mining',
        player: { ...BASE_PLAYER, missionsDone: 0, activeMission: { id: 'm1-iron', label: 'Iron Reserve Order → Eros' } },
        tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
        missionId: 'm1-iron', targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'm1-debrief':
      return {
        screen: 'debrief',
        player: { ...BASE_PLAYER, missionsDone: 0, stash: { iron: 6 } },
        tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true },
        missionId: 'm1-iron', targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: { iron: 6 }, popup: null,
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

    case 'm2-fab':
      return {
        screen: 'fab',
        player: { ...BASE_PLAYER, missionsDone: 1 },
        tutorial: true, doneSteps: { ...M1_DONE, 20: true },
        missionId: 'm2-silicon', targetId: 'eros',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'm2-mining':
      return {
        screen: 'mining',
        player: { ...BASE_PLAYER, missionsDone: 1, activeMission: { id: 'm2-silicon', label: 'Silicon Bulk Order → Eros' } },
        tutorial: true, doneSteps: { ...M1_DONE, 20: true, 21: true },
        missionId: 'm2-silicon', targetId: 'eros',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'm2-market':
      return {
        screen: 'market',
        player: { ...BASE_PLAYER, missionsDone: 1, stash: { silicon: 8 }, lastContractor: 'contractor-03b' },
        tutorial: false, doneSteps: M1_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: { silicon: 8 }, popup: null,
      }

    // ── Mission 3 ──
    case 'm3-hub':
      return {
        screen: 'hub',
        player: { ...BASE_PLAYER, missionsDone: 2, controlBuilt: true, placed: ['launchpad', 'control'], placementPlots: { launchpad: 0, control: 1 } },
        tutorial: false, doneSteps: {},
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'm3-fab':
      return {
        screen: 'fab',
        player: { ...BASE_PLAYER, missionsDone: 2, controlBuilt: true, placed: ['launchpad', 'control'], placementPlots: { launchpad: 0, control: 1 } },
        tutorial: false, doneSteps: M2_DONE,
        missionId: 'm3-nickel-cobalt', targetId: 'belt',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    // ── Free Ops ──
    case 'freeops':
      return {
        screen: 'hub',
        player: {
          ...BASE_PLAYER,
          missionsDone: 3, freeOperations: true,
          controlBuilt: true,
          placed: ['launchpad', 'control', 'satellite', 'refinery'],
          placementPlots: { launchpad: 0, control: 1, satellite: 2, refinery: 3 },
          francs: 50_000_000_000,
        },
        tutorial: false, doneSteps: {},
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk3', propulsion: 'ion-a3', drill: 'plasma-t3' },
        lastCargo: null, popup: null,
      }

    default:
      return null
  }
}
