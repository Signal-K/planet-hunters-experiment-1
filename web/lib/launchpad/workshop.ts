import type { Player } from '@/lib/game-types'
import { customizerPartById } from '@/lib/data/shipCustomizer'
import { allPartsForSlot, type BuilderSlot } from './rocketBuilder'

/** Existing catalog parts, permanently earned at the weekly research milestones. */
export const WEEKLY_ROCKET_PARTS: Record<number, string> = {
  2: 'storage-silo-t2', 4: 'fusion-thruster-t2', 5: 'ringed-laser-t3',
}
export const LIVERY_COLORS = {
  cream: 'var(--ln-blueprint-paper)', blue: 'var(--ln-blueprint-blue)',
  cyan: 'var(--ln-cyan)', ink: 'var(--ln-blueprint-ink)',
} as const
export type LiveryColor = keyof typeof LIVERY_COLORS
export const LIVERY_DECALS = ['none', 'star', 'orbit', 'stripes'] as const
export type RocketLivery = { hull: LiveryColor; trim: LiveryColor; decal: typeof LIVERY_DECALS[number]; updatedAt: number }
export function sanitizeLivery(raw: Partial<RocketLivery> | undefined): RocketLivery {
  const color = (value: unknown, fallback: LiveryColor) => typeof value === 'string' && Object.hasOwn(LIVERY_COLORS, value) ? value as LiveryColor : fallback
  return { hull: color(raw?.hull, 'cream'), trim: color(raw?.trim, 'blue'),
    decal: LIVERY_DECALS.includes(raw?.decal as RocketLivery['decal']) ? raw!.decal! : 'none',
    updatedAt: typeof raw?.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0 }
}
export function earnedRocketParts(player: Pick<Player, 'researchRocketParts' | 'researchPath' | 'badges'>): string[] {
  const ids = new Set<string>(Array.isArray(player.researchRocketParts) ? player.researchRocketParts : [])
  // Migrate already claimed research rewards; a completed past week also keeps its parts.
  const markers = Object.keys(player.badges ?? {}).some(key => key.startsWith('community-research-'))
    ? [2, 4, 5] : player.researchPath?.claimedSteps ?? []
  for (const marker of markers) if (WEEKLY_ROCKET_PARTS[marker]) ids.add(WEEKLY_ROCKET_PARTS[marker])
  return [...ids].filter(id => Object.values(WEEKLY_ROCKET_PARTS).includes(id))
}
export function workshopParts(slot: BuilderSlot, player: Pick<Player, 'missionsDone' | 'researchRocketParts' | 'researchPath' | 'badges'>) {
  const earned = earnedRocketParts(player)
  return allPartsForSlot(slot).filter(part => (part.unlockedAtMissions ?? 0) <= player.missionsDone || earned.includes(part.id))
}
export function workshopPartPrice(partId: string, player: Pick<Player, 'researchRocketParts' | 'researchPath' | 'badges'>): number {
  return earnedRocketParts(player).includes(partId) ? 0 : customizerPartById(partId)?.price ?? 0
}
