import { useState } from 'react'
import { currentPilot, SIGN_IN_URL } from './auth'
import type { Chapter } from './chapters'
import { RouteScene } from './RouteScene'
import { BriefingScene } from './BriefingScene'
import { WorldBackdrop } from '@landnam/components/game/hub/WorldBackdrop'
import { readSharedSave } from './sharedSave'

type View = { kind: 'route' } | { kind: 'briefing'; chapter: Chapter }

// Every screen is a scene with one primary button. No clock, tabs or dock.
export function App() {
  const pilot = currentPilot()
  const [view, setView] = useState<View>({ kind: 'route' })

  if (!pilot) {
    return (
      <main className="mn-scene" data-scene="minimal-sign-in">
        <WorldBackdrop />
        <section className="mn-card mn-sign-in">
          <p className="mn-eyebrow">LANDNAM MINIMAL</p>
          <h1>Run a space agency, one step at a time.</h1>
          <p>Sign in with your Landnam account. Your francs come with you.</p>
          <a className="mn-cta" href={SIGN_IN_URL}>SIGN IN TO PLAY</a>
        </section>
      </main>
    )
  }

  if (view.kind === 'briefing') return <BriefingScene chapter={view.chapter} onBack={() => setView({ kind: 'route' })} />

  // Shared with Landnam: francs, and whether its onboarding is done. Finishing it
  // there counts as chapter 1 (First light) here. Chapter progress itself is Minimal's.
  const save = readSharedSave(pilot.id)
  return (
    <RouteScene
      reached={save.onboardingDone ? 2 : 1}
      money={save.francs}
      onboardedInLandnam={save.onboardingDone}
      onOpen={chapter => setView({ kind: 'briefing', chapter })}
    />
  )
}
