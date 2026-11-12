'use client'

import { useMemo, useState } from 'react'
import { GalaxyMap } from '@/components/game/MissionBoard'
import { Dial } from './RadioMeteorScreen'
import { MINERAL_META, type Target } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import {
  BAND_MAX_NM,
  BAND_MIN_NM,
  PROBE_COLS,
  PROBE_READINGS_PER_DAY,
  PROBE_ROWS,
  bodyBands,
  depositsFound,
  readingScore,
  readingsLeft,
  sectorIds,
  sectorSpectrum,
} from '@/lib/probes/survey-probe'
import board from '@/components/game/MissionBoard.module.css'
import radio from './RadioMeteorScreen.module.css'
import styles from './ProbeScanScreen.module.css'

interface ProbeScanScreenProps {
  player: Player
  targets: readonly Target[]
  onBack: () => void
  /** Log one reading: the minerals the player marked in the sector's spectrum. */
  onLog: (targetId: string, sectorId: string, marked: string[]) => void
}

const SPECTRUM_POINTS = 96
const sectorName = (id: string) => {
  const [c, r] = id.split('_').map(Number)
  return `${String.fromCharCode(65 + r)}${c + 1}`
}
const mineralName = (id: string) => MINERAL_META[id]?.name ?? id
const mineralColor = (id: string) => MINERAL_META[id]?.color ?? '#9de7ef'

/** The console's three pages: pick a sector on the map, read its spectrum, see what was logged. */
type Step = 'map' | 'read' | 'logged'
const STEPS: { id: Step, label: string }[] = [{ id: 'map', label: 'Pick' }, { id: 'read', label: 'Read' }, { id: 'logged', label: 'Logged' }]

/**
 * SSL-773: the survey probe's console in the data hub, one page per step so nothing scrolls. MAP: the body's sectors,
 * pick one and pull its reading. READ: sweep the spectrum with the BAND dial, mark each dip against the reference
 * bands and log it. LOGGED: what is really in that sector, now drawn on the map. Logging is a probe observation.
 */
export default function ProbeScanScreen({ player, targets, onBack, onLog }: ProbeScanScreenProps) {
  const now = Date.now()
  const bodies = useMemo(
    () => Object.keys(player.probes ?? {}).map(id => targets.find(target => target.id === id)).filter((target): target is Target => !!target),
    [player.probes, targets],
  )
  const [bodyId, setBodyId] = useState<string | null>(bodies[0]?.id ?? null)
  const body = bodies.find(target => target.id === bodyId) ?? bodies[0] ?? null
  const record = body ? player.probes?.[body.id] : undefined
  const left = readingsLeft(record, now)
  const [sector, setSector] = useState<string | null>(sectorIds().find(id => !record?.readings[id]) ?? null)
  const [step, setStep] = useState<Step>('map')
  const [marked, setMarked] = useState<string[]>([])
  const [cursor, setCursor] = useState(0.5)

  const bands = useMemo(() => (body ? bodyBands(body) : []), [body])
  const read = sector ? record?.readings[sector] : undefined
  const reading = step !== 'map' && sector ? sector : null
  const spectrum = useMemo(() => (body && reading ? sectorSpectrum(body, reading, SPECTRUM_POINTS) : null), [body, reading])
  const found = body ? depositsFound(record, body) : []
  const readCount = Object.keys(record?.readings ?? {}).length
  const total = PROBE_COLS * PROBE_ROWS
  const nextUnread = sectorIds().find(id => !record?.readings[id]) ?? null
  const score = step === 'logged' && read ? readingScore(read.marked, read.deposits) : null
  const reviewing = step === 'read' && !!read

  const choose = (id: string) => { setSector(id); setMarked([]) }
  const switchBody = (id: string) => {
    setBodyId(id)
    const next = player.probes?.[id]
    setSector(sectorIds().find(sid => !next?.readings[sid]) ?? null)
    setMarked([])
    setStep('map')
  }
  const open = () => {
    if (!sector || (!read && left <= 0)) return
    setMarked(read ? read.marked : [])
    setCursor(0.5)
    setStep('read')
  }
  const toMap = (id: string | null = sector) => { if (id) choose(id); setStep('map') }
  const toggle = (mineral: string) => setMarked(prev => prev.includes(mineral) ? prev.filter(m => m !== mineral) : [...prev, mineral])
  const log = () => {
    if (!body || !sector || read || left <= 0) return
    onLog(body.id, sector, marked)
    setStep('logged')
  }

  const cursorNm = Math.round(BAND_MIN_NM + cursor * (BAND_MAX_NM - BAND_MIN_NM))
  const cursorValue = spectrum ? spectrum[Math.round(cursor * (SPECTRUM_POINTS - 1))] : null
  const x = (nm: number) => ((nm - BAND_MIN_NM) / (BAND_MAX_NM - BAND_MIN_NM)) * 100
  const path = spectrum ? spectrum.map((v, i) => `${i ? 'L' : 'M'}${((i / (SPECTRUM_POINTS - 1)) * 100).toFixed(2)} ${(100 - v * 100).toFixed(2)}`).join('') : ''
  const named = (list: readonly string[]) => list.length ? list.map(mineralName).join(' and ') : 'bare rock'

  const line = !body ? 'No probe in orbit yet. Launch one from the Program tab and its readings land here.'
    : step === 'logged' && read && score ? (score.missed === 0 && score.wrong === 0
      ? `Sector ${sectorName(sector!)}: ${named(read.deposits)}, exactly what you marked. It's on the map.`
      : `Sector ${sectorName(sector!)} holds ${named(read.deposits)}. You found ${score.found} of ${read.deposits.length}${score.wrong ? `, and ${score.wrong} mark had no dip under it` : ''}. The map shows what is really there.`)
    : step === 'read' ? (reviewing
      ? `Your reading of sector ${sectorName(sector!)}. It holds ${named(read!.deposits)}.`
      : 'Turn the BAND dial along the trace. Each dip below the line is a deposit soaking up light. Mark the ones you see, then log.')
    : !sector ? `Every sector of ${body.name} is mapped. Send a probe to another body for more.`
    : read ? `Sector ${sectorName(sector)} is mapped: ${named(read.deposits)}.`
    : left <= 0 ? `That's today's ${PROBE_READINGS_PER_DAY} readings from ${body.name}. The probe sends more tomorrow.`
    : `Probe over ${body.name}. Pick a sector on the map, then pull its reading.`

  const map = body && (
    <div className={styles.map} data-testid="probe-map" style={{ ['--cols' as string]: PROBE_COLS }} aria-label={`${body.name} sectors`}>
      {sectorIds().map(id => {
        const saved = record?.readings[id]
        return (
          <button
            key={id}
            type="button"
            className={styles.sector}
            data-read={!!saved || undefined}
            data-selected={id === sector || undefined}
            data-testid={`probe-sector-${id}`}
            aria-label={`Sector ${sectorName(id)}${saved ? `: ${saved.deposits.map(mineralName).join(', ') || 'bare'}` : ''}`}
            disabled={step !== 'map'}
            onClick={() => choose(id)}
          >
            <span className={styles.sectorName}>{sectorName(id)}</span>
            {saved && <span className={styles.dots}>{saved.deposits.map(m => <i key={m} style={{ background: mineralColor(m) }} />)}</span>}
          </button>
        )
      })}
    </div>
  )
  const tally = (
    <div className={radio.tally}>
      <span><b data-testid="probe-left">{left}</b>left today</span>
      <span><b data-testid="probe-found">{found.length}</b>deposits found</span>
    </div>
  )

  return (
    <div className={board.scene} data-testid="probe-scan-screen" data-screen="probe-scan" data-step={step}>
      <section className={board.dispatch} aria-label="Survey probe">
        <nav className={board.rail} aria-label="Survey probe">
          <button type="button" className={`${board.round} ${board.railClose}`} data-testid="probe-back" aria-label="Close" onClick={onBack}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6" /></svg>
          </button>
        </nav>
        <GalaxyMap targets={[]} mode="ambient" view="belt" onView={() => {}} />
        <article className={radio.workspace}>
          <section className={radio.receiver} aria-label="Probe console">
            <header className={`${radio.readout} ${styles.readout}`}>
              <span className={radio.eyebrow}>Survey probe · {body ? body.name : 'no probe yet'}</span>
              {body && (
                <ol className={styles.steps} aria-label="Steps" data-testid="probe-steps">
                  {STEPS.map((item, i) => (
                    <li key={item.id} aria-current={item.id === step ? 'step' : undefined} data-done={STEPS.findIndex(s => s.id === step) > i || undefined}>
                      <b>{i + 1}</b>{item.label}
                    </li>
                  ))}
                </ol>
              )}
            </header>
            <div className={styles.console}>
              <div className={styles.panel} data-testid="probe-console">
                <div className={radio.titlebar}>
                  <i className={radio.led} data-state={left > 0 ? 'live' : 'wait'} aria-hidden="true" />
                  <span>{step === 'map' ? (left > 0 ? 'DOWNLINK' : 'NEXT PASS TOMORROW') : `SECTOR ${sector ? sectorName(sector) : ''}`}</span>
                  <b data-testid="probe-title">{body ? `${readCount} / ${total} MAPPED` : 'NO PROBE'}</b>
                </div>
                {step === 'map' && bodies.length > 1 && (
                  <div className={styles.bodies} role="tablist" aria-label="Probes">
                    {bodies.map(item => (
                      <button key={item.id} type="button" role="tab" aria-selected={item.id === body?.id} className={styles.bodyTab} data-testid={`probe-body-${item.id}`} onClick={() => switchBody(item.id)}>{item.name}</button>
                    ))}
                  </div>
                )}
                {step !== 'read' && map}
                {step === 'read' && spectrum && (
                  <>
                    <div className={styles.trace} data-testid="probe-spectrum">
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={`Reflectance spectrum of sector ${sectorName(reading!)}`}>
                        <path d={path} className={styles.line} vectorEffect="non-scaling-stroke" />
                        <line x1={cursor * 100} x2={cursor * 100} y1="0" y2="100" className={styles.cursor} vectorEffect="non-scaling-stroke" />
                      </svg>
                      <span className={styles.axis} aria-hidden="true"><b>{BAND_MIN_NM} nm</b><b>{cursorNm} nm{cursorValue != null ? ` · ${cursorValue.toFixed(2)}` : ''}</b><b>{BAND_MAX_NM} nm</b></span>
                    </div>
                    <div className={styles.reference} aria-label="Reference bands" data-testid="probe-reference">
                      {bands.map(band => <span key={band.mineral} style={{ left: `${x(band.nm)}%`, color: mineralColor(band.mineral) }} title={`${mineralName(band.mineral)} ${band.nm} nm`}><i />{MINERAL_META[band.mineral]?.sym ?? band.mineral}</span>)}
                    </div>
                    <div className={radio.deck}>
                      <Dial label="BAND" testId="probe-band" readout={`${cursorNm} nm`} value={cursor} min={0} max={1} step={0.01} onChange={setCursor} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
          <section className={radio.desk} aria-label="Probe desk">
            <div className={radio.comms} data-testid="probe-dialogue" aria-live="polite">
              <span className={radio.speaker}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" /></svg>
                Probe desk
              </span>
              <p data-testid="probe-line">{line}</p>
            </div>
            {step === 'read' && (
              <div className={styles.marks} data-testid="probe-marks" aria-label="Deposits you see">
                <span>{reviewing ? 'What you marked' : 'Mark the dips you see'}</span>
                <div>
                  {bands.map(band => (
                    <button key={band.mineral} type="button" className={styles.mark} aria-pressed={marked.includes(band.mineral)} data-testid={`probe-mark-${band.mineral}`} disabled={reviewing} onClick={() => toggle(band.mineral)}>
                      <i style={{ background: mineralColor(band.mineral) }} />{mineralName(band.mineral)}<small>{band.nm} nm</small>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {step !== 'read' && tally}
            <div className={styles.actions}>
              {step === 'map' && body && (
                <button type="button" className={board.contractTake} data-testid="probe-pull" disabled={!sector || (!read && left <= 0)} onClick={open}>
                  {!sector ? 'ALL MAPPED' : read ? `VIEW READING · ${sectorName(sector)}` : left <= 0 ? 'NO PASS LEFT TODAY' : `PULL READING · ${sectorName(sector)}`}
                </button>
              )}
              {step === 'read' && !reviewing && (
                <button type="button" className={board.contractTake} data-testid="probe-log" disabled={left <= 0} onClick={log}>
                  {marked.length ? `LOG ${marked.length} DEPOSIT${marked.length === 1 ? '' : 'S'}` : 'LOG BARE SECTOR'}
                </button>
              )}
              {step === 'logged' && nextUnread && left > 0 && (
                <button type="button" className={board.contractTake} data-testid="probe-next-sector" onClick={() => toMap(nextUnread)}>NEXT SECTOR · {sectorName(nextUnread)}</button>
              )}
              {step !== 'map' && (
                <button type="button" className={`${radio.brief} ${styles.back}`} data-testid="probe-to-map" onClick={() => toMap()}>BACK TO MAP</button>
              )}
            </div>
          </section>
        </article>
      </section>
    </div>
  )
}
