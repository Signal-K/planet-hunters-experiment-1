import { CONSTRUCTION_COMING_LATER } from './deferred-features'
import type { Mission, Target } from './data'
import type { Player, Screen } from './game-types'
import { padNeedsService } from './data/building-levels'
import { missionResumeScreen } from './mission-resume'

interface ContractOption {
  mission: Mission
  unlocked: boolean
  targetIds: string[]
}

/** Pick a short, single-stop job from the same eligible list as the board. */
export function nextMiningContract(options: ContractOption[], targets: Target[]) {
  const option = options.filter(({ mission: m, unlocked, targetIds }) =>
    unlocked && targetIds.length > 0 && !!m.client && !m.deliveryTargetId && !m.payload && !m.construction
    && Object.values(m.requires.minerals).some(n => n > 0),
  ).sort((a, b) =>
    Object.values(a.mission.requires.minerals).reduce((sum, n) => sum + n, 0)
    - Object.values(b.mission.requires.minerals).reduce((sum, n) => sum + n, 0),
  )[0]
  if (!option) return null
  const feasible = targets.filter(t => option.targetIds.includes(t.id))
  const target = feasible.find(t => t.id === option.mission.targetId)
    ?? feasible.find(t => t.recommended) ?? feasible[0]
  return target ? { mission: option.mission, target } : null
}

export interface BaseNextFlight {
  title: string
  detail: string
  cta: string
  screen: Screen
  prepare?: { missionId: string; targetId: string }
}

function objective(mission: Mission, target: Target, cargo?: Record<string, number> | null) {
  const ore = Object.entries(mission.requires.minerals).filter(([, n]) => n > 0)
    .map(([id, n]) => `${cargo ? `${cargo[id] ?? 0}/` : ''}${n} ${id}`).join(' + ')
  return `${target.name} · ${ore || 'loadout selected'}`
}

export function baseNextFlight(player: Player, setup: Mission | null, target: Target | null,
  next: ReturnType<typeof nextMiningContract>, now = Date.now()): BaseNextFlight {
  if (player.activeMission) return {
    title: setup?.title ?? player.activeMission.label,
    detail: player.returningToEarth ? 'Bring your cargo home and settle this flight.'
      : setup && target ? objective(setup, target, player.missionPhase === 'mining' ? player.miningCargoInProgress ?? {} : undefined)
      : 'Your flight is waiting where you left it.',
    cta: player.missionPhase === 'debrief' ? 'Settle flight' : player.missionPhase === 'mining' ? 'Resume mining' : 'Resume flight',
    screen: missionResumeScreen(player, now),
  }
  if (!player.placed.includes('launchpad')) return {
    title: 'Your first launchpad', detail: 'Place the pad to start flying.', cta: 'Open base', screen: 'hub',
  }
  if (padNeedsService(player)) return {
    title: 'Get the pad ready', detail: 'Service the launchpad before your next flight.', cta: 'Service pad', screen: 'hub',
  }
  if (setup && target) return {
    title: setup.title, detail: objective(setup, target), cta: 'Continue setup', screen: 'fab',
  }
  if (player.pendingLaunch || player.stagedRockets?.some(r => r.id === player.selectedStagedRocketId)) return {
    title: 'Your prepared rocket', detail: 'Check the rocket before choosing another job.', cta: 'Open launchpad', screen: 'launchpad',
  }
  if (next) return {
    title: next.mission.title, detail: objective(next.mission, next.target),
    cta: 'Prepare flight', screen: 'missions', prepare: { missionId: next.mission.id, targetId: next.target.id },
  }
  return { title: 'Choose your next flight', detail: 'Contracts, surveys and your own mining runs.', cta: 'Open missions', screen: 'missions' }
}
