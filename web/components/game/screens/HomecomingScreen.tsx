'use client'

// SSL-553: back home. The rocket touches down on the Earth Base pad, then a roomy
// delivery sheet over the base settles the haul: per mineral, units go to the
// client (fulfils the contract), the underground silo, or the open market.

import { useEffect, useMemo, useState } from 'react'
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

  const available = (key: HomeDestination) => key === 'client' ? hasClient : key === 'silo' ? silo.built : true

  return (
    <div className={styles.root} data-testid="homecoming-screen" data-landed={down ? 'true' : 'false'}>
      <HubScreen player={player} homecoming padLanding={!down} onFocusBuilding={() => {}} onOpenScene={() => {}} />
      {down && (
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
                      <span className={styles.units}>{cargo[id]} units</span>
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
                <div><dt>Silo</dt><dd>{totals.silo} units</dd></div>
                <div><dt>Sell</dt><dd data-testid="summary-sell">{formatCurrency(sale)}</dd></div>
              </dl>
              <button type="button" className={styles.confirm} data-testid="delivery-confirm" onClick={() => onConfirm(split)}>
                Settle cargo
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}
