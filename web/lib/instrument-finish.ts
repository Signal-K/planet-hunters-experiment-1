/**
 * Instrument finishes (Liam, 1.11: "different colours each time, based on levels; allow for
 * some level of customisation"). Each instrument level unlocks one colourway for the glass
 * console. AUTO follows the instrument's level, so every level-up repaints the console; the
 * player can pin any unlocked finish instead. Device-local, like the orientation preference.
 * Mirrored by native `InstrumentFinish` (InstrumentViewport.swift).
 */
export interface InstrumentFinish {
  id: string
  name: string
  /** Instrument level that unlocks it. */
  unlockLevel: number
  /** Three accent stops (cool → mid → hot) as hex; amber stays the warning colour everywhere. */
  a: string
  b: string
  c: string
  /** Glass body tint, top and bottom. */
  glassTop: string
  glassBottom: string
}

export const INSTRUMENT_FINISHES: readonly InstrumentFinish[] = [
  { id: 'indigo', name: 'Indigo', unlockLevel: 1, a: '#74a8ff', b: '#b49bff', c: '#ff73d2', glassTop: '#1e1e48', glassBottom: '#0e102c' },
  { id: 'ember', name: 'Ember', unlockLevel: 2, a: '#ffb36b', b: '#ff7a59', c: '#ff4f8b', glassTop: '#3a1e2a', glassBottom: '#1a0e18' },
  { id: 'glacier', name: 'Glacier', unlockLevel: 3, a: '#a8e6ff', b: '#5f8dff', c: '#e4f4ff', glassTop: '#16284e', glassBottom: '#08122a' },
  { id: 'solar', name: 'Solar', unlockLevel: 4, a: '#ffe08a', b: '#ffb020', c: '#ff6a3d', glassTop: '#3a2a10', glassBottom: '#1a1206' },
  { id: 'void', name: 'Void', unlockLevel: 5, a: '#9b6bff', b: '#d43cff', c: '#ff5ce1', glassTop: '#1e0c3a', glassBottom: '#0a0418' },
]

export const AUTO_FINISH = 'auto'

/** The finish a level brings with it: one per level, wrapping after the last. */
export function finishForLevel(level: number): InstrumentFinish {
  const n = Math.max(1, Math.floor(level))
  return INSTRUMENT_FINISHES[(n - 1) % INSTRUMENT_FINISHES.length]
}

export function unlockedFinishes(level: number): InstrumentFinish[] {
  return INSTRUMENT_FINISHES.filter(f => f.unlockLevel <= Math.max(1, Math.floor(level)))
}

/** Pinned choice if still unlocked, otherwise the level's own finish. */
export function resolveFinish(choice: string | null | undefined, level: number): InstrumentFinish {
  const pinned = choice && choice !== AUTO_FINISH ? unlockedFinishes(level).find(f => f.id === choice) : undefined
  return pinned ?? finishForLevel(level)
}

/** Order the FINISH key steps through: AUTO, then each unlocked finish. */
export function nextFinishChoice(choice: string | null | undefined, level: number): string {
  const order = [AUTO_FINISH, ...unlockedFinishes(level).map(f => f.id)]
  const i = order.indexOf(choice ?? AUTO_FINISH)
  return order[(i + 1) % order.length]
}

const storageKey = (instrumentId: string) => `ln-instrument-finish:${instrumentId}`

export function readFinishChoice(instrumentId: string): string {
  try { return window.localStorage.getItem(storageKey(instrumentId)) ?? AUTO_FINISH } catch { return AUTO_FINISH }
}

export function writeFinishChoice(instrumentId: string, choice: string): void {
  try { window.localStorage.setItem(storageKey(instrumentId), choice) } catch { /* private mode */ }
}

function rgb(hex: string): string {
  const v = parseInt(hex.slice(1), 16)
  return `${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}`
}

/** CSS custom properties the console's glass block reads. */
export function finishStyle(f: InstrumentFinish): Record<string, string> {
  return {
    '--hw-a': f.a, '--hw-b': f.b, '--hw-c': f.c,
    '--hw-a-rgb': rgb(f.a), '--hw-b-rgb': rgb(f.b), '--hw-c-rgb': rgb(f.c),
    '--hw-glass-top-rgb': rgb(f.glassTop), '--hw-glass-bottom-rgb': rgb(f.glassBottom),
  }
}

export function hexNumber(hex: string): number {
  return parseInt(hex.slice(1), 16)
}
