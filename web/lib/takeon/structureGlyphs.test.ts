// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import type { FlatPainter } from '@takeon/engine'
import {
  installLandnamStructureGlyphs,
  type StructureGlyphEngine,
} from './structureGlyphs'

function paintingEngine() {
  let painter: FlatPainter | undefined = vi.fn()
  const engine: StructureGlyphEngine = {
    getFlatPainter: () => painter,
    registerFlatPainter: (_kind, next) => {
      painter = next
    },
  }
  return {
    engine,
    paint(variant: string) {
      const ctx = {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        fillStyle: '',
        globalAlpha: 1,
      }
      painter?.(
        ctx as unknown as CanvasRenderingContext2D,
        { id: variant, kind: 'structure', pos: { x: 0, y: 0 }, z: 0, variant },
        { tile: 16, daylight: 1, time: 0, facing: 0 },
      )
      return ctx
    },
  }
}

describe('installLandnamStructureGlyphs', () => {
  it('paints a storage silo from theme tokens and leaves other structures to the built-in painter', () => {
    document.documentElement.style.setProperty('--ln-text-dim', 'silver')
    document.documentElement.style.setProperty('--ln-void', 'black')
    const { engine, paint } = paintingEngine()
    const base = engine.getFlatPainter('structure')
    installLandnamStructureGlyphs(engine)

    const silo = paint('silo')
    expect(base).not.toHaveBeenCalled()
    expect(silo.fillStyle).toBe('black')
    expect(silo.fill).toHaveBeenCalledTimes(3)

    const solar = paint('solar-array')
    expect(base).toHaveBeenCalledTimes(1)
    expect(solar.fill).not.toHaveBeenCalled()
  })

  it('installs once per engine', () => {
    const { engine } = paintingEngine()
    const register = vi.spyOn(engine, 'registerFlatPainter')
    installLandnamStructureGlyphs(engine)
    installLandnamStructureGlyphs(engine)
    expect(register).toHaveBeenCalledTimes(1)
  })
})
