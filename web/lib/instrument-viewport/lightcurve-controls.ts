/**
 * Photometry controls for the transit telescope (Liam, 1.11: "can the controls zoom in or out
 * on the graphs, do phase-folding?"). These act on the data, not the picture: TIME narrows the
 * plotted window, SCAN slides it along the sector, BIN averages neighbouring points, and FOLD
 * stacks the whole light curve on a trial PERIOD so repeating dips land on top of each other.
 * SSL-747: no control finds the answer for the player. There is no auto-fold on a measured
 * period; the player turns PERIOD until their dips stack, and the readout only reports what
 * they measured.
 * Mirrored by native `LightcurveControls` (TessDiscoveryScreen.swift).
 */
import type { LightcurvePoint } from '@/components/game/LightcurvePlot'

export interface LightcurveControls {
  /** Time zoom: 1 shows the whole sector, 8 shows an eighth of it. */
  span: number
  /** Where the zoomed window sits along the sector, 0 (start) to 1 (end). */
  scan: number
  /** Points averaged into each plotted point. */
  bin: number
  fold: boolean
  /** Trial period in days for the fold. */
  period: number
}

export const LIGHTCURVE_LIMITS = { spanMin: 1, spanMax: 8, periodMin: 0.3, periodMax: 14, bins: [1, 2, 4, 8] as const }

export const DEFAULT_LIGHTCURVE_CONTROLS: LightcurveControls = { span: 1, scan: 0.5, bin: 1, fold: false, period: 3 }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Average every `n` consecutive points (x and y). n <= 1 returns the input. */
export function binPoints(points: LightcurvePoint[], n: number): LightcurvePoint[] {
  if (n <= 1) return points
  const out: LightcurvePoint[] = []
  for (let i = 0; i < points.length; i += n) {
    const group = points.slice(i, i + n)
    out.push({
      x: group.reduce((s, p) => s + p.x, 0) / group.length,
      y: group.reduce((s, p) => s + p.y, 0) / group.length,
    })
  }
  return out
}

/** The plotted [start, end] in days for a zoom and scan position. */
export function timeWindow(points: LightcurvePoint[], span: number, scan: number): [number, number] {
  if (!points.length) return [0, 1]
  const lo = points[0].x, hi = points[points.length - 1].x
  const full = hi - lo
  const width = full / clamp(span, LIGHTCURVE_LIMITS.spanMin, LIGHTCURVE_LIMITS.spanMax)
  const start = lo + clamp(scan, 0, 1) * (full - width)
  return [start, start + width]
}

/** Days from the nearest trial transit, in [-period/2, period/2), sorted by that offset. */
export function foldPoints(points: LightcurvePoint[], period: number, epoch: number): LightcurvePoint[] {
  if (period <= 0) return points
  return points
    .map(p => {
      const phase = (((p.x - epoch) / period) % 1 + 1.5) % 1 - 0.5
      return { x: phase * period, y: p.y }
    })
    .sort((a, b) => a.x - b.x)
}

export interface LightcurveDisplay {
  points: LightcurvePoint[]
  xDomain: [number, number]
  folded: boolean
}

/**
 * What the chart draws. Unfolded: the active sector, windowed and binned. Folded: every
 * sector, stacked on the trial period around `epoch` (the player's first marked dip, so a
 * correct period stacks their dips at 0).
 */
export function lightcurveDisplay(sectorPoints: LightcurvePoint[], allPoints: LightcurvePoint[], c: LightcurveControls, epoch: number): LightcurveDisplay {
  if (c.fold) {
    const half = c.period / 2
    return { points: binPoints(foldPoints(allPoints, c.period, epoch), c.bin), xDomain: [-half, half], folded: true }
  }
  const [x0, x1] = timeWindow(sectorPoints, c.span, c.scan)
  const inWindow = sectorPoints.filter(p => p.x >= x0 && p.x <= x1)
  return { points: binPoints(inWindow, c.bin), xDomain: [x0, x1], folded: false }
}

export interface LightcurveCommandResult { controls: LightcurveControls; lines: string[] }

/**
 * Console verbs: FOLD [days|OFF], PERIOD days, TIME n, SCAN 0-100, BIN n.
 * Returns null for anything else so the shared optics commands still run.
 */
export function applyLightcurveCommand(c: LightcurveControls, line: string): LightcurveCommandResult | null {
  const [verb, arg] = line.trim().toUpperCase().split(/\s+/)
  const n = Number(arg)
  const hasNumber = arg !== undefined && Number.isFinite(n)
  switch (verb) {
    case 'FOLD':
      if (arg === 'OFF') return { controls: { ...c, fold: false }, lines: ['> FOLD  OFF'] }
      if (hasNumber) {
        const period = clamp(n, LIGHTCURVE_LIMITS.periodMin, LIGHTCURVE_LIMITS.periodMax)
        return { controls: { ...c, fold: true, period }, lines: [`> FOLD  P ${period.toFixed(2)}D`] }
      }
      return { controls: { ...c, fold: !c.fold }, lines: [`> FOLD  ${c.fold ? 'OFF' : `P ${c.period.toFixed(2)}D`}`] }
    case 'PERIOD':
      if (!hasNumber) return { controls: c, lines: [`> PERIOD  ${c.period.toFixed(2)}D`] }
      return { controls: { ...c, period: clamp(n, LIGHTCURVE_LIMITS.periodMin, LIGHTCURVE_LIMITS.periodMax) }, lines: [`> PERIOD  ${clamp(n, LIGHTCURVE_LIMITS.periodMin, LIGHTCURVE_LIMITS.periodMax).toFixed(2)}D`] }
    case 'TIME':
      if (!hasNumber) return { controls: c, lines: [`> TIME  ${c.span.toFixed(1)}×`] }
      return { controls: { ...c, span: clamp(n, LIGHTCURVE_LIMITS.spanMin, LIGHTCURVE_LIMITS.spanMax) }, lines: [`> TIME  ${clamp(n, LIGHTCURVE_LIMITS.spanMin, LIGHTCURVE_LIMITS.spanMax).toFixed(1)}×`] }
    case 'SCAN':
      if (!hasNumber) return { controls: c, lines: [`> SCAN  ${Math.round(c.scan * 100)}%`] }
      return { controls: { ...c, scan: clamp(n / 100, 0, 1) }, lines: [`> SCAN  ${Math.round(clamp(n / 100, 0, 1) * 100)}%`] }
    case 'BIN': {
      if (!hasNumber) return { controls: c, lines: [`> BIN  ×${c.bin}`] }
      const bin = LIGHTCURVE_LIMITS.bins.reduce((best, b) => Math.abs(b - n) < Math.abs(best - n) ? b : best, 1)
      return { controls: { ...c, bin }, lines: [`> BIN  ×${bin}`] }
    }
    default:
      return null
  }
}

/** Next bin step for the BIN key: 1 → 2 → 4 → 8 → 1. */
export function nextBin(bin: number): number {
  const bins = LIGHTCURVE_LIMITS.bins
  const i = bins.indexOf(bin as (typeof bins)[number])
  return bins[(i + 1) % bins.length]
}

export interface DipMeasurement {
  /** Centre of the marked range, in days. */
  centre: number
  /** Width of the marked range, in hours. */
  hours: number
  /** How far the marked points sit below the unmarked baseline, in parts per thousand. */
  depthPpt: number
}

const median = (values: number[]) => {
  if (!values.length) return NaN
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/**
 * The player's own measurements of their marked dips (SSL-747 readout): centre, width and
 * depth against the median of every unmarked point, plus the gaps between consecutive marks.
 * Gaps are reported raw; deciding whether a gap is one period or several is the player's job.
 */
export function measureDips(points: LightcurvePoint[], ranges: Array<{ x1: number; x2: number }>): { dips: DipMeasurement[]; gaps: number[] } {
  const spans = ranges.map(r => [Math.min(r.x1, r.x2), Math.max(r.x1, r.x2)] as const)
  const inside = (x: number, [a, b]: readonly [number, number]) => x >= a && x <= b
  const baseline = median(points.filter(p => !spans.some(s => inside(p.x, s))).map(p => p.y))
  const dips = spans
    .map(span => {
      const ys = points.filter(p => inside(p.x, span)).map(p => p.y)
      const mean = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : NaN
      const depthPpt = Number.isFinite(baseline) && Number.isFinite(mean) && baseline !== 0 ? ((baseline - mean) / baseline) * 1000 : 0
      return { centre: (span[0] + span[1]) / 2, hours: (span[1] - span[0]) * 24, depthPpt }
    })
    .sort((a, b) => a.centre - b.centre)
  const gaps = dips.slice(1).map((d, i) => d.centre - dips[i].centre)
  return { dips, gaps }
}
