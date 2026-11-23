// Landnam Minimal (SSL-864): run a space agency from one side-on view of its base.
// The base is the progress: four structures start at level 1 and level up from
// the missions flown (structures.ts), each with a counter under it. One big
// button starts the next mission; every unlocked mission can be flown again.
// A run is the rocket leaving the pad, one job at the destination in the same
// view, and the rocket landing back on the pad, where the counters move.
import { useEffect, useMemo, useRef, useState } from 'react'
import { MINERAL_META } from '@landnam/lib/data/minerals'
import { SHOWERS } from '@landnam/lib/data/showers'
import type { Target } from '@landnam/lib/data/types'
import { currentPilot, SIGN_IN_URL } from './auth'
import { CHAPTERS, francs, mineralName, type Chapter } from './chapters'
import { applyResult, missingMaterials, readProgress, resultFor, writeProgress, type MinimalProgress, type RunResult } from './progress'
import { pushProgress, syncProgress } from './progressSync'
import { creditLandnam, readSharedSave } from './sharedSave'
import { base as baseFor, counterText, levelUps, rocketReaching, type Base, type RunCounts, type StructureId, type StructureState } from './structures'
import { Away, Home, ORDER, groundLine, useView, type Deposit, type Rocket } from './Stage'

const LIFTOFF_MS = 1500
const LANDING_MS = 1500
const LEAVE_MS = 900
const RELEASE_MS = 1600
const BUILD_MS = 1800
const SHOWER_FRAGMENTS = 5

type Run = {
  chapter: Chapter
  /** launch (home) → away (job) → leaving → [second stop] → land (home). */
  phase: 'launch' | 'away' | 'leaving' | 'land'
  /** 0 at the target, 1 at the delivery stop. */
  stop: 0 | 1
  haul: Record<string, number>
  deposits: Deposit[]
  /** The job at this stop is finished: the button heads on. */
  done: boolean
  beam?: number
  payload?: 'satellite' | 'probe'
  raising?: number
  crates?: boolean
}

type Sheet =
  | { kind: 'brief'; chapter: Chapter }
  | { kind: 'structure'; state: StructureState }
  | { kind: 'report'; result: RunResult; upgrades: ReturnType<typeof levelUps>; chapter: Chapter }

const SHOWER = SHOWERS.find(s => s.id.startsWith('leonids')) ?? SHOWERS[0]
const SHOWER_CHAPTER = CHAPTERS.find(c => c.type === 'shower-run')!

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
  return { ...progress, runs, done: CHAPTERS.filter(c => runs[c.type]).map(c => c.number) }
}

/** A mission is out of reach when its fixed world is past the rocket's orbit. Market runs pick a world in range. */
function outOfReach(chapter: Chapter, base: Base): string | undefined {
  if (chapter.destinations?.length) return undefined
  const far = Math.max(chapter.target?.orbit ?? 0, chapter.deliveryTarget?.orbit ?? 0)
  return far > base.rocket.maxOrbit ? rocketReaching(far) ?? 'a bigger rocket' : undefined
}

/** The mission to suggest: one never flown first, then whatever moves the closest structure up a level. */
function suggested(base: Base, done: ReadonlySet<number>): Chapter {
  const open = CHAPTERS.filter(c => base.chapters.has(c.number) && c.mission && !outOfReach(c, base))
  const fresh = open.find(c => !done.has(c.number))
  if (fresh) return fresh
  for (const s of base.structures.filter(s => !s.max).sort((a, b) => (a.need - a.have) - (b.need - b.have))) {
    const pick = open.find(c => !s.def.counts || s.def.counts.includes(c.type))
    if (pick) return pick
  }
  return open[0] ?? CHAPTERS[0]
}

/** What this stop's ground holds, and whether a deposit can be cut with the base's laser. */
function orePlan(chapter: Chapter, base: Base) {
  const showerFragment = chapter.type === 'shower-run' ? SHOWER?.resourceId : undefined
  const order: Record<string, number> = showerFragment ? { [showerFragment]: SHOWER_FRAGMENTS } : { ...(chapter.mission?.requires.minerals ?? {}) }
  const open = Object.keys(order).length === 0
  const pool = (chapter.target?.minerals ?? []).filter(id => MINERAL_META[id] && !id.endsWith('_debris'))
  return { order, open, pool: pool.length ? pool : Object.keys(order), hold: base.rocket.hold }
}

export function App() {
  const pilot = currentPilot()
  const [progress, setProgress] = useState(() => (pilot ? devRuns(readProgress(pilot.id)) : null))
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [run, setRun] = useState<Run | null>(null)
  const [picked, setPicked] = useState<Target | undefined>()
  const [fresh, setFresh] = useState<ReadonlySet<StructureId>>(new Set())
  const [toast, setToast] = useState<string | null>(null)
  const nextKey = useRef(1)
  const { w, h } = useView()
  const groundVar = { '--ground': `${groundLine(h)}px` } as React.CSSProperties

  // Progress is saved to the account (SSL-877): merge with this device's copy on load and when back online.
  const pilotId = pilot?.id
  useEffect(() => {
    if (!pilot) return
    let live = true
    const sync = () => {
      void syncProgress(pilot, readProgress(pilot.id)).then(merged => {
        creditLandnam(pilot.id, merged ?? readProgress(pilot.id))
        if (!live || !merged) return
        writeProgress(pilot.id, merged)
        setProgress(merged)
      })
    }
    sync()
    window.addEventListener('online', sync)
    return () => { live = false; window.removeEventListener('online', sync) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per pilot
  }, [pilotId])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  // Shared with Landnam: francs, and finishing its onboarding counts as chapter 1.
  const save = pilot ? readSharedSave(pilot.id) : null
  const runs = useMemo<RunCounts>(() => {
    if (!progress) return {}
    if (!save?.onboardingDone || progress.done.includes(1)) return progress.runs
    return { ...progress.runs, 'client-contract': (progress.runs['client-contract'] ?? 0) + 1 }
  }, [progress, save?.onboardingDone])
  const base = useMemo(() => baseFor(runs), [runs])

  if (!pilot || !progress || !save) {
    return (
      <main className="mn" data-scene="minimal-sign-in">
        <Home base={base} rocket="parked" fresh={new Set()} />
        <footer className="mn-bottom">
          <section className="mn-card">
            <h1>Run a space agency.</h1>
            <p>Fly missions and your base grows. Sign in with your Landnam account; your francs come with you.</p>
          </section>
          <a className="mn-cta" href={SIGN_IN_URL}>SIGN IN TO PLAY</a>
        </footer>
      </main>
    )
  }

  const done = new Set(progress.done)
  if (save.onboardingDone) done.add(1)
  const money = save.francs + progress.earned

  const withTarget = (chapter: Chapter): Chapter => {
    if (!chapter.destinations?.length) return chapter
    const inRange = chapter.destinations.filter(t => t.orbit <= base.rocket.maxOrbit)
    return { ...chapter, target: inRange.find(t => t.id === picked?.id) ?? inRange[0] ?? chapter.target }
  }

  // ---- A run ----------------------------------------------------------------

  const deposit = (plan: ReturnType<typeof orePlan>, got: Record<string, number>, standing: Deposit[], col: number, row: number): Deposit => {
    const wantedLeft = Object.keys(plan.order).filter(id => (plan.order[id] ?? 0) - (got[id] ?? 0) - standing.filter(d => !d.cut && d.mineral === id).length > 0)
    // The rest of the ground is other ore, so the order has to be picked out.
    const others = plan.open ? plan.pool : plan.pool.filter(id => !(id in plan.order)).concat(plan.pool.length > Object.keys(plan.order).length ? [] : ['iron', 'nickel'])
    const mineral = wantedLeft.length
      ? wantedLeft[Math.floor(Math.random() * wantedLeft.length)]
      : others[Math.floor(Math.random() * others.length)] ?? 'iron'
    return { key: nextKey.current++, mineral, col, row, cut: false, locked: (MINERAL_META[mineral]?.laserAccess ?? 1) > base.laser }
  }

  const field = (chapter: Chapter): Deposit[] => {
    if (chapter.verb !== 'mine' && chapter.verb !== 'deliver') return []
    const plan = orePlan(chapter, base)
    const cols = Math.max(3, Math.min(6, Math.floor((Math.min(w, 640) - 24) / 72)))
    const list: Deposit[] = []
    for (let row = 0; row < 2; row++) for (let col = 0; col < cols; col++) list.push(deposit(plan, {}, list, col, row))
    return list
  }

  const start = (chapter: Chapter) => {
    setSheet(null)
    setRun({ chapter, phase: 'launch', stop: 0, haul: {}, deposits: [], done: false })
    window.setTimeout(() => setRun(r => r && { ...r, phase: 'away', deposits: field(chapter), done: chapter.verb === 'deliver' ? false : false }), LIFTOFF_MS)
  }

  const cut = (key: number) => {
    if (!run || run.done) return
    const d = run.deposits.find(x => x.key === key)
    if (!d || d.cut) return
    if (d.locked) { setToast(`${mineralName(d.mineral)} needs a stronger laser. The Hangar's top level fits one.`); return }
    const plan = orePlan(run.chapter, base)
    const haul = { ...run.haul, [d.mineral]: (run.haul[d.mineral] ?? 0) + 1 }
    const total = Object.values(haul).reduce((a, b) => a + b, 0)
    const finished = plan.open ? total >= plan.hold : Object.entries(plan.order).every(([id, n]) => (haul[id] ?? 0) >= n)
    setRun({ ...run, haul, beam: key, done: finished, deposits: run.deposits.map(x => (x.key === key ? { ...x, cut: true } : x)) })
    window.setTimeout(() => setRun(r => r && { ...r, beam: r.beam === key ? undefined : r.beam }), 280)
    // A cut seam is replaced by a fresh one, so the order can always be filled.
    window.setTimeout(() => setRun(r => {
      if (!r) return r
      const i = r.deposits.findIndex(x => x.key === key)
      if (i < 0) return r
      const rest = r.deposits.filter(x => x.key !== key)
      const next = [...r.deposits]
      next[i] = deposit(plan, r.haul, rest, d.col, d.row)
      return { ...r, deposits: next }
    }), 900)
  }

  const act = () => {
    if (!run) return
    const { chapter } = run
    if (chapter.verb === 'deploy' || chapter.verb === 'survey') {
      setRun({ ...run, payload: chapter.verb === 'deploy' && chapter.type === 'satellite' ? 'satellite' : 'probe' })
      window.setTimeout(() => setRun(r => r && { ...r, done: true }), RELEASE_MS)
    } else if (chapter.verb === 'build') {
      const began = performance.now()
      const tick = () => {
        const p = Math.min(1, (performance.now() - began) / BUILD_MS)
        setRun(r => r && { ...r, raising: p, done: p >= 1 })
        if (p < 1) requestAnimationFrame(tick)
      }
      tick()
    } else if (chapter.verb === 'deliver' && run.stop === 1) {
      setRun({ ...run, crates: true, done: true })
    }
  }

  const leave = () => {
    if (!run) return
    setRun({ ...run, phase: 'leaving' })
    window.setTimeout(() => {
      if (run.chapter.verb === 'deliver' && run.stop === 0) {
        setRun(r => r && { ...r, phase: 'away', stop: 1, deposits: [], done: false, beam: undefined })
        return
      }
      setRun(r => r && { ...r, phase: 'land' })
      window.setTimeout(() => land(run.chapter, run.haul), LANDING_MS)
    }, LEAVE_MS)
  }

  const land = (chapter: Chapter, haul: Record<string, number>) => {
    const result = resultFor(chapter, haul)
    const after = { ...runs, [chapter.type]: (runs[chapter.type] ?? 0) + 1 }
    const upgrades = levelUps(runs, after)
    const next = applyResult(progress, chapter, result)
    writeProgress(pilot.id, next)
    creditLandnam(pilot.id, next)
    void pushProgress(pilot, next)
    setProgress(next)
    setFresh(new Set(upgrades.map(u => u.def.id)))
    setRun(null)
    setSheet({ kind: 'report', result, upgrades, chapter })
  }

  const abandon = () => {
    setRun(null)
    setToast('Back at base. Nothing banked.')
  }

  if (run && (run.phase === 'away' || run.phase === 'leaving')) {
    const { chapter } = run
    const where = (run.stop === 1 ? chapter.deliveryTarget : chapter.target)!
    const plan = orePlan(chapter, base)
    const mining = (chapter.verb === 'mine' || chapter.verb === 'deliver') && run.stop === 0
    const goal = mining
      ? plan.open
        ? [{ id: 'hold', text: `Hold ${Object.values(run.haul).reduce((a, b) => a + b, 0)}/${plan.hold}`, met: run.done }]
        : Object.entries(plan.order).map(([id, n]) => ({ id, text: `${mineralName(id)} ${Math.min(run.haul[id] ?? 0, n)}/${n}`, met: (run.haul[id] ?? 0) >= n }))
      : []
    const verb = chapter.verb === 'deploy' ? (chapter.type === 'satellite' ? 'DEPLOY TELESCOPE' : 'RELEASE PROBE')
      : chapter.verb === 'survey' ? 'RELEASE PROBE'
      : chapter.verb === 'build' ? 'BUILD'
      : 'DELIVER'
    const onward = chapter.verb === 'deliver' && run.stop === 0 ? `FLY TO ${chapter.deliveryTarget?.name.toUpperCase() ?? 'DROP-OFF'}` : 'HEAD HOME'
    const hint = mining ? (run.done ? null : plan.open ? 'Tap ore to cut it. Fill the hold.' : 'Tap the ore the order needs.') : null
    return (
      <main className="mn" data-scene="minimal-away">
        <Away
          key={run.stop}
          target={where}
          rocket={run.phase === 'leaving' ? 'leaving' : 'arriving'}
          deposits={mining ? run.deposits : []}
          beam={run.beam}
          payload={run.payload}
          raising={run.raising}
          crates={run.crates}
          event={chapter.type === 'shower-run'}
          onCut={cut}
        />
        <header className="mn-top">
          <button className="mn-chip" onClick={abandon}>‹ BASE</button>
          <span className="mn-chip">{where.name}</span>
        </header>
        <footer className="mn-bottom">
          {goal.length > 0 && (
            <div className="mn-row" aria-label="Order">
              {goal.map(g => <span key={g.id} className={`mn-chip${g.met ? ' mn-met' : ''}`}>{g.text}</span>)}
            </div>
          )}
          {hint && <p className="mn-hint">{hint}</p>}
          {mining || run.done
            ? run.done && <button className="mn-cta" disabled={run.phase === 'leaving'} onClick={leave}>{onward}</button>
            : <button className="mn-cta" disabled={run.payload !== undefined || run.raising !== undefined} onClick={act}>{verb}</button>}
        </footer>
        {toast && <p className="mn-toast" role="status">{toast}</p>}
      </main>
    )
  }

  // ---- The base -------------------------------------------------------------

  const rocket: Rocket = run?.phase === 'launch' ? 'launching' : run?.phase === 'land' ? 'landing' : 'parked'
  const next = suggested(base, done)
  const open = CHAPTERS.filter(c => base.chapters.has(c.number) && c.mission && c.type !== 'shower-run')
  const showerOpen = base.chapters.has(SHOWER_CHAPTER.number)
  const exchange = base.structures.find(s => s.def.id === 'exchange')!
  const busy = !!run

  return (
    <main className="mn" data-scene="minimal-base" style={groundVar}>
      <Home base={base} rocket={rocket} fresh={fresh} event={!!SHOWER} />
      <header className="mn-top">
        <span className="mn-chip mn-money" aria-label="Your francs">{francs(money)}</span>
        <span className="mn-chip">{base.rocket.name} · hold {base.rocket.hold}</span>
      </header>
      {SHOWER && !busy && (
        <button
          className={`mn-event${showerOpen ? '' : ' mn-event-locked'}`}
          onClick={() => (showerOpen ? setSheet({ kind: 'brief', chapter: SHOWER_CHAPTER }) : setToast(`Shower runs open at Exchange level 3. ${counterText(exchange)} to the next level.`))}
        >
          <span className="mn-event-name">☄ {SHOWER.name} meteor shower</span>
          <span className="mn-event-sub">{showerOpen ? 'Live now · fly into it' : 'Live now · opens at Exchange LV 3'}</span>
        </button>
      )}
      <div className="mn-plates" aria-label="Your base">
        {ORDER.map(id => {
          const s = base.structures.find(st => st.def.id === id)!
          return (
            <button
              key={id}
              className={`mn-plate${fresh.has(id) ? ' mn-fresh' : ''}`}
              onClick={() => setSheet({ kind: 'structure', state: s })}
              aria-label={`${s.def.name}, level ${s.level}. ${counterText(s)}.`}
            >
              <span className="mn-plate-name">{s.def.name.replace('Control Station', 'Control')}</span>
              <span className="mn-plate-lv">LV {s.level}</span>
              <span className="mn-bar"><i style={{ width: `${s.max ? 100 : (s.have / s.need) * 100}%` }} /></span>
              <span className="mn-plate-count">{s.max ? 'MAX' : `${s.have}/${s.need}`}</span>
            </button>
          )
        })}
      </div>
      {!busy && (
        <footer className="mn-bottom">
          {open.length > 1 && (
            <nav className="mn-row mn-missions" aria-label="Missions">
              {open.map(c => {
                const needs = outOfReach(c, base)
                return (
                  <button key={c.number} className={`mn-chip${c === next ? ' mn-chip-next' : ''}`} disabled={!!needs} onClick={() => setSheet({ kind: 'brief', chapter: c })}>
                    {c.name}{!done.has(c.number) && !needs ? ' ·  new' : ''}{needs ? ` · needs ${needs}` : ''}
                  </button>
                )
              })}
            </nav>
          )}
          <button className="mn-cta" onClick={() => setSheet({ kind: 'brief', chapter: next })}>
            <span className="mn-cta-kicker">NEXT MISSION</span>
            {next.name.toUpperCase()}
          </button>
        </footer>
      )}

      {sheet?.kind === 'brief' && (() => {
        const chapter = withTarget(sheet.chapter)
        const blocked = outOfReach(chapter, base)
        const missing = Object.entries(missingMaterials(chapter, progress.stash))
        const asks = Object.entries(chapter.mission?.requires.minerals ?? {})
        const reward = chapter.mission?.payout.francs ?? 0
        return (
          <Modal onClose={() => setSheet(null)} label={chapter.name}>
            <p className="mn-eyebrow">{chapter.teaches.toUpperCase()}{chapter.target ? ` · ${chapter.target.name.toUpperCase()}` : ''}</p>
            <p className="mn-title">{chapter.name}</p>
            <p>{chapter.goal}</p>
            {(asks.length > 0 || reward > 0) && (
              <div className="mn-row">
                {asks.map(([id, n]) => <Ore key={id} id={id} n={n} />)}
                {reward > 0 && <span className="mn-chip mn-money">{francs(reward)}</span>}
              </div>
            )}
            {chapter.destinations && chapter.destinations.length > 1 && (
              <div className="mn-row mn-scroll" role="radiogroup" aria-label="Where to mine">
                {chapter.destinations.map(t => {
                  const far = t.orbit > base.rocket.maxOrbit
                  return (
                    <button key={t.id} role="radio" aria-checked={t.id === chapter.target?.id} className="mn-chip mn-pick" disabled={far} onClick={() => setPicked(t)}>
                      {t.name.replace(/^\d+\s+/, '')}{far ? ` · ${rocketReaching(t.orbit) ?? 'later'}` : ''}
                    </button>
                  )
                })}
              </div>
            )}
            {blocked && <p className="mn-warn">Too far for the {base.rocket.name}. The Launchpad's next level brings the {blocked}.</p>}
            {missing.length > 0 && <p className="mn-warn">Store {missing.map(([id, n]) => `${n} ${mineralName(id)}`).join(' and ')} first (Stockpile).</p>}
            <button className="mn-cta" disabled={!chapter.mission || !chapter.target || !!blocked || missing.length > 0} onClick={() => start(chapter)}>LAUNCH</button>
          </Modal>
        )
      })()}

      {sheet?.kind === 'structure' && (
        <Modal onClose={() => setSheet(null)} label={sheet.state.def.name}>
          <p className="mn-title">{sheet.state.def.name} · LV {sheet.state.level}</p>
          <p>{sheet.state.def.counts ? `Levels up from ${sheet.state.def.unit[1]}.` : 'Levels up from every mission.'} {counterText(sheet.state)}.</p>
          <ol className="mn-levels">
            {sheet.state.def.unlocks.map((u, i) => (
              <li key={i} className={i < sheet.state.level ? 'mn-have' : i === sheet.state.level ? 'mn-next' : ''}>
                <b>{i < sheet.state.level ? '✓' : `LV ${i + 1}`}</b><span>{u.line}</span>
              </li>
            ))}
          </ol>
          <button className="mn-cta" onClick={() => setSheet(null)}>OK</button>
        </Modal>
      )}

      {sheet?.kind === 'report' && (
        <Modal onClose={() => setSheet(null)} label="Mission report">
          <p className="mn-eyebrow">{sheet.chapter.name.toUpperCase()} · DONE</p>
          <p className="mn-title">{sheet.result.outcome}</p>
          {(sheet.result.francs > 0 || Object.keys(sheet.result.stored).length > 0) && (
            <div className="mn-row">
              {sheet.result.francs > 0 && <span className="mn-chip mn-money">+{francs(sheet.result.francs)}</span>}
              {Object.entries(sheet.result.stored).map(([id, n]) => <Ore key={id} id={id} n={n} />)}
            </div>
          )}
          {sheet.upgrades.map(u => (
            <div key={u.def.id} className="mn-upgrade">
              <img src={u.def.art[u.level - 1]} alt="" draggable={false} />
              <div><p className="mn-eyebrow">{u.def.name.toUpperCase()} · LEVEL {u.level}</p><p>{u.unlock.line}</p></div>
            </div>
          ))}
          <button className="mn-cta" onClick={() => setSheet(null)}>{sheet.upgrades.length ? 'SEE THE BASE' : 'OK'}</button>
        </Modal>
      )}
      {toast && <p className="mn-toast" role="status">{toast}</p>}
    </main>
  )
}

function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="mn-backdrop" onClick={onClose}>
      <section className="mn-card mn-sheet" role="dialog" aria-label={label} onClick={e => e.stopPropagation()}>
        {children}
      </section>
    </div>
  )
}

function Ore({ id, n }: { id: string; n?: number }) {
  const meta = MINERAL_META[id]
  return (
    <span className="mn-chip mn-ore-chip">
      <i style={{ background: meta?.color ?? '#ccc' }} />
      {n ? `${n} ` : ''}{meta?.name ?? id}
    </span>
  )
}
