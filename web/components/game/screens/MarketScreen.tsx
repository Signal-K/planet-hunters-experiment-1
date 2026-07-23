'use client'

import { useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import { PrimaryBtn } from '@/components/ui/Button'
import StatusPill from '@/components/ui/StatusPill'
import ConfirmActionSheet from '@/components/game/ConfirmActionSheet'
import { MINERAL_META, CONTRACTOR_SLOTS } from '@/lib/data'
import { openMarketSellPrice, decayedUnitsSold } from '@/lib/systems/EconomySystem'
import { formatFrancs } from '@/lib/format'

interface MarketScreenProps {
  stash: Record<string, number>
  marketSupply?: Record<string, number>
  marketSupplyUpdatedAt?: Record<string, number>
  francs: number
  onSell: (mineralId: string, amount: number) => void
  onBack: () => void
  onOpenMissions: () => void
  contractorId?: string
}

export default function MarketScreen({ stash, marketSupply, marketSupplyUpdatedAt, francs, onSell, onBack, onOpenMissions, contractorId }: MarketScreenProps) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [sellAllConfirm, setSellAllConfirm] = useState(false)

  const entries = Object.entries(stash).filter(([, v]) => v > 0)

  const contractor = contractorId ? CONTRACTOR_SLOTS.find(c => c.id === contractorId) ?? null : null

  function marketPrice(mineralId: string, basePrice: number): number {
    const unitsSold = decayedUnitsSold(marketSupply?.[mineralId] ?? 0, marketSupplyUpdatedAt?.[mineralId])
    return openMarketSellPrice(basePrice, unitsSold)
  }

  function totalValue() {
    return entries.reduce((sum, [id, qty]) => {
      const meta = MINERAL_META[id]
      return sum + (meta ? marketPrice(id, meta.price) * qty : 0)
    }, 0)
  }

  function contractorPrice(basePrice: number, mineralId: string): number {
    if (!contractor) return basePrice
    const pref = contractor.mineralPreferences.includes(mineralId)
    return pref ? Math.round(basePrice * (1 + contractor.payoutPremium)) : basePrice
  }

  function handleSell(mineralId: string) {
    const qty = stash[mineralId] ?? 0
    if (qty > 0) {
      onSell(mineralId, qty)
    }
    setConfirming(null)
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0f1a] text-white">
      <TopBar title="Commodity Exchange" onBack={onBack} right={
        <StatusPill kind="amber">₣{formatFrancs(francs)}</StatusPill>
      } />

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <Panel>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 15, color: '#f5a623' }}>Mineral Inventory</div>
          <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', marginTop: 4 }}>
            Total estimated value: ₣{formatFrancs(totalValue())}
          </div>
        </Panel>

        {contractor && (
          <Panel accent="var(--ln-amber)">
            <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 13, color: contractor.color }}>
              {contractor.name} Premium
            </div>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: '#a9b8ce', marginTop: 2 }}>
              Preferred minerals sell at {Math.round((1 + contractor.payoutPremium) * 100)}% market rate
            </div>
          </Panel>
        )}

        {entries.length === 0 && (
          <Panel accent="var(--ln-cyan)" style={{ padding: 14 }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 15, fontWeight: 800, color: 'var(--ln-text)' }}>No cargo to sell yet</div>
            <p className="text-sm text-[#a9b8ce]" style={{ margin: '6px 0 12px', lineHeight: 1.45 }}>The exchange becomes useful after a mining run. Choose a contractor job or launch a self-directed run, then bring the ore home.</p>
            <PrimaryBtn onClick={onOpenMissions}>Find a Mining Run</PrimaryBtn>
          </Panel>
        )}

        {entries.length > 0 && (
          <PrimaryBtn kind="amber" onClick={() => setSellAllConfirm(true)}>Sell All Minerals</PrimaryBtn>
        )}
        {sellAllConfirm && (
          <ConfirmActionSheet
            eyebrow="Commodity Exchange"
            title="Sell Entire Inventory"
            description={`Sell all cargo for ₣${formatFrancs(totalValue())}? This can't be undone.`}
            confirmLabel={`Confirm Sell (₣${formatFrancs(totalValue())})`}
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
          const mp = marketPrice(id, meta.price)
          const marketValue = mp * qty
          const cp = contractorPrice(meta.price, id)
          const contractorValue = cp * qty
          const showContractor = contractor && cp !== meta.price
          return (
            <Panel key={id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 800,
                    background: meta.color + '22',
                    border: `1px solid ${meta.color}`,
                    color: meta.color,
                  }}>
                    {meta.sym}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 14, color: '#e6efff' }}>{meta.name}</div>
                    <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: '#7a8294' }}>
                      {qty} units · ₣{mp}/u
                      {showContractor && (
                        <span style={{ color: contractor.color, marginLeft: 8 }}>
                          · Contract ₣{cp}/u
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 16, color: '#f5a623' }}>
                    ₣{formatFrancs(showContractor ? contractorValue : marketValue)}
                  </div>
                  <PrimaryBtn kind="amber" onClick={() => setConfirming(id)}>Sell All</PrimaryBtn>
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
          description={`Sell ${stash[confirming] ?? 0} units for ₣${formatFrancs((contractor ? contractorPrice(MINERAL_META[confirming].price, confirming) : marketPrice(confirming, MINERAL_META[confirming].price)) * (stash[confirming] ?? 0))}? This can't be undone.`}
          confirmLabel="Confirm Sell"
          onConfirm={() => handleSell(confirming)}
          onDismiss={() => setConfirming(null)}
        />
      )}
    </div>
  )
}
