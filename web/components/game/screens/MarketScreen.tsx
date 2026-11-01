'use client'

import { requestAlertPermission } from '@/lib/priceAlertNotify'
import { useEffect, useState } from 'react'
import { REFINERY_RECIPES } from '@/lib/data'
import { openMarketSellPrice, refinedUnitPrice } from '@/lib/systems/EconomySystem'
import { spotBoard, type PriceAlert, type SpotQuote } from '@/lib/systems/MarketplaceSystem'
import { RESEARCH_FRAGMENT_CONVERSION_RATE, RESEARCH_MARKETPLACE_ITEMS, researchItemCost, researchItemPurchaseCount } from '@/lib/research/marketplace'
import type { DailyEconomySnapshot } from '@/lib/systems/DailyEconomySystem'
import { formatCurrency } from '@/lib/format'
import { captureGameEvent } from '@/lib/posthog'
import { MINERAL_META, isArtifactMineralId } from '@/lib/data'
import styles from './MarketScreen.module.css'

const ART = '/art/scenes/exchange'

type Tab = 'sell' | 'buy' | 'alerts' | 'research'
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
  researchFragments: number
  researchUniversalFragments: number
  researchPurchases?: Record<string, number>
  researchPermanentBonuses?: Record<string, number>
  francs: number
  /** The Exchange building. Buying, research and price alerts need it. */
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
  onConvertResearchFragments: () => void
  onBuyResearchItem: (itemId: string) => void
  clientId?: string
}

export default function MarketScreen({
  stash, marketSupply, marketSupplyUpdatedAt, dailyEconomySnapshot, francs, exchangeBuilt, priceAlerts = [], buyBlocker,
  onSell, onBuy, onSetAlert, onRemoveAlert, refinedGoods, onSellRefined, onBack, onBuild, clientId,
  researchFragments, researchUniversalFragments, researchPurchases, researchPermanentBonuses, onConvertResearchFragments, onBuyResearchItem,
}: MarketScreenProps) {
  const [tab, setTab] = useState<Tab>('sell')
  const [armed, setArmed] = useState(false)
  const [targets, setTargets] = useState<Record<string, number>>({})
  // Two-tone flow (Liam, 31.10): pick on the left, act on the right. One selection per tab.
  const [picked, setPicked] = useState<Partial<Record<Tab, string>>>({})
  const prices: SpotQuote[] = spotBoard({ stash, placed: exchangeBuilt ? ['market'] : [], marketSupply, marketSupplyUpdatedAt, dailyEconomySnapshot, researchPermanentBonuses }, clientId)
  // Selling leads with what you hold; the other tabs list the whole board by price.
  const board = tab === 'sell' ? [...prices].sort((a, b) => Number(b.held > 0) - Number(a.held > 0)) : prices
  const refined = REFINERY_RECIPES.map(r => ({ recipe: r, qty: refinedGoods[r.id] ?? 0 })).filter(r => r.qty > 0)
  const alertFor = (id: string) => priceAlerts.find(a => a.mineralId === id)
  const sellAllValue = prices.reduce((sum, q) => sum + q.spot * q.held, 0) + refined.reduce((sum, r) => sum + refinedUnitPrice(r.recipe, { researchPermanentBonuses }) * r.qty, 0)
  const hasCargo = prices.some(q => q.held > 0) || refined.length > 0

  useEffect(() => {
    if (!armed) return
    const timer = window.setTimeout(() => setArmed(false), 4000)
    return () => window.clearTimeout(timer)
  }, [armed])

  function sellAll() {
    if (!hasCargo) return
    if (!armed) { setArmed(true); return }
    captureGameEvent('market_sell_all', { mineral_count: prices.filter(q => q.held > 0).length + refined.length, total_value: sellAllValue })
    for (const q of prices) if (q.held > 0) onSell(q.id, q.held)
    for (const r of refined) onSellRefined(r.recipe.id, r.qty)
    setArmed(false)
  }

  function stepFor(q: SpotQuote) { return Math.max(1, Math.round(q.spot * 0.05)) }
  function targetFor(q: SpotQuote) { return targets[q.id] ?? alertFor(q.id)?.target ?? Math.round(q.spot * 1.1) }

  const locked = tab !== 'sell' && !exchangeBuilt
  const pickedId = picked[tab] ?? (tab === 'research' ? RESEARCH_MARKETPLACE_ITEMS[0]?.id : board[0]?.id)
  const pick = (id: string) => setPicked(current => ({ ...current, [tab]: id }))
  const quote = board.find(q => q.id === pickedId)
  const refinedPick = tab === 'sell' ? refined.find(r => r.recipe.id === pickedId) : undefined
  const researchPick = RESEARCH_MARKETPLACE_ITEMS.find(item => item.id === pickedId) ?? RESEARCH_MARKETPLACE_ITEMS[0]
  const bundles = Math.floor(researchFragments / RESEARCH_FRAGMENT_CONVERSION_RATE)

  function rowNote(q: SpotQuote) {
    if (tab !== 'alerts') return `${q.held} held`
    const alert = alertFor(q.id)
    if (!alert) return 'No alert'
    return alert.firedAt != null ? `Hit ${formatCurrency(alert.target, { compact: true })}` : `Alert at ${formatCurrency(alert.target, { compact: true })}`
  }

  function focus() {
    if (locked) {
      return (
        <div className={styles.focus} data-testid="market-locked">
          <span className={styles.eyebrow}>{tab}</span>
          <h2 className={styles.focusName}>Exchange not built</h2>
          <p className={styles.focusCopy}>{tab === 'buy' ? 'Build the Exchange to buy ore.' : tab === 'research' ? 'Build the Exchange to research new technology.' : 'Build the Exchange to set sell alerts.'}</p>
          <button type="button" className={styles.primary} data-testid="market-build-exchange" onClick={onBuild}>Build the Exchange</button>
        </div>
      )
    }
    if (tab === 'research') {
      const item = researchPick
      const count = item ? researchItemPurchaseCount({ researchPurchases }, item.id) : 0
      const cost = item ? researchItemCost({ researchPurchases }, item) : 0
      const owned = item?.kind === 'cosmetic' && count > 0
      return (
        <div className={styles.focus}>
          <div className={styles.fragments}>
            <span><b>{researchFragments}</b> regular</span>
            <span><b>{researchUniversalFragments}</b> universal</span>
          </div>
          <button type="button" className={styles.secondary} data-testid="research-convert" disabled={bundles < 1} onClick={onConvertResearchFragments}>
            {bundles < 1 ? `Need ${RESEARCH_FRAGMENT_CONVERSION_RATE} fragments to convert` : `Convert ${bundles * RESEARCH_FRAGMENT_CONVERSION_RATE} → ${bundles} universal`}
          </button>
          {item && <>
            <span className={styles.eyebrow}>{item.scope}</span>
            <h2 className={styles.focusName}>{item.name}</h2>
            <p className={styles.focusCopy}>{item.description}</p>
            <button type="button" className={styles.primary} data-testid={`research-buy-${item.id}`} disabled={owned || researchUniversalFragments < cost} onClick={() => onBuyResearchItem(item.id)}>
              {owned ? 'Owned' : `Research · ${cost} UF`}
            </button>
            {!owned && researchUniversalFragments < cost && <p className={styles.why}>Needs {cost - researchUniversalFragments} more universal fragments</p>}
          </>}
        </div>
      )
    }
    if (refinedPick) {
      const unit = refinedUnitPrice(refinedPick.recipe, { researchPermanentBonuses })
      return (
        <div className={styles.focus}>
          <span className={styles.eyebrow}>Refined · {refinedPick.qty} held</span>
          <h2 className={styles.focusName}>{refinedPick.recipe.output.name}</h2>
          <b className={styles.focusPrice}>{formatCurrency(unit, { compact: true })}</b>
          <button type="button" className={styles.primary} data-testid={`exchange-crate-${refinedPick.recipe.id}`} onClick={() => onSellRefined(refinedPick.recipe.id, 1)}>Sell 1</button>
          <button type="button" className={styles.secondary} onClick={() => onSellRefined(refinedPick.recipe.id, refinedPick.qty)}>Sell all {refinedPick.qty} · {formatCurrency(unit * refinedPick.qty, { compact: true })}</button>
        </div>
      )
    }
    if (!quote) return null
    const q = quote
    const price = tab === 'buy' ? q.ask : q.spot
    const trend = priceTrend(q.spot, q.id)
    const alert = alertFor(q.id)
    const blocked = tab === 'buy' ? buyBlocker(q.id, 1) : null
    const protectedArtifact = isArtifactMineralId(q.id)
    return (
      <div className={styles.focus}>
        <span className={styles.eyebrow}>{tab === 'buy' ? 'Ask price' : tab === 'alerts' ? 'Sell alert' : 'Spot price'} · {q.held} held</span>
        <h2 className={styles.focusName}>{q.name}</h2>
        <b className={styles.focusPrice}>
          {formatCurrency(price, { compact: true })}
          <span className={styles.trend} data-trend={trend} aria-hidden="true" />
        </b>
        <span className={styles.trendLabel}>{trend === 'up' ? 'Above book price' : trend === 'down' ? 'Below book price' : 'At book price'}</span>
        {tab === 'sell' && (protectedArtifact ? (
          <p className={styles.why}>Protected research evidence: not for sale.</p>
        ) : <>
          <button type="button" className={styles.primary} data-testid={`exchange-crate-${q.id}`} disabled={q.held <= 0} aria-label={`Sell one ${q.name}. ${q.held} held.`}
            onClick={() => { captureGameEvent('market_sell_one', { mineral_id: q.id, unit_price: q.spot, refined: false }); onSell(q.id, 1) }}>Sell 1 · {formatCurrency(q.spot, { compact: true })}</button>
          <button type="button" className={styles.secondary} data-testid={`market-sell-all-${q.id}`} disabled={q.held <= 0} aria-label={`Sell all ${q.name}`}
            onClick={() => onSell(q.id, q.held)}>{q.held > 0 ? `Sell all ${q.held} · ${formatCurrency(q.spot * q.held, { compact: true })}` : 'None held'}</button>
        </>)}
        {tab === 'buy' && <>
          <button type="button" className={styles.primary} data-testid={`market-buy-${q.id}`} disabled={!!blocked} aria-label={`Buy one ${q.name}`}
            onClick={() => { captureGameEvent('market_buy_one', { mineral_id: q.id, unit_price: q.ask }); onBuy(q.id, 1) }}>Buy 1 · {formatCurrency(q.ask, { compact: true })}</button>
          <button type="button" className={styles.secondary} disabled={!!buyBlocker(q.id, 10)} aria-label={`Buy ten ${q.name}`} onClick={() => onBuy(q.id, 10)}>Buy 10 · {formatCurrency(q.ask * 10, { compact: true })}</button>
          {blocked && <p className={styles.why}>{blocked}</p>}
        </>}
        {tab === 'alerts' && <>
          <div className={styles.stepper}>
            <button type="button" className={styles.round} aria-label={`Lower ${q.name} alert`} onClick={() => setTargets(t => ({ ...t, [q.id]: Math.max(1, targetFor(q) - stepFor(q)) }))}>−</button>
            <span className={styles.target} data-testid={`market-alert-target-${q.id}`}>{formatCurrency(targetFor(q), { compact: true })}</span>
            <button type="button" className={styles.round} aria-label={`Raise ${q.name} alert`} onClick={() => setTargets(t => ({ ...t, [q.id]: targetFor(q) + stepFor(q) }))}>+</button>
          </div>
          <button type="button" className={styles.primary} data-testid={`market-alert-set-${q.id}`} onClick={() => { captureGameEvent('market_alert_set', { mineral_id: q.id, target: targetFor(q) }); requestAlertPermission(); onSetAlert(q.id, targetFor(q)) }}>
            {alert ? 'Update alert' : 'Set alert'}
          </button>
          {alert && <button type="button" className={styles.secondary} data-testid={`market-alert-clear-${q.id}`} aria-label={`Remove ${q.name} alert`} onClick={() => onRemoveAlert(alert.id)}>Clear alert</button>}
        </>}
      </div>
    )
  }

  return (
    <div className={`market-screen ${styles.scene}`} data-testid="exchange-scene">
      <img className={styles.backdrop} src={`${ART}/exchange-plate-dock.png`} alt="" draggable={false} />

      <button type="button" className={styles.exit} data-testid="market-back" onClick={onBack}>‹ Back</button>
      <span className={styles.balance} data-testid="market-balance" aria-label={`Balance ${formatCurrency(francs)}`}>{formatCurrency(francs, { compact: true })}</span>

      <section className={styles.workspace} aria-label="Marketplace" data-testid="marketplace-panel">
        <div className={styles.left}>
          <h2 className={styles.title}>Exchange</h2>
          <div className={styles.tabs} role="tablist" aria-label="Marketplace">
            {(['sell', 'buy', 'alerts', 'research'] as const).map(id => (
              <button key={id} type="button" role="tab" className={styles.tab} aria-selected={tab === id} data-testid={`market-tab-${id}`} onClick={() => setTab(id)}>
                {id}
              </button>
            ))}
          </div>

          {tab === 'research' && !locked ? (
            <ul className={styles.rows} data-testid="research-marketplace-items">
              {RESEARCH_MARKETPLACE_ITEMS.map(item => {
                const count = researchItemPurchaseCount({ researchPurchases }, item.id)
                const owned = item.kind === 'cosmetic' && count > 0
                return (
                  <li key={item.id}>
                    <button type="button" className={styles.row} data-selected={researchPick?.id === item.id} data-testid={`research-item-${item.id}`} onClick={() => pick(item.id)}>
                      <span className={styles.who}><b>{item.name}</b><small>{item.scope}</small></span>
                      <span className={styles.price}>{owned ? 'Owned' : `${researchItemCost({ researchPurchases }, item)} UF`}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <ul className={styles.rows} data-testid="exchange-prices" data-locked={locked || undefined}>
              {board.map(q => (
                <li key={q.id}>
                  <button type="button" className={styles.row} data-selected={!locked && pickedId === q.id} data-empty={tab === 'sell' && q.held <= 0 ? 'true' : undefined}
                    data-fired={tab === 'alerts' && alertFor(q.id)?.firedAt != null ? 'true' : undefined}
                    data-testid={`exchange-price-${q.id}`} onClick={() => pick(q.id)}>
                    <span className={styles.who}><b>{q.name}</b><small>{rowNote(q)}</small></span>
                    <span className={styles.price} data-testid={`market-price-${q.id}`}>
                      {formatCurrency(tab === 'buy' ? q.ask : q.spot, { compact: true })}
                      <span className={styles.trend} data-trend={priceTrend(q.spot, q.id)} aria-hidden="true" />
                    </span>
                  </button>
                </li>
              ))}
              {tab === 'sell' && refined.map(({ recipe, qty }) => (
                <li key={recipe.id}>
                  <button type="button" className={styles.row} data-selected={pickedId === recipe.id} data-testid={`exchange-price-${recipe.id}`} onClick={() => pick(recipe.id)}>
                    <span className={styles.who}><b>{recipe.output.name}</b><small>{qty} held · refined</small></span>
                    <span className={styles.price}>{formatCurrency(refinedUnitPrice(recipe, { researchPermanentBonuses }), { compact: true })}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.right} data-testid={tab === 'research' && !locked ? 'research-marketplace' : undefined}>
          {focus()}
          {tab === 'sell' && (
            <button type="button" className={styles.cargo} data-armed={armed} data-testid="sell-all-btn" disabled={!hasCargo} onClick={sellAll}>
              {!hasCargo ? 'Cargo hold empty' : armed ? `Tap again to sell everything · ${formatCurrency(sellAllValue, { compact: true })}` : `Sell all cargo · ${formatCurrency(sellAllValue, { compact: true })}`}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
