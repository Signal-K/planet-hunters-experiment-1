/**
 * The "while you were away" catch-up (SSL-702). One card, one short list, one
 * dismissal. It only exists when the player was away 4 hours or more and at
 * least one source has something to say (Liam, 1.11). The instrument digest
 * folds into it instead of raising its own toast.
 */

import type { EconomyArrival } from './EconomyArrival.ts'

export const WELCOME_BACK_AWAY_MS = 4 * 60 * 60 * 1000

export type WelcomeBackScene = 'market' | 'instrument' | 'base' | 'friends'

export interface WelcomeBack {
  /** `lastVisitAt` the catch-up covers, so a reload never re-announces it. */
  since: number
  /** Structures that finished building while away. */
  built?: string[]
  /** Telescope digest items that arrived while away. */
  digest?: number
  /** Friend gifts waiting. */
  gifts?: number
}

export interface WelcomeBackRow {
  id: 'market' | 'instrument' | 'construction' | 'gift'
  text: string
  scene: WelcomeBackScene
}

export function wasAway(lastVisitAt: number | undefined, now = Date.now()): boolean {
  return typeof lastVisitAt === 'number' && now - lastVisitAt >= WELCOME_BACK_AWAY_MS
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function welcomeBackRows(
  arrival: EconomyArrival | undefined,
  back: WelcomeBack | undefined,
  structureName: (kind: string) => string = kind => kind,
): WelcomeBackRow[] {
  const rows: WelcomeBackRow[] = []
  if (arrival) {
    const moves = arrival.moves.map(m => `${m.materialName} ${m.changePct > 0 ? '+' : ''}${m.changePct}%`)
    const levels = arrival.levelUps.slice(0, 2).map(c => `${c.clientName} reached level ${c.levelAfter}`)
    const text = [...moves, ...levels].join(', ')
    if (text) rows.push({ id: 'market', text, scene: 'market' })
  }
  if (back?.digest) rows.push({ id: 'instrument', text: `${plural(back.digest, 'new telescope item')} to review`, scene: 'instrument' })
  if (back?.built?.length) {
    const names = back.built.slice(0, 2).map(structureName).join(' and ')
    const extra = back.built.length - 2
    rows.push({ id: 'construction', text: `${names}${extra > 0 ? ` and ${extra} more` : ''} finished building`, scene: 'base' })
  }
  if (back?.gifts) rows.push({ id: 'gift', text: `${plural(back.gifts, 'friend gift')} waiting`, scene: 'friends' })
  return rows
}

/** Merges a late-arriving source (digest, gifts) without losing the others. */
export function withWelcomeBack(current: WelcomeBack | undefined, since: number, patch: Partial<Omit<WelcomeBack, 'since'>>): WelcomeBack {
  return { ...(current && current.since === since ? current : {}), since, ...patch }
}
