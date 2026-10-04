'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  SCENE_TRANSITION_IN_MS,
  SCENE_TRANSITION_OUT_MS,
  transitionKind,
  type SceneTransitionKind,
} from '@/lib/scene-transition'

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Holds the outgoing scene until a void veil has covered it, then reveals
 * the incoming scene. The swap itself happens while the veil is opaque, so
 * the player never sees a hard cut. `sceneKey` is the routed screen, or
 * `launch` while the launch cinematic is up.
 */
export default function SceneTransition({ sceneKey, children }: { sceneKey: string; children: ReactNode }) {
  const held = useRef({ key: sceneKey, node: children })
  const latest = useRef(children)
  latest.current = children
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle')
  const [kind, setKind] = useState<SceneTransitionKind>('fade')
  const [, setEpoch] = useState(0)

  if (phase === 'idle' && held.current.key === sceneKey) {
    held.current.node = children
  }

  useLayoutEffect(() => {
    if (held.current.key === sceneKey) return
    let cancelled = false
    let revealTimer = 0
    if (prefersReducedMotion()) {
      held.current = { key: sceneKey, node: latest.current }
      setPhase('idle')
      setEpoch(value => value + 1)
      return
    }
    setKind(transitionKind(held.current.key, sceneKey))
    setPhase('out')
    const coverTimer = window.setTimeout(() => {
      if (cancelled) return
      held.current = { key: sceneKey, node: latest.current }
      setPhase('in')
      setEpoch(value => value + 1)
      revealTimer = window.setTimeout(() => {
        if (!cancelled) setPhase('idle')
      }, SCENE_TRANSITION_IN_MS)
    }, SCENE_TRANSITION_OUT_MS)
    return () => {
      cancelled = true
      window.clearTimeout(coverTimer)
      window.clearTimeout(revealTimer)
    }
  }, [sceneKey])

  const showHeld = held.current.key !== sceneKey || phase === 'out'
  const craft = kind !== 'fade' && phase !== 'idle'

  return (
    <div className="scene-transition" data-scene-key={held.current.key === sceneKey ? sceneKey : held.current.key}>
      {showHeld ? held.current.node : children}
      <div
        className="scene-transition-veil"
        data-phase={phase}
        data-kind={kind}
        aria-hidden="true"
      >
        {craft && (
          <div className="scene-transition-craft" data-kind={kind}>
            <span className="scene-transition-horizon" />
            <span className="scene-transition-body" />
            <span className="scene-transition-rocket" />
          </div>
        )}
      </div>
    </div>
  )
}
