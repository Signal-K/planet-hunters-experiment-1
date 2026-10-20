// Older night-run progress (SSL-578). New catches use orionidsFragments.
// This field still round-trips so a save from the night rule is not dropped.
// Cargo mass ignores fragments: they take no hold space.

import { cargoUnits } from '@/lib/data/minerals'

export interface OrionidsNightCatches {
  night: string
  count: number
}

const NIGHT_KEY = /^\d{4}-\d{2}-\d{2}$/

/** Hours before 06:00 belong to the previous evening, so 18:00 on 21 Oct and 02:00 on 22 Oct are one night. */
export function orionidsNightKey(at: number): string {
  const date = new Date(at)
  if (date.getHours() < 6) date.setDate(date.getDate() - 1)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function sanitizeNightCatches(raw: unknown): OrionidsNightCatches | null {
  if (!raw || typeof raw !== 'object') return null
  const night = (raw as { night?: unknown }).night
  const count = (raw as { count?: unknown }).count
  if (typeof night !== 'string' || !NIGHT_KEY.test(night)) return null
  if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) return null
  return { night, count: Math.floor(count) }
}

export function catchesForNight(saved: OrionidsNightCatches | null | undefined, at: number): number {
  const clean = sanitizeNightCatches(saved)
  if (!clean || clean.night !== orionidsNightKey(at)) return 0
  return clean.count
}

export function recordFragmentCatch(saved: OrionidsNightCatches | null | undefined, at: number): OrionidsNightCatches {
  const night = orionidsNightKey(at)
  const clean = sanitizeNightCatches(saved)
  const count = clean && clean.night === night ? clean.count + 1 : 1
  return { night, count }
}

/** Same night keeps the higher count. A later night replaces an earlier one. */
export function mergeNightCatches(
  current: OrionidsNightCatches | null | undefined,
  remote: OrionidsNightCatches | null | undefined,
): OrionidsNightCatches | null {
  const local = sanitizeNightCatches(current)
  const incoming = sanitizeNightCatches(remote)
  if (!local) return incoming
  if (!incoming) return local
  if (local.night === incoming.night) return { night: local.night, count: Math.max(local.count, incoming.count) }
  return local.night > incoming.night ? local : incoming
}

export function cargoMass(cargo: Record<string, number>): number {
  return Object.entries(cargo).reduce((sum, [id, amount]) => {
    if (amount <= 0) return sum
    return sum + amount * cargoUnits(id)
  }, 0)
}

/** True when one more unit of `adding` fits. A zero-weight fragment always fits. */
export function holdHasRoom(cargo: Record<string, number>, capacity: number, adding?: string): boolean {
  if (adding && cargoUnits(adding) === 0) return true
  return cargoMass(cargo) < capacity
}
