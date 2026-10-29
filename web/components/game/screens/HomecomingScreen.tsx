'use client'

// SSL-553: back home. The rocket touches down on the Earth Base pad, then a roomy
// delivery sheet over the base settles the haul: per mineral, units go to the
// client (fulfils the contract), the underground silo, or the open market.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { MineralMeta, Mission } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import { formatCurrency } from '@/lib/format'
import HubScreen from './HubScreen'
import {
  clientDemand, clientPayout, contractFulfilled, defaultHomeSplit, marketValue, pick, releaseUnit, shiftUnit,
  siloRoomFor, splitTotals, type HomeDestination, type HomeSplit,
} from '@/lib/systems/HomeDeliverySystem'
import { sellUnitPrice } from '@/lib/systems/EconomySystem'
import styles from './HomecomingScreen.module.css'

export const TOUCHDOWN_MS = 2600
/** Cargo leaves the hold and the rocket is taken apart before the base returns. */
export const SETTLE_MS = 2400
const MAX_CRATES = 8

interface Crate { id: string; kind: 'silo' | 'sell'; color: string; x: number; y: number; delay: number }

interface Props {
  player: Player
  mission: Mission
  cargo: Record<string, number>
  minerals: Record<string, MineralMeta>
  clientName?: string
  onConfirm: (split: HomeSplit) => void
  /** Skip the touchdown (fixtures, reduced motion). */
  landed?: boolean
}

const CHOICES: { key: HomeDestination; label: string; hint: string }[] = [
  { key: 'client', label: 'Deliver to client', hint: 'Fulfils the contract' },
  { key: 'silo', label: 'Store in silo', hint: 'Underground storage' },
  { key: 'sell', label: 'Sell', hint: 'Commodity Exchange' },
]

export default function HomecomingScreen({ player, mission, cargo, minerals, clientName, onConfirm, landed = false }: Props) {
  const [down, setDown] = useState(landed)
  useEffect(() => {
    if (down) return
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const id = window.setTimeout(() => setDown(true), reduced ? 0 : TOUCHDOWN_MS)
    return () => window.clearTimeout(id)
  }, [down])

  const demand = useMemo(() => clientDemand(mission, cargo), [mission, cargo])
  const silo = useMemo(() => siloRoomFor(player, cargo), [player, cargo])
  const [split, setSplit] = useState<HomeSplit>(() => defaultHomeSplit(cargo, demand, silo.free))
  const totals = splitTotals(split)
  const payout = clientPayout(mission, split, demand, player.missionsDone)
  const fulfilled = contractFulfilled(split, demand)
  const hasClient = Object.keys(demand).length > 0
  const sale = marketValue(player, pick(split, 'sell'))
  const shortBy = Object.entries(demand).reduce((n, [id, want]) => n + Math.max(0, want - (split[id]?.client ?? 0)), 0)

  const rootRef = useRef<HTMLDivElement>(null)
  const [crates, setCrates] = useState<Crate[] | null>(null)
  const settling = crates !== null
  const settledTimer = useRef<number | null>(null)
  useEffect(() => () => { if (settledTimer.current) window.clearTimeout(settledTimer.current) }, [])

  // Settle: crates leave the rocket (stored ones sink into the ground, sold ones fly to the francs counter), the rocket is
  // dismantled from the top, then the settlement is confirmed.
  const settle = () => {
    if (settling) return
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const root = rootRef.current
    const rocket = root?.querySelector('[data-testid="pad-rocket"]')?.getBoundingClientRect()
    const box = root?.getBoundingClientRect()
    if (reduced || !rocket || !box) { onConfirm(split); return }
    const out: Crate[] = []
    for (const [id, row] of Object.entries(split)) {
      const color = minerals[id]?.color ?? '#c8ccd2'
      for (let i = 0; i < row.silo && out.length < MAX_CRATES; i++) out.push({ id: `${id}-s${i}`, kind: 'silo', color, x: 0, y: 0, delay: 0 })
      for (let i = 0; i < row.sell && out.length < MAX_CRATES; i++) out.push({ id: `${id}-m${i}`, kind: 'sell', color, x: 0, y: 0, delay: 0 })
    }
    const startX = rocket.left - box.left + rocket.width / 2
    const startY = rocket.top - box.top + rocket.height * 0.7
    setCrates(out.map((c, i) => ({ ...c, x: startX + (i % 4) * 10 - 15, y: startY, delay: i * 140 })))
    settledTimer.current = window.setTimeout(() => onConfirm(split), SETTLE_MS)
  }
  const soldUnits = totals.sell
  const storedUnits = totals.silo

  const available = (key: HomeDestination) => key === 'client' ? hasClient : key === 'silo' ? silo.built : true

  return (
    <div ref={rootRef} className={styles.root} data-testid="homecoming-screen" data-landed={down ? 'true' : 'false'} data-settling={settling ? 'true' : undefined}>
      <HubScreen player={player} homecoming padLanding={!down} onFocusBuilding={() => {}} onOpenScene={() => {}} />
      {down && !settling && (
        <div className={styles.scrim}>
          <section className={styles.sheet} aria-label="Deliver cargo" data-testid="delivery-sheet">
            <header className={styles.head}>
              <div>
                <h2 className={styles.title}>Cargo home</h2>
                <p className={styles.sub}>{mission.title}{clientName ? ` · ${clientName}` : ''}</p>
              </div>
              <div className={styles.meters}>
                <span className={styles.meter} data-testid="silo-capacity">
                  Silo {silo.built ? `${silo.used + totals.silo}/${silo.capacity}` : 'not built'}
                  {silo.built && <i style={{ width: `${Math.min(100, ((silo.used + totals.silo) / Math.max(1, silo.capacity)) * 100)}%` }} />}
                </span>
              </div>
            </header>

            <div className={styles.cards}>
              {Object.entries(split).map(([id, row]) => {
                const meta = minerals[id]
                const price = sellUnitPrice(id, player).price
                return (
                  <article key={id} className={styles.card} data-testid={`cargo-card-${id}`}>
                    <div className={styles.cardHead}>
                      <span className={styles.swatch} style={{ background: meta?.color ?? '#c8ccd2' }} />
                      <strong>{meta?.name ?? id}</strong>
                      <span className={styles.units}>{cargo[id]} {cargo[id] === 1 ? 'unit' : 'units'}</span>
                    </div>
                    <div className={styles.choices}>
                      {CHOICES.map(choice => {
                        const on = available(choice.key)
                        const note = choice.key === 'client'
                          ? (demand[id] ? `Needs ${demand[id]}` : 'Not ordered')
                          : choice.key === 'silo'
                            ? (silo.built ? `${Math.max(0, silo.free - totals.silo)} free` : 'No silo')
                            : `${formatCurrency(price)} each`
                        const canAdd = on && !(choice.key === 'client' && row.client >= (demand[id] ?? 0))
                          && !(choice.key === 'silo' && totals.silo >= silo.free)
                          && (row.client + row.silo + row.sell - row[choice.key]) > 0
                        return (
                          <div key={choice.key} className={styles.choice} data-kind={choice.key} data-disabled={on ? undefined : 'true'}>
                            <span className={styles.choiceLabel}>{choice.label}</span>
                            <span className={styles.choiceNote}>{note}</span>
                            <div className={styles.stepper}>
                              <button type="button" aria-label={`Fewer ${meta?.name ?? id} to ${choice.label}`} disabled={!on || row[choice.key] <= 0}
                                onClick={() => setSplit(s => releaseUnit(s, id, choice.key, silo.free))}>−</button>
                              <output data-testid={`split-${id}-${choice.key}`}>{row[choice.key]}</output>
                              <button type="button" aria-label={`More ${meta?.name ?? id} to ${choice.label}`} disabled={!canAdd}
                                onClick={() => setSplit(s => shiftUnit(s, id, choice.key, demand, silo.free))}>+</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </article>
                )
              })}
            </div>

            <footer className={styles.foot}>
              <dl className={styles.summary}>
                <div><dt>Client</dt><dd data-testid="summary-client">{hasClient ? (fulfilled ? formatCurrency(payout) : `Short ${shortBy}`) : '—'}</dd></div>
                <div><dt>Silo</dt><dd>{totals.silo} {totals.silo === 1 ? 'unit' : 'units'}</dd></div>
                <div><dt>Sell</dt><dd data-testid="summary-sell">{formatCurrency(sale)}</dd></div>
              </dl>
              <button type="button" className={styles.confirm} data-testid="delivery-confirm" onClick={settle}>
                Settle cargo
              </button>
            </footer>
          </section>
        </div>
      )}
      {settling && (
        <>
          {crates!.map(c => (
            <i key={c.id} className={styles.crate} data-kind={c.kind} data-testid={`crate-${c.kind}`}
              style={{ left: c.x, top: c.y, background: c.color, animationDelay: `${c.delay}ms` }} />
          ))}
          <p className={styles.settleNote} role="status" data-testid="settle-note">
            {[soldUnits > 0 ? `Sold ${soldUnits} for ${formatCurrency(sale)}` : '', storedUnits > 0 ? `Stored ${storedUnits} in the silo` : '', 'Rocket recycled'].filter(Boolean).join(' · ')}
          </p>
        </>
      )}
    </div>
  )
}
