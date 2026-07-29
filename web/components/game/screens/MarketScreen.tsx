'use client'

import { useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import { PrimaryBtn } from '@/components/ui/Button'
import StatusPill from '@/components/ui/StatusPill'
import ConfirmActionSheet from '@/components/game/ConfirmActionSheet'
import MineralChip from '@/components/game/MineralChip'
import { MINERAL_META, CLIENT_SLOTS } from '@/lib/data'
import { sellUnitPrice, sellQuote } from '@/lib/systems/EconomySystem'
import { formatCurrency } from '@/lib/format'

interface MarketScreenProps {
  stash: Record<string, number>
  marketSupply?: Record<string, number>
  marketSupplyUpdatedAt?: Record<string, number>
  francs: number
  onSell: (mineralId: string, amount: number) => void
  onBack: () => void
  onOpenMissions: () => void
  clientId?: string
}

export default function MarketScreen({ stash, marketSupply, marketSupplyUpdatedAt, francs, onSell, onBack, onOpenMissions, clientId }: MarketScreenProps) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [sellAllConfirm, setSellAllConfirm] = useState(false)

  const entries = Object.entries(stash).filter(([, v]) => v > 0)

  const client = clientId ? CLIENT_SLOTS.find(c => c.id === clientId) ?? null : null

  // Prices come from the same function the sale itself uses, so a quote can
  // never promise more (or less) than the player is actually paid.
  const priceContext = { marketSupply, marketSupplyUpdatedAt }
  const unitPrice = (mineralId: string) => sellUnitPrice(mineralId, priceContext, clientId)
  const totalValue = () => sellQuote(stash, priceContext, clientId)

  function handleSell(mineralId: string) {
    const qty = stash[mineralId] ?? 0
    if (qty > 0) {
      onSell(mineralId, qty)
    }
    setConfirming(null)
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--ln-void)', color: 'var(--ln-text)' }}>
      <TopBar title="Commodity Exchange" onBack={onBack} right={
        <StatusPill kind="info">{formatCurrency(francs, { compact: true })}</StatusPill>
      } />

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <Panel>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ln-cyan)' }}>Mineral Inventory</div>
          <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-dim)', marginTop: 4 }}>
            Total estimated value: {formatCurrency(totalValue())}
          </div>
        </Panel>

        {client && (
          <Panel accent="var(--ln-cyan)">
            <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 13, color: client.color }}>
              {client.name} Premium
            </div>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: 'var(--ln-text-dim)', marginTop: 2 }}>
              Preferred minerals sell at {Math.round((1 + client.payoutPremium) * 100)}% market rate
            </div>
          </Panel>
        )}

        {entries.length === 0 && (
          <Panel accent="var(--ln-cyan)" style={{ padding: 14 }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 15, fontWeight: 800, color: 'var(--ln-text)' }}>No cargo to sell yet</div>
            <p className="text-sm" style={{ color: 'var(--ln-text-dim)', margin: '6px 0 12px', lineHeight: 1.45 }}>The exchange becomes useful after a mining run. Choose a client job or launch a self-directed run, then bring the ore home.</p>
            <PrimaryBtn onClick={onOpenMissions}>Find a Mining Run</PrimaryBtn>
          </Panel>
        )}

        {entries.length > 0 && (
          <PrimaryBtn onClick={() => setSellAllConfirm(true)}>Sell All Minerals</PrimaryBtn>
        )}
        {sellAllConfirm && (
          <ConfirmActionSheet
            eyebrow="Commodity Exchange"
            title="Sell Entire Inventory"
            description={`Sell all cargo for ${formatCurrency(totalValue())}? This can't be undone.`}
            confirmLabel={`Confirm Sell (${formatCurrency(totalValue())})`}
            onConfirm={() => {
              entries.forEach(([id]) => onSell(id, stash[id]))
              setSellAllConfirm(false)
            }}
            onDismiss={() => setSellAllConfirm(false)}
          />
        )}

        {entries.map(([id, qty]) => {
          const meta = MINERAL_META[id]
          if (!meta) return null
          const { price, base, premiumApplied } = unitPrice(id)
          return (
            <Panel key={id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MineralChip mineral={id} variant="avatar" size={36} />
                  <div>
                    <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 14, color: 'var(--ln-text)' }}>{meta.name}</div>
                    <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: 'var(--ln-text-muted)' }}>
                      {qty} units · {formatCurrency(base)}/u
                      {premiumApplied && client && (
                        <span style={{ color: client.color, marginLeft: 8 }}>
                          · Contract {formatCurrency(price)}/u
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 16, color: 'var(--ln-payout)' }}>
                    {formatCurrency(price * qty)}
                  </div>
                  <PrimaryBtn onClick={() => setConfirming(id)}>Sell All</PrimaryBtn>
                </div>
              </div>
            </Panel>
          )
        })}
      </div>

      {confirming && MINERAL_META[confirming] && (
        <ConfirmActionSheet
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
