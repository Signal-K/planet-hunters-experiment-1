// A chapter briefing as the destination itself: TakeOn's world for that body
// (minimal deposit scene, KES-530) with the rover parked by ore of the kind the
// mission wants. The chapter's name, what it asks and pays, and one verb.
import MineralChip from '@landnam/components/game/MineralChip'
import { francs, mineralName, type Chapter } from './chapters'
import { Scenery } from './scenes'
import { rocketReaching, type Base } from './structures'
import type { Target } from '@landnam/lib/data/types'

const START_LABEL: Record<Chapter['verb'], string> = {
  mine: 'MINE',
  deliver: 'DELIVER',
  build: 'BUILD',
  deploy: 'LAUNCH',
  survey: 'SURVEY',
}

export function BriefingScene({ chapter, base, blocked, missing, target, onPick, onBack, onStart }: {
  chapter: Chapter
  base: Base
  /** The rocket this mission needs, when the base's rocket cannot reach it. */
  blocked?: string
  /** Materials a build still needs from the home stash. */
  missing: Record<string, number>
  /** The world this run goes to (the player's pick for a market run). */
  target?: Target
  onPick: (target: Target) => void
  onBack: () => void
  onStart: () => void
}) {
  const { mission } = chapter
  const minerals = Object.entries(mission?.requires.minerals ?? {})
  const short = Object.entries(missing)
  const reward = mission?.payout.francs ?? 0
  return (
    <main className="mn-scene mn-briefing-scene" data-scene="minimal-briefing" data-chapter={chapter.number}>
      {target && (chapter.verb === 'deploy'
        ? <Scenery kind="launch" />
        : <Scenery key={target.id} kind="deposit" target={target} minerals={minerals.length ? minerals.map(([id]) => id) : target.minerals} />)}
      <header className="mn-scene-top">
        <button className="mn-chip mn-back" onClick={onBack}>‹ BACK</button>
        {target && <span className="mn-chip mn-place">{target.name}</span>}
      </header>
      <footer className="mn-scene-bottom">
        <section className="mn-card">
          <p className="mn-title">{chapter.name}</p>
          {chapter.destinations && target && (
            <div className="mn-haul" aria-label={`Ore on ${target.name}`}>
              {target.minerals.slice(0, 4).map(id => <MineralChip key={id} mineral={id} />)}
            </div>
          )}
          {mission && (minerals.length > 0 || reward > 0) && (
            <div className="mn-haul" aria-label="What it asks and pays">
              {minerals.map(([id, n]) => <MineralChip key={id} mineral={id} count={n} />)}
              {reward > 0 && <span className="mn-chip mn-reward">{francs(reward)}</span>}
            </div>
          )}
          {chapter.destinations && chapter.destinations.length > 1 && (
            <div className="mn-destinations" role="radiogroup" aria-label="Where to mine">
              {chapter.destinations.map(t => {
                const far = t.orbit > base.rocket.maxOrbit
                return (
                  <button
                    key={t.id}
                    role="radio"
                    aria-checked={t.id === target?.id}
                    className="mn-chip mn-destination"
                    disabled={far}
                    onClick={() => onPick(t)}
                  >
                    {t.name.replace(/^\d+\s+/, '')}{far ? ` · ${rocketReaching(t.orbit) ?? 'later'}` : ''}
                  </button>
                )
              })}
            </div>
          )}
          <p className="mn-note-dim">{base.rocket.name} · hold {base.rocket.hold}</p>
          {blocked && <p className="mn-note">Too far for the {base.rocket.name}. The Launchpad's next level brings the {blocked}.</p>}
          {short.length > 0 && (
            <p className="mn-note">Store {short.map(([id, n]) => `${n} ${mineralName(id)}`).join(' and ')} first.</p>
          )}
        </section>
        <button className="mn-cta" disabled={!mission || !target || !!blocked || short.length > 0} onClick={onStart}>
          {START_LABEL[chapter.verb]}
        </button>
      </footer>
    </main>
  )
}
