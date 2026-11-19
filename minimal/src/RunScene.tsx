// A run, from START to home: one scene per step, one button per scene. The
// steps follow the chapter's verb (chapters.ts). Mining is Landnam's own laser
// scene (MiningScreen), so the mechanics are Landnam's exactly; every other
// step stands on a TakeOn minimal scene.
import { useRef, useState } from 'react'
import type { MinimalSceneHandle } from '@takeon/engine'
import MiningScreen from '@landnam/components/game/screens/MiningScreen'
import MineralChip from '@landnam/components/game/MineralChip'
import { MINERAL_META } from '@landnam/lib/data/minerals'
import { CHAPTERS, francs, type Chapter, type Verb } from './chapters'
import { resultFor, type RunResult } from './progress'
import { Scenery } from './scenes'

type Step = 'launch' | 'mine' | 'deliver' | 'build' | 'deploy' | 'survey' | 'home'

const STEPS: Record<Verb, Step[]> = {
  mine: ['launch', 'mine', 'home'],
  deliver: ['launch', 'mine', 'deliver', 'home'],
  build: ['launch', 'build', 'home'],
  deploy: ['launch', 'deploy', 'home'],
  survey: ['launch', 'survey', 'home'],
}

/** How long the rocket climbs before the next scene (drawLaunch fades at 3 s). */
const LIFTOFF_MS = 2300
const BUILD_MS = 2400

export function RunScene({ chapter, onFinish, onQuit }: {
  chapter: Chapter
  /** The run is over: bank this result and go back to the route. */
  onFinish: (result: RunResult) => void
  /** Left before the end: nothing is banked. */
  onQuit: () => void
}) {
  const steps = STEPS[chapter.verb]
  const [index, setIndex] = useState(0)
  const [cargo, setCargo] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [scanned, setScanned] = useState(false)
  const scene = useRef<MinimalSceneHandle | null>(null)
  const step = steps[index]
  const next = () => {
    setBusy(false)
    setIndex(i => Math.min(i + 1, steps.length - 1))
  }
  const { mission, target } = chapter
  const header = (
    <header className="mn-scene-top">
      <button className="mn-chip mn-back" onClick={onQuit}>‹ LEAVE</button>
      <span className="mn-chip mn-place">{step === 'deliver' ? chapter.deliveryTarget?.name : step === 'launch' || step === 'home' ? 'Home' : target?.name}</span>
    </header>
  )
  const kicker = `CHAPTER ${chapter.number} OF ${CHAPTERS.length} · STEP ${index + 1} OF ${steps.length}`

  if (step === 'mine' && mission && target) {
    // Landnam's mining scene, whole: fly, fire, fill the order, head out.
    return (
      <div className="mn-mining" data-scene="minimal-mine">
        <MiningScreen
          mission={mission}
          target={target}
          minerals={MINERAL_META}
          deliveryTargetName={chapter.verb === 'deliver' ? chapter.deliveryTarget?.name : undefined}
          onComplete={haul => {
            setCargo(haul)
            next()
          }}
          onBack={() => onQuit()}
          onAbandon={onQuit}
        />
      </div>
    )
  }

  if (step === 'launch') {
    return (
      <main className="mn-scene" data-scene="minimal-launch">
        <Scenery kind="launch" autoLaunch={false} onReady={s => (scene.current = s)} />
        {header}
        <footer className="mn-scene-bottom">
          <section className="mn-card">
            <p className="mn-eyebrow">{kicker}</p>
            <p className="mn-goal">{chapter.verb === 'deploy' ? `${mission?.payload?.name ?? 'Payload'} is on the pad.` : chapter.verb === 'build' ? 'Materials are loaded.' : `Rocket fuelled for ${target?.name}.`}</p>
          </section>
          <button
            className="mn-cta"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              scene.current?.launch()
              window.setTimeout(next, LIFTOFF_MS)
            }}
          >
            <span className="mn-cta-kicker">{busy ? 'LIFTOFF' : 'READY'}</span>
            <span>LAUNCH</span>
          </button>
        </footer>
      </main>
    )
  }

  if (step === 'deliver') {
    return (
      <main className="mn-scene" data-scene="minimal-deliver">
        <Scenery kind="outpost" target={chapter.deliveryTarget} />
        {header}
        <footer className="mn-scene-bottom">
          <section className="mn-card">
            <p className="mn-eyebrow">{kicker}</p>
            <p className="mn-goal">Drop the order at {chapter.deliveryTarget?.name}'s outpost.</p>
            <Haul minerals={cargo} />
          </section>
          <button className="mn-cta" onClick={next}>
            <span className="mn-cta-kicker">SECOND STOP</span>
            <span>DELIVER</span>
          </button>
        </footer>
      </main>
    )
  }

  if (step === 'build') {
    const build = () => {
      const handle = scene.current
      setBusy(true)
      // The structure rises where the outpost's rig stood: a frame filling in.
      const site = handle?.props.find(p => p.type === 'drill-rig')
      const started = performance.now()
      const raise = () => {
        const progress = Math.min(1, (performance.now() - started) / BUILD_MS)
        if (handle && site) handle.game.showProps(handle.props.map(p => (p === site ? { ...p, type: progress < 1 ? 'habitat-frame' : 'habitat', progress } : p)))
        if (progress < 1) requestAnimationFrame(raise)
        else window.setTimeout(next, 500)
      }
      raise()
    }
    return (
      <main className="mn-scene" data-scene="minimal-build">
        <Scenery kind="outpost" target={target} rover onReady={s => (scene.current = s)} />
        {header}
        <footer className="mn-scene-bottom">
          <section className="mn-card">
            <p className="mn-eyebrow">{kicker}</p>
            <p className="mn-goal">{mission?.title ?? 'Build'} on {target?.name}.</p>
            <Haul minerals={mission?.requires.minerals ?? {}} />
          </section>
          <button className="mn-cta" disabled={busy} onClick={build}>
            <span className="mn-cta-kicker">{busy ? 'RAISING' : 'ON SITE'}</span>
            <span>BUILD</span>
          </button>
        </footer>
      </main>
    )
  }

  if (step === 'deploy') {
    return (
      <main className="mn-scene" data-scene="minimal-deploy">
        <Scenery kind="launch" autoLaunch />
        {header}
        <footer className="mn-scene-bottom">
          <section className="mn-card">
            <p className="mn-eyebrow">{kicker}</p>
            <p className="mn-goal">In orbit{target ? ` at ${target.name}` : ''}. Release the {mission?.payload?.name?.toLowerCase() ?? 'payload'}.</p>
          </section>
          <button className="mn-cta" onClick={next}>
            <span className="mn-cta-kicker">IN ORBIT</span>
            <span>DEPLOY</span>
          </button>
        </footer>
      </main>
    )
  }

  if (step === 'survey') {
    return (
      <main className="mn-scene" data-scene="minimal-survey">
        <Scenery kind="deposit" target={target} minerals={target?.minerals} />
        {header}
        <footer className="mn-scene-bottom">
          <section className="mn-card">
            <p className="mn-eyebrow">{kicker}</p>
            <p className="mn-goal">{scanned ? `${target?.name} holds:` : `Landed on ${target?.name}. Scan the ground.`}</p>
            {scanned && <Haul minerals={Object.fromEntries((target?.minerals ?? []).slice(0, 4).map(id => [id, 0]))} />}
          </section>
          <button className="mn-cta" onClick={() => (scanned ? next() : setScanned(true))}>
            <span className="mn-cta-kicker">{scanned ? 'READINGS IN' : 'SURVEY'}</span>
            <span>{scanned ? 'HEAD HOME' : 'SCAN'}</span>
          </button>
        </footer>
      </main>
    )
  }

  // Home: what this run changed, then back to the route.
  const result = resultFor(chapter, cargo)
  return (
    <main className="mn-scene" data-scene="minimal-home">
      <Scenery kind="outpost" />
      <header className="mn-scene-top">
        <span className="mn-chip mn-place">Home</span>
        {result.francs > 0 && <span className="mn-chip mn-money">+{francs(result.francs)}</span>}
      </header>
      <footer className="mn-scene-bottom">
        <section className="mn-card">
          <p className="mn-eyebrow">CHAPTER {chapter.number} DONE · {chapter.name.toUpperCase()}</p>
          <p className="mn-goal">{result.outcome}</p>
          {Object.keys(result.stored).length > 0 && <Haul minerals={result.stored} />}
          {result.francs > 0 && <div className="mn-haul"><span className="mn-chip mn-reward">+{francs(result.francs)}</span></div>}
        </section>
        <button className="mn-cta" onClick={() => onFinish(result)}>
          <span className="mn-cta-kicker">NEXT CHAPTER</span>
          <span>CONTINUE</span>
        </button>
      </footer>
    </main>
  )
}

function Haul({ minerals }: { minerals: Record<string, number> }) {
  const rows = Object.entries(minerals)
  if (rows.length === 0) return null
  return (
    <div className="mn-haul">
      {rows.map(([id, n]) => <MineralChip key={id} mineral={id} count={n || undefined} />)}
    </div>
  )
}
