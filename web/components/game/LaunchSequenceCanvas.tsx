'use client'

import React, { useEffect, useRef, useState } from 'react'
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

const FLAME_CSS = `
@keyframes launch-flame { 0%,100% { transform: scale(1, 1); } 35% { transform: scale(0.88, 1.18); } 70% { transform: scale(1.1, 0.9); } }
@keyframes launch-smoke { 0% { transform: translateY(0) scale(0.6); opacity: 0.7; } 100% { transform: translateY(-40px) scale(1.8); opacity: 0; } }
`

/** One layered pixel-style flame: white core, amber body, orange edge. `px` sizes it; it hangs below its parent's top edge. */
function Flame({ x, width, height, delay = 0 }: { x: string; width: number; height: number; delay?: number }) {
  const layer = (scale: number, color: string): React.CSSProperties => ({
    position: 'absolute', left: '50%', top: 0, width: width * scale, height: height * (0.55 + scale * 0.45),
    marginLeft: -(width * scale) / 2, background: color, clipPath: 'polygon(0 0, 100% 0, 78% 55%, 50% 100%, 22% 55%)',
  })
  return (
    <div aria-hidden="true" data-testid="launch-flame" style={{ position: 'absolute', left: x, top: '100%', width: 0, height: 0, transformOrigin: 'top center', animation: `launch-flame 0.18s steps(3, end) ${delay}s infinite` }}>
      <div style={layer(1, '#ff6a2a')} />
      <div style={layer(0.68, '#ffb23e')} />
      <div style={layer(0.34, '#fff4c2')} />
    </div>
  )
}

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
          <style>{FLAME_CSS}</style>
          {!airborne && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <BaseWorldCanvas px={px} camera={BASE_CAMERA_HOME} time="dusk" biome={earthBiome ?? 'mountains'} />
          </div>}
          {airborne && (
            <div aria-hidden="true" data-testid="launch-sky" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #3d5a86 0%, #1a2748 45%, #0b1020 100%)' }} />
              <div style={{ position: 'absolute', inset: 0, opacity: 0.25 + flight * 0.75, backgroundImage: 'radial-gradient(1.5px 1.5px at 12% 18%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 78% 12%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 42% 30%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 66% 44%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 24% 56%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 90% 66%, #fff 50%, transparent 51%)' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '22%', background: '#2b3350', borderTop: '4px solid #46506f', transform: `translateY(${flight * 160}%)` }} />
            </div>
          )}
          <div style={{ position: 'absolute', top: 28, left: 16, right: 16, zIndex: 5, color: '#f6f2ea', fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800, letterSpacing: '0.1em', textAlign: 'center', textTransform: 'uppercase', textShadow: '2px 2px 0 #16293b' }}>
            <div>{rocketName}</div><div style={{ marginTop: 8 }}>{phase}</div>
          </div>
          {!airborne && (
            <div style={{ position: 'absolute', left: '50%', bottom: '18%', zIndex: 3, transform: 'translateX(-50%)', ['--px' as string]: `${px}px` }}>
              <PixelStructure kind="launchpad" phase="launch" />
            </div>
          )}
          {!airborne && elapsed >= 900 && (
            <div aria-hidden="true" data-testid="launch-ignition" style={{ position: 'absolute', left: '50%', bottom: '17%', zIndex: 4, width: 0, height: 0 }}>
              <div style={{ position: 'absolute', left: -48 * px / 4, bottom: 0, width: 96 * px / 4, height: 28 * px / 4, borderRadius: '50%', background: 'radial-gradient(ellipse, #fff4c2 0%, #ffb23e 45%, rgba(255,106,42,0) 75%)', animation: 'launch-flame 0.18s steps(3, end) infinite' }} />
              {[-1, 0, 1].map(n => <div key={n} style={{ position: 'absolute', left: n * 34 * px / 4 - 10, bottom: 4, width: 20, height: 20, borderRadius: '50%', background: '#cfd6e6', opacity: 0, animation: `launch-smoke 1.1s ease-out ${(n + 1) * 0.25}s infinite` }} />)}
            </div>
          )}
          {airborne && (
            <div style={{ position: 'absolute', left: `${24 + flight * 50}%`, top: `${58 - flight * 38}%`, zIndex: 3, width: `${44 * px}px`, height: `${72 * px}px`, transform: `rotate(${flight * 18}deg)`, filter: 'drop-shadow(3px 4px 0 #16293b)' }}>
              <KitRocket className="launch-sequence-rocket" />
              <Flame x="50%" width={11 * px} height={34 * px} />
              <Flame x="15%" width={7 * px} height={24 * px} delay={0.06} />
              <Flame x="85%" width={7 * px} height={24 * px} delay={0.12} />
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
