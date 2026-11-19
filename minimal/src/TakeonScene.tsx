// A TakeOn minimal scene (KES-530) as a full-screen picture: the real voxel world
// for a body, framed as a deposit, an outpost or a launch. Read-only; nothing
// here reacts to input. Loaded lazily (see scenes.tsx): the engine is large.
import { useEffect, useRef } from 'react'
import { createMinimalScene, type MinimalSceneKind, type ResourceKey } from '@takeon/engine'
import type { Target } from '@landnam/lib/data/types'
import { destinationBody, HOME_SEED, homeBody } from './takeonWorlds'

type Frame = { focus: { x: number; y: number }; zoom: number }
export type Framing = { portrait: Frame; landscape: Frame }

const seedOf = (id: string) => [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7)

export function TakeonScene({ kind, target, highlight = [], framing, rover, className }: {
  kind: MinimalSceneKind
  rover?: boolean
  /** The destination to show; none means home (Landnam's steppe outpost). */
  target?: Target
  highlight?: readonly ResourceKey[]
  framing: Framing
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const highlightKey = highlight.join(',')
  const framingKey = JSON.stringify(framing)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const frames = JSON.parse(framingKey) as Framing
    const scene = createMinimalScene({
      canvas,
      kind,
      body: target ? destinationBody(target) : homeBody(),
      seed: target ? seedOf(target.id) : HOME_SEED,
      highlight: highlightKey ? (highlightKey.split(',') as ResourceKey[]) : [],
      drift: !reduced,
      rover,
    })
    // Upright and sideways layouts put the card in different places, so the
    // subject moves with them.
    const fit = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const frame = w > h ? frames.landscape : frames.portrait
      // Framings are tuned on a phone; a bigger screen moves the camera closer
      // so the subject keeps its share of the view.
      const scale = Math.max(1, Math.min(w, h) / 600)
      scene.resize(w, h, Math.min(2, window.devicePixelRatio || 1))
      scene.setFocus(frame.focus, frame.zoom * scale)
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
  }, [kind, target, highlightKey, framingKey, rover])

  return <canvas ref={canvasRef} className={className} aria-hidden data-takeon-scene={kind} />
}
