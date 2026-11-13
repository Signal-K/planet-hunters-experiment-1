import type { RoverPart } from '@takeon/engine'

interface ProbePainterRegistry {
  listRoverParts: () => RoverPart[]
  registerRoverPart: (part: RoverPart) => void
}
const installed = new WeakSet<ProbePainterRegistry>()

/** The camera sits on feet; other rover builds retain their normal drivetrain. */
export function installFieldProbeGlyph(engine: ProbePainterRegistry): void {
  if (installed.has(engine)) return
  installed.add(engine)
  for (const part of engine.listRoverParts()) {
    if (!['tracks', 'wheels', 'wheel-dust'].includes(part.id)) continue
    engine.registerRoverPart({ ...part, when: p => p.rover.spec.id !== 'field-probe' && (part.when?.(p) ?? true) })
  }
  engine.registerRoverPart({
    id: 'field-probe-feet', order: 10,
    when: p => p.rover.spec.id === 'field-probe',
    draw(ctx, p) {
      ctx.strokeStyle = p.body
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-8, -3); ctx.lineTo(-13, 6); ctx.lineTo(-17, 6)
      ctx.moveTo(8, -3); ctx.lineTo(13, 6); ctx.lineTo(17, 6)
      ctx.stroke()
    },
  })
}
