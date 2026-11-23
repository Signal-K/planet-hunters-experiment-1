import { useEffect, useState } from 'react'
import { TARGETS } from '@landnam/lib/data/targets'
import { SKY_EVENTS, badgeTierFor } from '@landnam/lib/data/sky-events'
import { getShower, SHOWERS } from '@landnam/lib/data/showers'
import { showerSpecials, specialMissions } from '@landnam/lib/orionids/special-missions'
import { fetchSite, fetchCommunityResearch, fetchBallots, castVote } from '@landnam/lib/community/client'
import type { Ballot } from '@landnam/lib/community/ballots'
import { type SiteView } from '@landnam/lib/community/site'
import { stampsInMonth, communityBar, type CommunityResearch } from '@landnam/lib/research/stamps'
import { tessCandidateToExoplanetTarget } from '@landnam/lib/data/tess-candidates'
import { STAGE_TESS_FEED } from '@landnam/lib/stage-feed'
import { CHAPTERS, PROGRAM, debrisFlight, discoveryFlight, eventFlight, francs, type Chapter } from './chapters'
import { counterText, type Base, type StructureState, type StructureId } from './structures'
import { researchPlayer } from './research'
import { StoryRadio } from './StoryRadio'
import { World } from './World'
import { SIGN_IN_URL, type Pilot } from './auth'

const instruments = [
  ['Community research', 'Monthly research, ballots and the community site', 'community-research'],
  ['Exoplanet Hunters', 'Inspect a TESS light curve for a planetary transit', 'tess-discovery'],
  ['Asteroid discovery', 'Review moving objects in telescope images', 'asteroid-discovery'],
  ['Saturn storm search', 'Identify storms in the gas giant’s atmosphere', 'saturn-storm-search'],
  ['Radio meteor receiver', 'Mark meteor echoes in BRAMS spectrograms', 'radio-meteors'],
]
type Station = 'routes' | 'research' | 'sky'
export function BaseField({
  base,
  pilot,
  done,
  money,
  fresh,
  open,
  structure,
  connected,
  notice,
}: {
  base: Base
  pilot: Pilot | null
  done: Set<number>
  money: number
  fresh: ReadonlySet<StructureId>
  open: (c: Chapter, direct?: boolean) => void
  structure: (s: StructureState) => void
  notice?: string | null
  connected: boolean
}) {
  const [station, select] = useState<Station | null>(null)
  const [index, choose] = useState(0)
  const [facility, setFacility] = useState<StructureState | null>(null)
  const [instrument, setInstrument] = useState<string[] | null>(null)
  const [site, setSite] = useState<SiteView | null>(null)
  const [monthly, setMonthly] = useState<CommunityResearch | null>(null)
  const [attempt, retry] = useState(0)
  const [ballots, setBallots] = useState<Ballot[]>([])
  const [voteStatus, setVoteStatus] = useState('')
  const [network, setNetwork] = useState('Connecting to shared research…')
  const [now, tick] = useState(Date.now)
  useEffect(() => {
    const id = window.setInterval(() => tick(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])
  const player = pilot && researchPlayer(pilot.id)
  const flown = new Set(player?.completedMissions?.map((m) => m.id) || [])
  const worlds = Object.values(player?.discoveredExoplanetTargets ?? {})
  if (pilot?.id === 'stage' && done.has(4) && !worlds.length && STAGE_TESS_FEED[0])
    worlds.push(tessCandidateToExoplanetTarget(STAGE_TESS_FEED[0]))
  const discoveries = worlds.map(discoveryFlight).filter((c) => c.mission)
  const next = PROGRAM.find((c) => !done.has(c.number))
  const candidate = next || discoveries.find((c) => c.mission && !flown.has(c.mission.id))
  const date = new Date(now)
  const bar = communityBar(
    stampsInMonth(player?.researchStamps, date.getUTCFullYear(), date.getUTCMonth()),
    monthly,
  )
  useEffect(() => {
    if (!connected || !pilot || pilot.id === 'stage') return
    let live = true
    void fetchBallots()
      .then((result) => {
        if (live) setBallots(result.ballots.filter((b) => b.phase === 'open'))
      })
      .catch(() => {})
    Promise.all([fetchSite(), fetchCommunityResearch()])
      .then(([result, total]) => {
        if (live) {
          setSite(result.site)
          setMonthly(total)
          setNetwork('')
        }
      })
      .catch(() => {
        if (live) setNetwork('Shared research is offline.')
      })
    return () => {
      live = false
    }
  }, [connected, pilot?.id, attempt, station, instrument])
  function visit(place: Station, initial = 0, building: StructureState | null = null) {
    setFacility(building)
    choose(initial)
    select(place)
  }
  const launch = (chapter: Chapter) => open(chapter, true)
  const desk = (item: string[]) => (pilot ? setInstrument(item) : location.assign(SIGN_IN_URL))
  const routes = [
    ...PROGRAM,
    ...discoveries,
    ...CHAPTERS.filter((c) => base.chapters.has(c.number) && c.mission && c.target && !PROGRAM.includes(c)),
  ]
  const events = [...SKY_EVENTS].sort(
    (a, b) =>
      Number(badgeTierFor(b.id, now) === 'gold') - Number(badgeTierFor(a.id, now) === 'gold') ||
      b.startUtc.localeCompare(a.startUtc),
  )
  const specials = SHOWERS.flatMap((s) => showerSpecials(s.id, player || {}, flown))
  const special = specials[index - events.length]
  const event = events[index]
  const route = routes[index]
  const item = instruments[index]
  const grade = event && badgeTierFor(event.id, now)
  const shower = event && getShower(event.id)
  const routeLocked = route && PROGRAM.includes(route) && route !== next && !done.has(route.number)
  const count =
    station === 'sky' ? events.length + specials.length : station === 'routes' ? routes.length : instruments.length
  const inspect = (s: StructureState) => {
    if (s.def.id === 'launchpad' && candidate) launch(candidate)
    else if (s.def.id === 'launchpad') visit('research', 1, s)
    else if (s.def.id === 'control-station') visit('research', 0, s)
    else if (s.def.id === 'exchange')
      visit(
        'routes',
        Math.max(
          0,
          routes.findIndex((c) => c === CHAPTERS[0]),
        ),
        s,
      )
    else visit('routes', Math.max(0, routes.indexOf(next!)), s)
  }
  let instrumentUrl = ''
  if (instrument) {
    const screen = instrument[2]
    if (pilot?.id !== 'stage') instrumentUrl = '/game/' + screen
    else if (screen === 'radio-meteors') {
      // The generic sandbox freezes its clock in March, before the shower receivers open.
      const at = station === 'sky' && event ? Date.parse(event.startUtc) + 86400000 : now
      instrumentUrl =
        '/game/stage?' + new URLSearchParams({ preset: 'ui-radio-meteors', at: new Date(at).toISOString() })
    } else instrumentUrl = '/game/stage?preset=sandbox:ui-' + screen
  }
  const specialMission = special && specialMissions(TARGETS, player || {}, flown).find((m) => m.id === special.id)
  const close = () => {
    select(null)
    setInstrument(null)
  }
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') instrument ? setInstrument(null) : select(null)
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [instrument])
  return (
    <section className="base-field">
      <World
        base={base}
        pilotId={pilot?.id}
        inspect={inspect}
        notice={notice}
        readout={pilot ? pilot.name + ' · ' + francs(money) : 'Visitor'}
        objective={candidate ? 'Launch · ' + candidate.target?.name : 'Launchpad'}
        navigation={
          <>
            <button aria-pressed={!station} onClick={close}>
              <img
                className="instrument-icon"
                alt=""
                src={new URL('./art/flight-patch.png', import.meta.url).href}
              />{' '}
              Story
            </button>
            <button
              aria-pressed={station === 'routes'}
              onClick={() =>
                visit(
                  'routes',
                  Math.max(0, routes.indexOf(candidate!)),
                  base.structures.find((s) => s.def.id === 'hangar'),
                )
              }
            >
              <img className="instrument-icon" alt="" src="/game/assets/base/kit/space-rocket.png" /> Navigation
            </button>
            <button
              aria-pressed={station === 'research'}
              onClick={() =>
                visit(
                  'research',
                  0,
                  base.structures.find((s) => s.def.id === 'control-station'),
                )
              }
            >
              <img className="instrument-icon" alt="" src="/game/assets/base/v7/structures/control-station.png" />{' '}
              Research
            </button>
            <button aria-pressed={station === 'sky'} onClick={() => visit('sky')}>
              <img className="instrument-icon" alt="" src="/game/assets/events/orionids/fx/streak-01.png" />{' '}
              Signals{' '}
              {events[0] && badgeTierFor(events[0].id, now) === 'gold' ? (
                <i className="live-lamp" aria-label="Active event" />
              ) : null}
            </button>
          </>
        }
        onPlace={() => select(null)}
      >
        {!station && (
          <StoryRadio
            chapter={candidate}
            pilot={pilot}
            done={done}
            onFly={launch}
            onObserve={() => desk(instruments[1])}
          />
        )}
        {station && (
          <section
            className="field-instrument"
            role="region"
            aria-label={
              station === 'routes' ? 'Navigation chart' : station === 'sky' ? 'Sky receiver' : 'Control station'
            }
          >
            <button className="sheet-close" onClick={close} aria-label="Close instrument">
              ×
            </button>
            <small>
              {station === 'routes' ? 'NAVIGATION CHART' : station === 'sky' ? 'SKY RECEIVER' : 'RESEARCH STATION'}{' '}
              · {index + 1} / {count}
            </small>
            {station === 'routes' && (
              <div className="orbit-chart" aria-label="Select a flight">
                {routes.map((c, i) => (
                  <button
                    key={c.number + ':' + c.target?.id}
                    className={i === index ? 'selected' : ''}
                    style={
                      {
                        '--tone': ['#d6d4c3', '#c0bca6', '#c36846', '#978976', '#b4ab93', '#aabec4'][i % 6],
                      } as React.CSSProperties
                    }
                    onClick={() => choose(i)}
                    aria-label={c.name}
                  />
                ))}
              </div>
            )}
            <div className="tuner">
              <button aria-label="Previous" onClick={() => choose((index + count - 1) % count)}>
                ‹
              </button>
              <div>
                <h2>
                  {station === 'routes'
                    ? route.name
                    : station === 'research'
                      ? item[0]
                      : event?.name || special?.title}
                </h2>
                <p>
                  {station === 'routes'
                    ? route.target?.name
                    : station === 'research'
                      ? item[1]
                      : event
                        ? grade === 'gold'
                          ? 'Live observing window'
                          : grade === 'silver'
                            ? 'Archived window'
                            : 'Opens ' + event.startUtc.slice(0, 10)
                        : special?.needs}
                </p>
              </div>
              <button aria-label="Next" onClick={() => choose((index + 1) % count)}>
                ›
              </button>
            </div>
            {station === 'routes' && (
              <button className="engage" disabled={routeLocked} onClick={() => launch(route)}>
                {routeLocked ? 'Complete ' + PROGRAM[PROGRAM.indexOf(route) - 1]?.name : 'Launch flight'}
              </button>
            )}
            {station === 'research' && (
              <>
                {index === 0 && (
                  <p>
                    {monthly
                      ? bar.total + ' / ' + bar.goal + ' research stamps'
                      : pilot?.id === 'stage'
                        ? 'Shared totals are available on your Landnam account.'
                        : network}{' '}
                    {site?.name} {site?.stage}
                  </p>
                )}
                {index === 0 ? (
                  <>
                    {site && <progress aria-label="Community site construction" value={site.fill} max={1} />}
                    {ballots.map((ballot) => (
                      <label key={ballot.key}>
                        {ballot.title}{' '}
                        <select
                          aria-label={ballot.title}
                          defaultValue={ballot.myVote || ''}
                          onChange={async (e) => {
                            const option = e.target.value
                            if (!option) return
                            try {
                              const result = await castVote(ballot.key, option)
                              setVoteStatus(result.kind === 'saved' ? 'Vote recorded' : 'Vote queued')
                            } catch {
                              setVoteStatus('Vote could not be saved')
                            }
                          }}
                        >
                          <option value="">Choose a project</option>
                          {ballot.options.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                    {voteStatus && <p role="status">{voteStatus}</p>}
                    <button className="engage" onClick={() => desk(instruments[1])}>
                      Observe with the telescope
                    </button>
                  </>
                ) : (
                  <button className="engage" onClick={() => desk(item)}>
                    Use instrument
                  </button>
                )}
                {index === 0 && connected && network.includes('offline') && (
                  <button onClick={() => retry((n) => n + 1)}>Reconnect</button>
                )}
              </>
            )}
            {station === 'sky' &&
              (event ? (
                <>
                  <button
                    className="engage"
                    disabled={!grade}
                    onClick={() => {
                      const c = shower ? eventFlight(shower) : debrisFlight(event)
                      if (c) launch(c)
                      else if (event.activities.includes('launch')) launch(PROGRAM[6])
                      else desk(instruments[event.activities.includes('saturn-classification') ? 3 : 2])
                    }}
                  >
                    {grade ? 'Begin observation' : 'Scheduled'}
                  </button>
                  {shower && grade && <button onClick={() => desk(instruments[4])}>Tune radio receiver</button>}
                </>
              ) : (
                <button
                  className="engage"
                  disabled={!specialMission || done.has(500 + index - events.length)}
                  onClick={() =>
                    specialMission &&
                    launch({
                      number: 500 + index - events.length,
                      type: 'client-contract',
                      verb: 'mine',
                      name: specialMission.title,
                      teaches: 'Special mission',
                      goal: specialMission.brief,
                      mission: specialMission,
                      target: TARGETS.find((t) => t.id === specialMission.targetId),
                    })
                  }
                >
                  {specialMission ? 'Fly special mission' : special?.state}
                </button>
              ))}
            {facility && (
              <button className="facility-level" onClick={() => structure(facility)}>
                {fresh.has(facility.def.id) ? 'Upgraded · ' : ''}
                {facility.def.name} · Lv {facility.level} · {counterText(facility)}
              </button>
            )}
          </section>
        )}
      </World>
      {instrument && (
        <div className="op-desk" role="dialog" aria-label={instrument[0]}>
          <header>
            <strong>{instrument[0]}</strong>
            <button onClick={() => setInstrument(null)}>Return to station</button>
          </header>
          <iframe title={instrument[0]} src={instrumentUrl} />
        </div>
      )}
    </section>
  )
}
