import { weeklyRocketPartById, weeklyRocketPart } from '@/lib/data/weeklyRocketParts'
import type { Player } from '@/lib/game-types'
import { customizerPartById } from '@/lib/data/shipCustomizer'
import { allPartsForSlot, type BuilderSlot } from './rocketBuilder'

/** Legacy catalog rewards already stored before SSL-849; new awards use weekly issue IDs. */
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
export function earnedRocketParts(player: Pick<Player, 'researchRocketParts' | 'researchPath' | 'badges' | 'researchPassportWeeks'>): string[] {
  const ids = new Set<string>(Array.isArray(player.researchRocketParts) ? player.researchRocketParts : [])
  for (const row of Object.values(player.researchPassportWeeks ?? {})) { const part = row.earned ? weeklyRocketPart(row.week) : undefined; if (part) ids.add(part.id) }
  return [...ids].filter(id => Object.values(WEEKLY_ROCKET_PARTS).includes(id) || !!weeklyRocketPartById(id))
}
export function workshopParts(slot: BuilderSlot, player: Pick<Player, 'missionsDone' | 'researchRocketParts' | 'researchPath' | 'badges'>) {
  const earned = earnedRocketParts(player)
  const rewards = earned.map(customizerPartById).filter((part): part is NonNullable<typeof part> => !!part && part.kind === slot.kind && (!slot.match || part.id.includes(slot.match)))
  return [...allPartsForSlot(slot).filter(part => (part.unlockedAtMissions ?? 0) <= player.missionsDone || earned.includes(part.id)), ...rewards.filter(part => !allPartsForSlot(slot).some(existing => existing.id === part.id))]
}
export function workshopPartPrice(partId: string, player: Pick<Player, 'researchRocketParts' | 'researchPath' | 'badges'>): number {
  return earnedRocketParts(player).includes(partId) ? 0 : customizerPartById(partId)?.price ?? 0
}
