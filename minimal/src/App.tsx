import { lazy, Suspense, useMemo, useState } from 'react'
import { currentPilot, SIGN_IN_URL } from './auth'
import { CHAPTERS, type Chapter } from './chapters'
import { BaseScene, outOfReach } from './BaseScene'
import { BriefingScene } from './BriefingScene'
import { Scenery } from './scenes'
import { readSharedSave } from './sharedSave'
import { applyResult, missingMaterials, readProgress, writeProgress, type MinimalProgress } from './progress'
import { base as baseFor, levelUps, type RunCounts, type StructureId } from './structures'
import type { Target } from '@landnam/lib/data/types'

// A run pulls in Landnam's mining scene (Pixi): load it when START is pressed.
const RunScene = lazy(() => import('./RunScene').then(m => ({ default: m.RunScene })))

type View = { kind: 'base' } | { kind: 'briefing'; chapter: Chapter } | { kind: 'run'; chapter: Chapter }

/** Dev only: `?chapter=N` opens that briefing, `&run=1` starts it (storyboard captures). */
function devView(): View {
  if (!import.meta.env.DEV) return { kind: 'base' }
  const q = new URLSearchParams(location.search)
  const chapter = CHAPTERS.find(c => c.number === Number(q.get('chapter')))
  if (!chapter) return { kind: 'base' }
  return q.get('run') ? { kind: 'run', chapter } : { kind: 'briefing', chapter }
}

/** Dev only: `?runs=client-contract:2,satellite:1` plays as a pilot with those runs flown. */
function devRuns(progress: MinimalProgress): MinimalProgress {
  if (!import.meta.env.DEV) return progress
  const q = new URLSearchParams(location.search).get('runs')
  if (!q) return progress
  const runs: RunCounts = {}
  for (const pair of q.split(',')) {
    const [type, n] = pair.split(':')
    runs[type as keyof RunCounts] = Number(n) || 1
  }
  const done = CHAPTERS.filter(c => runs[c.type]).map(c => c.number)
  return { ...progress, runs, done }
}

// Every screen is a scene with one primary button. No clock, tabs or dock.
export function App() {
  const pilot = currentPilot()
  const [view, setView] = useState<View>(devView)
  const [progress, setProgress] = useState(() => (pilot ? devRuns(readProgress(pilot.id)) : null))
  const [picked, setPicked] = useState<Target | undefined>()
  const [fresh, setFresh] = useState<ReadonlySet<StructureId>>(new Set())

  // Shared with Landnam: francs, and whether its onboarding is done. Finishing it
  // there counts as one client contract here (chapter 1, First light).
  const save = pilot ? readSharedSave(pilot.id) : null
  const runs = useMemo<RunCounts>(() => {
    if (!progress) return {}
    if (!save?.onboardingDone || progress.done.includes(1)) return progress.runs
    return { ...progress.runs, 'client-contract': (progress.runs['client-contract'] ?? 0) + 1 }
  }, [progress, save?.onboardingDone])
  const base = useMemo(() => baseFor(runs), [runs])

  if (!pilot || !progress || !save) {
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

  // A market run goes to the world the player picked, if the rocket reaches it; otherwise the nearest.
  const withTarget = (chapter: Chapter): Chapter => {
    if (!chapter.destinations?.length) return chapter
    const inRange = chapter.destinations.filter(t => t.orbit <= base.rocket.maxOrbit)
    const target = inRange.find(t => t.id === picked?.id) ?? inRange[0] ?? chapter.target
    return { ...chapter, target }
  }

  if (view.kind === 'run') {
    const chapter = withTarget(view.chapter)
    const after = { ...runs, [chapter.type]: (runs[chapter.type] ?? 0) + 1 }
    const upgrades = levelUps(runs, after)
    return (
      <Suspense fallback={<main className="mn-scene"><div className="mn-sky" aria-hidden /></main>}>
      <RunScene
        chapter={chapter}
        base={base}
        upgrades={upgrades}
        onQuit={() => setView({ kind: 'briefing', chapter: view.chapter })}
        onFinish={result => {
          const next = applyResult(progress, chapter, result)
          writeProgress(pilot.id, next)
          setProgress(next)
          setFresh(new Set(upgrades.map(u => u.def.id)))
          setView({ kind: 'base' })
        }}
      />
      </Suspense>
    )
  }

  if (view.kind === 'briefing') {
    const chapter = withTarget(view.chapter)
    return (
      <BriefingScene
        chapter={chapter}
        base={base}
        blocked={outOfReach(chapter, base)}
        target={chapter.target}
        onPick={setPicked}
        missing={missingMaterials(chapter, progress.stash)}
        onBack={() => setView({ kind: 'base' })}
        onStart={() => setView({ kind: 'run', chapter })}
      />
    )
  }

  const done = new Set(progress.done)
  if (save.onboardingDone) done.add(1)
  return (
    <BaseScene
      base={base}
      done={done}
      money={save.francs + progress.earned}
      fresh={fresh}
      onOpen={chapter => { setFresh(new Set()); setView({ kind: 'briefing', chapter }) }}
    />
  )
}
