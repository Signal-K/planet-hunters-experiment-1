'use client'

import { useEffect, useState } from 'react'
import { BaseDock } from '@/components/game/hub/BaseDock'
import { HubClockWidget } from '@/components/game/hub/HubClockWidget'
import { REFINERY_RECIPES } from '@/lib/data'
import { openMarketSellPrice } from '@/lib/systems/EconomySystem'
import { spotBoard, type PriceAlert, type SpotQuote } from '@/lib/systems/MarketplaceSystem'
import type { DailyEconomySnapshot } from '@/lib/systems/DailyEconomySystem'
import { formatCurrency } from '@/lib/format'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { openSettings } from '@/lib/mining/openChrome'
import { captureGameEvent } from '@/lib/posthog'
import { MINERAL_META } from '@/lib/data'
import styles from './MarketScreen.module.css'

const ART = '/art/scenes/exchange'

type Tab = 'sell' | 'buy' | 'alerts'
type Trend = 'up' | 'down' | 'flat'

function priceTrend(spot: number, mineralId: string): Trend {
  const book = openMarketSellPrice(MINERAL_META[mineralId]?.price ?? 0, 0)
  if (spot > book + 1) return 'up'
  if (spot < book - 1) return 'down'
  return 'flat'
}

interface MarketScreenProps {
  stash: Record<string, number>
  marketSupply?: Record<string, number>
  marketSupplyUpdatedAt?: Record<string, number>
  dailyEconomySnapshot?: DailyEconomySnapshot
  francs: number
  /** The Exchange building. Buying and price alerts need it. */
  exchangeBuilt: boolean
  priceAlerts?: PriceAlert[]
  /** Why a purchase is refused, or null. */
  buyBlocker: (mineralId: string, amount: number) => string | null
  onSell: (mineralId: string, amount: number) => void
  onBuy: (mineralId: string, amount: number) => void
  onSetAlert: (mineralId: string, target: number) => void
  onRemoveAlert: (alertId: string) => void
  refinedGoods: Record<string, number>
  onSellRefined: (recipeId: string, amount: number) => void
  onBack: () => void
  onBuild: () => void
  onHub: () => void
  onNext: () => void
  clientId?: string
}

export default function MarketScreen({
  stash, marketSupply, marketSupplyUpdatedAt, dailyEconomySnapshot, francs, exchangeBuilt, priceAlerts = [], buyBlocker,
  onSell, onBuy, onSetAlert, onRemoveAlert, refinedGoods, onSellRefined, onBack, onBuild, onHub, onNext, clientId,
}: MarketScreenProps) {
  const [tab, setTab] = useState<Tab>('sell')
  const [armed, setArmed] = useState(false)
  const [targets, setTargets] = useState<Record<string, number>>({})
  const board: SpotQuote[] = spotBoard({ stash, marketSupply, marketSupplyUpdatedAt, dailyEconomySnapshot }, clientId)
  const refined = REFINERY_RECIPES.map(r => ({ recipe: r, qty: refinedGoods[r.id] ?? 0 })).filter(r => r.qty > 0)
  const alertFor = (id: string) => priceAlerts.find(a => a.mineralId === id)
  const sellAllValue = board.reduce((sum, q) => sum + q.spot * q.held, 0) + refined.reduce((sum, r) => sum + r.recipe.output.price * r.qty, 0)
  const hasCargo = board.some(q => q.held > 0) || refined.length > 0

  useEffect(() => {
    if (!armed) return
    const timer = window.setTimeout(() => setArmed(false), 4000)
    return () => window.clearTimeout(timer)
  }, [armed])

  function sellAll() {
    if (!hasCargo) return
    if (!armed) { setArmed(true); return }
    captureGameEvent('market_sell_all', { mineral_count: board.filter(q => q.held > 0).length + refined.length, total_value: sellAllValue })
    for (const q of board) if (q.held > 0) onSell(q.id, q.held)
    for (const r of refined) onSellRefined(r.recipe.id, r.qty)
    setArmed(false)
  }

  function stepFor(q: SpotQuote) { return Math.max(1, Math.round(q.spot * 0.05)) }
  function targetFor(q: SpotQuote) { return targets[q.id] ?? alertFor(q.id)?.target ?? Math.round(q.spot * 1.1) }

  return (
    <div className={`market-screen ${styles.scene}`} data-testid="exchange-scene">
      <img className={styles.backdrop} src={`${ART}/exchange-plate-dock.png`} alt="" draggable={false} />

      <div className={styles.hud} data-dev-launcher={isDevLauncherEnabled() ? 'true' : 'false'}>
        <div className={styles.cluster}>
          <button type="button" className={styles.cog} data-testid="settings-button" aria-label="Settings" onClick={openSettings}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
          <HubClockWidget />
        </div>
      </div>

      <section className={styles.panel} aria-label="Marketplace" data-testid="marketplace-panel">
        <div className={styles.top}>
          <h2 className={styles.title}>Spot prices</h2>
          <span className={styles.balance} data-testid="market-balance" aria-label={`Balance ${formatCurrency(francs)}`}>{formatCurrency(francs, { compact: true })}</span>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Marketplace">
          {(['sell', 'buy', 'alerts'] as const).map(id => (
            <button key={id} type="button" role="tab" className={styles.tab} aria-selected={tab === id} data-testid={`market-tab-${id}`} onClick={() => setTab(id)}>
              {id}
            </button>
          ))}
        </div>

        {tab !== 'sell' && !exchangeBuilt ? (
          <div className={styles.lock} data-testid="market-locked">
            <p className={styles.note}>{tab === 'buy' ? 'Build the Exchange to buy ore.' : 'Build the Exchange to set sell alerts.'}</p>
            <button type="button" className={styles.btn} data-testid="market-build-exchange" onClick={onBuild}>Build the Exchange</button>
          </div>
        ) : (
          <ul className={styles.rows} data-testid="exchange-prices">
            {board.map(q => {
              const alert = alertFor(q.id)
              const blocked = tab === 'buy' ? buyBlocker(q.id, 1) : null
              return (
                <li className={styles.row} key={q.id} data-testid={`exchange-price-${q.id}`} data-fired={tab === 'alerts' && alert?.firedAt != null ? 'true' : undefined}>
                  <div className={styles.who}>
                    <span className={styles.name}>{q.name}</span>
                    <span className={styles.held}>
                      {tab === 'alerts'
                        ? alert ? (alert.firedAt != null ? `Hit ${formatCurrency(alert.target, { compact: true })}` : `Alert at ${formatCurrency(alert.target, { compact: true })}`) : 'No alert'
                        : `${q.held} held`}
                    </span>
                  </div>
                  <span className={styles.price} data-testid={`market-price-${q.id}`}>
                    {formatCurrency(tab === 'buy' ? q.ask : q.spot, { compact: true })}
                    <span className={styles.trend} data-trend={priceTrend(q.spot, q.id)} aria-hidden="true" />
                  </span>
                  <div className={styles.actions}>
                    {tab === 'sell' && (
                      <>
                        <button type="button" className={styles.btn} data-testid={`exchange-crate-${q.id}`} disabled={q.held <= 0} aria-label={`Sell one ${q.name}. ${q.held} held.`}
                          onClick={() => { captureGameEvent('market_sell_one', { mineral_id: q.id, unit_price: q.spot, refined: false }); onSell(q.id, 1) }}>Sell 1</button>
                        <button type="button" className={styles.btn} data-testid={`market-sell-all-${q.id}`} disabled={q.held <= 0} aria-label={`Sell all ${q.name}`}
                          onClick={() => onSell(q.id, q.held)}>All</button>
                      </>
                    )}
                    {tab === 'buy' && (
                      <>
                        <button type="button" className={styles.btn} data-testid={`market-buy-${q.id}`} disabled={!!blocked} title={blocked ?? undefined} aria-label={`Buy one ${q.name}`}
                          onClick={() => { captureGameEvent('market_buy_one', { mineral_id: q.id, unit_price: q.ask }); onBuy(q.id, 1) }}>Buy 1</button>
                        <button type="button" className={styles.btn} disabled={!!buyBlocker(q.id, 10)} aria-label={`Buy ten ${q.name}`} onClick={() => onBuy(q.id, 10)}>x10</button>
                      </>
                    )}
                    {tab === 'alerts' && (
                      <>
                        <div className={styles.stepper}>
                          <button type="button" className={styles.btn} aria-label={`Lower ${q.name} alert`} onClick={() => setTargets(t => ({ ...t, [q.id]: Math.max(1, targetFor(q) - stepFor(q)) }))}>-</button>
                          <span className={styles.price} data-testid={`market-alert-target-${q.id}`}>{formatCurrency(targetFor(q), { compact: true })}</span>
                          <button type="button" className={styles.btn} aria-label={`Raise ${q.name} alert`} onClick={() => setTargets(t => ({ ...t, [q.id]: targetFor(q) + stepFor(q) }))}>+</button>
                        </div>
                        <button type="button" className={styles.btn} data-testid={`market-alert-set-${q.id}`} onClick={() => { captureGameEvent('market_alert_set', { mineral_id: q.id, target: targetFor(q) }); onSetAlert(q.id, targetFor(q)) }}>Set</button>
                        {alert && <button type="button" className={styles.btn} data-testid={`market-alert-clear-${q.id}`} aria-label={`Remove ${q.name} alert`} onClick={() => onRemoveAlert(alert.id)}>Clear</button>}
                      </>
                    )}
                  </div>
                </li>
              )
            })}
            {tab === 'sell' && refined.map(({ recipe, qty }) => (
              <li className={styles.row} key={recipe.id} data-testid={`exchange-price-${recipe.id}`}>
                <div className={styles.who}>
                  <span className={styles.name}>{recipe.output.name}</span>
                  <span className={styles.held}>{qty} held</span>
                </div>
                <span className={styles.price}>{formatCurrency(recipe.output.price, { compact: true })}</span>
                <div className={styles.actions}>
                  <button type="button" className={styles.btn} data-testid={`exchange-crate-${recipe.id}`} onClick={() => onSellRefined(recipe.id, 1)}>Sell 1</button>
                  <button type="button" className={styles.btn} onClick={() => onSellRefined(recipe.id, qty)}>All</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {tab === 'sell' && (
          <button type="button" className={styles.btn} data-armed={armed} data-testid="sell-all-btn" disabled={!hasCargo} onClick={sellAll}>
            {armed ? `Confirm ${formatCurrency(sellAllValue, { compact: true })}` : 'Sell all'}
          </button>
        )}
      </section>

      <div className={styles.dock}>
        <BaseDock onPrev={onBack} onNext={onNext} onBuild={onBuild} onHub={onHub} />
      </div>
    </div>
  )
}
