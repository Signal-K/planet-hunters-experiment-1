// A chapter briefing as the destination itself: TakeOn's voxel world for that
// body (minimal deposit scene, KES-530) with the rover parked by a deposit of
// what the contract wants and a dashed route to it. One goal line, one button.
import MineralChip from '@landnam/components/game/MineralChip'
import { CHAPTERS, francs, type Chapter } from './chapters'
import { DepositScenery } from './scenes'

export function BriefingScene({ chapter, onBack }: { chapter: Chapter; onBack: () => void }) {
  const { mission, target } = chapter
  const minerals = Object.entries(mission?.requires.minerals ?? {})
  return (
    <main className="mn-scene mn-briefing-scene" data-scene="minimal-briefing">
      {target && <DepositScenery target={target} minerals={minerals.map(([id]) => id)} />}
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
