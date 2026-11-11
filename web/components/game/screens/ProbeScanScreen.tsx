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

/** The sector just logged; its score is read back from the save. */
type Last = { sector: string } | null

/**
 * SSL-773: the survey probe's console in the data hub. The body's map is split into sectors; the player pulls a
 * sector's reading, sweeps the spectrum with the BAND dial, matches the dips to the reference bands and logs what
 * they see. Logging is a probe observation (a research stamp) and puts that sector's deposits on the map.
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
  const firstUnread = sectorIds().find(id => !record?.readings[id]) ?? null
  const [sector, setSector] = useState<string | null>(firstUnread)
  const [pulled, setPulled] = useState<string | null>(null)
  const [marked, setMarked] = useState<string[]>([])
  const [cursor, setCursor] = useState(0.5)
  const [last, setLast] = useState<Last>(null)

  const bands = useMemo(() => (body ? bodyBands(body) : []), [body])
  const read = sector ? record?.readings[sector] : undefined
  const showing = sector && (pulled === sector || read) ? sector : null
  const spectrum = useMemo(() => (body && showing ? sectorSpectrum(body, showing, SPECTRUM_POINTS) : null), [body, showing])
  const found = body ? depositsFound(record, body) : []
  const readCount = Object.keys(record?.readings ?? {}).length
  const total = PROBE_COLS * PROBE_ROWS

  const choose = (id: string) => {
    setSector(id)
    setMarked([])
    setLast(null)
    if (pulled !== id) setPulled(null)
  }
  const switchBody = (id: string) => {
    setBodyId(id)
    const next = player.probes?.[id]
    const unread = sectorIds().find(sid => !next?.readings[sid]) ?? null
    setSector(unread)
    setPulled(null)
    setMarked([])
    setLast(null)
  }
  const pull = () => {
    if (!sector || read || left <= 0) return
    setPulled(sector)
    setMarked([])
    setLast(null)
  }
  const toggle = (mineral: string) => setMarked(prev => prev.includes(mineral) ? prev.filter(m => m !== mineral) : [...prev, mineral])
  const log = () => {
    if (!body || !sector || read || pulled !== sector) return
    onLog(body.id, sector, marked)
    setLast({ sector })
    setPulled(null)
    setMarked([])
  }

  // Score the reading that was just logged, now that the save holds it.
  const lastRead = last && body ? record?.readings[last.sector] : undefined
  const score = lastRead ? readingScore(lastRead.marked, lastRead.deposits) : null
  const nextUnread = sectorIds().find(id => !record?.readings[id]) ?? null

  const cursorNm = Math.round(BAND_MIN_NM + cursor * (BAND_MAX_NM - BAND_MIN_NM))
  const cursorValue = spectrum ? spectrum[Math.round(cursor * (SPECTRUM_POINTS - 1))] : null
  const x = (nm: number) => ((nm - BAND_MIN_NM) / (BAND_MAX_NM - BAND_MIN_NM)) * 100
  const path = spectrum ? spectrum.map((v, i) => `${i ? 'L' : 'M'}${((i / (SPECTRUM_POINTS - 1)) * 100).toFixed(2)} ${(100 - v * 100).toFixed(2)}`).join('') : ''

  const line = !body ? 'No probe in orbit yet. Launch one from the Program tab and its readings land here.'
    : lastRead && score ? (score.missed === 0 && score.wrong === 0
      ? `Sector ${sectorName(last!.sector)} logged: ${lastRead.deposits.length ? lastRead.deposits.map(mineralName).join(' and ') : 'bare rock'}, exactly what you marked. It's on the map.`
      : `Sector ${sectorName(last!.sector)} logged. You found ${score.found} of ${lastRead.deposits.length}${score.wrong ? `, and ${score.wrong} mark had no dip under it` : ''}. The map now shows what is really there.`)
    : read ? `Sector ${sectorName(sector!)} is already on the map: ${read.deposits.length ? read.deposits.map(mineralName).join(', ') : 'bare rock'}.`
    : !sector ? `Every sector of ${body.name} is mapped. Nice work. Send a probe to another body for more.`
    : left <= 0 ? `That's today's ${PROBE_READINGS_PER_DAY} readings from ${body.name}. The probe sends more tomorrow.`
    : pulled === sector ? 'Sweep the BAND dial along the trace. Every dip below the line is a deposit soaking up light. Match each dip to a reference band and mark it, then log it.'
    : `Probe over ${body.name}, sector ${sectorName(sector)}. Pull its reading when you're ready.`

  return (
    <div className={board.scene} data-testid="probe-scan-screen" data-screen="probe-scan">
      <section className={board.dispatch} aria-label="Survey probe">
        <nav className={board.rail} aria-label="Survey probe">
          <button type="button" className={`${board.round} ${board.railClose}`} data-testid="probe-back" aria-label="Close" onClick={onBack}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6" /></svg>
          </button>
        </nav>
        <GalaxyMap targets={[]} mode="ambient" view="belt" onView={() => {}} />
        <article className={radio.workspace}>
          <section className={radio.receiver} aria-label="Probe console">
            <header className={radio.readout}>
              <span className={radio.eyebrow}>Survey probe · in orbit</span>
              <h2 data-testid="probe-body">{body ? body.name : 'No probe yet'}</h2>
            </header>
            <div className={styles.console}>
              <div className={styles.panel} data-testid="probe-console">
                <div className={radio.titlebar}>
                  <i className={radio.led} data-state={left > 0 ? 'live' : 'wait'} aria-hidden="true" />
                  <span>{left > 0 ? 'DOWNLINK' : 'NEXT PASS TOMORROW'}</span>
                  <b data-testid="probe-title">{body ? `${readCount} / ${total} SECTORS` : 'NO PROBE'}</b>
                </div>
                {bodies.length > 1 && (
                  <div className={styles.bodies} role="tablist" aria-label="Probes">
                    {bodies.map(item => (
                      <button key={item.id} type="button" role="tab" aria-selected={item.id === body?.id} className={styles.bodyTab} data-testid={`probe-body-${item.id}`} onClick={() => switchBody(item.id)}>{item.name}</button>
                    ))}
                  </div>
                )}
                {body && (
                  <div className={styles.views}>
                    <div className={styles.map} data-testid="probe-map" style={{ ['--cols' as string]: PROBE_COLS }} aria-label={`${body.name} sectors`}>
                      {sectorIds().map(id => {
                        const reading = record?.readings[id]
                        return (
                          <button
                            key={id}
                            type="button"
                            className={styles.sector}
                            data-read={!!reading || undefined}
                            data-selected={id === sector || undefined}
                            data-testid={`probe-sector-${id}`}
                            aria-label={`Sector ${sectorName(id)}${reading ? `: ${reading.deposits.map(mineralName).join(', ') || 'bare'}` : ''}`}
                            onClick={() => choose(id)}
                          >
                            <span className={styles.sectorName}>{sectorName(id)}</span>
                            {reading && <span className={styles.dots}>{reading.deposits.map(m => <i key={m} style={{ background: mineralColor(m) }} />)}</span>}
                          </button>
                        )
                      })}
                    </div>
                    <div className={styles.trace} data-testid={spectrum ? 'probe-spectrum' : 'probe-standby'}>
                      {spectrum ? (
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={`Reflectance spectrum of sector ${sectorName(showing!)}`}>
                          <path d={path} className={styles.line} vectorEffect="non-scaling-stroke" />
                          <line x1={cursor * 100} x2={cursor * 100} y1="0" y2="100" className={styles.cursor} vectorEffect="non-scaling-stroke" />
                        </svg>
                      ) : (
                        <p className={styles.standby}>{read ? 'MAPPED' : left > 0 ? 'PULL READING' : 'NO PASS'}</p>
                      )}
                      <span className={styles.axis} aria-hidden="true"><b>{BAND_MIN_NM} nm</b><b>{cursorNm} nm{cursorValue != null ? ` · ${cursorValue.toFixed(2)}` : ''}</b><b>{BAND_MAX_NM} nm</b></span>
                    </div>
                    <div className={styles.reference} aria-label="Reference bands" data-testid="probe-reference">
                      {bands.map(band => <span key={band.mineral} style={{ left: `${x(band.nm)}%`, color: mineralColor(band.mineral) }} title={`${mineralName(band.mineral)} ${band.nm} nm`}><i />{MINERAL_META[band.mineral]?.sym ?? band.mineral}</span>)}
                    </div>
                  </div>
                )}
                <div className={radio.deck}>
                  <Dial label="BAND" testId="probe-band" readout={`${cursorNm} nm`} value={cursor} min={0} max={1} step={0.01} disabled={!spectrum} onChange={setCursor} />
                  <button type="button" className={styles.key} data-testid="probe-pull" disabled={!sector || !!read || left <= 0 || pulled === sector} onClick={pull}>PULL READING</button>
                </div>
              </div>
            </div>
          </section>
          <section className={radio.desk} aria-label="Probe desk">
            <div className={radio.comms} data-testid="probe-dialogue" aria-live="polite">
              <span className={radio.speaker}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" /></svg>
                Probe desk{body ? ` · ${body.name}` : ''}
              </span>
              <p data-testid="probe-line">{line}</p>
              {lastRead && nextUnread && left > 0 && (
                <button type="button" className={radio.next} data-testid="probe-next-sector" onClick={() => choose(nextUnread)}>NEXT SECTOR · {sectorName(nextUnread)}</button>
              )}
            </div>
            {body && (
              <div className={styles.marks} data-testid="probe-marks" aria-label="Deposits you see">
                <span>{pulled === sector ? 'Mark the dips you see' : 'Reference library'}</span>
                <div>
                  {bands.map(band => (
                    <button key={band.mineral} type="button" className={styles.mark} aria-pressed={marked.includes(band.mineral)} data-testid={`probe-mark-${band.mineral}`} disabled={pulled !== sector} onClick={() => toggle(band.mineral)}>
                      <i style={{ background: mineralColor(band.mineral) }} />{mineralName(band.mineral)}<small>{band.nm} nm</small>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className={radio.tally}>
              <span><b data-testid="probe-left">{left}</b>left today</span>
              <span><b data-testid="probe-found">{found.length}</b>deposits found</span>
            </div>
            <div className={styles.actions}>
              <button type="button" className={board.contractTake} data-testid="probe-log" disabled={!body || !sector || !!read || pulled !== sector} onClick={log}>
                {read ? 'LOGGED' : marked.length ? `LOG ${marked.length} DEPOSIT${marked.length === 1 ? '' : 'S'}` : 'LOG BARE SECTOR'}
              </button>
            </div>
          </section>
        </article>
      </section>
    </div>
  )
}
