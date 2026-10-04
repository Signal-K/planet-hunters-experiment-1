import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'

export type InstrumentSourceFilter = 'all' | 'transit' | 'deep-space'

export interface InstrumentHubViewState {
  sourceFilter: InstrumentSourceFilter
  unresolvedOnly: boolean
  selectedIndex: number
  gain: number
  zoom: number
  scrub: number
}

export const DEFAULT_INSTRUMENT_HUB_VIEW: InstrumentHubViewState = {
  sourceFilter: 'all',
  unresolvedOnly: false,
  selectedIndex: 0,
  gain: 58,
  zoom: 1,
  scrub: 42,
}

function signalMeetsUnresolvedThreshold(signal: InstrumentSignal): boolean {
  if (signal.kind === 'transit') {
    const sn = Number.parseFloat(signal.subtitle.split('S/N ')[1] ?? '0')
    return sn >= 8
  }
  const score = Number.parseInt(signal.subtitle.match(/score (\d+)/i)?.[1] ?? '0', 10)
  return score >= 60
}

export function filterInstrumentSignals(
  signals: InstrumentSignal[],
  view: Pick<InstrumentHubViewState, 'sourceFilter' | 'unresolvedOnly'>,
): InstrumentSignal[] {
  return signals.filter(signal => {
    if (view.sourceFilter !== 'all' && signal.kind !== view.sourceFilter) return false
    if (view.unresolvedOnly && !signalMeetsUnresolvedThreshold(signal)) return false
    return true
  })
}

export function clampInstrumentHubView(view: InstrumentHubViewState): InstrumentHubViewState {
  return {
    ...view,
    gain: Math.min(100, Math.max(0, view.gain)),
    zoom: Math.min(2.4, Math.max(0.55, view.zoom)),
    scrub: Math.min(100, Math.max(0, view.scrub)),
    selectedIndex: Math.max(0, view.selectedIndex),
  }
}

export function selectInstrumentSignalIndex(
  view: InstrumentHubViewState,
  index: number,
  visibleCount: number,
): InstrumentHubViewState {
  if (visibleCount <= 0) return { ...view, selectedIndex: 0 }
  return clampInstrumentHubView({
    ...view,
    selectedIndex: Math.min(index, visibleCount - 1),
  })
}

export function cycleSourceFilter(current: InstrumentSourceFilter): InstrumentSourceFilter {
  if (current === 'all') return 'transit'
  if (current === 'transit') return 'deep-space'
  return 'all'
}

/** Synthetic flux samples for the classify preview — gain/zoom/scrub reshape emphasis. */
export function buildPreviewWaveform(
  seed: string,
  gain: number,
  zoom: number,
  scrub: number,
): number[] {
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const amplitude = 0.35 + (gain / 100) * 0.55
  const dipCenter = (scrub / 100) * 0.72 + 0.14
  const width = 0.08 / zoom
  const points = 48
  const values: number[] = []

  for (let i = 0; i < points; i += 1) {
    const t = i / (points - 1)
    const ripple = Math.sin((t * 6 + hash * 0.03) * Math.PI * 2) * 0.06
    const dip = Math.exp(-Math.pow(t - dipCenter, 2) / (2 * width * width))
    const baseline = 0.5 + ripple
    values.push(Math.max(0.08, Math.min(0.96, baseline - dip * amplitude)))
  }

  return values
}
