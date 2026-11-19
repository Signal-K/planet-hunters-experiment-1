// The chapter route as an in-world scene: the home outpost in TakeOn (pad,
// habitat, solar, rover; KES-530) with the six chapters drawn as a flight route
// that climbs from the pad into the sky. Text is names only.
import { OutpostScenery } from './scenes'
import { useViewSize } from '@landnam/lib/hooks/useViewSize'
import { CHAPTERS, francs, type Chapter } from './chapters'

// Waypoints in screen percent, zig-zagging up the sky. Portrait has a tall sky;
// a landscape view keeps them in the band above the horizon.
const PORTRAIT_STOPS: Array<{ x: number; y: number }> = [
  { x: 30, y: 52 },
  { x: 70, y: 44 },
  { x: 28, y: 35 },
  { x: 72, y: 27 },
  { x: 32, y: 19 },
  { x: 68, y: 11 },
]

function stopsFor(w: number, h: number) {
  if (w <= h) return PORTRAIT_STOPS
  return PORTRAIT_STOPS.map((p, i) => ({ x: 14 + i * 14.4, y: 8 + (p.y - 11) * (30 / 41) }))
}

export function RouteScene({ reached, money, onboardedInLandnam, onOpen }: {
  reached: number
  money: number
  onboardedInLandnam: boolean
  onOpen: (chapter: Chapter) => void
}) {
  const view = useViewSize()
  const STOPS = stopsFor(view.w, view.h)
  const next = CHAPTERS[reached - 1]
  const points = STOPS.map(p => `${p.x},${p.y}`).join(' ')
  const flown = STOPS.slice(0, reached).map(p => `${p.x},${p.y}`).join(' ')
  return (
    <main className="mn-scene" data-scene="minimal-route">
      <OutpostScenery rover={false} />
      <div className="mn-sky-scrim" aria-hidden />
      <svg className="mn-route-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <polyline points={points} className="mn-route-ahead" vectorEffect="non-scaling-stroke" />
        <polyline points={flown} className="mn-route-flown" vectorEffect="non-scaling-stroke" />
      </svg>
      <ol className="mn-waypoints" aria-label="Chapters">
        {CHAPTERS.map((chapter, i) => {
          const state = chapter.number < reached ? 'done' : chapter.number === reached ? 'now' : 'locked'
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
        <button className="mn-cta" onClick={() => onOpen(next)}>
          <span className="mn-cta-kicker">CHAPTER {next.number} OF {CHAPTERS.length}</span>
          <span>{next.name.toUpperCase()}</span>
        </button>
      </footer>
    </main>
  )
}
