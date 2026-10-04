import { describe, expect, it } from 'vitest'
import {
  buildPreviewWaveform,
  cycleSourceFilter,
  filterInstrumentSignals,
  selectInstrumentSignalIndex,
} from './instrument-hub-state'
import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'

const sampleSignals: InstrumentSignal[] = [
  {
    id: 't1',
    kind: 'transit',
    instrumentId: 'transit-telescope',
    title: 'TOI 1000.01',
    subtitle: 'Host · Lyra',
    inspectorScreen: 'galaxy',
  },
  {
    id: 'a1',
    kind: 'deep-space',
    instrumentId: 'deep-space-telescope',
    title: 'K26A01',
    subtitle: 'V 20.1',
    inspectorScreen: 'asteroid-discovery',
  },
]

describe('instrument hub view state', () => {
  it('filters by instrument source', () => {
    expect(filterInstrumentSignals(sampleSignals, { sourceFilter: 'transit', unresolvedOnly: false })).toHaveLength(1)
    expect(filterInstrumentSignals(sampleSignals, { sourceFilter: 'deep-space', unresolvedOnly: false })[0]?.id).toBe('a1')
  })

  it('can require stronger unresolved thresholds', () => {
    const weakTransit: InstrumentSignal = {
      ...sampleSignals[0],
      id: 't-weak',
      subtitle: 'Host · Lyra · S/N 4.0',
    }
    expect(filterInstrumentSignals([weakTransit], { sourceFilter: 'all', unresolvedOnly: true })).toHaveLength(0)
  })

  it('cycles source filters in hub order', () => {
    expect(cycleSourceFilter('all')).toBe('transit')
    expect(cycleSourceFilter('transit')).toBe('deep-space')
    expect(cycleSourceFilter('deep-space')).toBe('all')
  })

  it('clamps selected index to visible queue length', () => {
    expect(selectInstrumentSignalIndex({ sourceFilter: 'all', unresolvedOnly: false, selectedIndex: 4, gain: 50, zoom: 1, scrub: 0 }, 1, 2).selectedIndex).toBe(1)
  })

  it('changes preview dip depth with gain and scrub', () => {
    const lowGain = buildPreviewWaveform('seed', 10, 1, 50)
    const highGain = buildPreviewWaveform('seed', 90, 1, 50)
    const avg = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
    expect(avg(highGain)).toBeLessThan(avg(lowGain))
  })
})
