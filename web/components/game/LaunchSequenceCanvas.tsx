'use client'

import { useEffect, useRef, useState } from 'react'
import { fragmentsCaughtOnLaunch } from '@/lib/orionids/launch-catch'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { skyEventNow } from '@/lib/data/sky-events'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import { BaseWorldCanvas } from '@/components/game/hub/BaseWorldCanvas'
import { PixelStructure } from '@/components/game/hub/PixelStructure'
import { KitRocket } from '@/components/game/hub/KitRocket'
import { BASE_CAMERA_HOME } from '@/lib/scene/base-camera'
import { kitScale } from '@/lib/scene/base-site'
import type { EarthBiomeId } from '@/lib/scene/base-world'
import SequenceDesktopFrame from '@/components/game/SequenceDesktopFrame'

interface Props {
  rocketId?: string
  rocketName: string
  rocketImageSrc?: string
  targetName: string
  earthBiome?: EarthBiomeId
  onComplete: () => void
}

// The old Pixi graph composed a second launchpad and a second rocket, then
// relied on WebGL surviving the hand-off. This reuses the real Base artwork,
// so the player sees the same physical vehicle leave the same physical site.
const LIFTOFF_MS = 3_200
const COMPLETE_MS = 5_200
const FAILSAFE_MS = 18_000

export function LaunchSequenceCanvas({ rocketName, targetName, earthBiome, onComplete }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const [view, setView] = useState(() => ({ w: typeof window === 'undefined' ? 402 : window.innerWidth, h: typeof window === 'undefined' ? 780 : window.innerHeight }))
  const completeRef = useRef(onComplete)
  const firedRef = useRef(false)
  const isDesktop = useIsDesktop()
  const ascentFragments = fragmentsCaughtOnLaunch(skyEventNow(isDevLauncherEnabled()))
  completeRef.current = onComplete

  const finish = useRef(() => {
    if (firedRef.current) return
    firedRef.current = true
    completeRef.current()
  }).current

  useEffect(() => {
    const onResize = () => setView({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const next = Math.min(COMPLETE_MS, now - started)
      setElapsed(next)
      if (next >= COMPLETE_MS) finish()
      else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const failsafe = window.setTimeout(finish, FAILSAFE_MS)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(failsafe)
    }
  }, [finish])

  const px = kitScale(view)
  const airborne = elapsed >= LIFTOFF_MS
  const flight = Math.max(0, Math.min(1, (elapsed - LIFTOFF_MS) / (COMPLETE_MS - LIFTOFF_MS)))
  const phase = elapsed < 900 ? 'COUNTDOWN · GUIDANCE LOCKED' : elapsed < LIFTOFF_MS ? 'IGNITION · BOOSTERS NOMINAL' : 'ASCENT · ORIONIDS SHOWER FIELD'

  return (
    <SequenceDesktopFrame
      background="#10182c"
      stageAspect={isDesktop ? '16 / 9' : '402 / 780'}
      leftTitle="MISSION"
      leftRows={[{ label: 'VEHICLE', value: rocketName }, { label: 'DESTINATION', value: targetName }]}
      rightTitle="LAUNCH TELEMETRY"
      rightRows={[{ label: 'SEQUENCE', value: 'AUTOMATED' }, { label: 'STATUS', value: 'NOMINAL' }]}
      showClock
      renderStage={style => (
        <div data-testid="launch-sequence-stage" data-fragments={ascentFragments || undefined} style={{ position: 'relative', isolation: 'isolate', overflow: 'hidden', background: '#10182c', ...style }}>
          {!airborne && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <BaseWorldCanvas px={px} camera={BASE_CAMERA_HOME} time="dusk" biome={earthBiome ?? 'mountains'} />
          </div>}
          <div style={{ position: 'absolute', top: 28, left: 16, right: 16, zIndex: 5, color: '#f6f2ea', fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800, letterSpacing: '0.1em', textAlign: 'center', textTransform: 'uppercase', textShadow: '2px 2px 0 #16293b' }}>
            <div>{rocketName}</div><div style={{ marginTop: 8 }}>{phase}</div>
          </div>
          {!airborne && (
            <div style={{ position: 'absolute', left: '50%', bottom: '18%', zIndex: 3, transform: 'translateX(-50%)', ['--px' as string]: `${px}px` }}>
              <PixelStructure kind="launchpad" phase="launch" />
            </div>
          )}
          {airborne && (
            <div style={{ position: 'absolute', left: `${24 + flight * 50}%`, top: `${58 - flight * 38}%`, zIndex: 3, width: `${44 * px}px`, height: `${72 * px}px`, transform: `rotate(${flight * 18}deg)`, filter: 'drop-shadow(3px 4px 0 #16293b)' }}>
              <KitRocket className="launch-sequence-rocket" />
            </div>
          )}
          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 24, zIndex: 5, color: '#f6f2ea', fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800, letterSpacing: '0.08em', textAlign: 'center', textTransform: 'uppercase', textShadow: '2px 2px 0 #16293b' }}>Transit → {targetName}</div>
        </div>
      )}
    >
      {process.env.NODE_ENV === 'development' && <button data-testid="launch-sequence-skip-btn" onClick={finish} style={{ position: 'absolute', bottom: 24, right: 24, zIndex: 101, minHeight: 44, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', background: '#f6f2ea', border: '2px solid #16293b', boxShadow: '3px 3px 0 #42a6df', color: '#16293b', fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Skip ▸</button>}
    </SequenceDesktopFrame>
  )
}
