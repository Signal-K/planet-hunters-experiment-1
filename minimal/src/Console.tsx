import { useEffect, useState } from 'react'
import { TARGETS } from '@landnam/lib/data/targets'
import { SKY_EVENTS, badgeTierFor } from '@landnam/lib/data/sky-events'
import { getShower, SHOWERS } from '@landnam/lib/data/showers'
import { showerSpecials, specialMissions } from '@landnam/lib/orionids/special-missions'
import { fetchSite, fetchCommunityResearch } from '@landnam/lib/community/client'
import { SITE_RULES, type SiteView } from '@landnam/lib/community/site'
import { stampsInMonth, communityBar, type CommunityResearch } from '@landnam/lib/research/stamps'
import { eventPanel } from '@landnam/lib/research/event-week'
import { tessCandidateToExoplanetTarget } from '@landnam/lib/data/tess-candidates'
import { STAGE_TESS_FEED } from '@landnam/lib/stage-feed'
import { CHAPTERS, PROGRAM, debrisFlight, discoveryFlight, eventFlight, francs, type Chapter } from './chapters'
import { counterText, type Base, type StructureState, type StructureId } from './structures'
import { researchPlayer } from './research'
import { World } from './World'
import { SIGN_IN_URL, type Pilot } from './auth'

const instruments = [
  ['Community research', 'Monthly research, ballots and the community site', 'community-research'],
  ['Exoplanet Hunters', 'Inspect a TESS light curve for a planetary transit', 'tess-discovery'],
  ['Asteroid discovery', 'Review moving objects in telescope images', 'asteroid-discovery'],
  ['Saturn storm search', 'Identify storms in the gas giant’s atmosphere', 'saturn-storm-search'],
  ['Radio meteor receiver', 'Mark meteor echoes in BRAMS spectrograms', 'radio-meteors'],
]
const tabs = ['Overview', 'Flight plan', 'Research', 'Events'] as const
type Tab = (typeof tabs)[number]
const glyphs = ['⌂', '⌖', '⌁', '✧']
export function Console({
  base,
  pilot,
  done,
  money,
  fresh,
  open,
  structure,
  connected,
}: {
  base: Base
  pilot: Pilot | null
  done: Set<number>
  money: number
  fresh: ReadonlySet<StructureId>
  open: (c: Chapter) => void
  structure: (s: StructureState) => void
  connected: boolean
}) {
  const [tab, select] = useState<Tab>('Overview')
  const [instrument, setInstrument] = useState<string[] | null>(null)
  const [site, setSite] = useState<SiteView | null>(null)
  const [monthly, setMonthly] = useState<CommunityResearch | null>(null)
  const [attempt, retry] = useState(0)
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
  const candidate = next || discoveries[0]
  const date = new Date(now)
  const bar = communityBar(
    stampsInMonth(player?.researchStamps, date.getUTCFullYear(), date.getUTCMonth()),
    monthly,
  )
  useEffect(() => {
    if (!connected || !pilot || pilot.id === 'stage') return
    let live = true
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
  }, [connected, pilot?.id, attempt, tab])
  const launch = (c: Chapter) => (pilot ? open(c) : location.assign(SIGN_IN_URL))
  const desk = (item: string[]) => (pilot ? setInstrument(item) : location.assign(SIGN_IN_URL))
  const live = eventPanel(now)
  const missionRow = (c: Chapter, locked = false, label?: string) => (
    <button key={c.mission?.id || c.number} className="op-row" disabled={locked} onClick={() => launch(c)}>
      <span>
        <small>{c.teaches}</small>
        <b>{c.name}</b>
      </span>
      <em>{label || (done.has(c.number) ? 'Replay' : c.target?.name)}</em>
    </button>
  )
  return (
    <div className="ops">
      <header className="op-head">
        <div className="op-brand">
          <i aria-hidden>◈</i> LANDNAM <small>MINIMAL</small>
        </div>
        <span className="op-state">
          <i /> {pilot ? 'Agency online' : 'Flight operations'}
        </span>
      </header>
      <div className="op-wrap">
        <div className="op-topline">
          <span>⌖ &nbsp; EARTH STATION</span>
          <span>GROUND CONTROL</span>
        </div>
        <section className="op-land">
          <World base={base} pilotId={pilot?.id} inspect={structure} />
          <div className="op-live">
            <i /> BASE CAM &nbsp;/&nbsp; 01
          </div>
          <div className="op-caption">
            <small>AGENCY OPERATIONS</small>
            <h1>Mission control</h1>
          </div>
          <span className="op-coordinate"></span>
        </section>
        <nav className="op-nav" aria-label="Agency views">
          {tabs.map((t, i) => (
            <button key={t} aria-current={tab === t ? 'page' : undefined} onClick={() => select(t)}>
              <span aria-hidden>{glyphs[i]}</span>
              {t}
              {t === 'Events' && live?.phase === 'live' && <i />}
            </button>
          ))}
        </nav>
        {tab === 'Overview' && (
          <div className="op-grid">
            <section className="op-mission">
              <div className="op-kicker">
                <span className="op-square" /> NEXT MISSION <span className="op-rule" />
              </div>
              <div className="op-brief">
                <img
                  className="op-patch"
                  src={new URL('./art/flight-patch.png', import.meta.url).href}
                  alt="Lunar expedition insignia"
                />
                <div>
                  <small>
                    {candidate?.teaches || 'Scientific programme'} &nbsp; / &nbsp;{' '}
                    {candidate?.target?.name || 'TESS'}
                  </small>
                  <h2>{candidate?.name || 'Find a new world'}</h2>
                  <p>
                    {candidate?.goal ||
                      'Review telescope observations, then send a probe to a world you discover.'}
                  </p>
                </div>
              </div>
              <button
                className="op-primary"
                onClick={() => (candidate ? launch(candidate) : desk(instruments[1]))}
              >
                <span aria-hidden>▶</span>{' '}
                {pilot ? (candidate ? 'Open mission briefing' : 'Open telescope') : 'Sign in with Landnam'}
              </button>
              <div className="op-stats">
                <span>
                  Vehicle <b>{base.rocket.name}</b>
                </span>
                <span>
                  Treasury <b>{pilot ? francs(money) : '—'}</b>
                </span>
              </div>
            </section>
            <section className="op-fac">
              <div className="op-kicker">
                <span className="op-square mint" /> AGENCY FACILITIES <span className="op-rule" />
              </div>
              {base.structures.map((s) => (
                <button className="op-struct" key={s.def.id} onClick={() => structure(s)}>
                  <img src={s.def.art[s.level - 1]} alt="" />
                  <span>
                    <b>{s.def.name}</b>
                    <small>
                      {fresh.has(s.def.id) ? 'Upgraded · ' : ''}
                      {counterText(s)}
                    </small>
                  </span>
                  <em>LV {String(s.level).padStart(2, '0')}</em>
                  <i style={{ '--fill': (s.max ? 100 : (100 * s.have) / s.need) + '%' } as React.CSSProperties} />
                </button>
              ))}
            </section>
          </div>
        )}
        {tab === 'Overview' && (
          <button className="op-dispatch" onClick={() => select('Events')}>
            <small>✦ &nbsp; SKY BULLETIN</small>
            <b>{live?.name || 'Event archive'}</b>
            <span>
              {live?.phase === 'live'
                ? 'Active observing window'
                : live?.phase === 'upcoming'
                  ? 'Upcoming observing window'
                  : 'View event records'}
            </span>
          </button>
        )}
        {tab === 'Flight plan' && (
          <section className="op-panel">
            <small>EXPLORATION PROGRAMME</small>
            <h2>Flight plan</h2>
            {PROGRAM.map((c, i) =>
              missionRow(
                c,
                !done.has(c.number) && c !== next,
                done.has(c.number) ? 'Replay' : c === next ? 'Ready' : `After ${PROGRAM[i - 1]?.name}`,
              ),
            )}
            <h3>Exoplanet follow-ups</h3>
            {discoveries.map((c) => missionRow(c))}
            <button className="op-row" onClick={() => desk(instruments[1])}>
              <b>Review telescope observations</b>
              <em>TESS</em>
            </button>
            <h3>Agency operations</h3>
            {CHAPTERS.filter((c) => base.chapters.has(c.number) && c.mission && c.target).map((c) =>
              missionRow(c),
            )}
          </section>
        )}
        {tab === 'Research' && (
          <section className="op-panel">
            <small>SHARED SCIENCE</small>
            <h2>Community research</h2>
            {monthly && (
              <p>
                {bar.total} / {bar.goal} research stamps this month
              </p>
            )}
            {site ? (
              <div>
                <h3>
                  {site.name} · {site.stage}
                </h3>
                <p>Your contribution: {site.mineTotal} units</p>
                {site.components.map((c) => (
                  <p key={c.id}>
                    {SITE_RULES.components.find((s) => s.id === c.id)?.label} &nbsp; {c.total} / {c.target}
                  </p>
                ))}
              </div>
            ) : (
              <p>
                {pilot?.id === 'stage'
                  ? 'Training station · community totals require a Landnam account.'
                  : !pilot
                    ? 'Sign in to see your share of this month’s project.'
                    : !connected
                      ? 'Research connection pending.'
                      : network}{' '}
                {pilot && connected && network && <button onClick={() => retry((n) => n + 1)}>Retry</button>}
              </p>
            )}
            {instruments.map((row) => (
              <button className="op-row" key={row[2]} onClick={() => desk(row)}>
                <span>
                  <b>{row[0]}</b>
                  <small>{row[1]}</small>
                </span>
                <em>Open</em>
              </button>
            ))}
          </section>
        )}
        {tab === 'Events' && (
          <section className="op-panel">
            <small>SKY CALENDAR</small>
            <h2>Special missions</h2>
            {[...SKY_EVENTS]
              .sort(
                (a, b) =>
                  Number(badgeTierFor(b.id, now) === 'gold') - Number(badgeTierFor(a.id, now) === 'gold') ||
                  Date.parse(b.startUtc) - Date.parse(a.startUtc),
              )
              .map((e) => {
                const grade = badgeTierFor(e.id, now),
                  shower = getShower(e.id)
                const debris = debrisFlight(e)
                const tool = e.activities.includes('saturn-classification')
                  ? instruments[3]
                  : e.activities.includes('asteroid-classification')
                    ? instruments[2]
                    : instruments[4]
                return (
                  <div className="op-event-row" key={e.id}>
                    <button
                      className="op-row"
                      disabled={!grade}
                      onClick={() =>
                        shower
                          ? launch(eventFlight(shower))
                          : debris
                            ? launch(debris)
                            : e.activities.includes('launch')
                              ? launch(PROGRAM[6])
                              : desk(tool)
                      }
                    >
                      <span>
                        <small>
                          {grade === 'gold' ? 'Live window' : grade === 'silver' ? 'Event archive' : 'Upcoming'} ·{' '}
                          {e.startUtc.slice(0, 10)}
                        </small>
                        <b>{e.name}</b>
                      </span>
                      <em>{!grade ? 'Scheduled' : shower ? 'Fly mission' : 'Open'}</em>
                    </button>
                    {shower?.id && grade && (
                      <button className="op-link" onClick={() => desk(instruments[4])}>
                        Open {e.communityInstrument?.callsign || 'radio'} receiver
                      </button>
                    )}
                  </div>
                )
              })}
            <h3>Event rewards</h3>
            {SHOWERS.flatMap((s) => showerSpecials(s.id, player || {}, flown)).map((v) => {
              const m = specialMissions(TARGETS, player || {}, flown).find((m) => m.id === v.id)
              return (
                <button
                  className="op-row"
                  key={v.id}
                  disabled={
                    !m ||
                    done.has(
                      500 + SHOWERS.flatMap((s) => showerSpecials(s.id, {})).findIndex((x) => x.id === v.id),
                    )
                  }
                  onClick={() =>
                    m &&
                    launch({
                      number:
                        500 + SHOWERS.flatMap((s) => showerSpecials(s.id, {})).findIndex((x) => x.id === v.id),
                      type: 'client-contract',
                      verb: 'mine',
                      name: m.title,
                      teaches: 'Special mission',
                      goal: m.brief,
                      mission: m,
                      target: TARGETS.find((t) => t.id === m.targetId),
                    })
                  }
                >
                  <span>
                    <b>{v.title}</b>
                    <small>
                      {v.state === 'locked'
                        ? v.needs
                        : v.state === 'flown' ||
                            done.has(
                              500 +
                                SHOWERS.flatMap((s) => showerSpecials(s.id, {})).findIndex((x) => x.id === v.id),
                            )
                          ? 'Completed'
                          : 'Available'}
                    </small>
                  </span>
                </button>
              )
            })}
          </section>
        )}
      </div>
      {instrument && (
        <div className="op-desk" role="dialog" aria-label={instrument[0]}>
          <header>
            <b>{instrument[0]}</b>
            <button autoFocus onClick={() => setInstrument(null)}>
              Return to base
            </button>
          </header>
          <iframe
            title={instrument[0]}
            src={
              pilot?.id === 'stage' ? `/game/stage?preset=sandbox:ui-${instrument[2]}` : `/game/${instrument[2]}`
            }
          />
        </div>
      )}
    </div>
  )
}
