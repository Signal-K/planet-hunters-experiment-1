'use client'

import Image from 'next/image'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import { PrimaryBtn, GhostBtn } from '@/components/ui/Button'
import { STARTER_ROCKETS } from '@/lib/data'
import type { StarterRocket } from '@/lib/data'

interface RocketPurchaseScreenProps {
  missionsDone: number
  francs: number
  onPurchase: (rocketId: string) => void
  onBack: () => void
}

function formatFrancs(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B ▲`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M ▲`
  return `${n.toLocaleString()} ▲`
}

function getRequiredRocket(missionsDone: number): StarterRocket {
  const eligible = STARTER_ROCKETS.filter(r => !r.locked && r.missionsRequired <= missionsDone)
  return eligible.sort((a, b) => b.tier - a.tier)[0] ?? STARTER_ROCKETS[0]
}

export default function RocketPurchaseScreen({ missionsDone, francs, onPurchase, onBack }: RocketPurchaseScreenProps) {
  const rocket = getRequiredRocket(missionsDone)
  const isFree = rocket.costFrancs === 0
  const canAfford = francs >= rocket.costFrancs

  return (
    <div className="game-screen">
      <TopBar eyebrow="LAUNCHPAD · VEHICLE" title="Select Rocket" onBack={onBack} />
      <div className="screen-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Panel accent="var(--ln-cyan)" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 72, height: 56, flexShrink: 0,
              display: 'grid', placeItems: 'center',
              background: 'rgba(0,0,0,0.3)', borderRadius: 8,
              border: '1px solid rgba(135,207,250,0.2)',
            }}>
              <Image src={rocket.img} alt={rocket.name} width={64} height={48} style={{ objectFit: 'contain' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>
                SR{rocket.tier} · {isFree ? 'INCLUDED' : 'PURCHASE REQUIRED'}
              </div>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 16, fontWeight: 800, color: 'var(--ln-text)', marginTop: 2 }}>{rocket.name}</div>
              {rocket.stats.cargo > 0 && (
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: 'var(--ln-text-muted)' }}>CARGO {rocket.stats.cargo}</span>
                  <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: 'var(--ln-text-muted)' }}>ORB {rocket.stats.maxOrbit}</span>
                  <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: 'var(--ln-text-muted)' }}>DRILL T{rocket.stats.drillTier}</span>
                </div>
              )}
            </div>
          </div>
        </Panel>

        {!isFree && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>Cost</span>
              <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800, color: 'var(--ln-amber)' }}>{formatFrancs(rocket.costFrancs)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>Balance</span>
              <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800, color: canAfford ? 'var(--ln-text)' : 'var(--ln-crimson)' }}>{formatFrancs(francs)}</span>
            </div>
            {!canAfford && (
              <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 11, color: 'var(--ln-crimson)', marginTop: 4, letterSpacing: '0.06em' }}>
                Insufficient Francs — sell minerals or complete contractor missions to raise funds.
              </div>
            )}
          </div>
        )}

        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, color: 'var(--ln-text-dim)', letterSpacing: '0.08em', lineHeight: 1.6 }}>
          Rockets are single-use. Each mission requires a fresh vehicle.
        </div>
      </div>

      <div className="sticky-actions">
        {isFree ? (
          <PrimaryBtn kind="cyan" onClick={() => onPurchase(rocket.id)}>
            Launch with {rocket.name}
          </PrimaryBtn>
        ) : (
          <>
            <div style={{ marginBottom: 8 }}><GhostBtn full onClick={onBack}>Back</GhostBtn></div>
            <PrimaryBtn kind="amber" disabled={!canAfford} onClick={() => onPurchase(rocket.id)}>
              Purchase · {formatFrancs(rocket.costFrancs)}
            </PrimaryBtn>
          </>
        )}
      </div>
    </div>
  )
}
