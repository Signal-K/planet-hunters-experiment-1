import type { TessCandidate } from '@/lib/data'

/**
 * SSL-359: the TESS screen teaches by doing. Each step is one short hint
 * anchored to the real control, and advances only when the player performs
 * the action — never on a "Next" tap.
 */
export type TessCoachStepId = 'gain' | 'mark' | 'confirm' | 'outcome'

export interface TessCoachStep {
  id: TessCoachStepId
  hint: string
  /** `data-coach-target` values left undimmed for this step. */
  targets: string[]
  /** The control the hint points at. */
  anchor: string
}

export const TESS_COACH_STEPS: TessCoachStep[] = [
  { id: 'gain', hint: 'Drag gain up until the dip shows', targets: ['tess-chart', 'tess-gain'], anchor: 'tess-gain' },
  { id: 'mark', hint: 'Tap the dip to mark it', targets: ['tess-chart'], anchor: 'tess-chart' },
  { id: 'confirm', hint: 'Tap Confirm Transit', targets: ['tess-confirm'], anchor: 'tess-confirm' },
  // Only after the known-planet training curve: the payoff line.
  { id: 'outcome', hint: 'That dip is a planet crossing its star.', targets: ['tess-chart'], anchor: 'tess-chart' },
]

export const TESS_COACH_MISSED_HINT = 'Missed. Tap where the line drops.'

export const TESS_COACH_DONE_KEY = 'landnam_tess_coach_done_v1'

/**
 * The first-ever curve a player sees is a confirmed planet, so the first mark
 * lands on a real transit. TOI-270 c (Günther et al. 2019): a sub-Neptune
 * around an M dwarf in Pictor, found in TESS sectors 3–5. The points are
 * modelled from its published period and depth, not a raw TESS download, and
 * the screen labels it that way. Never sent to the shared classification feed.
 */
export const TESS_TRAINING_CANDIDATE: TessCandidate = {
  id: 'tess-training-toi-270c',
  ticId: 'TIC 259377017',
  toi: 'TOI-270 c',
  host: 'TOI-270',
  sector: 'Sector 3',
  constellation: 'Pictor',
  distanceLy: 73,
  planetRadiusEarth: 2.42,
  periodDays: 5.66,
  transitEpoch: 1.9,
  depthPpm: 3400,
  signalToNoise: 30,
  starTeffK: 3386,
}

export const GAIN_MIN = 0.01
export const GAIN_MAX = 1

/**
 * Display gain stretches the flux axis around the curve's midline. At the
 * default (GAIN_MAX) the axis spans the curve's full range, as before SSL-359;
 * lower gain flattens the curve until even a deep dip is a sliver.
 */
export function gainDomain(yMin: number, yMax: number, gain: number): [number, number] {
  const mid = (yMin + yMax) / 2
  const half = (yMax - yMin) / 2 / Math.max(GAIN_MIN, Math.min(GAIN_MAX, gain))
  return [mid - half, mid + half]
}

/** The gain slider is logarithmic: equal drags feel like equal changes. */
export function gainFromSlider(position: number): number {
  const t = Math.max(0, Math.min(1, position))
  return GAIN_MIN * (GAIN_MAX / GAIN_MIN) ** t
}

export function sliderFromGain(gain: number): number {
  const clamped = Math.max(GAIN_MIN, Math.min(GAIN_MAX, gain))
  return Math.log(clamped / GAIN_MIN) / Math.log(GAIN_MAX / GAIN_MIN)
}

/** Shown as ×1 (flattest) to ×100 (full range). */
export function gainLabel(gain: number): string {
  return `×${Math.round(gain / GAIN_MIN)}`
}

// Share of the chart height the dip must span to count as "in view".
const DIP_VISIBLE_SHARE = 0.2

/**
 * The dip is "in view" once it spans a readable share of the chart height.
 * A candidate so shallow it never reaches that share counts as in view at
 * (nearly) full gain, so the step can always be finished.
 */
export function dipInView(depthPpm: number, yMin: number, yMax: number, gain: number): boolean {
  const range = yMax - yMin
  if (!(range > 0) || !(depthPpm > 0)) return gain >= GAIN_MAX * 0.9
  const shareAtFullGain = Math.min(1, (depthPpm / 1_000_000) / range)
  const needed = Math.min(DIP_VISIBLE_SHARE, shareAtFullGain * 0.9)
  return shareAtFullGain * (gain / GAIN_MAX) >= needed
}
