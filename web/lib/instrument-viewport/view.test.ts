import { describe, expect, it } from 'vitest'
import {
  applyInstrumentCommand,
  DEFAULT_INSTRUMENT_VIEW,
  instrumentOptics,
  nudgeAim,
} from './view'

describe('instrument viewport commands', () => {
  it('aims, zooms, focuses, exposes, stretches and inverts the same view', () => {
    let view = DEFAULT_INSTRUMENT_VIEW
    view = applyInstrumentCommand(view, 'POINT N')!.view
    expect(view.panY).toBeLessThan(0)
    view = applyInstrumentCommand(view, 'ZOOM 2.5')!.view
    expect(view.zoom).toBe(2.5)
    view = applyInstrumentCommand(view, 'FOCUS 80')!.view
    expect(view.focus).toBe(0.8)
    view = applyInstrumentCommand(view, 'EXPOSE 1.4')!.view
    expect(view.exposure).toBe(1.4)
    view = applyInstrumentCommand(view, 'STRETCH ON')!.view
    expect(view.stretch).toBe(true)
    view = applyInstrumentCommand(view, 'INVERT')!.view
    expect(view.invert).toBe(true)

    const optics = instrumentOptics(view)
    expect(optics.zoom).toBe(2.5)
    expect(optics.stretch).toBeGreaterThan(1)
    expect(optics.invert).toBe(1)
    expect(optics.blurPx).toBeGreaterThan(0)
    expect(optics.exposure).toBe(1.4)
  })

  it('echoes downlink and rejects an unknown verb', () => {
    const downlink = applyInstrumentCommand(DEFAULT_INSTRUMENT_VIEW, 'downlink')
    expect(downlink?.lines[0]).toContain('RECEIVED')
    expect(downlink?.view).toEqual(DEFAULT_INSTRUMENT_VIEW)
    expect(applyInstrumentCommand(DEFAULT_INSTRUMENT_VIEW, 'SECTOR 2')).toBeNull()
  })

  it('resets aim from the centre control and from POINT RESET', () => {
    const shifted = nudgeAim(DEFAULT_INSTRUMENT_VIEW, 'e')
    expect(shifted.panX).toBeGreaterThan(0)
    expect(nudgeAim(shifted, 'reset').panX).toBe(0)
    expect(applyInstrumentCommand(shifted, 'POINT RESET')!.view.panX).toBe(0)
  })

  it('clamps zoom and exposure to the instrument range', () => {
    expect(applyInstrumentCommand(DEFAULT_INSTRUMENT_VIEW, 'ZOOM 9')!.view.zoom).toBe(3)
    expect(applyInstrumentCommand(DEFAULT_INSTRUMENT_VIEW, 'EXPOSE 0.1')!.view.exposure).toBe(0.6)
  })
})
