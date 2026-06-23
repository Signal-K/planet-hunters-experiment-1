'use client'

import Image from 'next/image'
import TopBar from '@/components/ui/TopBar'
import { STARTER_ROCKETS } from '@/lib/data'
import type { StarterRocket } from '@/lib/data'
import { UI_ZONES } from '@/lib/ui-zones'

interface HangarScreenProps {
  francs: number
  missionsDone: number
  onBack: () => void
  onSelect?: (rocketId: string) => void
}

function formatFrancs(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B ▲`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M ▲`
  return `${n.toLocaleString()} ▲`
}

function RocketCard({ rocket, missionsDone, onSelect }: { rocket: StarterRocket; missionsDone: number; onSelect?: (id: string) => void }) {
  const missionUnlocked = missionsDone >= rocket.missionsRequired
  const isAvailable = !rocket.locked && missionUnlocked

  return (
    <div style={{
      background: isAvailable ? 'linear-gradient(180deg, rgba(10,18,29,0.9), rgba(6,12,22,0.95))' : 'rgba(6,10,18,0.7)',
      border: `1px solid ${isAvailable ? 'rgba(135,207,250,0.3)' : 'rgba(135,207,250,0.1)'}`,
      borderRadius: 12,
      padding: 12,
      opacity: isAvailable ? 1 : 0.55,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{ width: 64, height: 48, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: 8, border: '1px solid rgba(135,207,250,0.15)' }}>
        {isAvailable
          ? <Image src={rocket.img} alt={rocket.name} width={56} height={40} style={{ objectFit: 'contain' }} />
          : <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 18, color: 'rgba(135,207,250,0.3)' }}>?</span>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>SR{rocket.tier}</span>
          {!isAvailable && (
            <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(135,207,250,0.4)', textTransform: 'uppercase', padding: '1px 5px', border: '1px solid rgba(135,207,250,0.2)', borderRadius: 4 }}>LOCKED</span>
          )}
        </div>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800, color: isAvailable ? 'var(--ln-text)' : 'var(--ln-text-muted)', marginTop: 2 }}>{rocket.name}</div>
        {isAvailable && rocket.stats.cargo > 0 ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: 'var(--ln-text-muted)' }}>CARGO {rocket.stats.cargo}</span>
            <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: 'var(--ln-text-muted)' }}>ORB {rocket.stats.maxOrbit}</span>
            <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: 'var(--ln-text-muted)' }}>DRILL T{rocket.stats.drillTier}</span>
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, color: 'rgba(135,207,250,0.4)', marginTop: 4 }}>{rocket.unlockHint}</div>
        )}
      </div>
      {isAvailable && onSelect && rocket.costFrancs > 0 && (
        <button
          onClick={() => onSelect(rocket.id)}
          style={{
            flexShrink: 0, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(180deg, #f5a623, #c47d10)',
            color: '#04121f', fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}
        >
          {formatFrancs(rocket.costFrancs)}
        </button>
      )}
    </div>
  )
}

export default function HangarScreen({ francs: _francs, missionsDone, onBack, onSelect }: HangarScreenProps) {
  return (
    <div className="game-screen">
      <TopBar eyebrow="LAUNCHPAD · HANGAR" title="Rocket Fleet" onBack={onBack} />
      <div className="screen-scroll" data-ui-zone={UI_ZONES.screenContent} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STARTER_ROCKETS.map(rocket => (
          <RocketCard key={rocket.id} rocket={rocket} missionsDone={missionsDone} onSelect={onSelect} />
        ))}

      </div>
    </div>
  )
}
