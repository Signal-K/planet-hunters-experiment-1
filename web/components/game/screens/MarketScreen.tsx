'use client'

import { useState, type CSSProperties } from 'react'
import ActionConfirmBar from '@/components/game/ActionConfirmBar'
import MineralChip from '@/components/game/MineralChip'
import {
  MINERAL_META,
  CLIENT_SLOTS,
  REFINERY_RECIPES,
  CRAFTING_RECIPES,
  CRAFTING_CATEGORY_LABELS,
  CRAFTING_CATEGORY_ORDER,
  craftingAffordability,
  type CraftingCategory,
} from '@/lib/data'
import { sellUnitPrice, sellQuote } from '@/lib/systems/EconomySystem'
import { formatCurrency } from '@/lib/format'
import type { DailyEconomySnapshot } from '@/lib/systems/DailyEconomySystem'
import { captureGameEvent } from '@/lib/posthog'
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
}

export default function MarketScreen({ stash, marketSupply, marketSupplyUpdatedAt, dailyEconomySnapshot, francs, onSell, refinedGoods, onSellRefined, onBack, onOpenMissions, clientId }: MarketScreenProps) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [sellAllConfirm, setSellAllConfirm] = useState(false)
  // SSL-316: every recipe in the game is published here so the player can
  // plan purchases against their stash before they are standing on a field.
  const recipeCategories = CRAFTING_CATEGORY_ORDER.filter(c => CRAFTING_RECIPES.some(r => r.category === c))
  const [recipeCategory, setRecipeCategory] = useState<CraftingCategory>(recipeCategories[0])
  const visibleRecipes = CRAFTING_RECIPES.filter(r => r.category === recipeCategory)

  const entries = Object.entries(stash).filter(([, v]) => v > 0)

  const client = clientId ? CLIENT_SLOTS.find(c => c.id === clientId) ?? null : null

  // Prices come from the same function the sale itself uses, so a quote can
  // never promise more (or less) than the player is actually paid.
  const priceContext = { marketSupply, marketSupplyUpdatedAt, dailyEconomySnapshot }
  const unitPrice = (mineralId: string) => sellUnitPrice(mineralId, priceContext, clientId)
  const totalValue = () => sellQuote(stash, priceContext, clientId)

  function handleSell(mineralId: string) {
    const qty = stash[mineralId] ?? 0
    if (qty > 0) {
      captureGameEvent('market_mineral_sold', { mineral_id: mineralId, quantity: qty })
      onSell(mineralId, qty)
    }
    setConfirming(null)
  }

  const totalUnits = entries.reduce((sum, [, qty]) => sum + qty, 0)
  const refinedEntries = REFINERY_RECIPES.filter(recipe => (refinedGoods[recipe.id] ?? 0) > 0)

  return (
    <div className={`theme-light market-screen ${styles.screen}`}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={onBack} aria-label="Back to previous screen" type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className={styles.headerCopy}>
          <div className={styles.eyebrow}>Base · Resource Desk</div>
          <h1 className={styles.title}>Commodity Exchange</h1>
        </div>
        <div className={styles.balance} aria-label={`Current balance ${formatCurrency(francs)}`}>
          <span className={styles.metricLabel}>Available francs</span>
          <span className={styles.balanceValue}>{formatCurrency(francs, { compact: true })}</span>
        </div>
      </header>

      <main className={styles.content}>
        <section className={styles.intro} aria-labelledby="market-intro-title">
          <div className={styles.paperCard}>
            <div className={styles.sectionLabel}>Open market · live rates</div>
            <h2 id="market-intro-title">Move recovered material into working capital.</h2>
            <p>Sell mined cargo at the published exchange rate. Daily client construction demand sets the next price board.</p>
          </div>
          <div className={styles.quote} aria-label={`Estimated inventory value ${formatCurrency(totalValue())}`}>
            <div>
              <div className={styles.sectionLabel}>Estimated inventory value</div>
              <span className={styles.quoteValue}>{formatCurrency(totalValue())}</span>
            </div>
            <div className={styles.quoteNote}>{totalUnits > 0 ? `${totalUnits} units across ${entries.length} mineral${entries.length === 1 ? '' : 's'}.` : 'No cargo currently buffered.'}</div>
          </div>
        </section>

        {client && !dailyEconomySnapshot && (
          <section className={styles.clientCard} style={{ '--client-accent': client.color } as CSSProperties} aria-label={`${client.name} premium`}>
            <div className={styles.clientMark} aria-hidden="true">+</div>
            <div>
              <div className={styles.sectionLabel}>Active client preference</div>
              <h2>{client.name} Premium</h2>
              <p>Preferred minerals sell at {Math.round((1 + client.payoutPremium) * 100)}% market rate.</p>
            </div>
          </section>
        )}

        {entries.length === 0 && (
          <section className={styles.emptyCard} aria-labelledby="empty-market-title">
            <div className={styles.sectionLabel}>Inventory status · empty</div>
            <h2 id="empty-market-title">No cargo to sell yet</h2>
            <p>The exchange becomes useful after a mining run. Choose a client job or launch a self-directed run, then bring the ore home.</p>
            <button className={styles.primaryButton} onClick={onOpenMissions} type="button">Find a Mining Run</button>
          </section>
        )}

        {entries.length > 0 && (
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionLabel}>Cargo manifest</div>
              <h2>Mineral Inventory</h2>
            </div>
            <button className={styles.sellButton} onClick={() => setSellAllConfirm(true)} type="button">Sell All Minerals</button>
          </div>
        )}

        {refinedEntries.length > 0 && (
          <>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionLabel}>Processed inventory</div>
                <h2>Refined Goods</h2>
              </div>
              <div className={styles.commodityMeta}>Output value · recipe rate</div>
            </div>
            <div className={styles.commodityGrid} data-testid="market-refined-grid">
              {refinedEntries.map(recipe => {
                const qty = refinedGoods[recipe.id] ?? 0
                return (
                  <article className={styles.commodityCard} key={recipe.id}>
                    <div className={styles.commodityTop}>
                      <div>
                        <div className={styles.commodityName}>{recipe.output.name}</div>
                        <div className={styles.commodityMeta}>{qty} units ready</div>
                      </div>
                      <div className={styles.commodityValue}>{formatCurrency(recipe.output.price * qty)}</div>
                    </div>
                    <div className={styles.rate}>
                      <div>
                        <div className={styles.rateLabel}>Settlement rate</div>
                        <div className={styles.rateValue}>{formatCurrency(recipe.output.price)}/u</div>
                      </div>
                    </div>
                    <button className={styles.sellButton} onClick={() => { captureGameEvent('market_refined_sold', { recipe_id: recipe.id, quantity: qty }); onSellRefined(recipe.id, qty) }} type="button">Sell All {recipe.output.name}</button>
                  </article>
                )
              })}
            </div>
          </>
        )}
        <section className={styles.recipes} aria-labelledby="market-recipes-title" data-testid="market-recipes">
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionLabel}>Fabrication &amp; build recipes</div>
              <h2 id="market-recipes-title">What your cargo can become</h2>
            </div>
            <div className={styles.commodityMeta}>Costs are charged when you build or fabricate</div>
          </div>
          <div className={styles.recipeTabs} role="tablist" aria-label="Recipe categories">
            {recipeCategories.map(category => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={recipeCategory === category}
                className={styles.recipeTab}
                onClick={() => setRecipeCategory(category)}
                data-testid={`market-recipe-tab-${category}`}
              >
                {CRAFTING_CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
          <div className={styles.commodityGrid} data-testid="market-recipe-grid">
            {visibleRecipes.map(recipe => {
              const can = craftingAffordability(recipe, francs, stash, refinedGoods)
              return (
                <article className={`${styles.commodityCard} ${styles.recipeCard}`} key={recipe.id} data-affordable={can.ok} data-testid={`market-recipe-${recipe.id}`}>
                  <div className={styles.commodityTop}>
                    <div>
                      <div className={styles.commodityName}>{recipe.name}</div>
                      <div className={styles.commodityMeta}>Made at {recipe.producedAt.replace(/-/g, ' ')}{recipe.placeable ? ' · placeable on the field' : ''}</div>
                    </div>
                    <span className={styles.recipeState} data-ok={can.ok}>{can.ok ? 'Ready' : 'Short'}</span>
                  </div>
                  <p className={styles.recipeDescription}>{recipe.description}</p>
                  <div className={styles.recipeCosts}>
                    {recipe.costFrancs > 0 && <span className={styles.recipeChip}>{formatCurrency(recipe.costFrancs, { compact: true })}</span>}
                    {Object.entries(recipe.costMinerals).map(([id, amount]) => (
                      <span className={styles.recipeChip} key={id} data-short={(can.mineralsShort[id] ?? 0) > 0}>
                        <MineralChip mineral={id} variant="avatar" size={16} />
                        {amount} {MINERAL_META[id]?.name ?? id}
                      </span>
                    ))}
                    {Object.entries(recipe.costRefined ?? {}).map(([id, amount]) => (
                      <span className={styles.recipeChip} key={id} data-short={(can.refinedShort[id] ?? 0) > 0}>
                        {amount} {REFINERY_RECIPES.find(r => r.id === id)?.name ?? id}
                      </span>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {sellAllConfirm && (
          <ActionConfirmBar
            eyebrow="Commodity Exchange"
            title="Sell Entire Inventory"
            description={`Sell all cargo for ${formatCurrency(totalValue())}? This can't be undone.`}
            confirmLabel={`Confirm Sell (${formatCurrency(totalValue())})`}
            onConfirm={() => {
              captureGameEvent('market_sell_all', { mineral_count: entries.length, total_value: totalValue() })
              entries.forEach(([id]) => onSell(id, stash[id]))
              setSellAllConfirm(false)
            }}
            onDismiss={() => setSellAllConfirm(false)}
          />
        )}

        {entries.length > 0 && (
          <div className={styles.commodityGrid} data-testid="market-commodity-grid">
            {entries.map(([id, qty]) => {
              const meta = MINERAL_META[id]
              if (!meta) return null
              const { price, base, premiumApplied } = unitPrice(id)
              const demandExplanation = dailyEconomySnapshot?.prices[id]?.explanation
              return (
                <article className={styles.commodityCard} key={id}>
              <div className={styles.commodityTop}>
                <div className={styles.commodityIdentity}>
                  <MineralChip mineral={id} variant="avatar" size={36} />
                  <div>
                    <div className={styles.commodityName}>{meta.name}</div>
                    <div className={styles.commodityMeta}>{qty} units held</div>
                  </div>
                </div>
                <div className={styles.commodityValue}>{formatCurrency(price * qty)}</div>
              </div>
              <div className={styles.rate}>
                <div>
                  <div className={styles.rateLabel}>Current rate</div>
                  <div className={styles.rateValue}>{formatCurrency(price)}/u <span className={styles.commodityMeta}>base {formatCurrency(base)}/u</span></div>
                  {demandExplanation && <div className={styles.commodityMeta} data-testid={`market-demand-explanation-${id}`}>{demandExplanation}</div>}
                </div>
                {premiumApplied && client && <div className={styles.commodityMeta} style={{ color: client.color }}>Client premium</div>}
              </div>
              <button className={styles.sellButton} onClick={() => setConfirming(id)} type="button">Sell All {meta.name}</button>
                </article>
              )
            })}
          </div>
        )}
      </main>

      {confirming && MINERAL_META[confirming] && (
        <ActionConfirmBar
          eyebrow="Commodity Exchange"
          title={`Sell All ${MINERAL_META[confirming].name}`}
          description={`Sell ${stash[confirming] ?? 0} units for ${formatCurrency(unitPrice(confirming).price * (stash[confirming] ?? 0))}? This can't be undone.`}
          confirmLabel="Confirm Sell"
          onConfirm={() => handleSell(confirming)}
          onDismiss={() => setConfirming(null)}
        />
      )}
    </div>
  )
}
