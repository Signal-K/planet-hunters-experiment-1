'use client'

import { useState } from 'react'
import ActionConfirmBar from '@/components/game/ActionConfirmBar'
import {
  MINERAL_META,
  REFINERY_RECIPES,
  CRAFTING_RECIPES,
  craftingAffordability,
  type CraftingRecipe,
} from '@/lib/data'
import { sellUnitPrice, sellQuote } from '@/lib/systems/EconomySystem'
import { formatCurrency } from '@/lib/format'
import type { DailyEconomySnapshot } from '@/lib/systems/DailyEconomySystem'
import { captureGameEvent } from '@/lib/posthog'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import styles from './MarketScreen.module.css'

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
  onOpenMissions: () => void
  clientId?: string
  /** Base structure kinds already placed, so a built recipe reads BUILT. */
  placedStructures?: string[]
  /** Field kits held, by recipe id. */
  fieldKits?: Record<string, number>
  /** Run a recipe's build action. True when something was built. */
  onBuildRecipe?: (recipe: CraftingRecipe) => boolean
}

function recipeAction(recipe: CraftingRecipe, affordable: boolean, placed: string[], kits: Record<string, number>): { label: string; disabled: boolean } | null {
  switch (recipe.producedAt) {
    case 'field': {
      const held = kits[recipe.id] ?? 0
      return { label: held > 0 ? `Build · ${held}` : 'Build', disabled: !affordable }
    }
    case 'earth-base': {
      const kind = recipe.id.replace(/^earth-/, '')
      if (!placed.includes(kind)) return { label: 'Build', disabled: !affordable }
      if (recipe.id === 'earth-surface-silo') return { label: 'One per base', disabled: true }
      return { label: 'Built', disabled: true }
    }
    case 'subsurface': return { label: 'Open base', disabled: false }
    case 'refinery': return { label: 'Open refinery', disabled: false }
    case 'hangar': return { label: 'Open hangar', disabled: false }
    default: return null
  }
}

function costLine(recipe: CraftingRecipe): string {
  const parts: string[] = []
  if (recipe.costFrancs > 0) parts.push(formatCurrency(recipe.costFrancs, { compact: true }))
  for (const [id, amount] of Object.entries(recipe.costMinerals)) {
    parts.push(`${amount} ${MINERAL_META[id]?.name ?? id}`)
  }
  for (const [id, amount] of Object.entries(recipe.costRefined ?? {})) {
    parts.push(`${amount} ${REFINERY_RECIPES.find(item => item.id === id)?.name ?? id}`)
  }
  return parts.join(' · ')
}

export default function MarketScreen({ stash, marketSupply, marketSupplyUpdatedAt, dailyEconomySnapshot, francs, onSell, refinedGoods, onSellRefined, onBack, clientId, placedStructures = [], fieldKits = {}, onBuildRecipe }: MarketScreenProps) {
  const [sellAllConfirm, setSellAllConfirm] = useState(false)
  const [showBuild, setShowBuild] = useState(false)

  const entries = Object.entries(stash).filter(([, qty]) => qty > 0)
  const refinedEntries = REFINERY_RECIPES.filter(recipe => (refinedGoods[recipe.id] ?? 0) > 0)
  const priceContext = { marketSupply, marketSupplyUpdatedAt, dailyEconomySnapshot }
  const unitPrice = (mineralId: string) => sellUnitPrice(mineralId, priceContext, clientId)
  const cargoValue = sellQuote(stash, priceContext, clientId)
  const refinedValue = refinedEntries.reduce((sum, recipe) => sum + recipe.output.price * (refinedGoods[recipe.id] ?? 0), 0)
  const hasCargo = entries.length > 0 || refinedEntries.length > 0

  return (
    <div className={`theme-light market-screen ${styles.screen}`}>
      <header className={styles.header} data-dev-launcher={isDevLauncherEnabled() || undefined}>
        <button className={styles.backButton} onClick={onBack} aria-label="Back" type="button" data-testid="market-back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className={styles.balance} data-testid="market-balance" aria-label={`Balance ${formatCurrency(francs)}`}>
          {formatCurrency(francs, { compact: true })}
        </span>
      </header>

      <div className={styles.actions}>
        <button
          className={styles.sellButton}
          onClick={() => setSellAllConfirm(true)}
          type="button"
          data-testid="sell-all-btn"
          disabled={!hasCargo}
        >
          Sell all
        </button>
        <button
          className={styles.buildToggle}
          type="button"
          aria-pressed={showBuild}
          data-testid="market-build-toggle"
          onClick={() => setShowBuild(open => !open)}
        >
          Build
        </button>
      </div>

      {showBuild ? (
        <section className={styles.list} data-testid="market-recipes" aria-label="Recipes">
          {CRAFTING_RECIPES.map(recipe => {
            const can = craftingAffordability(recipe, francs, stash, refinedGoods)
            const action = recipeAction(recipe, can.ok, placedStructures, fieldKits)
            return (
              <div className={styles.row} key={recipe.id} data-testid={`market-recipe-${recipe.id}`}>
                <div className={styles.rowCopy}>
                  <span className={styles.name}>{recipe.name}</span>
                  <span className={styles.meta}>{costLine(recipe)}</span>
                </div>
                {action && onBuildRecipe && (
                  <button
                    className={styles.buildButton}
                    type="button"
                    disabled={action.disabled}
                    data-testid={`market-recipe-build-${recipe.id}`}
                    onClick={() => { captureGameEvent('market_recipe_build', { recipe_id: recipe.id }); onBuildRecipe(recipe) }}
                  >
                    {action.label}
                  </button>
                )}
              </div>
            )
          })}
        </section>
      ) : (
        <section className={styles.list} data-testid="market-cargo" aria-label="Cargo">
          {entries.map(([id, qty]) => {
            const meta = MINERAL_META[id]
            if (!meta) return null
            const { price } = unitPrice(id)
            return (
              <div className={styles.row} key={id} data-testid={`commodity-${id}`}>
                <span className={styles.name}>{meta.name}</span>
                <span className={styles.qty}>{qty}</span>
                <span className={styles.price}>{formatCurrency(price * qty, { compact: true })}</span>
              </div>
            )
          })}
          {refinedEntries.map(recipe => {
            const qty = refinedGoods[recipe.id] ?? 0
            return (
              <div className={styles.row} key={recipe.id} data-testid={`refined-${recipe.id}`}>
                <span className={styles.name}>{recipe.output.name}</span>
                <span className={styles.qty}>{qty}</span>
                <span className={styles.price}>{formatCurrency(recipe.output.price * qty, { compact: true })}</span>
              </div>
            )
          })}
          {!hasCargo && <p className={styles.empty}>No cargo</p>}
        </section>
      )}

      {sellAllConfirm && (
        <ActionConfirmBar
          eyebrow="Sell"
          title="Sell all cargo"
          description={`Sell everything held for ${formatCurrency(cargoValue + refinedValue)}? This can't be undone.`}
          confirmLabel="Confirm sell"
          onConfirm={() => {
            captureGameEvent('market_sell_all', { mineral_count: entries.length, total_value: cargoValue + refinedValue })
            entries.forEach(([id]) => onSell(id, stash[id]))
            refinedEntries.forEach(recipe => onSellRefined(recipe.id, refinedGoods[recipe.id] ?? 0))
            setSellAllConfirm(false)
          }}
          onDismiss={() => setSellAllConfirm(false)}
        />
      )}
    </div>
  )
}
