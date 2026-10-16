'use client'

import { useEffect, useRef, useState } from 'react'
import { BaseDock } from '@/components/game/hub/BaseDock'
import { HubClockWidget } from '@/components/game/hub/HubClockWidget'
import { MINERAL_META, REFINERY_RECIPES } from '@/lib/data'
import { openMarketSellPrice, sellQuote, sellUnitPrice } from '@/lib/systems/EconomySystem'
import type { DailyEconomySnapshot } from '@/lib/systems/DailyEconomySystem'
import { formatCurrency, formatFrancs, FRANC } from '@/lib/format'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { openSettings } from '@/lib/mining/openChrome'
import { captureGameEvent } from '@/lib/posthog'
import { biomeLayers, sanitizeEarthBiome, type EarthBiomeId } from '@/lib/scene/base-world'
import styles from './MarketScreen.module.css'

const ART = '/art/scenes/exchange'

/** Steel-blue, silver, and lilac crates. No green or warm ore. */
const CRATE_FOR: Record<string, string> = {
  iron: 'exchange-crate-1-iron.png',
  nickel: 'exchange-crate-2-nickel.png',
  cobalt: 'exchange-crate-3-steel-blue.png',
  copper: 'exchange-crate-3-steel-blue.png',
  silicon: 'exchange-crate-5-silver.png',
  aluminium: 'exchange-crate-5-silver.png',
  carbon: 'exchange-crate-5-silver.png',
  platinum: 'exchange-crate-4-platinum.png',
  palladium: 'exchange-crate-4-platinum.png',
  gold: 'exchange-crate-4-platinum.png',
  iridium: 'exchange-crate-4-platinum.png',
  rhodium: 'exchange-crate-4-platinum.png',
  rare: 'exchange-crate-4-platinum.png',
  ice: 'exchange-crate-6-ice.png',
  hydrogen: 'exchange-crate-6-ice.png',
  uranium: 'exchange-crate-3-steel-blue.png',
  orionid_debris: 'exchange-crate-6-ice.png',
  draconid_debris: 'exchange-crate-3-steel-blue.png',
}

function crateFile(id: string): string {
  return CRATE_FOR[id] ?? 'exchange-crate-3-steel-blue.png'
}

function pileHeight(qty: number): number {
  if (qty >= 24) return 4
  if (qty >= 8) return 3
  if (qty >= 2) return 2
  return 1
}

type Trend = 'up' | 'down' | 'flat'

function priceTrend(price: number, book: number): Trend {
  if (price > book + 1) return 'up'
  if (price < book - 1) return 'down'
  return 'flat'
}

interface CargoLot {
  id: string
  name: string
  qty: number
  unit: number
  trend: Trend
  refined: boolean
}

interface MarketScreenProps {
  stash: Record<string, number>
  marketSupply?: Record<string, number>
  marketSupplyUpdatedAt?: Record<string, number>
  dailyEconomySnapshot?: DailyEconomySnapshot
  francs: number
  onSell: (mineralId: string, amount: number) => void
  refinedGoods: Record<string, number>
  onSellRefined: (recipeId: string, amount: number) => void
  onBack: () => void
  onBuild: () => void
  onHub: () => void
  onNext: () => void
  clientId?: string
  biome?: EarthBiomeId
}

export default function MarketScreen({
  stash, marketSupply, marketSupplyUpdatedAt, dailyEconomySnapshot, francs, onSell,
  refinedGoods, onSellRefined, onBack, onBuild, onHub, onNext, clientId, biome = 'mountains',
}: MarketScreenProps) {
  const landscape = sanitizeEarthBiome(biome)
  const landscapeLayers = biomeLayers(landscape)
  const priceContext = { marketSupply, marketSupplyUpdatedAt, dailyEconomySnapshot }
  const lots: CargoLot[] = []
  for (const [id, qty] of Object.entries(stash)) {
    if (qty <= 0) continue
    const meta = MINERAL_META[id]
    if (!meta) continue
    const { price } = sellUnitPrice(id, priceContext, clientId)
    lots.push({
      id, name: meta.name, qty, unit: price, refined: false,
      trend: priceTrend(price, openMarketSellPrice(meta.price, 0)),
    })
  }
  for (const recipe of REFINERY_RECIPES) {
    const qty = refinedGoods[recipe.id] ?? 0
    if (qty <= 0) continue
    lots.push({
      id: recipe.id, name: recipe.output.name, qty, unit: recipe.output.price,
      trend: 'flat', refined: true,
    })
  }
  lots.sort((a, b) => a.name.localeCompare(b.name))

  const cargoValue = sellQuote(stash, priceContext, clientId)
  const refinedValue = lots.filter(lot => lot.refined).reduce((sum, lot) => sum + lot.unit * lot.qty, 0)
  const hasCargo = lots.length > 0

  const [armed, setArmed] = useState(false)
  const [shownFrancs, setShownFrancs] = useState(francs)
  const [padLot, setPadLot] = useState<string | null>(null)
  const [ghost, setGhost] = useState<{ src: string; x: number; y: number } | null>(null)
  const [flight, setFlight] = useState<{ src: string; x: number; y: number; dx: number; dy: number } | null>(null)
  const shownRef = useRef(francs)
  const dragRef = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null)
  const draggedRef = useRef(false)
  const padRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const from = shownRef.current
    const to = francs
    if (from === to) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      shownRef.current = to
      setShownFrancs(to)
      return
    }
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 680)
      const eased = 1 - (1 - t) * (1 - t)
      const value = Math.round(from + (to - from) * eased)
      shownRef.current = value
      setShownFrancs(value)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [francs])

  useEffect(() => {
    if (!armed) return
    const timer = window.setTimeout(() => setArmed(false), 4000)
    return () => window.clearTimeout(timer)
  }, [armed])

  function sellLot(lot: CargoLot, origin: DOMRect | null) {
    const pad = padRef.current?.getBoundingClientRect()
    if (origin && pad) {
      const x = pad.left + pad.width / 2
      const y = pad.top + pad.height / 2
      setFlight({
        src: `${ART}/${crateFile(lot.refined ? 'silicon' : lot.id)}`,
        x, y,
        dx: origin.left + origin.width / 2 - x,
        dy: origin.top + origin.height / 2 - y,
      })
      window.setTimeout(() => setFlight(null), 340)
    }
    setPadLot(lot.id)
    window.setTimeout(() => setPadLot(current => current === lot.id ? null : current), 700)
    captureGameEvent('market_sell_one', { mineral_id: lot.id, unit_price: lot.unit, refined: lot.refined })
    if (lot.refined) onSellRefined(lot.id, 1)
    else onSell(lot.id, 1)
  }

  function sellAll() {
    if (!hasCargo) return
    if (!armed) {
      setArmed(true)
      return
    }
    captureGameEvent('market_sell_all', { mineral_count: lots.length, total_value: cargoValue + refinedValue })
    for (const lot of lots) {
      if (lot.refined) onSellRefined(lot.id, lot.qty)
      else onSell(lot.id, lot.qty)
    }
    setArmed(false)
    setPadLot('all')
    window.setTimeout(() => setPadLot(null), 700)
  }

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
        <div className={styles.cluster}>
          <span className="scene-chip" data-testid="market-balance">{formatCurrency(francs, { compact: true })}</span>
          <span className="scene-chip" data-testid="exchange-cargo-chip" aria-label="Cargo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
              <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
            </svg>
          </span>
        </div>
      </div>

      <div className={styles.play}>
        <section className={styles.board} aria-label="Prices" data-testid="exchange-prices">
          {lots.length === 0 && <p className={styles.quiet}>No quotes</p>}
          {lots.map(lot => (
            <div className={styles.quote} key={lot.id} data-testid={`exchange-price-${lot.id}`}>
              <img src={`${ART}/${crateFile(lot.refined ? 'silicon' : lot.id)}`} alt="" draggable={false} />
              <span className={styles.mineral}>{lot.name}</span>
              <span className={styles.unit}>{formatCurrency(lot.unit, { compact: true })}</span>
              <span className={styles.trend} data-trend={lot.trend} aria-label={lot.trend === 'up' ? 'Price up' : lot.trend === 'down' ? 'Price down' : 'Price steady'} />
            </div>
          ))}
        </section>

        <div className={styles.window} data-biome={landscape} aria-hidden="true">
          <div className={styles.windowSky} />
          {landscapeLayers.map((layer, index) => (
            <img
              key={layer.id}
              className={styles.windowBand}
              data-layer={layer.id}
              src={layer.src}
              alt=""
              draggable={false}
              style={{ height: layer.height, zIndex: index + 1 }}
            />
          ))}
          <div className={styles.windowGround} />
        </div>

        <div className={styles.belt} data-testid="exchange-belt" aria-label="Cargo on the conveyor">
          {lots.length === 0 && <p className={styles.empty}>Hold is empty</p>}
          {lots.map(lot => {
            const layers = pileHeight(lot.qty)
            const src = `${ART}/${crateFile(lot.refined ? 'silicon' : lot.id)}`
            return (
              <button
                key={lot.id}
                type="button"
                className={styles.stack}
                data-testid={`exchange-crate-${lot.id}`}
                aria-label={`Sell one ${lot.name}. ${lot.qty} held.`}
                onPointerDown={event => {
                  event.currentTarget.setPointerCapture(event.pointerId)
                  dragRef.current = { id: lot.id, x: event.clientX, y: event.clientY, moved: false }
                  setGhost({ src, x: event.clientX, y: event.clientY })
                }}
                onPointerMove={event => {
                  const drag = dragRef.current
                  if (!drag || drag.id !== lot.id) return
                  if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8) drag.moved = true
                  setGhost({ src, x: event.clientX, y: event.clientY })
                }}
                onPointerUp={event => {
                  const drag = dragRef.current
                  dragRef.current = null
                  setGhost(null)
                  if (!drag || drag.id !== lot.id || !drag.moved) return
                  draggedRef.current = true
                  const pad = padRef.current?.getBoundingClientRect()
                  const over = !!pad && event.clientX >= pad.left && event.clientX <= pad.right && event.clientY >= pad.top && event.clientY <= pad.bottom
                  if (over) sellLot(lot, event.currentTarget.getBoundingClientRect())
                }}
                onClick={event => {
                  if (draggedRef.current) {
                    draggedRef.current = false
                    return
                  }
                  sellLot(lot, (event.currentTarget as HTMLButtonElement).getBoundingClientRect())
                }}
              >
                <span className={styles.pile} aria-hidden="true">
                  {Array.from({ length: layers }, (_, index) => (
                    <img key={index} src={src} alt="" draggable={false} style={{ bottom: index * 12 }} />
                  ))}
                </span>
                <span className={styles.count}>{lot.qty}</span>
              </button>
            )
          })}
        </div>

        <div className={styles.floor}>
          <div className={styles.pad} ref={padRef} data-testid="exchange-sell-pad" aria-label="Sell pad">
            <img src={`${ART}/exchange-sell-pad.png`} alt="" draggable={false} />
            {padLot && <img className={styles.onPad} src={`${ART}/exchange-crate-on-pad.png`} alt="" draggable={false} />}
          </div>
          <div className={styles.machine}>
            <div className={styles.face}>
              <img src={`${ART}/exchange-counter-machine.png`} alt="" draggable={false} />
              <span className={styles.digits} data-testid="exchange-francs" aria-label={`Francs ${formatFrancs(shownFrancs)}`}>
                {FRANC}{formatFrancs(shownFrancs)}
              </span>
            </div>
            <button
              type="button"
              className={styles.sellAll}
              data-testid="sell-all-btn"
              disabled={!hasCargo}
              onClick={sellAll}
            >
              {armed ? `Confirm ${formatCurrency(cargoValue + refinedValue, { compact: true })}` : 'Sell all'}
            </button>
          </div>
        </div>
      </div>

      {ghost && <img className={styles.ghost} src={ghost.src} alt="" style={{ left: ghost.x, top: ghost.y }} draggable={false} />}
      {flight && (
        <img
          className={styles.flight}
          src={flight.src}
          alt=""
          style={{ left: flight.x, top: flight.y, ['--dx' as string]: `${flight.dx}px`, ['--dy' as string]: `${flight.dy}px` }}
          draggable={false}
        />
      )}

      <div className={styles.dock}>
        <BaseDock onPrev={onBack} onNext={onNext} onBuild={onBuild} onHub={onHub} />
      </div>
    </div>
  )
}
