// A chapter briefing as the destination itself: TakeOn's world for that body
// (minimal deposit scene, KES-530) with the rover parked by ore of the kind the
// mission wants. The chapter's name, what it asks and pays, and one verb.
import MineralChip from '@landnam/components/game/MineralChip'
import { francs, mineralName, type Chapter } from './chapters'
import { Scenery } from './scenes'

const START_LABEL: Record<Chapter['verb'], string> = {
  mine: 'MINE',
  deliver: 'DELIVER',
  build: 'BUILD',
  deploy: 'LAUNCH',
  survey: 'SURVEY',
}

export function BriefingScene({ chapter, missing, onBack, onStart }: {
  chapter: Chapter
  /** Materials a build still needs from the home stash. */
  missing: Record<string, number>
  onBack: () => void
  onStart: () => void
}) {
  const { mission, target } = chapter
  const minerals = Object.entries(mission?.requires.minerals ?? {})
  const short = Object.entries(missing)
  const reward = mission?.payout.francs ?? 0
  return (
    <main className="mn-scene mn-briefing-scene" data-scene="minimal-briefing" data-chapter={chapter.number}>
      {target && (chapter.verb === 'deploy'
        ? <Scenery kind="launch" />
        : <Scenery kind="deposit" target={target} minerals={minerals.map(([id]) => id)} />)}
      <header className="mn-scene-top">
        <button className="mn-chip mn-back" onClick={onBack}>‹ BACK</button>
        {target && <span className="mn-chip mn-place">{target.name}</span>}
      </header>
      <footer className="mn-scene-bottom">
        <section className="mn-card">
          <p className="mn-title">{chapter.name}</p>
          {mission && (minerals.length > 0 || reward > 0) && (
            <div className="mn-haul" aria-label="What it asks and pays">
              {minerals.map(([id, n]) => <MineralChip key={id} mineral={id} count={n} />)}
              {reward > 0 && <span className="mn-chip mn-reward">{francs(reward)}</span>}
            </div>
          )}
          {short.length > 0 && (
            <p className="mn-note">Store {short.map(([id, n]) => `${n} ${mineralName(id)}`).join(' and ')} first.</p>
          )}
        </section>
        <button className="mn-cta" disabled={!mission || !target || short.length > 0} onClick={onStart}>
          {START_LABEL[chapter.verb]}
        </button>
      </footer>
    </main>
  )
}
