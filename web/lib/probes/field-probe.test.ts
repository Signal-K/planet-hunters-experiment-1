import { describe, expect, it } from 'vitest'
import { EventBus, getBody, Simulation } from '@takeon/engine'
import { DEFAULT_STATE, mergeRemoteState, normalizeState } from '@/lib/game-state'
import { DEBRIS_PRESETS } from '@/lib/data/sky-events'
import { bestSighting, cameraCovers, FIELD_PROBE, mergeProbeObservations, probeRatePerMinute, probeShowerAt, probeWeatherRates, type ProbeObservation } from './field-probe'

const leonids = DEBRIS_PRESETS.find(p => p.eventId === 'leonids-2026')!
const observation: ProbeObservation = { id: 'watch-1', runId: 'watch', eventId: leonids.eventId, bodyId: 'moon', observedAt: 1234, bearing: 355, distance: 8, pos: { x: 5, y: 10 } }

describe('fixed meteor camera', () => {
  it.each(DEBRIS_PRESETS)('uses $eventId window and configured peak', preset => {
    const peak = Date.parse(preset.peakUtc), start = Date.parse(preset.startUtc), end = Date.parse(preset.endUtc)
    expect(probeRatePerMinute(preset, peak)).toBe(preset.peakRatePerMinute)
    expect(probeRatePerMinute(preset, start)).toBe(preset.baseRatePerMinute)
    expect(probeRatePerMinute(preset, end)).toBe(0)
    expect(probeRatePerMinute(preset, start - 1)).toBe(0)
    expect(probeRatePerMinute(preset, (start + peak) / 2)).toBeCloseTo((preset.baseRatePerMinute + preset.peakRatePerMinute) / 2)
    expect(probeRatePerMinute(preset, (end + peak) / 2)).toBeCloseTo((preset.baseRatePerMinute + preset.peakRatePerMinute) / 2)
  })
  it('observes independently of Earth night and scales the body rate', () => {
    const peak = Date.parse(leonids.peakUtc)
    expect(probeShowerAt(peak)?.eventId).toBe(leonids.eventId)
    expect(probeShowerAt(Date.parse('2026-08-01T12:00:00Z'))).toBeNull()
    const body = { weather: { 'meteor-shower': 3 } } as const
    expect(probeWeatherRates(body, null, peak)?.['meteor-shower']).toBe(0)
    expect(probeWeatherRates(body, leonids, peak)?.['meteor-shower']).toBeCloseTo(3 * leonids.peakRatePerMinute / 12)
  })
  it('covers wrapped bearings and excludes impacts outside the camera', () => {
    expect(cameraCovers(355, 0)).toBe(true)
    expect(cameraCovers(5, 350)).toBe(true)
    expect(cameraCovers(60, 0)).toBe(true)
    expect(cameraCovers(61, 0)).toBe(false)
    expect(cameraCovers(180, 0)).toBe(false)
  })
  it('round trips and merges independent sightings without duplicates', () => {
    const second = { ...observation, id: 'watch-2', distance: 3 }
    const saved = JSON.parse(JSON.stringify({ [observation.id]: observation }))
    const merged = mergeProbeObservations(saved, { [second.id]: second, [observation.id]: observation })
    expect(Object.keys(merged)).toHaveLength(2)
    expect(bestSighting(Object.values(merged))?.id).toBe(second.id)
    expect(mergeProbeObservations({ broken: null, bad: { ...observation, id: 'bad', distance: -1 } }, ['bad'])).toEqual({})
  })
  it('preserves observations through player hydration and remote reconciliation', () => {
    const current = normalizeState({ ...DEFAULT_STATE, player: { ...DEFAULT_STATE.player, probeObservations: { [observation.id]: observation } } })
    const second = { ...observation, id: 'remote-1' }
    const merged = mergeRemoteState(current, { ...DEFAULT_STATE, player: { ...DEFAULT_STATE.player, probeObservations: { [second.id]: second } } })
    expect(Object.keys(merged.player.probeObservations ?? {}).sort()).toEqual(['remote-1', 'watch-1'])
  })
  it('receives real core impacts during a wheel-free watch without moving', () => {
    const body = { ...getBody('moon')!, weather: probeWeatherRates(getBody('moon')!, leonids, Date.parse(leonids.peakUtc)) }
    const events = new EventBus(), impacts: unknown[] = []
    events.on('meteorImpact', payload => impacts.push(payload))
    const sim = new Simulation({ body, spec: FIELD_PROBE, seed: 772, events })
    const origin = { ...sim.rover.pos }
    sim.weather = { type: 'meteor-shower', intensity: 1, duration: 70, remaining: 70 }
    for (let i = 0; i < 600; i++) sim.tick()
    expect(sim.rover.pos).toEqual(origin)
    expect(impacts.length).toBeGreaterThan(0)
    sim.dispose()
  })
})
