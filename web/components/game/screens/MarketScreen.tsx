'use client'

import { useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import { PrimaryBtn } from '@/components/ui/Button'
import StatusPill from '@/components/ui/StatusPill'
import { MINERAL_META, CONTRACTOR_SLOTS } from '@/lib/data'
import { openMarketSellPrice } from '@/lib/systems/EconomySystem'

interface MarketScreenProps {
  stash: Record<string, number>
  marketSupply?: Record<string, number>
  francs: number
  onSell: (mineralId: string, amount: number) => void
  onBack: () => void
  contractorId?: string
}

export default function MarketScreen({ stash, marketSupply, francs, onSell, onBack, contractorId }: MarketScreenProps) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [sellAllConfirm, setSellAllConfirm] = useState(false)

  const entries = Object.entries(stash).filter(([, v]) => v > 0)

  const contractor = contractorId ? CONTRACTOR_SLOTS.find(c => c.id === contractorId) ?? null : null

  function marketPrice(mineralId: string, basePrice: number): number {
    return openMarketSellPrice(basePrice, marketSupply?.[mineralId] ?? 0)
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
        <StatusPill kind="amber">₣{francs.toLocaleString()}</StatusPill>
      } />

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <Panel>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 15, color: '#f5a623' }}>Mineral Inventory</div>
          <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', marginTop: 4 }}>
            Total estimated value: ₣{totalValue().toLocaleString()}
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
          <Panel>
            <p className="text-sm text-[#a9b8ce]">No minerals in stash. Complete mining missions to acquire ore.</p>
          </Panel>
        )}

        {entries.length > 0 && !sellAllConfirm && (
          <PrimaryBtn kind="amber" onClick={() => setSellAllConfirm(true)}>Sell All Minerals</PrimaryBtn>
        )}
        {sellAllConfirm && (
          <Panel accent="var(--ln-amber)">
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 800, color: '#f5a623' }}>Sell entire inventory for ₣{totalValue().toLocaleString()}?</span>
              <div className="flex gap-2">
                <PrimaryBtn kind="amber" onClick={() => {
                  entries.forEach(([id]) => onSell(id, stash[id]))
                  setSellAllConfirm(false)
                }}>Confirm</PrimaryBtn>
                <PrimaryBtn kind="amber" onClick={() => setSellAllConfirm(false)}>Cancel</PrimaryBtn>
              </div>
            </div>
          </Panel>
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
                    ₣{showContractor ? contractorValue.toLocaleString() : marketValue.toLocaleString()}
                  </div>
                  {confirming === id ? (
                    <div className="flex gap-1">
                      <PrimaryBtn kind="amber" onClick={() => handleSell(id)}>Confirm</PrimaryBtn>
                      <PrimaryBtn kind="amber" onClick={() => setConfirming(null)}>Cancel</PrimaryBtn>
                    </div>
                  ) : (
                    <PrimaryBtn kind="amber" onClick={() => setConfirming(id)}>Sell All</PrimaryBtn>
                  )}
                </div>
              </div>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}
