'use client'

import { groundOffsetCss, type SceneRoadPath } from '@/lib/scene/terrain-kit'

// SSL-428: base staff, outlined blueprint figures pacing the apron between buildings.
const CREW_SRC = '/game/assets/actors/crew.png'
const WALKS = [
  { from: 14, to: 24, seconds: 11, delay: 0 },
  { from: 56, to: 70, seconds: 15, delay: -6 },
]

export function CrewWalkers({ road }: { road?: SceneRoadPath }) {
  if (!road || road.points.length === 0) return null
  const bottom = groundOffsetCss(road.points[0].groundOffset)
  return (
    <div data-testid="crew-walkers" aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9 }}>
      <style>{`@keyframes ln-crew-pace{0%{left:var(--from)}50%{left:var(--to)}100%{left:var(--from)}}
@media (prefers-reduced-motion: reduce){[data-crew]{animation:none!important}}`}</style>
      {WALKS.map((w, i) => (
        <img
          key={i}
          data-crew
          src={CREW_SRC}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            bottom,
            left: `${w.from}%`,
            width: 'clamp(10px, 1.6vw, 20px)',
            aspectRatio: '2 / 3',
            transform: 'translateX(-50%)',
            animation: `ln-crew-pace ${w.seconds}s ease-in-out ${w.delay}s infinite`,
            ['--from' as string]: `${w.from}%`,
            ['--to' as string]: `${w.to}%`,
          }}
        />
      ))}
    </div>
  )
}
