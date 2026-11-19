import { useState } from 'react'
import { currentPilot, SIGN_IN_URL } from './auth'
import { CHAPTERS, francs, mineralName, type Chapter } from './chapters'

type View = { kind: 'route' } | { kind: 'briefing'; chapter: Chapter }

// One screen, one primary button. No clock, chips, tabs or dock.
export function App() {
  const pilot = currentPilot()
  const [view, setView] = useState<View>({ kind: 'route' })
  const reached = 1 // chapter progress lands with the first playable slice

  if (!pilot) {
    return (
      <main className="screen center">
        <section className="panel">
          <p className="eyebrow">LANDNAM MINIMAL</p>
          <h1>Run a space agency, one step at a time.</h1>
          <p>Sign in to start. Your progress is shared with Landnam.</p>
          <a className="cta" href={SIGN_IN_URL}>SIGN IN TO PLAY</a>
        </section>
      </main>
    )
  }

  if (view.kind === 'briefing') return <Briefing chapter={view.chapter} onBack={() => setView({ kind: 'route' })} />

  const next = CHAPTERS[reached - 1]
  return (
    <main className="screen">
      <header className="route-head">
        <p className="eyebrow">LANDNAM MINIMAL</p>
        <h1>Chapter {next.number} of {CHAPTERS.length}</h1>
      </header>
      <ol className="route" aria-label="Chapters">
        {CHAPTERS.map(chapter => {
          const state = chapter.number < reached ? 'done' : chapter.number === reached ? 'now' : 'locked'
          return (
            <li key={chapter.number} className={`stop ${state}`}>
              <span className="dot" aria-hidden>{chapter.number}</span>
              <span className="stop-text">
                <strong>{chapter.name}</strong>
                <span>{state === 'locked' ? `Opens after chapter ${chapter.number - 1}` : chapter.goal}</span>
              </span>
            </li>
          )
        })}
      </ol>
      <footer className="dock">
        <button className="cta" onClick={() => setView({ kind: 'briefing', chapter: next })}>
          CHAPTER {next.number} · {next.name.toUpperCase()}
        </button>
      </footer>
    </main>
  )
}

function Briefing({ chapter, onBack }: { chapter: Chapter; onBack: () => void }) {
  const mission = chapter.mission
  const minerals = Object.entries(mission?.requires.minerals ?? {})
  return (
    <main className="screen">
      <button className="back" onClick={onBack}>‹ BACK</button>
      <section className="panel briefing">
        <p className="eyebrow">CHAPTER {chapter.number} OF {CHAPTERS.length}</p>
        <h1>{chapter.name}</h1>
        <p className="goal">{chapter.goal}</p>
        {mission && chapter.target && (
          <dl className="facts">
            <div><dt>WHERE</dt><dd>{chapter.target.name}</dd></div>
            <div><dt>BRING BACK</dt><dd>{minerals.map(([id, n]) => `${n} ${mineralName(id)}`).join(', ')}</dd></div>
            <div><dt>REWARD</dt><dd className="gold">{francs(mission.payout.francs)}</dd></div>
          </dl>
        )}
        <ul className="rules">
          <li>Steer with the arrows. Press FIRE over a glowing seam.</li>
          <li>A run takes about a minute. A miss costs nothing.</li>
        </ul>
      </section>
      <footer className="dock">
        <button className="cta" disabled title="The mining run is the next build step (SSL-864)">START · COMING NEXT</button>
      </footer>
    </main>
  )
}
