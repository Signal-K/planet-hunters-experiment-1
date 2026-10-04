/**
 * Host glyphs for Landnam structures the takeon flat view does not know.
 *
 * Painters are registered per entity kind, so a storage silo otherwise falls
 * through to the unknown-structure placeholder (a blue-gray block). This wraps
 * the built-in structure painter and only replaces the `silo` variant. The
 * engine is injected (type-only import) so this module does not pull
 * `@takeon/engine` into the main bundle.
 */

import type { FlatPainter } from '@takeon/engine'

export interface StructureGlyphEngine {
  getFlatPainter(kind: string): FlatPainter | undefined
  registerFlatPainter(kind: string, painter: FlatPainter): void
}

const installed = new WeakSet<object>()

function cssToken(name: string): string {
  if (typeof document === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** Top-down storage silo: a round tank with a hatch. Returns false when the
 *  theme tokens are unavailable so the caller can keep the built-in painter. */
export function paintStorageSilo(ctx: CanvasRenderingContext2D, paint: { tile: number }): boolean {
  const body = cssToken('--ln-text-dim')
  const ink = cssToken('--ln-void')
  if (!body || !ink) return false
  const radius = Math.max(6, paint.tile * 0.78) / 2
  ctx.save()
  ctx.fillStyle = ink
  ctx.globalAlpha = 0.45
  ctx.beginPath()
  ctx.arc(0, 0, radius + 1, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = ink
  ctx.beginPath()
  ctx.arc(0, 0, Math.max(1.5, radius * 0.28), 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  return true
}

export function installLandnamStructureGlyphs(engine: StructureGlyphEngine): void {
  if (installed.has(engine)) return
  const base = engine.getFlatPainter('structure')
  if (!base) return
  installed.add(engine)
  engine.registerFlatPainter('structure', (ctx, entity, paint) => {
    if (entity.variant === 'silo' && paintStorageSilo(ctx, paint)) return
    base(ctx, entity, paint)
  })
}
