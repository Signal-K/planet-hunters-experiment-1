import { useState } from 'react'
import { PROGRAM, type Chapter } from './chapters'
import { SIGN_IN_URL, type Pilot } from './auth'

const dispatches: Record<number, string> = {
  101: 'Your agency has one rocket, one rover, and a blank lunar map. Survey three sites to guide the first miners. Each flight helps grow this base.',
  102: 'The survey crew marked ore on the Moon. Fill the rover’s hold and bring it home. The exchange will buy your first cargo.',
  103: 'Your first lunar cargo is banked. Take the survey rover to Mars and map three sites in the iron-rich plains.',
  104: 'The Mars map is back at the station. Now try a smaller body. Land on Eros and bring a hold of asteroid metal home.',
  105: 'Eros supplied the metals. This time the science team wants ice. Survey three sites on Ceres, the dwarf planet in the belt.',
  106: 'The Ceres survey is in the archive. Your next landing crosses Jupiter’s orbit to chart Europa’s ice shell.',
  4: 'Your crews have reached the outer system. Deploy the space telescope so the station can search for planets around other stars.',
}
const milestones = [
  { label: 'Moon', numbers: [101, 102], color: '#cfcebb' },
  { label: 'Mars', numbers: [103], color: '#df8b65' },
  { label: 'Belt', numbers: [104, 105], color: '#aa9b80' },
  { label: 'Europa', numbers: [106], color: '#9fbfc6' },
  { label: 'Deep sky', numbers: [4], color: '#c9aaf2' },
]
export function StoryRadio({
  chapter,
  pilot,
  done,
  onFly,
  onObserve,
}: {
  chapter?: Chapter
  pilot: Pilot | null
  done: Set<number>
  onFly: (chapter: Chapter) => void
  onObserve: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const first = chapter?.number === 101
  const stage = chapter ? PROGRAM.indexOf(chapter) : -1
  const label = first ? 'Your first expedition' : chapter?.name || 'A signal from another star'
  if (!expanded)
    return (
      <button className="story-resume" onClick={() => setExpanded(true)}>
        ▸ Story · {label}
      </button>
    )
  return (
    <aside className="story-radio" aria-label="Story mode">
      {chapter?.target?.id === 'moon' && (
        <img
          className="dispatch-patch"
          src={new URL('./art/flight-patch.png', import.meta.url).href}
          alt="Lunar expedition patch"
        />
      )}
      <header>
        <small>
          FLIGHT DIRECTOR · {stage >= 0 ? 'CHAPTER ' + (stage + 1) + ' / ' + PROGRAM.length : 'DEEP SKY'}
        </small>
        <button aria-label="Fold story briefing" onClick={() => setExpanded(false)}>
          ⌄
        </button>
      </header>
      <h1>{label}</h1>
      <p>
        {chapter
          ? dispatches[chapter.number] ||
            'The telescope has found a candidate. Fly a follow-up survey and bring the field measurements back to the station.'
          : 'Open the telescope at the control station. Look for a dip in a star’s light and select a discovery for your next flight.'}
      </p>
      <ol className="story-route" aria-label="Expedition route">
        {milestones.map((m) => (
          <li
            key={m.label}
            style={{ '--planet': m.color } as React.CSSProperties}
            aria-current={chapter && m.numbers.includes(chapter.number) ? 'step' : undefined}
          >
            <i>{m.numbers.every((n) => done.has(n)) ? '✓' : ''}</i>
            {m.label}
          </li>
        ))}
      </ol>
      {pilot ? (
        <button className="story-go" onClick={() => (chapter ? onFly(chapter) : onObserve())}>
          {chapter ? 'Launch · ' + chapter.target?.name : 'Use the telescope'} <b aria-hidden>↗</b>
        </button>
      ) : (
        <div className="story-gate">
          <a className="story-go" href={SIGN_IN_URL}>
            Sign in with Landnam ↗
          </a>
          {(import.meta.env.DEV || location.hostname === 'staging.playlandnam.space') && (
            <a href="?stage=1">Try practice story</a>
          )}
        </div>
      )}
    </aside>
  )
}
