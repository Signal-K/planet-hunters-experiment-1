// The chapter route as an in-world scene: the home outpost in TakeOn (pad,
// habitat, solar, rover; KES-530) with the six chapters drawn as a flight route
// that climbs from the pad into the sky. Text is names only.
import { ROUTE_FRAMING, Scenery } from './scenes'
import { useViewSize } from '@landnam/lib/hooks/useViewSize'
import type { MinimalBase } from '@takeon/engine'
import { CHAPTERS, francs, type Chapter } from './chapters'
import { PickedCard, useBuildingPick } from './buildingPick'

// Waypoints in screen percent, zig-zagging up the sky above the outpost. A
// landscape view spreads them left to right instead.
function stopsFor(w: number, h: number, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const t = count > 1 ? i / (count - 1) : 0
    return w <= h
      ? { x: i % 2 === 0 ? 28 : 72, y: 56 - t * 47 }
      : { x: 8 + t * 84, y: 52 - t * 40 + (i % 2 === 0 ? 0 : 6) }
  })
}

export function RouteScene({ done, base, money, onboardedInLandnam, onOpen }: {
  /** The home base as far as the player has built it. */
  base: MinimalBase
  /** Finished chapter numbers. */
  done: ReadonlySet<number>
  money: number
  onboardedInLandnam: boolean
  onOpen: (chapter: Chapter) => void
}) {
  const view = useViewSize()
  const { scene, picked, tap } = useBuildingPick()
  const STOPS = stopsFor(view.w, view.h, CHAPTERS.length)
  const next = CHAPTERS.find(c => !done.has(c.number)) ?? CHAPTERS[CHAPTERS.length - 1]
  const reached = next.number
  const points = STOPS.map(p => `${p.x},${p.y}`).join(' ')
  const flown = STOPS.slice(0, reached).map(p => `${p.x},${p.y}`).join(' ')
  return (
    <main className="mn-scene" data-scene="minimal-route" onClick={tap}>
      <Scenery kind="outpost" rover={false} base={base} framing={ROUTE_FRAMING} onReady={s => { scene.current = s }} />
      <div className="mn-sky-scrim" aria-hidden />
      <svg className="mn-route-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <polyline points={points} className="mn-route-ahead" vectorEffect="non-scaling-stroke" />
        <polyline points={flown} className="mn-route-flown" vectorEffect="non-scaling-stroke" />
      </svg>
      <ol className="mn-waypoints" aria-label="Chapters">
        {CHAPTERS.map((chapter, i) => {
          const state = done.has(chapter.number) ? 'done' : chapter.number === reached ? 'now' : 'locked'
          const node = state === 'now' ? 'map_node_selected' : state === 'done' ? 'map_node_available' : 'map_node_locked'
          return (
            <li key={chapter.number} className={`mn-waypoint mn-${state}`} style={{ left: `${STOPS[i].x}%`, top: `${STOPS[i].y}%` }}>
              <button
                className="mn-waypoint-hit"
                disabled={state === 'locked'}
                onClick={() => onOpen(chapter)}
                aria-label={`Chapter ${chapter.number}: ${chapter.name}${state === 'done' ? ', done' : ''}`}
              >
                <img src={`/game/assets/galaxy/${node}.png`} alt="" draggable={false} />
                <span className="mn-waypoint-num">{state === 'done' ? '✓' : chapter.number}</span>
              </button>
              <span className="mn-waypoint-name">{chapter.name}</span>
              {state === 'done' && chapter.number === 1 && onboardedInLandnam && <span className="mn-waypoint-tag">LANDNAM</span>}
            </li>
          )
        })}
      </ol>
      <header className="mn-scene-top">
        <span className="mn-chip mn-money" aria-label="Your francs">{francs(money)}</span>
      </header>
      <footer className="mn-scene-bottom">
        {picked && <PickedCard picked={picked} />}
        <button className="mn-cta" onClick={() => onOpen(next)}>
          {next.name.toUpperCase()}
        </button>
      </footer>
    </main>
  )
}
