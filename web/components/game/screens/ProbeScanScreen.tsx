'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { GalaxyMap } from '@/components/game/MissionBoard'
import { MINERAL_META, type Target } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import { probeContracts, probeRunMission } from '@/lib/probes/probe-offers'
import {
  PROBE_COLS,
  PROBE_ROWS,
  sectorMsOf,
  newSectors,
  nextSector,
  scanOrder,
  sectorDeposits,
  sectorsMapped,
  surveyOf,
} from '@/lib/probes/survey-probe'
import board from '@/components/game/MissionBoard.module.css'
import styles from './ProbeScanScreen.module.css'

interface ProbeScanScreenProps {
  player: Player
  targets: readonly Target[]
  onBack: () => void
  /** Download the sectors the probes mapped since the last visit (a probe observation). */
  onCollect: () => void
  /** Leave for the hub from the readout. */
  onHub: () => void
  /** Open the Free run tab on this body with its targeted run picked. */
  onPlanRun: (targetId: string, runId: string) => void
  /** Open the Contracts tab showing only this body's offers. */
  onViewContracts: (targetId: string) => void
}

const sectorName = (id: string) => {
  const [c, r] = id.split('_').map(Number)
  return `${String.fromCharCode(65 + r)}${c + 1}`
}
const mineralName = (id: string) => MINERAL_META[id]?.name ?? id
const mineralColor = (id: string) => MINERAL_META[id]?.color ?? '#9de7ef'
const rarity = (id: string) => MINERAL_META[id]?.rarity
const tonnes = (n: number) => `${n.toLocaleString('en-GB')} t`
const inTime = (ms: number) => {
  const mins = Math.max(1, Math.ceil(ms / 60_000))
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m` : `${mins}m`
}
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Seconds between sectors while the console plays back what the probe mapped since the last visit. */
const PLAYBACK_MS = 650

// The orbit stage, in SVG units: the body in the middle, a tilted orbit around it.
const W = 380
const H = 290
const CX = 190
const CY = 145
const R = 102
const RX = 172
const RY = 50
const TILT = -14 * Math.PI / 180
const ORBIT_S = 9

const BODY_TONES: Record<string, [string, string]> = {
  mercury: ['#b3a89c', '#5d554e'], venus: ['#e8c88a', '#8a6a3a'], mars: ['#d97a4a', '#6e2e1a'],
  jupiter: ['#e2bf92', '#7a5838'], europa: ['#e4dccb', '#7d7462'], ceres: ['#a49d94', '#4a4540'],
}
const ASTEROID_TONE: [string, string] = ['#9a8a74', '#3e352c']

function orbitPoint(angle: number) {
  const x = RX * Math.cos(angle)
  const y = RY * Math.sin(angle)
  return { x: CX + x * Math.cos(TILT) - y * Math.sin(TILT), y: CY + x * Math.sin(TILT) + y * Math.cos(TILT), front: Math.sin(angle) > 0 }
}

function cellBox(id: string) {
  const [c, r] = id.split('_').map(Number)
  const w = (2 * R) / PROBE_COLS
  const h = (2 * R) / PROBE_ROWS
  return { x: CX - R + c * w, y: CY - R + r * h, w, h }
}

function Satellite() {
  return (
    <g className={styles.sat}>
      <rect x={-17} y={-4} width={11} height={8} rx={1} className={styles.panelWing} />
      <rect x={6} y={-4} width={11} height={8} rx={1} className={styles.panelWing} />
      <rect x={-6} y={-6} width={12} height={12} rx={2} className={styles.bus} />
      <circle cx={0} cy={0} r={2.4} className={styles.lens} />
    </g>
  )
}

/**
 * SSL-773: the survey probe's console. The basic scan is automatic, so the console is a view of the probe at work,
 * the way Tiny Space Program shows a satellite: the probe circles the body, scan flashes go off, the map fills in
 * and a progress bar counts the sectors. Opening it plays back the sectors mapped since the last visit, then the
 * readout says what was found and offers a free targeted run there and the client contracts the finds opened.
 */
export default function ProbeScanScreen({ player, targets, onBack, onCollect, onHub, onPlanRun, onViewContracts }: ProbeScanScreenProps) {
  const [now] = useState(() => Date.now())
  const bodies = useMemo(
    () => Object.keys(player.probes ?? {}).map(id => targets.find(target => target.id === id)).filter((target): target is Target => !!target),
    [player.probes, targets],
  )
  const [bodyId, setBodyId] = useState<string | null>(bodies[0]?.id ?? null)
  const body = bodies.find(target => target.id === bodyId) ?? bodies[0] ?? null
  const record = body ? player.probes?.[body.id] : undefined
  // Sectors new since the last visit, per body, remembered for this visit so the playback survives the download.
  const [fresh] = useState(() => Object.fromEntries(Object.entries(player.probes ?? {}).map(([id, rec]) => [id, newSectors(rec, now)])))
  const mapped = sectorsMapped(record, now)
  const freshHere = body ? fresh[body.id] ?? [] : []
  const before = mapped.length - freshHere.length
  const [played, setPlayed] = useState<Record<string, number>>({})
  const shown = body ? Math.max(before, Math.min(mapped.length, played[body.id] ?? before)) : 0
  const playing = shown < mapped.length
  const next = nextSector(record, now)

  useEffect(() => { if (Object.values(fresh).some(list => list.length)) onCollect() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Play the new sectors back one at a time, a scan flash on each.
  const [flash, setFlash] = useState<{ key: number; x: number; y: number; sector: string | null } | null>(null)
  const satPos = useRef(orbitPoint(0))
  useEffect(() => {
    if (!body || !playing) return
    if (reducedMotion()) { setPlayed(p => ({ ...p, [body.id]: mapped.length })); return }
    const timer = window.setTimeout(() => {
      const sector = scanOrder()[shown]
      const box = cellBox(sector)
      setFlash({ key: Date.now(), x: box.x + box.w / 2, y: box.y + box.h / 2, sector })
      setPlayed(p => ({ ...p, [body.id]: shown + 1 }))
    }, shown === before ? 900 : PLAYBACK_MS)
    return () => window.clearTimeout(timer)
  }, [body?.id, playing, shown, before, mapped.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Between playbacks, an occasional flash where the probe is scanning now.
  useEffect(() => {
    if (!body || playing || !next || reducedMotion()) return
    const timer = window.setInterval(() => {
      const box = cellBox(next.sector)
      setFlash({ key: Date.now(), x: box.x + box.w * (0.25 + Math.random() * 0.5), y: box.y + box.h * (0.25 + Math.random() * 0.5), sector: null })
    }, 2600)
    return () => window.clearInterval(timer)
  }, [body?.id, playing, next?.sector]) // eslint-disable-line react-hooks/exhaustive-deps

  // The probe's orbit, driven by the clock so it never stutters with React renders.
  const backRef = useRef<SVGGElement>(null)
  const frontRef = useRef<SVGGElement>(null)
  useEffect(() => {
    if (!body) return
    let frame = 0
    const still = reducedMotion()
    const tick = (t: number) => {
      const angle = still ? 0.9 : (t / 1000) * (2 * Math.PI / ORBIT_S)
      const p = orbitPoint(angle)
      satPos.current = p
      for (const [el, show] of [[backRef.current, !p.front], [frontRef.current, p.front]] as const) {
        if (!el) continue
        el.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${p.front ? 1.15 : 0.85})`)
        el.style.opacity = show ? '1' : '0'
      }
      if (!still) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [!!body]) // eslint-disable-line react-hooks/exhaustive-deps

  const shownSectors = scanOrder().slice(0, shown)
  const shownSet = new Set(shownSectors)
  const scanningId = playing ? scanOrder()[shown] : next?.sector ?? null
  const freshSet = new Set(freshHere)
  const survey = body ? surveyOf(body, shownSectors, rarity) : []
  const known = new Set(body ? surveyOf(body, scanOrder().slice(0, before)).map(row => row.mineral) : [])
  const newTypes = survey.filter(row => !known.has(row.mineral)).map(row => row.mineral)
  const flown = new Set((player.completedMissions ?? []).map(item => item.id))
  const run = body && !playing ? probeRunMission(body, survey) : null
  const contracts = body && !playing ? probeContracts(body, survey, flown) : []
  const newContracts = contracts.filter(contract => newTypes.some(mineral => contract.requires.minerals[mineral])).length
  const total = PROBE_COLS * PROBE_ROWS
  const [tone, shade] = body ? BODY_TONES[body.id] ?? ASTEROID_TONE : ASTEROID_TONE

  const line = !body ? 'No probe in orbit yet. Launch one from the Program tab and it starts mapping as soon as it arrives.'
    : playing ? `Receiving sector ${sectorName(scanOrder()[shown])}…`
    : freshHere.length ? `${freshHere.length} new sector${freshHere.length === 1 ? '' : 's'} mapped since you last looked${newTypes.length ? `: ${newTypes.length} new mineral type${newTypes.length === 1 ? '' : 's'} found` : ''}.`
    : mapped.length === 0 ? `Probe in orbit at ${body.name}. The first sector is mapped in ${next ? inTime(next.at - now) : 'a moment'}.`
    : !next ? `${body.name} is fully mapped. Every deposit is on file.`
    : `Nothing new since you last looked. Sector ${sectorName(next.sector)} is done in ${inTime(next.at - now)}.`

  return (
    <div className={board.scene} data-testid="probe-scan-screen" data-screen="probe-scan">
      <section className={board.dispatch} aria-label="Survey probe">
        <nav className={board.rail} aria-label="Survey probe">
          <button type="button" className={`${board.round} ${board.railClose}`} data-testid="probe-back" aria-label="Close" onClick={onBack}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6" /></svg>
          </button>
        </nav>
        <GalaxyMap targets={[]} mode="ambient" view="belt" onView={() => {}} />
        <article className={styles.workspace}>
          <section className={styles.stage} aria-label="Probe in orbit">
            <header className={styles.head}>
              <span className={styles.eyebrow}>Survey probe · basic scan</span>
              <h2 data-testid="probe-body">{body ? body.name : 'No probe yet'}</h2>
            </header>
            {bodies.length > 1 && (
              <div className={styles.bodies} role="tablist" aria-label="Probes">
                {bodies.map(item => (
                  <button key={item.id} type="button" role="tab" aria-selected={item.id === body?.id} className={styles.bodyTab} data-testid={`probe-body-${item.id}`} onClick={() => setBodyId(item.id)}>{item.name.replace(/^\d+\s+/, '')}</button>
                ))}
              </div>
            )}
            <div className={styles.view}>
              <svg viewBox={`0 0 ${W} ${H}`} className={styles.orbit} data-testid="probe-map" role="img" aria-label={body ? `${body.name}: ${shown} of ${total} sectors mapped` : 'No probe'}>
                <defs>
                  <radialGradient id="probe-body" cx="38%" cy="34%" r="70%">
                    <stop offset="0" stopColor={tone} />
                    <stop offset="1" stopColor={shade} />
                  </radialGradient>
                  <radialGradient id="probe-night" cx="30%" cy="30%" r="85%">
                    <stop offset=".55" stopColor="#000" stopOpacity="0" />
                    <stop offset="1" stopColor="#020611" stopOpacity=".75" />
                  </radialGradient>
                  <clipPath id="probe-disc"><circle cx={CX} cy={CY} r={R} /></clipPath>
                </defs>
                <g transform={`rotate(${TILT * 180 / Math.PI} ${CX} ${CY})`}>
                  <path d={`M ${CX - RX} ${CY} A ${RX} ${RY} 0 0 1 ${CX + RX} ${CY}`} className={styles.track} data-half="back" />
                </g>
                {body && <g ref={backRef}><Satellite /></g>}
                {body && (
                  <g>
                    <circle cx={CX} cy={CY} r={R} fill="url(#probe-body)" />
                    <g clipPath="url(#probe-disc)">
                      <circle cx={CX - 30} cy={CY - 22} r={14} className={styles.crater} />
                      <circle cx={CX + 34} cy={CY + 30} r={20} className={styles.crater} />
                      <circle cx={CX + 18} cy={CY - 46} r={8} className={styles.crater} />
                      {scanOrder().map(id => {
                        const box = cellBox(id)
                        const done = shownSet.has(id)
                        const deposits = done ? sectorDeposits(body, id) : []
                        return (
                          <g key={id} data-testid={`probe-sector-${id}`} data-read={done || undefined} data-new={done && freshSet.has(id) || undefined} data-scanning={id === scanningId || undefined}>
                            <rect x={box.x} y={box.y} width={box.w} height={box.h} className={styles.cell} />
                            {deposits.map((m, i) => (
                              <circle key={m} cx={box.x + 9 + (i % 3) * 9} cy={box.y + box.h - 9 - Math.floor(i / 3) * 9} r={3.4} fill={mineralColor(m)} className={styles.deposit} />
                            ))}
                          </g>
                        )
                      })}
                      <circle cx={CX} cy={CY} r={R} fill="url(#probe-night)" />
                    </g>
                    <circle cx={CX} cy={CY} r={R} className={styles.rim} />
                  </g>
                )}
                <g transform={`rotate(${TILT * 180 / Math.PI} ${CX} ${CY})`}>
                  <path d={`M ${CX + RX} ${CY} A ${RX} ${RY} 0 0 1 ${CX - RX} ${CY}`} className={styles.track} data-half="front" />
                </g>
                {flash && (
                  <g key={flash.key} className={styles.flash} data-testid="probe-flash">
                    <line x1={satPos.current.x} y1={satPos.current.y} x2={flash.x} y2={flash.y} className={styles.beam} />
                    <circle cx={flash.x} cy={flash.y} r={6} className={styles.burst} />
                    {flash.sector && (() => { const box = cellBox(flash.sector); return <rect x={box.x} y={box.y} width={box.w} height={box.h} className={styles.land} /> })()}
                  </g>
                )}
                {body && <g ref={frontRef}><Satellite /></g>}
              </svg>
            </div>
            {body && (
              <div className={styles.progress} data-testid="probe-progress">
                <div className={styles.progressHead}>
                  <span><i className={styles.led} data-state={playing ? 'rx' : next ? 'live' : 'done'} aria-hidden="true" />{playing ? 'Downloading' : next ? 'Mapping' : 'Map complete'}</span>
                  <b data-testid="probe-title">{shown} / {total} sectors</b>
                </div>
                <div className={styles.bar} role="progressbar" aria-label="Sectors mapped" aria-valuemin={0} aria-valuemax={total} aria-valuenow={shown}>
                  <i style={{ width: `${(shown / total) * 100}%` }} />
                  {next && !playing && <i className={styles.barNext} style={{ left: `${(shown / total) * 100}%`, width: `${(1 / total) * 100}%`, ['--part' as string]: 1 - (next.at - now) / sectorMsOf(record) }} />}
                </div>
                <small>{playing ? `Sector ${sectorName(scanOrder()[shown])}` : next ? `Next sector ${sectorName(next.sector)} in ${inTime(next.at - now)}` : 'Every sector mapped'}</small>
              </div>
            )}
          </section>
          <section className={styles.desk} aria-label="Scan readout">
            <div className={styles.readout} data-testid="probe-readout" data-phase={playing ? 'playing' : 'done'}>
              <span className={styles.speaker}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" /></svg>
                Scan readout
              </span>
              <p data-testid="probe-line" aria-live="polite">{line}</p>
              {body && (
                <div className={styles.found} data-testid="probe-found-list" aria-label="Deposits found">
                  <span>Deposits · {survey.length} of {body.minerals.length} types</span>
                  {survey.length ? (
                    <ul>
                      {survey.map(row => (
                        <li key={row.mineral} data-testid={`probe-deposit-${row.mineral}`} data-new={newTypes.includes(row.mineral) || undefined}>
                          <i style={{ background: mineralColor(row.mineral) }} />
                          <b>{mineralName(row.mineral)}</b>
                          <small>{tonnes(row.tonnes)}</small>
                        </li>
                      ))}
                    </ul>
                  ) : <p>Nothing yet. Deposits show here as sectors are mapped.</p>}
                </div>
              )}
            </div>
            <div className={styles.actions}>
              {playing ? (
                <button type="button" className={styles.ghost} data-testid="probe-skip" onClick={() => body && setPlayed(p => ({ ...p, [body.id]: mapped.length }))}>Skip</button>
              ) : <>
                {body && (
                  <button type="button" className={styles.primary} data-testid="probe-plan-run" disabled={!run} onClick={() => body && run && onPlanRun(body.id, run.id)}>
                    <span>Targeted run</span><em>Free</em>
                  </button>
                )}
                {body && (
                  <button type="button" className={styles.secondary} data-testid="probe-contracts" disabled={!contracts.length} onClick={() => body && onViewContracts(body.id)}>
                    <span>{contracts.length ? `Contracts · ${contracts.length}` : 'No contracts'}</span>
                    {newContracts > 0 && <em>{newContracts} new</em>}
                  </button>
                )}
                <button type="button" className={styles.ghost} data-testid="probe-hub" onClick={onHub}>Back to hub</button>
              </>}
            </div>
          </section>
        </article>
      </section>
    </div>
  )
}
