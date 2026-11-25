import { loadSolarTransport, previewLandingRequest } from './solarLandingPreview'
import { missionZone, type MissionZone } from '@/lib/data/mission-zone'

export type ObservedSample = { red: number; green: number; blue: number; elevationMeters?: number }
export type ObservedCoverage = 'imagery-and-elevation' | 'imagery' | 'none'

/** Coverage of the assets actually bundled with Takeon, not claimed survey accuracy. */
export function observedCoverage(id: string): ObservedCoverage {
  if (id === 'mars' || id === 'moon') return 'imagery-and-elevation'
  if (['earth', 'mercury', 'venus', 'jupiter', 'saturn', 'neptune'].includes(id)) return 'imagery'
  return 'none'
}

const cache = new Map<string, Promise<ObservedSample[]>>()
export function loadObservedPatch(id: string, step: number, width: number, height: number, zone?: MissionZone): Promise<ObservedSample[]> {
  const key = `${id}:${missionZone(zone)}:${step}:${width}:${height}`
  let result = cache.get(key)
  if (!result) {
    result = loadSolarTransport().then(transport => {
      const solar = { ...previewLandingRequest(id, zone), step, width, height }
      const response = JSON.parse(transport(JSON.stringify({ op: 'observedSolarPatch', solar }))) as { ok: boolean; error?: string; value?: { bodyId: string; width: number; height: number; samples: ObservedSample[] } }
      const value = response.value
      if (!response.ok || !value || value.bodyId !== id || value.width !== width || value.height !== height || !Array.isArray(value.samples) || value.samples.length !== width * height || value.samples.some(s => !s || [s.red, s.green, s.blue].some(n => !Number.isFinite(n) || n < 0 || n > 1) || (s.elevationMeters !== undefined && !Number.isFinite(s.elevationMeters)))) throw new Error(response.error ?? 'Invalid observed patch')
      return value.samples
    }).catch(error => { cache.delete(key); throw error })
    cache.set(key, result)
  }
  return result
}

export function observedHex(sample: ObservedSample): string {
  return '#' + [sample.red, sample.green, sample.blue].map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('')
}
