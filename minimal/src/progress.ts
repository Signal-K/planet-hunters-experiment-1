// Minimal's own progress (Liam, 2026-11-19: chapter progress is Minimal's; only
// francs and onboarding are shared with Landnam). Kept per pilot on this device.
// Writing francs back into the Landnam save is still open (decision note).
import { openMarketSellPrice } from '@landnam/lib/systems/EconomySystem'
import { MINERAL_META } from '@landnam/lib/data/minerals'
import type { MinimalBase } from '@takeon/engine'
import { CHAPTERS, type Chapter } from './chapters'

export interface MinimalProgress {
  /** Chapter numbers finished in Minimal. */
  done: number[]
  /** Francs earned in Minimal, on top of the Landnam balance. */
  earned: number
  /** Materials stored at home (the Stockpile chapter fills it; Build spends it). */
  stash: Record<string, number>
}

const EMPTY: MinimalProgress = { done: [], earned: 0, stash: {} }
const key = (pilotId: string) => `landnam-minimal-v1:user:${pilotId}`

export function readProgress(pilotId: string): MinimalProgress {
  try {
    const raw = localStorage.getItem(key(pilotId))
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<MinimalProgress>) } : EMPTY
  } catch {
    return EMPTY
  }
}

export function writeProgress(pilotId: string, progress: MinimalProgress): void {
  try {
    localStorage.setItem(key(pilotId), JSON.stringify(progress))
  } catch {
    // Private mode or storage blocked: the run still finishes, it just is not kept.
  }
}

/** What one finished run gives, by Landnam's own rules for that mission type. */
export interface RunResult {
  francs: number
  stored: Record<string, number>
  spent: Record<string, number>
  /** One line for the home screen: what changed in the world. */
  outcome: string
}

/** Open-market value of a haul, at Landnam's sell price for each mineral. */
export function marketValue(cargo: Record<string, number>): number {
  return Object.entries(cargo).reduce((sum, [id, n]) => sum + openMarketSellPrice(MINERAL_META[id]?.price ?? 0, 0) * n, 0)
}

export function resultFor(chapter: Chapter, cargo: Record<string, number>): RunResult {
  const mission = chapter.mission
  const none = { francs: 0, stored: {}, spent: {} }
  switch (chapter.type) {
    case 'client-contract':
    case 'delivery':
      return { ...none, francs: mission?.payout.francs ?? 0, outcome: 'Delivered and paid.' }
    case 'construction':
      return { ...none, francs: mission?.payout.francs ?? 0, spent: mission?.requires.minerals ?? {}, outcome: `${mission?.title.replace(/^Build an? /, '') ?? 'Structure'} raised.` }
    case 'shower-run':
      // Landnam pays the run's stated payout for the fragments (showerRunMission).
      return { ...none, francs: mission?.payout.francs ?? 0, outcome: 'Fragments handed in.' }
    case 'founding':
      return { ...none, outcome: 'Your agency is open for business.' }
    case 'self-directed':
      return { ...none, francs: marketValue(cargo), outcome: 'Sold at market.' }
    case 'materials-haul':
      return { ...none, stored: cargo, outcome: 'Stored at home.' }
    default:
      // Landnam's program outcome reads "Space telescope online · daily instrument
      // feed unlocked": the home screen keeps the first clause.
      return { ...none, outcome: shortOutcome(mission?.programReward?.outcome) }
  }
}

export function applyResult(progress: MinimalProgress, chapter: Chapter, result: RunResult): MinimalProgress {
  const stash = { ...progress.stash }
  for (const [id, n] of Object.entries(result.stored)) stash[id] = (stash[id] ?? 0) + n
  for (const [id, n] of Object.entries(result.spent)) stash[id] = Math.max(0, (stash[id] ?? 0) - n)
  return {
    done: [...new Set([...progress.done, chapter.number])].sort((a, b) => a - b),
    earned: progress.earned + result.francs,
    stash,
  }
}

/** Materials a build still lacks from the home stash; empty when it can start. */
export function missingMaterials(chapter: Chapter, stash: Record<string, number>): Record<string, number> {
  if (chapter.verb !== 'build') return {}
  const missing: Record<string, number> = {}
  for (const [id, n] of Object.entries(chapter.mission?.requires.minerals ?? {})) {
    const short = n - (stash[id] ?? 0)
    if (short > 0) missing[id] = short
  }
  return missing
}

/**
 * The home base as the finished chapters have built it: unbroken ground until
 * Groundbreaking (chapter 0) is done, then the agency and pad plus one
 * building per finished chapter, in story order.
 */
export function baseFor(done: ReadonlySet<number>): MinimalBase {
  if (!done.has(0)) return { stage: 'raw' }
  return { stage: 'founded', buildings: CHAPTERS.filter(c => c.builds && done.has(c.number)).map(c => c.builds!) }
}

function shortOutcome(text?: string): string {
  const first = text?.split(' · ')[0]?.trim()
  if (!first) return 'Done.'
  return /[.!]$/.test(first) ? first : `${first}.`
}
