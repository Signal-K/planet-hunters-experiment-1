// The chapter's destination as a TakeOn diorama (KES-530): the real voxel world
// for that body, the rover parked a few tiles from a deposit, a dashed route to
// it and a slow camera drift. Read-only; nothing here reacts to input.
import { useEffect, useRef } from 'react'
import { createMinimalScene, type ResourceKey } from '@takeon/engine'
import { takeonBodyForTarget } from '@landnam/lib/takeon/bodies'
import type { Target } from '@landnam/lib/data/types'

export function TakeonDiorama({ target, minerals, className }: { target: Target; minerals: readonly string[]; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const scene = createMinimalScene({
      canvas,
      body: takeonBodyForTarget(target),
      seed: [...target.id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7),
      highlight: minerals as ResourceKey[],
      drift: !reduced,
    })
    // Upright: the pair sits above the bottom card. Sideways: the card is a left
    // column, so the pair moves right and the camera pulls back a little.
    const fit = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      scene.resize(w, h, Math.min(2, window.devicePixelRatio || 1))
      scene.setFocus(w > h ? { x: 0.72, y: 0.5 } : { x: 0.5, y: 0.36 }, w > h ? 2.2 : 2.6)
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(canvas)
    scene.start()
    if (import.meta.env.DEV) (window as unknown as { __mnScene?: unknown }).__mnScene = scene
    return () => {
      observer.disconnect()
      scene.destroy()
    }
  }, [target, minerals])

  return <canvas ref={canvasRef} className={className} aria-hidden data-takeon-scene="minimal" />
}
