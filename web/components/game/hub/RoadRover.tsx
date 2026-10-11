'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { groundOffsetCss, type SceneRoadPath, type SceneRoadPoint } from '@/lib/scene/terrain-kit'

// KES-260: ambient Earth Base traffic stays on the composition's road path.
const ROVER_SRC = '/game/assets/actors/road_rover.png'

function pathLength(points: SceneRoadPoint[]): number {
  return points.slice(1).reduce((total, point, index) => {
    const previous = points[index]
    return total + Math.hypot(point.x - previous.x, point.groundOffset - previous.groundOffset)
  }, 0)
}

function pointAtProgress(points: SceneRoadPoint[], progress: number): SceneRoadPoint {
  if (points.length === 0) return { x: 0, groundOffset: 0 }
  if (points.length === 1) return points[0]

  const total = pathLength(points)
  let distance = Math.min(1, Math.max(0, progress)) * total
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const point = points[index]
    const segment = Math.hypot(point.x - previous.x, point.groundOffset - previous.groundOffset)
    if (distance <= segment) {
      const t = segment === 0 ? 0 : distance / segment
      return {
        x: previous.x + (point.x - previous.x) * t,
        groundOffset: previous.groundOffset + (point.groundOffset - previous.groundOffset) * t,
      }
    }
    distance -= segment
  }
  return points[points.length - 1]
}

export function RoadRover({ road, durationMs = 18000 }: { road?: SceneRoadPath; durationMs?: number }) {
  const roverRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [canAnimate, setCanAnimate] = useState(false)
  const total = useMemo(() => road ? pathLength(road.points) : 0, [road])
  const point = useMemo(
    () => road ? pointAtProgress(road.points, progress) : { x: 0, groundOffset: 0 },
    [road, progress],
  )

  useEffect(() => {
    const rover = roverRef.current
    if (!rover || typeof IntersectionObserver === 'undefined') {
      setCanAnimate(!document.hidden)
      return
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let intersecting = false
    const update = () => setCanAnimate(intersecting && !document.hidden && !media.matches)
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry?.isIntersecting ?? false
      update()
    })
    observer.observe(rover)
    document.addEventListener('visibilitychange', update)
    media.addEventListener('change', update)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', update)
      media.removeEventListener('change', update)
    }
  }, [])

  useEffect(() => {
    if (!canAnimate || !road || road.points.length < 2 || total === 0) return

    const startedAt = Date.now()
    const tick = () => setProgress(((Date.now() - startedAt) % durationMs) / durationMs)
    tick()
    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  }, [canAnimate, durationMs, road, total])

  if (!road || road.points.length === 0) return null

  return (
    <div
      ref={roverRef}
      data-testid="road-rover"
      data-road-id={road.id}
      data-road-progress={progress.toFixed(3)}
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: `${point.x}%`,
        bottom: groundOffsetCss(point.groundOffset),
        width: 'clamp(36px, 5vw, 72px)',
        aspectRatio: '72 / 48',
        // Below the building status-pill layer (HubScreen.tsx, zIndex 10) —
        // KES-352 found this rover driving in front of and obscuring the
        // "LAUNCHPAD · READY" pill text as it crossed behind the structure.
        zIndex: 9,
        pointerEvents: 'none',
        transform: 'translateX(-50%)',
        transition: 'left 250ms linear, bottom 250ms linear',
        filter: 'drop-shadow(0 3px 3px color-mix(in srgb, var(--ln-void) 48%, transparent))',
      }}
    >
      <img
        src={ROVER_SRC}
        alt=""
        draggable={false}
        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center bottom' }}
      />
    </div>
  )
}
