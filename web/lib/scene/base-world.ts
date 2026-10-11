import type { TimeOfDayPhase } from '@/lib/hooks/useTimeOfDay'

/** Earth Base landscapes. Mountains and desert ship layer art; tundra and coast reuse those sets with a grade. */
export const EARTH_BIOMES = ['mountains', 'desert', 'tundra', 'coast'] as const
export type EarthBiomeId = (typeof EARTH_BIOMES)[number]

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const
export type Season = (typeof SEASONS)[number]

/** Full day cycle. Dusk is one grade, not the only sky. */
export const WORLD_TIME_GRADES = ['dawn', 'morning', 'midday', 'afternoon', 'dusk', 'night'] as const
export type WorldTimeGrade = (typeof WORLD_TIME_GRADES)[number]

export interface BiomeLayer {
  id: 'far' | 'hills' | 'treeline'
  src: string
  /** Height of the band above the ground line. */
  height: string
  /** Seconds for one parallax wrap. Farther bands are slower. */
  parallaxSeconds: number
}

const MOUNTAIN_LAYERS: readonly BiomeLayer[] = [
  { id: 'far', src: '/game/assets/biomes/mountains/layer-far.png', height: '34%', parallaxSeconds: 140 },
  { id: 'hills', src: '/game/assets/biomes/mountains/layer-hills.png', height: '28%', parallaxSeconds: 96 },
  { id: 'treeline', src: '/game/assets/biomes/mountains/layer-treeline.png', height: '22%', parallaxSeconds: 64 },
]

const DESERT_LAYERS: readonly BiomeLayer[] = [
  { id: 'far', src: '/game/assets/biomes/desert/layer-far.png', height: '32%', parallaxSeconds: 140 },
]

/** Layer set for a biome. Tundra borrows the mountain bands; coast borrows the desert band. */
export function biomeLayers(biome: EarthBiomeId): readonly BiomeLayer[] {
  if (biome === 'desert' || biome === 'coast') return DESERT_LAYERS
  return MOUNTAIN_LAYERS
}

export function sanitizeEarthBiome(value: unknown): EarthBiomeId {
  return typeof value === 'string' && (EARTH_BIOMES as readonly string[]).includes(value)
    ? value as EarthBiomeId
    : 'mountains'
}

/** Month is 0-indexed, matching `Date#getMonth`. */
export function seasonForMonth(month: number): Season {
  const m = ((Math.floor(month) % 12) + 12) % 12
  if (m === 11 || m <= 1) return 'winter'
  if (m <= 4) return 'spring'
  if (m <= 7) return 'summer'
  return 'autumn'
}

export function seasonForDate(date: Date): Season {
  return seasonForMonth(date.getMonth())
}

export function sanitizeSeason(value: unknown): Season | null {
  return typeof value === 'string' && (SEASONS as readonly string[]).includes(value)
    ? value as Season
    : null
}

/** Local hour, 0–23. Dawn 5, morning 8, midday 11, afternoon 14, dusk 17, night 20. */
export function worldTimeForHour(hour: number): WorldTimeGrade {
  const h = ((Math.floor(hour) % 24) + 24) % 24
  if (h >= 5 && h < 8) return 'dawn'
  if (h >= 8 && h < 11) return 'morning'
  if (h >= 11 && h < 14) return 'midday'
  if (h >= 14 && h < 17) return 'afternoon'
  if (h >= 17 && h < 20) return 'dusk'
  return 'night'
}

export function sanitizeWorldTime(value: unknown): WorldTimeGrade | null {
  if (value === 'day') return 'midday'
  return typeof value === 'string' && (WORLD_TIME_GRADES as readonly string[]).includes(value)
    ? value as WorldTimeGrade
    : null
}

/** Four-step sky still used by the launchpad terrain and the courtyard plates. */
export function coarseSkyPhase(grade: WorldTimeGrade): TimeOfDayPhase {
  if (grade === 'night') return 'night'
  if (grade === 'dusk') return 'dusk'
  if (grade === 'dawn') return 'dawn'
  return 'day'
}

let previewTime: WorldTimeGrade | null = null
let previewSeasonLock: Season | null = null

/** Remember `?time=` and `?season=` before a preset load strips the query. */
export function lockBaseWorldPreview(params: { get(name: string): string | null }): void {
  const time = sanitizeWorldTime(params.get('time'))
  const season = sanitizeSeason(params.get('season'))
  if (time) previewTime = time
  if (season) previewSeasonLock = season
}

export function lockedWorldTime(): WorldTimeGrade | null {
  return previewTime
}

export function lockedSeason(): Season | null {
  return previewSeasonLock
}

export function worldTimeGrade(phase: TimeOfDayPhase | WorldTimeGrade): WorldTimeGrade {
  if (phase === 'day') return 'midday'
  return sanitizeWorldTime(phase) ?? 'midday'
}

export interface SceneFootprint {
  x: number
  /** Half-width in the same scene units as `x`. */
  half: number
}

/** Largest empty span between occupied scene-x positions (0 to 402), so the Exchange sits in a gap.
 *  The lift shaft reserves the centre, and the Exchange never lands on it. */
export function exchangeAnchorX(occupiedSceneX: number[], sceneWidth = 402): number {
  const points = [...occupiedSceneX, sceneWidth / 2]
    .filter(x => Number.isFinite(x))
    .slice()
    .sort((a, b) => a - b)
  const edges = [0, ...points, sceneWidth]
  let best = sceneWidth / 2
  let bestGap = -1
  for (let i = 1; i < edges.length; i += 1) {
    const gap = edges[i] - edges[i - 1]
    if (gap > bestGap) {
      bestGap = gap
      best = (edges[i] + edges[i - 1]) / 2
    }
  }
  return best
}

/** Exchange scene-x that keeps its own half-width clear of neighbours and the lift shaft.
 *  Equal room on both sides of the shaft prefers the first side, which is left of centre. */
export function exchangeSeat(occupied: SceneFootprint[], ownHalf: number, sceneWidth = 402): number {
  const shaftHalf = 36
  const blocks = [
    ...occupied.filter(block => Number.isFinite(block.x) && Number.isFinite(block.half)),
    { x: sceneWidth / 2, half: shaftHalf },
  ].sort((a, b) => a.x - b.x)
  const edges: SceneFootprint[] = [{ x: 0, half: 0 }, ...blocks, { x: sceneWidth, half: 0 }]
  let bestX = sceneWidth * 0.72
  let bestRoom = -Infinity
  for (let i = 1; i < edges.length; i += 1) {
    const left = edges[i - 1]
    const right = edges[i]
    const minX = left.x + left.half + ownHalf
    const maxX = right.x - right.half - ownHalf
    const room = maxX - minX
    if (room > bestRoom) {
      bestRoom = room
      bestX = room >= 0 ? (minX + maxX) / 2 : (left.x + right.x) / 2
    }
  }
  return Math.min(sceneWidth - ownHalf, Math.max(ownHalf, bestX))
}

/** Level 1 is the small first build. Level 3 is the full reference size. */
export function structureTierScale(level: number): number {
  if (level >= 3) return 1
  if (level >= 2) return 0.78
  return 0.56
}

export function structureTier(level: number): 1 | 2 | 3 {
  if (level >= 3) return 3
  if (level >= 2) return 2
  return 1
}
