import { lazy, Suspense, useState } from 'react'
import { currentPilot, SIGN_IN_URL } from './auth'
import { CHAPTERS, type Chapter } from './chapters'
import { RouteScene } from './RouteScene'
import { BriefingScene } from './BriefingScene'
import { Scenery } from './scenes'
import { readSharedSave } from './sharedSave'
import { applyResult, missingMaterials, readProgress, writeProgress } from './progress'

// A run pulls in Landnam's mining scene (Pixi): load it when START is pressed.
const RunScene = lazy(() => import('./RunScene').then(m => ({ default: m.RunScene })))

type View = { kind: 'route' } | { kind: 'briefing'; chapter: Chapter } | { kind: 'run'; chapter: Chapter }

/** Dev only: `?chapter=N` opens that briefing, `&run=1` starts it (storyboard captures). */
function devView(): View {
  if (!import.meta.env.DEV) return { kind: 'route' }
  const q = new URLSearchParams(location.search)
  const chapter = CHAPTERS.find(c => c.number === Number(q.get('chapter')))
  if (!chapter) return { kind: 'route' }
  return q.get('run') ? { kind: 'run', chapter } : { kind: 'briefing', chapter }
}

// Every screen is a scene with one primary button. No clock, tabs or dock.
export function App() {
  const pilot = currentPilot()
  const [view, setView] = useState<View>(devView)
  const [progress, setProgress] = useState(() => (pilot ? readProgress(pilot.id) : null))

  if (!pilot || !progress) {
    return (
      <main className="mn-scene" data-scene="minimal-sign-in">
        <Scenery kind="launch" />
        <section className="mn-card mn-sign-in">
          <p className="mn-eyebrow">LANDNAM MINIMAL</p>
          <h1>Run a space agency, one step at a time.</h1>
          <p>Sign in with your Landnam account. Your francs come with you.</p>
          <a className="mn-cta" href={SIGN_IN_URL}>SIGN IN TO PLAY</a>
        </section>
      </main>
    )
  }

  if (view.kind === 'run') {
    return (
      <Suspense fallback={<main className="mn-scene"><div className="mn-sky" aria-hidden /></main>}>
      <RunScene
        chapter={view.chapter}
        onQuit={() => setView({ kind: 'briefing', chapter: view.chapter })}
        onFinish={result => {
          const next = applyResult(progress, view.chapter, result)
          writeProgress(pilot.id, next)
          setProgress(next)
          setView({ kind: 'route' })
        }}
      />
      </Suspense>
    )
  }

  if (view.kind === 'briefing') {
    return (
      <BriefingScene
        chapter={view.chapter}
        missing={missingMaterials(view.chapter, progress.stash)}
        onBack={() => setView({ kind: 'route' })}
        onStart={() => setView({ kind: 'run', chapter: view.chapter })}
      />
    )
  }

  // Shared with Landnam: francs, and whether its onboarding is done. Finishing it
  // there counts as chapter 1 (First light) here. Chapter progress itself is Minimal's.
  const save = readSharedSave(pilot.id)
  const done = new Set(progress.done)
  if (save.onboardingDone) done.add(1)
  return (
    <RouteScene
      done={done}
      money={save.francs + progress.earned}
      onboardedInLandnam={save.onboardingDone}
      onOpen={chapter => setView({ kind: 'briefing', chapter })}
    />
  )
}
