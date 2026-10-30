import raw from './constellations.json'
import type { Player } from '@/lib/game-types'

export interface SkyConstellation {
  id: string
  name: string
  description: string
  source_kind: 'mission' | 'contribution' | 'event'
  source: string
  points: ReadonlyArray<readonly [number, number]>
}

export interface UnlockedConstellation extends SkyConstellation {
  earnedAt: number
  earnedBy: string
}

const constellations = (raw.constellations as Array<Omit<SkyConstellation, 'points'> & { points: number[][] }>).map(constellation => ({
  ...constellation,
  points: constellation.points.filter(point => point.length === 2).map(point => [point[0], point[1]] as const),
}))

function unlock(player: Player, constellation: SkyConstellation): { earnedAt: number; earnedBy: string } | null {
  if (constellation.source_kind === 'mission') {
    const records = (player.completedMissions ?? []).filter(record => constellation.source === 'any-mission' || record.id === constellation.source)
    const first = records.slice().sort((a, b) => a.completedAt - b.completedAt)[0]
    return first ? { earnedAt: first.completedAt, earnedBy: first.title } : null
  }
  if (constellation.source_kind === 'event') {
    const badge = player.badges?.[constellation.source]
    return badge ? { earnedAt: badge.earnedAt, earnedBy: badge.eventId === 'orionids-2026' ? 'Completed the Orionids shower' : badge.eventId } : null
  }
  const classificationTimes = [
    ...Object.values(player.tessClassifications ?? {}).map(value => value.submittedAt),
    ...Object.values(player.asteroidClassifications ?? {}).map(value => value.submittedAt),
    ...Object.values(player.saturnClassifications ?? {}).map(value => value.submittedAt),
  ].filter(Number.isFinite)
  if (constellation.source === 'classification') {
    const earnedAt = Math.min(...classificationTimes)
    return Number.isFinite(earnedAt) ? { earnedAt, earnedBy: 'A telescope classification' } : null
  }
  const researchTimes = [
    ...Object.values(player.researchStamps ?? {}).flat().map(() => 0),
    ...((player.researchFragments ?? 0) > 0 ? [0] : []),
  ]
  const earnedAt = Math.min(...researchTimes.filter(Number.isFinite))
  return researchTimes.length ? { earnedAt: Number.isFinite(earnedAt) ? earnedAt : 0, earnedBy: 'A community research contribution' } : null
}

export function unlockedConstellations(player: Player): UnlockedConstellation[] {
  return constellations.flatMap(constellation => {
    const result = unlock(player, constellation)
    return result ? [{ ...constellation, ...result }] : []
  })
}
