// Orionids peak extras (SSL-578). The fireball falls once per player at local
// 22 Oct 02:00. The reading and the quiz both have to finish before the
// Fireball Spotter badge. Tiers follow the Orionids window: gold until 8 Nov,
// silver after. Rows use the existing event_badges shape.

import {
  badgeTierFor,
  orionidsPeakReminderMs,
  type BadgeTier,
  type PlayerBadge,
} from '@/lib/data/sky-events'
import { ORIONIDS_EVENT_ID, ORIONIDS_SOURCE } from './finds'

export const FIREBALL_FRAGMENT_ID = 'fireball_fragment'
export { FIREBALL_FRAGMENT_PRICE } from '@/lib/data/economy'
export const FIREBALL_2026_BADGE = 'fireball-2026'
export const FIREBALL_SPOTTER_BADGE = 'fireball-spotter-2026'
export const FIREBALL_SUBJECT_ID = 'self'
export const FIREBALLS_IN_THE_SKY_URL = 'https://fireballsinthesky.com.au'

export interface FireballSpotterProgress {
  readAt: number | null
  passedAt: number | null
}

export type FireballPlayer = {
  badges?: Record<string, PlayerBadge>
  fireball2026CaughtAt?: number | null
  fireballSpotter?: FireballSpotterProgress | null
}

export interface FireballQuestion {
  prompt: string
  choices: readonly string[]
  answer: number
}

export const FIREBALL_ARTICLE = [
  'A meteoroid is a small rock still in space. A meteor is the streak of light when that rock hits the air and burns. A meteorite is a piece that survives and reaches the ground. A fireball is a meteor bright enough to outshine Venus, about magnitude −4 or brighter.',
  'Fireballs in the Sky is the public face of Curtin University’s Desert Fireball Network. Cameras in different places photograph the same fireball. Intersecting those lines of sight triangulates the path through the atmosphere. From the path and the speed, the network models the dark flight after the light goes out and searches the ground for the meteorite.',
  'If you see one, report it at fireballsinthesky.com.au. Useful details are the time, where you were, the direction it travelled, how long it lasted, how bright it looked, whether you heard a sound, and whether it broke apart.',
] as const

export const FIREBALL_QUIZ: readonly FireballQuestion[] = [
  {
    prompt: 'What is a meteorite?',
    choices: [
      'The streak of light in the sky',
      'A piece that reaches the ground',
      'Any rock still in space',
    ],
    answer: 1,
  },
  {
    prompt: 'What makes a meteor a fireball?',
    choices: [
      'It is bright enough to outshine Venus',
      'It is slower than a satellite',
      'It only appears during a named shower',
    ],
    answer: 0,
  },
  {
    prompt: 'How does Fireballs in the Sky locate a fall?',
    choices: [
      'One camera guesses the landing from brightness alone',
      'Cameras in different places triangulate the path, then the dark flight is modelled',
      'The rock is tracked only after it is already on the ground',
    ],
    answer: 1,
  },
]

/** Local 22 Oct 02:00, the same instant as the real-sky reminder. */
export function fireballMomentMs(): number {
  return orionidsPeakReminderMs()
}

/** Peak night ends at local 22 Oct 06:00. */
export function fireballWindowEndMs(): number {
  return new Date(2026, 9, 22, 6, 0, 0, 0).getTime()
}

/** One fragment is due from 02:00 until 06:00 if this player has not caught it. */
export function fireballDue(at: number, caughtAt: number | null | undefined): boolean {
  if (!Number.isFinite(at)) return false
  if (typeof caughtAt === 'number' && caughtAt > 0) return false
  return at >= fireballMomentMs() && at < fireballWindowEndMs()
}

export function fireballQuizCorrect(answers: readonly number[]): boolean {
  return FIREBALL_QUIZ.every((question, index) => answers[index] === question.answer)
}

function grantNamedBadge<T extends FireballPlayer>(
  player: T,
  eventId: string,
  at: number,
): { player: T; badge: PlayerBadge | null } {
  const tier: BadgeTier | null = badgeTierFor(ORIONIDS_EVENT_ID, at)
  if (!tier) return { player, badge: null }
  const existing = player.badges?.[eventId]
  if (existing && (existing.tier === 'gold' || tier === 'silver')) return { player, badge: null }
  const badge: PlayerBadge = { eventId, tier, earnedAt: at }
  return {
    player: { ...player, badges: { ...(player.badges ?? {}), [eventId]: badge } },
    badge,
  }
}

/** Catching the fragment records the instant and the Fireball 2026 badge. Idempotent. */
export function grantFireballCatch<T extends FireballPlayer>(
  player: T,
  at: number,
): { player: T; badge: PlayerBadge | null } {
  if (player.fireball2026CaughtAt) return { player, badge: null }
  const granted = grantNamedBadge(player, FIREBALL_2026_BADGE, at)
  if (!granted.badge && granted.player === player && !badgeTierFor(ORIONIDS_EVENT_ID, at)) {
    return { player, badge: null }
  }
  return {
    player: { ...granted.player, fireball2026CaughtAt: at },
    badge: granted.badge,
  }
}

export function markFireballRead<T extends FireballPlayer>(player: T, at: number): T {
  if (player.fireballSpotter?.readAt) return player
  return {
    ...player,
    fireballSpotter: { readAt: at, passedAt: player.fireballSpotter?.passedAt ?? null },
  }
}

/** The badge needs the reading and a correct check. Gold in the window, silver after 8 Nov. */
export function submitFireballQuiz<T extends FireballPlayer>(
  player: T,
  answers: readonly number[],
  at: number,
): { player: T; badge: PlayerBadge | null } {
  if (!player.fireballSpotter?.readAt) return { player, badge: null }
  if (!fireballQuizCorrect(answers)) return { player, badge: null }
  if (player.badges?.[FIREBALL_SPOTTER_BADGE] && player.fireballSpotter.passedAt) {
    return { player, badge: null }
  }
  const granted = grantNamedBadge(
    { ...player, fireballSpotter: { readAt: player.fireballSpotter.readAt, passedAt: at } },
    FIREBALL_SPOTTER_BADGE,
    at,
  )
  const next = granted.player.fireballSpotter?.passedAt
    ? granted.player
    : { ...granted.player, fireballSpotter: { readAt: player.fireballSpotter.readAt, passedAt: at } }
  return { player: next, badge: granted.badge }
}

export function sanitizeFireballCaughtAt(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : null
}

export function sanitizeFireballSpotter(raw: unknown): FireballSpotterProgress {
  if (!raw || typeof raw !== 'object') return { readAt: null, passedAt: null }
  const row = raw as { readAt?: unknown; passedAt?: unknown }
  return {
    readAt: sanitizeFireballCaughtAt(row.readAt),
    passedAt: sanitizeFireballCaughtAt(row.passedAt),
  }
}

export const FIREBALL_BADGE_SOURCE = ORIONIDS_SOURCE
