'use client'

import { useEffect, useMemo, useState } from 'react'
import { GalaxyMap } from '@/components/game/MissionBoard'
import { MINERAL_META, type Target } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import {
  PROBE_COLS,
  PROBE_ROWS,
  bodySurvey,
  depositTonnes,
  newSectors,
  nextSector,
  sectorDeposits,
  sectorIds,
  sectorsMapped,
} from '@/lib/probes/survey-probe'
import board from '@/components/game/MissionBoard.module.css'
import radio from './RadioMeteorScreen.module.css'
import styles from './ProbeScanScreen.module.css'

interface ProbeScanScreenProps {
  player: Player
  targets: readonly Target[]
  onBack: () => void
  /** Download the sectors the probes mapped since the last visit (a probe observation). */
  onCollect: () => void
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

/**
 * SSL-773: the survey probe's console in the data hub. The basic scan is automatic: the probe maps one sector at a
 * time on its own and this console shows what it has found, each deposit and its tonnes. Opening it downloads the
 * sectors mapped since the last visit. Scan levels with a player activity come in cycle 11.
 */
export default function ProbeScanScreen({ player, targets, onBack, onCollect }: ProbeScanScreenProps) {
  const now = Date.now()
  const bodies = useMemo(
    () => Object.keys(player.probes ?? {}).map(id => targets.find(target => target.id === id)).filter((target): target is Target => !!target),
    [player.probes, targets],
  )
  const [bodyId, setBodyId] = useState<string | null>(bodies[0]?.id ?? null)
  const body = bodies.find(target => target.id === bodyId) ?? bodies[0] ?? null
  const record = body ? player.probes?.[body.id] : undefined
  // Sectors new since the last visit, remembered for this visit so they stay marked NEW after the download.
  const [fresh] = useState(() => new Set(Object.entries(player.probes ?? {}).flatMap(([id, rec]) => newSectors(rec, now).map(s => `${id}:${s}`))))
  const [sector, setSector] = useState<string | null>(null)

  useEffect(() => { if (fresh.size) onCollect() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const mapped = new Set(sectorsMapped(record, now))
  const next = nextSector(record, now)
  const survey = body ? bodySurvey(body, record, now, rarity) : []
  const total = PROBE_COLS * PROBE_ROWS
  const freshHere = body ? [...fresh].filter(key => key.startsWith(`${body.id}:`)).length : 0
  const picked = sector && mapped.has(sector) && body ? sectorDeposits(body, sector) : null

  const line = !body ? 'No probe in orbit yet. Launch one from the Program tab and it starts mapping as soon as it arrives.'
    : picked ? `Sector ${sectorName(sector!)}: ${picked.length ? picked.map(m => `${mineralName(m)} ${tonnes(depositTonnes(body, sector!, m, rarity(m)))}`).join(', ') : 'bare rock, nothing worth mining'}.`
    : !next ? `${body.name} is fully mapped. Send a probe to another body to keep surveying.`
    : mapped.size === 0 ? `Probe in orbit at ${body.name}. The first sector is mapped in ${inTime(next.at - now)}.`
    : freshHere ? `${freshHere} new sector${freshHere === 1 ? '' : 's'} mapped since you last looked. Tap a sector to see what's in it.`
    : `Mapping ${body.name}. Sector ${sectorName(next.sector)} is done in ${inTime(next.at - now)}.`

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
          <section className={radio.receiver} aria-label="Probe map">
            <header className={radio.readout}>
              <span className={radio.eyebrow}>Survey probe · basic scan</span>
              <h2 data-testid="probe-body">{body ? body.name : 'No probe yet'}</h2>
            </header>
            <div className={styles.console}>
              <div className={styles.panel} data-testid="probe-console">
                <div className={radio.titlebar}>
                  <i className={radio.led} data-state={next ? 'live' : 'wait'} aria-hidden="true" />
                  <span>{!body ? 'NO PROBE' : next ? `MAPPING · NEXT ${inTime(next.at - now)}` : 'MAP COMPLETE'}</span>
                  <b data-testid="probe-title">{body ? `${mapped.size} / ${total} MAPPED` : ''}</b>
                </div>
                {bodies.length > 1 && (
                  <div className={styles.bodies} role="tablist" aria-label="Probes">
                    {bodies.map(item => (
                      <button key={item.id} type="button" role="tab" aria-selected={item.id === body?.id} className={styles.bodyTab} data-testid={`probe-body-${item.id}`} onClick={() => { setBodyId(item.id); setSector(null) }}>{item.name}</button>
                    ))}
                  </div>
                )}
                {body && (
                  <div className={styles.map} data-testid="probe-map" style={{ ['--cols' as string]: PROBE_COLS }} aria-label={`${body.name} sectors`}>
                    {sectorIds().map(id => {
                      const done = mapped.has(id)
                      const deposits = done ? sectorDeposits(body, id) : []
                      return (
                        <button
                          key={id}
                          type="button"
                          className={styles.sector}
                          data-read={done || undefined}
                          data-scanning={next?.sector === id || undefined}
                          data-new={fresh.has(`${body.id}:${id}`) || undefined}
                          data-selected={id === sector || undefined}
                          data-testid={`probe-sector-${id}`}
                          aria-label={`Sector ${sectorName(id)}${done ? `: ${deposits.map(mineralName).join(', ') || 'bare'}` : next?.sector === id ? ': mapping now' : ': not mapped yet'}`}
                          disabled={!done}
                          onClick={() => setSector(prev => prev === id ? null : id)}
                        >
                          <span className={styles.sectorName}>{sectorName(id)}</span>
                          {done && <span className={styles.dots}>{deposits.map(m => <i key={m} style={{ background: mineralColor(m) }} />)}</span>}
                        </button>
                      )
                    })}
                  </div>
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
            {body && (
              <div className={styles.found} data-testid="probe-found-list" aria-label="Deposits found">
                <span>Deposits found · {survey.length} of {body.minerals.length} types</span>
                {survey.length ? (
                  <ul>
                    {survey.map(row => (
                      <li key={row.mineral} data-testid={`probe-deposit-${row.mineral}`} data-picked={picked?.includes(row.mineral) || undefined}>
                        <i style={{ background: mineralColor(row.mineral) }} />
                        <b>{mineralName(row.mineral)}</b>
                        <small>{tonnes(row.tonnes)}</small>
                      </li>
                    ))}
                  </ul>
                ) : <p>Nothing yet. The first deposits show here once a sector is mapped.</p>}
              </div>
            )}
          </section>
        </article>
      </section>
    </div>
  )
}
