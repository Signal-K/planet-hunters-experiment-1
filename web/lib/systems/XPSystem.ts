// The one XP primitive. Every progression track in Landnam derives from this —
// player research, crew members, and the academy — rather than each one
// reimplementing "add a number, compare it to some thresholds".
//
// Before this existed there were four unrelated counters (researchXP,
// skillPoints, satelliteMonitoringLevel, transitSatelliteLevel), researchXP was
// incremented with raw `(s.player.researchXP ?? 0) + n` arithmetic in four
// different files including a React hook, and one grant was a bare `+ 15`
// literal inline. Crew XP and academy levels would have made that six tracks.
// `skillPoints` is a currency (spent, not accumulated) and `satelliteMonitoringLevel`
// / `transitSatelliteLevel` are purchased/earned integer levels with no XP
// behind them (STS-606 decision) — neither belongs here or in XP_CURVES.
//
// A track is (xp, curve). Level is *derived*, never stored as an independent
// number that can drift out of step with the XP that earned it.

/**
 * Cumulative XP required to reach each level. `thresholds[0]` is the XP for
 * level 1 and is 0 by definition; `thresholds[n]` is the XP for level n+1.
 * Must be non-decreasing — `assertValidCurve` checks that in tests.
 */
export interface XPCurve {
  id: string
  thresholds: readonly number[]
}

export interface XPProgress {
  level: number
  /** Level cap for the curve. */
  maxLevel: number
  xp: number
  /** XP accumulated since reaching the current level. */
  xpIntoLevel: number
  /** XP still needed for the next level; null at max level. */
  xpToNextLevel: number | null
  /** 0–1 through the current level; 1 at max level. */
  fraction: number
  atMax: boolean
}

export function levelForXP(xp: number, curve: XPCurve): number {
  const safe = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0
  let level = 1
  for (let i = 1; i < curve.thresholds.length; i++) {
    if (safe < curve.thresholds[i]) break
    level = i + 1
  }
  return level
}

export function xpProgress(xp: number, curve: XPCurve): XPProgress {
  const safe = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0
  const level = levelForXP(safe, curve)
  const maxLevel = curve.thresholds.length
  const atMax = level >= maxLevel
  const floor = curve.thresholds[level - 1]
  const ceiling = atMax ? null : curve.thresholds[level]
  const span = ceiling === null ? 0 : ceiling - floor
  return {
    level,
    maxLevel,
    xp: safe,
    xpIntoLevel: safe - floor,
    xpToNextLevel: ceiling === null ? null : ceiling - safe,
    fraction: atMax || span <= 0 ? 1 : (safe - floor) / span,
    atMax,
  }
}

/** Anything that carries XP: a crew member, the academy, the player's research. */
export interface XPBearer {
  xp: number
}

/**
 * Add XP to a bearer. Returns the same object reference when nothing changes,
 * so callers can use identity to skip a re-render — the convention the rest of
 * the `apply*` state functions already follow.
 */
export function grantXP<T extends XPBearer>(bearer: T, amount: number): T {
  if (!Number.isFinite(amount) || amount <= 0) return bearer
  return { ...bearer, xp: Math.max(0, Math.floor(bearer.xp)) + Math.floor(amount) }
}

/** True when the grant pushes the bearer over a level boundary — the moment worth surfacing in UI. */
export function grantCrossesLevel(xp: number, amount: number, curve: XPCurve): boolean {
  if (!Number.isFinite(amount) || amount <= 0) return false
  return levelForXP(xp + Math.floor(amount), curve) > levelForXP(xp, curve)
}

// --- Curves ------------------------------------------------------------------
//
// Every curve in the game lives here so the shapes can be compared side by side
// rather than discovered one file at a time.

/**
 * Player research. Thresholds are the existing licence-grade gates
 * (`LICENSE_GRADE_XP_GATES`, retuned 2026-07-21 under STS-492) expressed as a
 * curve — level 1/2/3 *are* Grade I/II/III. `ProgressionSystem` remains the
 * source of the grade names; this is the same numbers in the shared shape.
 */
export const RESEARCH_XP_CURVE: XPCurve = {
  id: 'research',
  thresholds: [0, 150, 500],
}

/**
 * Crew. Ten levels, roughly quadratic so early promotions land quickly and the
 * top of the ladder is a real investment. Hired crew arrive at level 3 (300 XP
 * equivalent), which is why level 3 sits early on the curve — a hire should
 * feel like a shortcut past the grind, not past the whole ladder.
 *
 * Provisional, like the specialisation model: retune on real feedback in four
 * sprints (STS-599). Nothing reads these numbers directly — go through
 * `levelForXP`/`xpProgress` so a retune is a one-line change here.
 */
export const CREW_XP_CURVE: XPCurve = {
  id: 'crew',
  thresholds: [0, 100, 300, 600, 1000, 1500, 2200, 3100, 4200, 5600],
}

/**
 * The Astronaut Academy itself. Deliberately short — what levelling *buys*
 * (higher training tiers, more simultaneous trainees, lower upkeep) is still
 * open, so three levels is the smallest ladder that makes "the academy levels
 * up" true without pre-committing to a shape.
 */
export const ACADEMY_XP_CURVE: XPCurve = {
  id: 'academy',
  thresholds: [0, 500, 1500],
}

export const XP_CURVES: readonly XPCurve[] = [RESEARCH_XP_CURVE, CREW_XP_CURVE, ACADEMY_XP_CURVE]

/** Structural invariant every curve must hold. Exported so tests can assert it over XP_CURVES. */
export function isValidCurve(curve: XPCurve): boolean {
  if (curve.thresholds.length === 0) return false
  if (curve.thresholds[0] !== 0) return false
  for (let i = 1; i < curve.thresholds.length; i++) {
    if (curve.thresholds[i] <= curve.thresholds[i - 1]) return false
  }
  return true
}
