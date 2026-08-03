import type { Player, Screen } from '@/lib/game-types'

export const CONTENT_UPDATE_FLAG = 'landnam-content-update'

export type PlayerPlaystyle = 'contracts' | 'science' | 'industry' | 'exploration'

export interface ContentUpdate {
  id: string
  headline: string
  missions: string[]
  impact: string
  ctaLabel?: string
  ctaScreen?: Screen
}

const CONTENT_UPDATE_SCREENS = new Set<Screen>([
  'hub', 'missions', 'launchpad', 'galaxy', 'build', 'skills', 'market', 'hangar',
])

function numericTotal(values: Record<string, number> | undefined): number {
  return Object.values(values ?? {}).reduce((total, value) => total + Math.max(0, value), 0)
}

export function derivePlayerPlaystyle(player: Player): PlayerPlaystyle {
  const scores: Record<PlayerPlaystyle, number> = {
    contracts: player.missionsDone + numericTotal(player.clientMissions),
    science: player.researchAnnotations
      + Object.keys(player.tessClassifications ?? {}).length
      + Object.keys(player.asteroidClassifications ?? {}).length,
    industry: (player.refineryBuilt ? 4 : 0)
      + (player.launchpadUpgraded ? 2 : 0)
      + numericTotal(player.refinedGoods),
    exploration: (player.hasLanded ? 3 : 0)
      + (player.roverDeployments?.length ?? 0)
      + Object.keys(player.discoveredExoplanetTargets ?? {}).length,
  }

  return (Object.entries(scores) as Array<[PlayerPlaystyle, number]>)
    .reduce((best, current) => current[1] > best[1] ? current : best, ['contracts', scores.contracts])[0]
}

export function contentUpdateTargeting(player: Player): Record<string, string | number | boolean> {
  const progressionStage = !player.freeOperations
    ? 'guided_ops'
    : player.missionsDone < 6
      ? 'early_free_ops'
      : 'established_program'

  return {
    landnam_playstyle: derivePlayerPlaystyle(player),
    landnam_progression_stage: progressionStage,
    landnam_missions_done: player.missionsDone,
    landnam_free_operations: player.freeOperations,
    landnam_has_monitoring_station: !!player.satelliteMonitoringBuilt,
    landnam_has_refinery: player.refineryBuilt,
    landnam_has_landed: !!player.hasLanded,
    landnam_license_grade: player.licenseGrade ?? 'Grade I',
  }
}

export function parseContentUpdatePayload(value: unknown): ContentUpdate | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const payload = value as Record<string, unknown>
  const id = typeof payload.id === 'string' ? payload.id.trim() : ''
  const headline = typeof payload.headline === 'string' ? payload.headline.trim() : ''
  const impact = typeof payload.impact === 'string' ? payload.impact.trim() : ''
  const missions = Array.isArray(payload.missions)
    ? payload.missions.filter((mission): mission is string => typeof mission === 'string' && mission.trim().length > 0).slice(0, 4)
    : []

  if (!id || !headline || !impact || missions.length === 0) return null

  const ctaScreen = typeof payload.ctaScreen === 'string' && CONTENT_UPDATE_SCREENS.has(payload.ctaScreen as Screen)
    ? payload.ctaScreen as Screen
    : undefined
  const ctaLabel = ctaScreen && typeof payload.ctaLabel === 'string' && payload.ctaLabel.trim()
    ? payload.ctaLabel.trim()
    : undefined

  return { id, headline, missions, impact, ctaLabel, ctaScreen }
}
