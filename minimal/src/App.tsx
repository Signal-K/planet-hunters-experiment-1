import { useEffect, useMemo, useRef, useState } from 'react'
import { MINERAL_META } from '@landnam/lib/data/minerals'
import { showerForRunMission } from '@landnam/lib/data/showers'
import { ORIONIDS_FRAGMENT_GOAL } from '@landnam/lib/data/missions'
import { BaseField } from './BaseField'
import { connectResearch, recordFlight } from './research'
import type { Target } from '@landnam/lib/data/types'
import { currentPilot, SIGN_IN_URL } from './auth'
import { CHAPTERS, francs, mineralName, type Chapter } from './chapters'
import {
  applyResult,
  missingMaterials,
  readProgress,
  resultFor,
  writeProgress,
  type MinimalProgress,
} from './progress'
import { pushProgress, syncProgress } from './progressSync'
import { creditLandnam, readSharedSave } from './sharedSave'
import {
  base as baseFor,
  counterText,
  levelUps,
  rocketReaching,
  type Base,
  type RunCounts,
  type StructureId,
  type StructureState,
} from './structures'
import { World, type Deposit } from './World'

const LIFTOFF_MS = 1500
const LANDING_MS = 1500
const LEAVE_MS = 900
const RELEASE_MS = 1600
const BUILD_MS = 1800
const SHOWER_FRAGMENTS = ORIONIDS_FRAGMENT_GOAL

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

type Sheet = { kind: 'brief'; chapter: Chapter } | { kind: 'structure'; state: StructureState }
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
  return { ...progress, runs, done: CHAPTERS.filter((c) => runs[c.type]).map((c) => c.number) }
}

/** A mission is out of reach when its fixed world is past the rocket's orbit. Market runs pick a world in range. */
function outOfReach(chapter: Chapter, base: Base): string | undefined {
  if (chapter.destinations?.length) return undefined
  const far = Math.max(chapter.target?.orbit ?? 0, chapter.deliveryTarget?.orbit ?? 0)
  return far > base.rocket.maxOrbit ? (rocketReaching(far) ?? 'a bigger rocket') : undefined
}

/** What this stop's ground holds, and whether a deposit can be cut with the base's laser. */
function orePlan(chapter: Chapter, base: Base) {
  const showerFragment = showerForRunMission(chapter.mission?.id)?.resourceId
  const order: Record<string, number> = showerFragment
    ? { [showerFragment]: SHOWER_FRAGMENTS }
    : { ...(chapter.mission?.requires.minerals ?? {}) }
  const open = Object.keys(order).length === 0
  const pool = (chapter.target?.minerals ?? []).filter((id) => MINERAL_META[id] && !id.endsWith('_debris'))
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
  const [connected, setConnected] = useState(false)
  const flightId = useRef('')

  // Progress is saved to the account (SSL-877): merge with this device's copy on load and when back online.
  const pilotId = pilot?.id
  useEffect(() => {
    if (!pilot) return
    let live = true
    const sync = () => {
      void connectResearch(pilot.id)
        .then(() => {
          if (live) setConnected(true)
        })
        .catch(() => {
          if (live) setConnected(false)
        })
      void syncProgress(pilot, readProgress(pilot.id)).then((merged) => {
        creditLandnam(pilot.id, merged ?? readProgress(pilot.id))
        if (!live || !merged) return
        writeProgress(pilot.id, merged)
        setProgress(merged)
      })
    }
    sync()
    window.addEventListener('online', sync)
    return () => {
      live = false
      window.removeEventListener('online', sync)
    }
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
      <BaseField
        base={base}
        pilot={null}
        done={new Set()}
        money={0}
        fresh={fresh}
        open={() => location.assign(SIGN_IN_URL)}
        structure={() => location.assign(SIGN_IN_URL)}
        connected={false}
      />
    )
  }

  const done = new Set(progress.done)
  if (save.onboardingDone) done.add(1)
  const money = save.francs + progress.earned

  const withTarget = (chapter: Chapter): Chapter => {
    if (!chapter.destinations?.length) return chapter
    const inRange = chapter.destinations.filter((t) => t.orbit <= base.rocket.maxOrbit)
    return { ...chapter, target: inRange.find((t) => t.id === picked?.id) ?? inRange[0] ?? chapter.target }
  }

  // ---- A run ----------------------------------------------------------------

  const deposit = (
    plan: ReturnType<typeof orePlan>,
    got: Record<string, number>,
    standing: Deposit[],
    col: number,
    row: number,
  ): Deposit => {
    const wantedLeft = Object.keys(plan.order).filter(
      (id) =>
        (plan.order[id] ?? 0) - (got[id] ?? 0) - standing.filter((d) => !d.cut && d.mineral === id).length > 0,
    )
    // The rest of the ground is other ore, so the order has to be picked out.
    const others = plan.open
      ? plan.pool
      : plan.pool
          .filter((id) => !(id in plan.order))
          .concat(plan.pool.length > Object.keys(plan.order).length ? [] : ['iron', 'nickel'])
    const mineral = wantedLeft.length
      ? wantedLeft[Math.floor(Math.random() * wantedLeft.length)]
      : (others[Math.floor(Math.random() * others.length)] ?? 'iron')
    return {
      key: nextKey.current++,
      mineral,
      col,
      row,
      cut: false,
      locked: (MINERAL_META[mineral]?.laserAccess ?? 1) > base.laser,
    }
  }

  const field = (chapter: Chapter): Deposit[] => {
    if (chapter.verb !== 'mine' && chapter.verb !== 'deliver') return []
    const plan = orePlan(chapter, base)
    const cols = Math.max(3, Math.min(6, Math.floor((Math.min(window.innerWidth, 640) - 24) / 72)))
    const list: Deposit[] = []
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < cols; col++) list.push(deposit(plan, {}, list, col, row))
    return list
  }

  const start = (chapter: Chapter) => {
    flightId.current = crypto.randomUUID()
    setSheet(null)
    setRun({ chapter, phase: 'launch', stop: 0, haul: {}, deposits: [], done: false })
    window.setTimeout(
      () => setRun((r) => r && { ...r, phase: 'away', deposits: field(chapter), done: false }),
      LIFTOFF_MS,
    )
  }

  const cut = (key: number) => {
    if (!run || run.done) return
    const d = run.deposits.find((x) => x.key === key)
    if (!d || d.cut) return
    if (d.locked) {
      setToast(`${mineralName(d.mineral)} needs a stronger laser. The Hangar's top level fits one.`)
      return
    }
    const plan = orePlan(run.chapter, base)
    const haul = { ...run.haul, [d.mineral]: (run.haul[d.mineral] ?? 0) + 1 }
    const total = Object.values(haul).reduce((a, b) => a + b, 0)
    const finished = plan.open
      ? total >= plan.hold
      : Object.entries(plan.order).every(([id, n]) => (haul[id] ?? 0) >= n)
    setRun({
      ...run,
      haul,
      beam: key,
      done: finished,
      deposits: run.deposits.map((x) => (x.key === key ? { ...x, cut: true } : x)),
    })
    window.setTimeout(() => setRun((r) => r && { ...r, beam: r.beam === key ? undefined : r.beam }), 280)
    // A cut seam is replaced by a fresh one, so the order can always be filled.
    window.setTimeout(
      () =>
        setRun((r) => {
          if (!r) return r
          const i = r.deposits.findIndex((x) => x.key === key)
          if (i < 0) return r
          const rest = r.deposits.filter((x) => x.key !== key)
          const next = [...r.deposits]
          next[i] = deposit(plan, r.haul, rest, d.col, d.row)
          return { ...r, deposits: next }
        }),
      900,
    )
  }

  const act = () => {
    if (!run) return
    const { chapter } = run
    const id = flightId.current
    if (chapter.verb === 'deploy' || chapter.verb === 'survey') {
      setRun({
        ...run,
        payload: chapter.verb === 'deploy' && chapter.type === 'satellite' ? 'satellite' : 'probe',
      })
      window.setTimeout(() => setRun((r) => (r && id === flightId.current ? { ...r, done: true } : r)), RELEASE_MS)
    } else if (chapter.verb === 'build') {
      const began = performance.now()
      const tick = () => {
        if (id !== flightId.current) return
        const p = Math.min(1, (performance.now() - began) / BUILD_MS)
        setRun((r) => r && { ...r, raising: p, done: p >= 1 })
        if (p < 1) requestAnimationFrame(tick)
      }
      tick()
    } else if (chapter.verb === 'deliver' && run.stop === 1) {
      setRun({ ...run, crates: true, done: true })
    }
  }

  const leave = () => {
    if (!run || run.phase !== 'away' || !run.done) return
    const id = flightId.current
    setRun({ ...run, phase: 'leaving' })
    window.setTimeout(() => {
      if (id !== flightId.current) return
      if (run.chapter.verb === 'deliver' && run.stop === 0) {
        setRun((r) => r && { ...r, phase: 'away', stop: 1, deposits: [], done: false, beam: undefined })
        return
      }
      setRun((r) => r && { ...r, phase: 'land' })
      window.setTimeout(() => {
        if (id === flightId.current) land(run.chapter, run.haul)
      }, LANDING_MS)
    }, LEAVE_MS)
  }

  const land = (chapter: Chapter, haul: Record<string, number>) => {
    const result = resultFor(chapter, haul)
    const after = { ...runs, [chapter.type]: (runs[chapter.type] ?? 0) + 1 }
    const upgrades = levelUps(runs, after)
    const next = applyResult(progress, chapter, result)
    writeProgress(pilot.id, next)
    creditLandnam(pilot.id, next)
    recordFlight(pilot.id, chapter, haul, flightId.current)
    void pushProgress(pilot, next)
    setProgress(next)
    setFresh(new Set(upgrades.map((u) => u.def.id)))
    setRun(null)
    setToast([result.outcome, ...upgrades.map((u) => u.def.name + ' · Lv ' + u.level)].join(' · '))
  }

  const abandon = () => {
    flightId.current = ''
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
        ? [
            {
              id: 'hold',
              text: `Hold ${Object.values(run.haul).reduce((a, b) => a + b, 0)}/${plan.hold}`,
              met: run.done,
            },
          ]
        : Object.entries(plan.order).map(([id, n]) => ({
            id,
            text: `${mineralName(id)} ${Math.min(run.haul[id] ?? 0, n)}/${n}`,
            met: (run.haul[id] ?? 0) >= n,
          }))
      : []
    const verb =
      chapter.verb === 'deploy'
        ? chapter.type === 'satellite'
          ? 'DEPLOY TELESCOPE'
          : 'RELEASE PROBE'
        : chapter.verb === 'survey'
          ? 'RELEASE PROBE'
          : chapter.verb === 'build'
            ? 'BUILD'
            : 'DELIVER'
    return (
      <main className="mn" data-scene="minimal-away">
        <World
          key={chapter.number + ':' + run.stop}
          onWork={act}
          onDepart={leave}
          done={run.done}
          busy={run.payload !== undefined || run.raising !== undefined || run.phase === 'leaving'}
          survey={chapter.verb === 'survey'}
          workLabel={mining ? 'Drive to an ore seam' : verb}
          base={base}
          target={where}
          phase={run.phase === 'leaving' ? 'leaving' : 'away'}
          deposits={mining ? run.deposits : undefined}
          beam={run.beam}
          payload={run.payload}
          raising={run.raising}
          crates={run.crates}
          event={chapter.type === 'shower-run'}
          onCut={cut}
        />
        <header className="mn-top">
          <button className="mn-chip" onClick={abandon}>
            ‹ BASE
          </button>
          <span className="mn-chip">{where.name}</span>
        </header>
        <footer className="mn-bottom">
          {goal.length > 0 && (
            <div className="mn-row" aria-label="Order">
              {goal.map((g) => (
                <span key={g.id} className={`mn-chip${g.met ? ' mn-met' : ''}`}>
                  {g.text}
                </span>
              ))}
            </div>
          )}
        </footer>
        {toast && (
          <p className="mn-toast" role="status">
            {toast}
          </p>
        )}
      </main>
    )
  }

  // ---- The base -------------------------------------------------------------

  return (
    <main className="mn" data-scene="minimal-base">
      {run ? (
        <>
          <World base={base} pilotId={pilot.id} phase={run.phase === 'launch' ? 'launch' : 'land'} />
          <div className="mn-bottom">
            <p className="mn-chip">
              {run.phase === 'launch' ? 'Launching' : 'Landing'} · {run.chapter.name}
            </p>
          </div>
        </>
      ) : (
        <BaseField
          base={base}
          pilot={pilot}
          done={done}
          money={money}
          fresh={fresh}
          connected={connected}
          structure={(state) => setSheet({ kind: 'structure', state })}
          open={(chapter, direct) => {
            setPicked(undefined)
            if (
              direct &&
              !chapter.destinations?.length &&
              chapter.mission &&
              chapter.target &&
              !outOfReach(chapter, base) &&
              !Object.keys(missingMaterials(chapter, progress.stash)).length &&
              !Object.keys(chapter.mission.requires.minerals ?? {}).some(
                (id) => (MINERAL_META[id]?.laserAccess ?? 1) > base.laser,
              )
            )
              start(chapter)
            else setSheet({ kind: 'brief', chapter })
          }}
        />
      )}
      {sheet?.kind === 'brief' &&
        (() => {
          const chapter = withTarget(sheet.chapter)
          const hardOre = Object.keys(chapter.mission?.requires.minerals || {}).find(
            (id) => (MINERAL_META[id]?.laserAccess || 1) > base.laser,
          )
          const blocked = outOfReach(chapter, base)
          const missing = Object.entries(missingMaterials(chapter, progress.stash))
          const asks = Object.entries(chapter.mission?.requires.minerals ?? {})
          const reward = chapter.mission?.payout.francs ?? 0
          return (
            <Modal onClose={() => setSheet(null)} label={chapter.name}>
              <p className="mn-eyebrow">
                {chapter.teaches.toUpperCase()}
                {chapter.target ? ` · ${chapter.target.name.toUpperCase()}` : ''}
              </p>
              <p className="mn-title">{chapter.name}</p>
              <p>{chapter.goal}</p>
              {(asks.length > 0 || reward > 0) && (
                <div className="mn-row">
                  {asks.map(([id, n]) => (
                    <Ore key={id} id={id} n={n} />
                  ))}
                  {reward > 0 && <span className="mn-chip mn-money">{francs(reward)}</span>}
                </div>
              )}
              {chapter.destinations && chapter.destinations.length > 1 && (
                <div className="mn-row mn-scroll" role="radiogroup" aria-label="Where to mine">
                  {chapter.destinations.map((t) => {
                    const far = t.orbit > base.rocket.maxOrbit
                    return (
                      <button
                        key={t.id}
                        role="radio"
                        aria-checked={t.id === chapter.target?.id}
                        className="mn-chip mn-pick"
                        disabled={far}
                        onClick={() => setPicked(t)}
                      >
                        {t.name.replace(/^\d+\s+/, '')}
                        {far ? ` · ${rocketReaching(t.orbit) ?? 'later'}` : ''}
                      </button>
                    )
                  })}
                </div>
              )}
              {hardOre && <p className="mn-warn">Upgrade the Hangar laser to cut {mineralName(hardOre)}.</p>}
              {blocked && (
                <p className="mn-warn">
                  Too far for the {base.rocket.name}. The Launchpad's next level brings the {blocked}.
                </p>
              )}
              {missing.length > 0 && (
                <p className="mn-warn">
                  Store {missing.map(([id, n]) => `${n} ${mineralName(id)}`).join(' and ')} first (Stockpile).
                </p>
              )}
              <button
                className="mn-cta"
                disabled={!chapter.mission || !chapter.target || !!blocked || !!hardOre || missing.length > 0}
                onClick={() => start(chapter)}
              >
                LAUNCH
              </button>
            </Modal>
          )
        })()}

      {sheet?.kind === 'structure' && (
        <Modal onClose={() => setSheet(null)} label={sheet.state.def.name}>
          <p className="mn-title">
            {sheet.state.def.name} · LV {sheet.state.level}
          </p>
          <p>
            {sheet.state.def.counts
              ? `Levels up from ${sheet.state.def.unit[1]}.`
              : 'Levels up from every mission.'}{' '}
            {counterText(sheet.state)}.
          </p>
          <ol className="mn-levels">
            {sheet.state.def.unlocks.map((u, i) => (
              <li key={i} className={i < sheet.state.level ? 'mn-have' : i === sheet.state.level ? 'mn-next' : ''}>
                <b>{i < sheet.state.level ? '✓' : `LV ${i + 1}`}</b>
                <span>{u.line}</span>
              </li>
            ))}
          </ol>
          <button className="mn-cta" onClick={() => setSheet(null)}>
            OK
          </button>
        </Modal>
      )}

      {toast && (
        <p className="mn-toast" role="status">
          {toast}
        </p>
      )}
    </main>
  )
}

function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = dialog.current
    el?.showModal()
    return () => el?.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      className="mn-native-dialog"
      aria-label={label}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="mn-card mn-sheet">
        <button className="sheet-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {children}
      </section>
    </dialog>
  )
}

function Ore({ id, n }: { id: string; n?: number }) {
  const meta = MINERAL_META[id]
  return (
    <span className="mn-chip mn-ore-chip">
      <i style={{ background: meta?.color ?? '#ccc' }} />
      {n ? `${n} ` : ''}
      {meta?.name ?? id}
    </span>
  )
}
