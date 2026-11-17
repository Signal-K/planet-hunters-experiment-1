import type { BodyDef, RoverSpec } from '@takeon/engine'
import { DEBRIS_PRESETS, type DebrisEventPreset } from '@/lib/data/sky-events'

export const PROBE_FIXTURE_KEY = 'landnam.fixture.probe-watch.observations.v1'
export const PROBE_RUN_SECONDS = 60
export const PROBE_CAPTURE_MS = 8000
export const PROBE_HALF_VIEW = 60

/** A fixed chassis on landing feet. No drive/tool module is fitted. */
export const FIELD_PROBE: RoverSpec = {
  id: 'field-probe', name: 'Field camera', chassis: 'chassis-scout', wheels: '',
  power: 'power-solar-s', battery: 'batt-cell', modules: ['cam-science'], color: '#c8d6e5',
}

export interface ProbeObservation {
  id: string
  runId: string
  eventId: string
  bodyId: 'moon'
  observedAt: number
  bearing: number
  distance: number
  pos: { x: number; y: number }
}

/** Airless-body observing has no Earth local-night gate or location bonus. */
export function probeShowerAt(at: number): DebrisEventPreset | null {
  return DEBRIS_PRESETS.find(p => at >= Date.parse(p.startUtc) && at < Date.parse(p.endUtc)) ?? null
}

export function probeRatePerMinute(preset: DebrisEventPreset, at: number): number {
  if (!Number.isFinite(at) || at < Date.parse(preset.startUtc) || at >= Date.parse(preset.endUtc)) return 0
  const peak = Date.parse(preset.peakUtc)
  const side = at <= peak ? peak - Date.parse(preset.startUtc) : Date.parse(preset.endUtc) - peak
  const fraction = Math.max(0, 1 - Math.abs(at - peak) / Math.max(1, side))
  return preset.baseRatePerMinute + (preset.peakRatePerMinute - preset.baseRatePerMinute) * fraction
}

/** Body event frequency scales with this day's activity relative to the reference shower peak. */
export function probeWeatherRates(body: Pick<BodyDef, 'weather'>, preset: DebrisEventPreset | null, at: number): BodyDef['weather'] {
  const referencePeak = DEBRIS_PRESETS.find(p => p.eventId === 'orionids-2026')!.peakRatePerMinute
  return { 'meteor-shower': preset ? (body.weather?.['meteor-shower'] ?? 0) * probeRatePerMinute(preset, at) / referencePeak : 0 }
}

export interface ProbeImpact { atMs: number; bearing: number; distance: number; pos: { x: number; y: number } }

/** Where the camera stands, in the same field coordinates saved sightings use. */
export const PROBE_ORIGIN = { x: 48, y: 48 }

/**
 * The impacts of one watch: a busy shower lands about ten a minute around the camera, a quiet one about four. Seeded by
 * the watch id, so a watch replays the same sky and two watches differ. Distances are kilometres from the camera.
 */
export function probeImpacts(runId: string, preset: DebrisEventPreset | null, at: number, seconds = PROBE_RUN_SECONDS): ProbeImpact[] {
  if (!preset) return []
  const activity = Math.max(0, Math.min(1, probeRatePerMinute(preset, at) / preset.peakRatePerMinute))
  if (activity <= 0) return []
  let seed = 2166136261
  for (let i = 0; i < runId.length; i++) seed = Math.imul(seed ^ runId.charCodeAt(i), 16777619) >>> 0
  const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  const meanGap = 60 / (4 + 6 * activity)
  const impacts: ProbeImpact[] = []
  let t = 2 + next() * 2
  while (t < seconds - 1) {
    const bearing = Math.floor(next() * 360)
    const distance = Math.round((3 + 37 * next() ** 1.6) * 10) / 10
    const rad = bearing * Math.PI / 180
    impacts.push({ atMs: Math.round(t * 1000), bearing, distance, pos: { x: PROBE_ORIGIN.x + Math.cos(rad) * distance, y: PROBE_ORIGIN.y + Math.sin(rad) * distance } })
    t += Math.max(2.5, Math.min(12, meanGap * (0.5 + next())))
  }
  return impacts
}

export function impactBearing(pos: { x: number; y: number }, origin: { x: number; y: number }): number {
  return (Math.atan2(pos.y - origin.y, pos.x - origin.x) * 180 / Math.PI + 360) % 360
}
export function cameraOffset(bearing: number, aim: number): number {
  return ((bearing - aim + 540) % 360) - 180
}
export function cameraCovers(bearing: number, aim: number): boolean {
  return Math.abs(cameraOffset(bearing, aim)) <= PROBE_HALF_VIEW
}

/** Reject malformed optional records from old or untrusted saves; additive across devices. */
export function mergeProbeObservations(...sources: unknown[]): Record<string, ProbeObservation> {
  const result: Record<string, ProbeObservation> = {}
  for (const source of sources) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) continue
    for (const [id, raw] of Object.entries(source)) {
      const o = raw as Partial<ProbeObservation> | null
      if (!o || o.id !== id || typeof o.runId !== 'string' || o.bodyId !== 'moon' ||
        !DEBRIS_PRESETS.some(p => p.eventId === o.eventId) ||
        typeof o.observedAt !== 'number' || !Number.isFinite(o.observedAt) || o.observedAt < 0 ||
        typeof o.bearing !== 'number' || !Number.isFinite(o.bearing) || o.bearing < 0 || o.bearing >= 360 ||
        typeof o.distance !== 'number' || !Number.isFinite(o.distance) || o.distance < 0 ||
        !o.pos || !Number.isFinite(o.pos.x) || !Number.isFinite(o.pos.y)) continue
      result[id] = o as ProbeObservation
    }
  }
  return result
}
export function bestSighting(observations: readonly ProbeObservation[]): ProbeObservation | null {
  return observations.reduce<ProbeObservation | null>((best, o) => !best || o.distance < best.distance ? o : best, null)
}
