'use client'

import { useEffect, useMemo, useState } from 'react'
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
  const [progress, setProgress] = useState(0)
  const total = useMemo(() => road ? pathLength(road.points) : 0, [road])
  const point = useMemo(
    () => road ? pointAtProgress(road.points, progress) : { x: 0, groundOffset: 0 },
    [road, progress],
  )

  useEffect(() => {
    if (!road || road.points.length < 2 || total === 0) return

    let frame = 0
    const startedAt = performance.now()
    const tick = (now: number) => {
      setProgress(((now - startedAt) % durationMs) / durationMs)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [durationMs, road, total])

  if (!road || road.points.length === 0) return null

  return (
    <div
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
        zIndex: 13,
        pointerEvents: 'none',
        transform: 'translateX(-50%)',
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
