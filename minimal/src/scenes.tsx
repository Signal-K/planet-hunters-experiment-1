// Minimal's scenery: every screen stands on a TakeOn minimal scene (KES-530).
// Home is an outpost on Landnam's steppe, signing in and launching watch a rocket
// leave it, and a destination shows its deposit or the outpost built there.
import { lazy, Suspense } from 'react'
import type { MinimalSceneHandle, MinimalSceneKind, ResourceKey } from '@takeon/engine'
import type { Target } from '@landnam/lib/data/types'
import { LANDNAM_TO_TAKEON_MINERAL } from '@landnam/lib/takeon/minerals'
import type { Framing } from './TakeonScene'

// TakeOn's engine (with its Go core) is large: split it from the first paint.
const TakeonScene = lazy(() => import('./TakeonScene').then(m => ({ default: m.TakeonScene })))

/** Where the subject sits for each scene, upright and sideways (the card takes the bottom or the left). */
export const FRAMING: Record<MinimalSceneKind, Framing> = {
  outpost: {
    portrait: { focus: { x: 0.5, y: 0.36 }, zoom: 2.2 },
    landscape: { focus: { x: 0.72, y: 0.52 }, zoom: 2 },
  },
  launch: {
    portrait: { focus: { x: 0.5, y: 0.52 }, zoom: 2.2 },
    landscape: { focus: { x: 0.72, y: 0.66 }, zoom: 2 },
  },
  deposit: {
    portrait: { focus: { x: 0.5, y: 0.36 }, zoom: 2.8 },
    landscape: { focus: { x: 0.72, y: 0.5 }, zoom: 2.4 },
  },
}

/** Landnam minerals as the TakeOn resources that stand in for them (platinum shows as crystal). */
export function takeonResources(minerals: readonly string[]): ResourceKey[] {
  return [...new Set(minerals.map(m => LANDNAM_TO_TAKEON_MINERAL[m]).filter(Boolean))]
}

// The sky shows while the engine loads, so the screen is never blank.
const Sky = () => <div className="mn-sky" aria-hidden />

export function Scenery({ kind, target, minerals = [], rover, autoLaunch, framing, onReady }: {
  kind: MinimalSceneKind
  /** A destination; none means home. */
  target?: Target
  /** Landnam minerals the deposit scene should point at. */
  minerals?: readonly string[]
  rover?: boolean
  autoLaunch?: boolean
  framing?: Framing
  onReady?: (scene: MinimalSceneHandle | null) => void
}) {
  return (
    <Suspense fallback={<Sky />}>
      <TakeonScene
        className="mn-world"
        kind={kind}
        target={target}
        highlight={takeonResources(minerals)}
        rover={rover}
        autoLaunch={autoLaunch}
        framing={framing ?? FRAMING[kind]}
        onReady={onReady}
      />
    </Suspense>
  )
}
