'use client'

import { useEffect, useState } from 'react'
import { structureTier } from '@/lib/scene/base-world'
import { KitRocket } from '@/components/game/hub/KitRocket'
import type { InstalledCustomizerPartsByKind } from '@/lib/data'
import styles from './BaseLayerScene.module.css'

const KIT = '/game/assets/base/kit'
const EXHAUST_FRAMES = [0, 1, 2, 3].map(frame => `${KIT}/pad-exhaust-${frame}.png`)
const SMOKE_FRAMES = [0, 1, 2, 3].map(frame => `${KIT}/pad-smoke-${frame}.png`)
const ARM_FRAMES = [0, 1, 2, 3].map(frame => `${KIT}/pad-gantry-arms-${frame}.png`)
const BEACONS: Array<readonly [number, number, string]> = [
  [7, 18, '0s'],
  [33, 18, '0.35s'],
  [7, 48, '0.15s'],
  [33, 48, '0.55s'],
  [7, 74, '0.2s'],
  [33, 74, '0.7s'],
]

function useSpriteFrame(frameCount: number, intervalMs: number, hold: boolean, active = true) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    if (!active) return
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setFrame(hold ? frameCount - 1 : 0)
      return
    }
    let current = 0
    const id = window.setInterval(() => {
      current += 1
      if (hold && current >= frameCount) {
        window.clearInterval(id)
        setFrame(frameCount - 1)
        return
      }
      setFrame(current % frameCount)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [active, frameCount, hold, intervalMs])
  return frame
}

function SpriteLoop({ frames, intervalMs, className, testId }: { frames: string[]; intervalMs: number; className?: string; testId?: string }) {
  const frame = useSpriteFrame(frames.length, intervalMs, false)
  return <img src={frames[frame]} alt="" draggable={false} className={className} data-testid={testId} />
}

/** Native pad stack: concrete slab, lattice gantry, cream rocket. Sizes follow --px. */
function LaunchpadKit({ tier, parts, phase = 'idle', rocket = true }: { tier: number; parts?: InstalledCustomizerPartsByKind | null; phase?: 'idle' | 'launch'; rocket?: boolean }) {
  const launching = phase === 'launch'
  const arm = useSpriteFrame(ARM_FRAMES.length, 180, true, launching)
  return (
    <span data-pixel-structure="launchpad" data-tier={tier} data-pad-phase={phase} data-pad-rocket={rocket ? 'built' : 'empty'} className={styles.padStack}>
      <span className={styles.padGantryBox}>
        <img src={`${KIT}/pad-gantry-tower.png`} alt="" draggable={false} className={styles.padGantry} />
        <img src={ARM_FRAMES[launching ? arm : 0]} alt="" draggable={false} className={styles.padArms} data-testid="pad-gantry-arms" />
        {BEACONS.map(([x, y, delay]) => (
          <img
            key={`${x}-${y}`}
            src={`${KIT}/pad-beacon-1.png`}
            alt=""
            draggable={false}
            className={styles.padBeacon}
            style={{ left: `calc(${x} * var(--px, 3px))`, top: `calc(${y} * var(--px, 3px))`, animationDelay: delay }}
          />
        ))}
      </span>
      {rocket && (
        <span className={styles.padFlight}>
          <KitRocket parts={parts} className={styles.padRocket} testId="pad-rocket" />
          {launching && <SpriteLoop frames={EXHAUST_FRAMES} intervalMs={90} className={styles.padExhaust} testId="pad-exhaust" />}
        </span>
      )}
      <img src={`${KIT}/pad-slab-concrete.png`} alt="" draggable={false} className={styles.padSlab} />
      {launching && <SpriteLoop frames={SMOKE_FRAMES} intervalMs={140} className={styles.padSmoke} testId="pad-smoke" />}
    </span>
  )
}

/** Side-on pixel structure. The base shows the launchpad and the glazed hangar only. */
export function PixelStructure({ kind, level = 1, parts, phase = 'idle', rocket = true }: { kind: string; level?: number; parts?: InstalledCustomizerPartsByKind | null; phase?: 'idle' | 'launch'; rocket?: boolean }) {
  const tier = structureTier(level)
  if (kind === 'launchpad') return <LaunchpadKit tier={tier} parts={parts} phase={phase} rocket={rocket} />
  if (kind === 'hangar') {
    return <img src={`${KIT}/hangar-white.png`} alt="" draggable={false} className={styles.hangarSprite} data-pixel-structure="hangar" data-tier={tier} />
  }
  return null
}
