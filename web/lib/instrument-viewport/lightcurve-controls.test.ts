import { describe, expect, it } from 'vitest'
import { DEFAULT_LIGHTCURVE_CONTROLS, applyLightcurveCommand, binPoints, foldPoints, lightcurveDisplay, measureDips, nextBin, timeWindow } from './lightcurve-controls'

const line = (n: number, dx = 0.1) => Array.from({ length: n }, (_, i) => ({ x: i * dx, y: 1 }))

describe('lightcurve controls', () => {
  it('bins consecutive points by averaging', () => {
    expect(binPoints([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }], 2)).toEqual([{ x: 0.5, y: 2 }, { x: 2, y: 5 }])
    expect(nextBin(8)).toBe(1)
  })

  it('narrows and slides the time window', () => {
    const pts = line(101) // 0..10 days
    expect(timeWindow(pts, 1, 0.5)).toEqual([0, 10])
    const [a, b] = timeWindow(pts, 4, 1)
    expect(a).toBeCloseTo(7.5); expect(b).toBeCloseTo(10)
    expect(lightcurveDisplay(pts, pts, { ...DEFAULT_LIGHTCURVE_CONTROLS, span: 4, scan: 0 }, 0).points.every(p => p.x <= 2.5)).toBe(true)
  })

  it('stacks dips that repeat on the fold period at zero', () => {
    const pts = [2, 5, 8].map(x => ({ x, y: 0.99 })).concat([{ x: 3.5, y: 1 }])
    const folded = foldPoints(pts, 3, 2)
    expect(folded.filter(p => p.y === 0.99).every(p => Math.abs(p.x) < 1e-9)).toBe(true)
    expect(folded.every(p => p.x >= -1.5 && p.x < 1.5)).toBe(true)
  })

  it('parses console verbs and falls through on others', () => {
    expect(applyLightcurveCommand(DEFAULT_LIGHTCURVE_CONTROLS, 'fold 2.5')?.controls).toMatchObject({ fold: true, period: 2.5 })
    // No control folds on the player's behalf (SSL-747).
    expect(applyLightcurveCommand(DEFAULT_LIGHTCURVE_CONTROLS, 'SNAP')).toBeNull()
    expect(applyLightcurveCommand(DEFAULT_LIGHTCURVE_CONTROLS, 'BIN 3')?.controls.bin).toBe(2)
    expect(applyLightcurveCommand(DEFAULT_LIGHTCURVE_CONTROLS, 'ZOOM 2')).toBeNull()
  })

  it('measures marked dips against the unmarked baseline and reports raw gaps', () => {
    const pts = line(101).map(p => ({ x: p.x, y: (p.x > 1.95 && p.x < 2.05) || (p.x > 6.35 && p.x < 6.45) ? 0.99 : 1 }))
    const { dips, gaps } = measureDips(pts, [{ x1: 6.3, x2: 6.5 }, { x1: 1.9, x2: 2.1 }])
    expect(dips.map(d => d.centre)).toEqual([2, 6.4])
    expect(dips[0].hours).toBeCloseTo(4.8)
    expect(dips[0].depthPpt).toBeGreaterThan(3)
    expect(gaps[0]).toBeCloseTo(4.4)
  })
})
