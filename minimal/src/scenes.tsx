// Minimal's scenery: every screen stands on a TakeOn minimal scene (KES-530).
// Home is an outpost on Landnam's steppe, signing in watches a launch
// from it, and a briefing shows the destination's deposit.
import { lazy, Suspense } from 'react'
import type { ResourceKey } from '@takeon/engine'
import type { Target } from '@landnam/lib/data/types'
import { LANDNAM_TO_TAKEON_MINERAL } from '@landnam/lib/takeon/minerals'
import type { Framing } from './TakeonScene'

// TakeOn's engine (with its Go core) is large: split it from the first paint.
const TakeonScene = lazy(() => import('./TakeonScene').then(m => ({ default: m.TakeonScene })))

const OUTPOST_FRAMING: Framing = {
  portrait: { focus: { x: 0.5, y: 0.72 }, zoom: 1.7 },
  landscape: { focus: { x: 0.5, y: 0.66 }, zoom: 1.5 },
}
const LAUNCH_FRAMING: Framing = {
  portrait: { focus: { x: 0.5, y: 0.52 }, zoom: 2 },
  landscape: { focus: { x: 0.7, y: 0.66 }, zoom: 1.8 },
}
const DEPOSIT_FRAMING: Framing = {
  portrait: { focus: { x: 0.5, y: 0.36 }, zoom: 2.6 },
  landscape: { focus: { x: 0.72, y: 0.5 }, zoom: 2.2 },
}

/** Landnam minerals as the TakeOn resources that stand in for them (platinum shows as crystal). */
export function takeonResources(minerals: readonly string[]): ResourceKey[] {
  return [...new Set(minerals.map(m => LANDNAM_TO_TAKEON_MINERAL[m]).filter(Boolean))]
}

// The sky shows while the engine loads, so the screen is never blank.
const Sky = () => <div className="mn-sky" aria-hidden />

/** Home outpost. The route screen draws its chapters over it, so it leaves the rover out. */
export function OutpostScenery({ rover = true }: { rover?: boolean }) {
  return (
    <Suspense fallback={<Sky />}>
      <TakeonScene className="mn-world" kind="outpost" rover={rover} framing={OUTPOST_FRAMING} />
    </Suspense>
  )
}

export function LaunchScenery() {
  return (
    <Suspense fallback={<Sky />}>
      <TakeonScene className="mn-world" kind="launch" framing={LAUNCH_FRAMING} />
    </Suspense>
  )
}

export function DepositScenery({ target, minerals }: { target: Target; minerals: readonly string[] }) {
  return (
    <Suspense fallback={<Sky />}>
      <TakeonScene
        className="mn-world"
        kind="deposit"
        target={target}
        highlight={takeonResources(minerals)}
        framing={DEPOSIT_FRAMING}
      />
    </Suspense>
  )
}
