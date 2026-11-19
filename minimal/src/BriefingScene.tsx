// A chapter briefing as a flight scene: the real destination (Landnam's painted
// body for that target), the rocket heading for it, and what to bring back as
// ore swatches. One short goal line, one button.
import MineralChip from '@landnam/components/game/MineralChip'
import { flightBodySpec } from '@landnam/lib/flight-body'
import { CHAPTERS, francs, type Chapter } from './chapters'

export function BriefingScene({ chapter, onBack }: { chapter: Chapter; onBack: () => void }) {
  const { mission, target } = chapter
  const minerals = Object.entries(mission?.requires.minerals ?? {})
  const body = target ? flightBodySpec({ id: target.id, name: target.name, type: target.type, archetype: target.archetype }, false) : null
  return (
    <main className="mn-scene mn-briefing-scene" data-scene="minimal-briefing">
      <div className="mn-space" aria-hidden style={{ background: `url(/game/assets/galaxy/galaxy_map_bg.png) center / cover no-repeat${body ? `, ${body.palette.skyCss}` : ''}` }} />
      {body && (
        <img
          className="mn-destination"
          src={body.kind === 'earth' ? '/game/assets/base/kit/earth-pixel.png' : '/game/assets/base/kit/asteroid-pixel.png'}
          alt=""
          data-body={body.kind}
          style={{ filter: `drop-shadow(0 0 28px ${body.palette.beamCss})` }}
          draggable={false}
        />
      )}
      <img className="mn-flying-rocket" src="/game/assets/base/kit/pad-rocket.png" alt="" draggable={false} />
      <header className="mn-scene-top">
        <button className="mn-chip mn-back" onClick={onBack}>‹ BACK</button>
        {target && <span className="mn-chip mn-place">{target.name}</span>}
      </header>
      <footer className="mn-scene-bottom">
        <section className="mn-card">
          <p className="mn-eyebrow">CHAPTER {chapter.number} OF {CHAPTERS.length} · {chapter.name.toUpperCase()}</p>
          <p className="mn-goal">{chapter.goal}</p>
          {mission && (
            <div className="mn-haul" aria-label="Bring back and reward">
              {minerals.map(([id, n]) => <MineralChip key={id} mineral={id} count={n} />)}
              <span className="mn-chip mn-reward">{francs(mission.payout.francs)}</span>
            </div>
          )}
        </section>
        <button className="mn-cta" disabled title="The mining run is the next build step (SSL-864)">
          <span className="mn-cta-kicker">MINING RUN</span>
          <span>COMING NEXT</span>
        </button>
      </footer>
    </main>
  )
}
