'use client'

import { useEffect, useState } from 'react'
import { structureTier } from '@/lib/scene/base-world'
import { KitRocket } from '@/components/game/hub/KitRocket'
import type { InstalledCustomizerPartsByKind } from '@/lib/data'
import { ASSET_ROOT, structureSprite, units } from '@/lib/scene/base-site'
import styles from './BaseLayerScene.module.css'

const KIT = '/game/assets/base/kit'
const EXHAUST_FRAMES = [0, 1, 2, 3].map(frame => `${KIT}/pad-exhaust-${frame}.png`)
const SMOKE_FRAMES = [0, 1, 2, 3].map(frame => `${KIT}/pad-smoke-${frame}.png`)

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

/** Launch complex (base kit v7): slab, lattice gantry and service hut in one sprite; the rocket stands on the
 *  launch mount only while a mission is in progress. Sizes are kit units times --px, from the shared site map. */
function LaunchpadKit({ tier, parts, phase = 'idle', rocket = true }: { tier: number; parts?: InstalledCustomizerPartsByKind | null; phase?: 'idle' | 'launch'; rocket?: boolean | 'core' }) {
  const launching = phase === 'launch'
  const pad = structureSprite('launchpad', tier)!
  return (
    <span
      data-pixel-structure="launchpad"
      data-tier={tier}
      data-pad-phase={phase}
      data-pad-rocket={rocket ? 'built' : 'empty'}
      className={styles.padStack}
      style={{ width: units(pad.width!), height: units(pad.height!) }}
    >
      <img src={`${ASSET_ROOT}${pad.src}`} alt="" draggable={false} className={styles.padArt} />
      {tier === 1 && <span className={styles.padBeacon} style={{ left: units(34.5), bottom: units(130.5) }} />}
      {rocket && (
        <span className={styles.padFlight} style={{ left: units(pad.mount!.x - 22), bottom: units(pad.mount!.z + 2) }}>
          <KitRocket parts={parts} space={rocket === 'core'} className={styles.padRocket} testId="pad-rocket" />
          {launching && <SpriteLoop frames={EXHAUST_FRAMES} intervalMs={90} className={styles.padExhaust} testId="pad-exhaust" />}
        </span>
      )}
      {rocket === 'core' && <>
        <span className={styles.recoveryCapsule} style={{ left: units(pad.mount!.x + 25), bottom: units(pad.mount!.z) }} data-testid="recovery-parachutes" aria-hidden="true">
          <svg viewBox="0 0 100 150" fill="none">
            <path d="M5 45C8-8 92-8 95 45Q80 32 65 45Q50 32 35 45Q20 32 5 45Z" fill="var(--ln-text)" stroke="var(--ln-cyan)" strokeWidth="3" />
            <path d="M35 45Q35 5 50 5Q65 5 65 45M5 45 40 115M35 45 44 115M65 45 56 115M95 45 60 115" stroke="var(--ln-cyan)" strokeWidth="2" />
            <path d="M40 115 32 139Q50 150 68 139L60 115Z" fill="var(--ln-text)" stroke="var(--ln-panel)" strokeWidth="3" />
            <path d="M33 137H67" stroke="var(--ln-cyan)" strokeWidth="4" />
          </svg>
        </span>
        <svg className={styles.catchArms} viewBox="0 0 112 99" data-testid="recovery-catch-arms" aria-hidden="true" fill="none" stroke="var(--ln-text)" strokeWidth="3">
          <path className={styles.catchArmLeft} d="M28 65V34H49V42" />
          <path className={styles.catchArmRight} d="M94 65V34H71V42" />
        </svg>
      </>}
      {launching && <SpriteLoop frames={SMOKE_FRAMES} intervalMs={140} className={styles.padSmoke} testId="pad-smoke" />}
    </span>
  )
}

/** Side-on base structure (kit v7). The base shows the launchpad, the hangar, the Control Station and the optional Exchange. */
export function PixelStructure({ kind, level = 1, parts, phase = 'idle', rocket = true }: { kind: string; level?: number; parts?: InstalledCustomizerPartsByKind | null; phase?: 'idle' | 'launch'; rocket?: boolean | 'core' }) {
  const tier = structureTier(level)
  if (kind === 'launchpad') return <LaunchpadKit tier={tier} parts={parts} phase={phase} rocket={rocket} />
  // SSL-792: the hangar, Exchange and control station draw their own sprite per level.
  const sprite = structureSprite(kind, kind === 'agency' ? 1 : level)
  if (!sprite?.src || (kind !== 'hangar' && kind !== 'garage' && kind !== 'market' && kind !== 'control-station' && kind !== 'agency')) return null
  return (
    <img
      src={`${ASSET_ROOT}${sprite.src}`}
      alt=""
      draggable={false}
      className={styles.structureArt}
      style={{ width: units(sprite.width!), height: units(sprite.height!) }}
      data-pixel-structure={kind === 'garage' ? 'hangar' : kind}
      data-tier={tier}
    />
  )
}
