// Orionids night-run progress (SSL-578). The goal is fragments caught across
// one local night, stored on the player and synced with the rest of the save.
// Cargo is a separate hold: it keeps only what the ship can carry.

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

export function holdHasRoom(cargo: Record<string, number>, capacity: number): boolean {
  const units = Object.values(cargo).reduce((sum, amount) => sum + (amount > 0 ? amount : 0), 0)
  return units < capacity
}
