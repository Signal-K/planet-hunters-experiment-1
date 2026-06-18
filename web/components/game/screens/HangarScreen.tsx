'use client'

import Image from 'next/image'
import { useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import { STARTER_ROCKETS, hasShipCustomizer } from '@/lib/data'
import type { StarterRocket } from '@/lib/data'
import { UI_ZONES } from '@/lib/ui-zones'
import ShipInteriorPreview from '@/components/game/ShipInteriorPreview'

interface HangarScreenProps {
  francs: number
  missionsDone: number
  unlockedSkillNodes?: string[]
  onBack: () => void
  onSelect?: (rocketId: string) => void
}

function formatFrancs(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B ▲`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M ▲`
  return `${n.toLocaleString()} ▲`
}

const STAT_MAX: Record<string, number> = { cargo: 20, maxOrbit: 10, drillTier: 5 }

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ display: 'grid', gap: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 7, color: 'var(--ln-text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, color: 'var(--ln-text)' }}>{value}</span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: 'rgba(63,169,255,0.12)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: 'linear-gradient(90deg, var(--ln-cyan-press), var(--ln-cyan-bright))', boxShadow: '0 0 6px rgba(63,169,255,0.5)' }} />
      </div>
    </div>
  )
}

function RocketCard({ rocket, missionsDone, onSelect }: { rocket: StarterRocket; missionsDone: number; onSelect?: (id: string) => void }) {
  const missionUnlocked = missionsDone >= rocket.missionsRequired
  const isAvailable = !rocket.locked && missionUnlocked
  const isLocked = rocket.locked || !missionUnlocked
  const hasCost = rocket.costFrancs > 0

  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid ${isAvailable ? 'rgba(63,169,255,0.35)' : 'rgba(63,169,255,0.1)'}`,
      background: isAvailable
        ? 'linear-gradient(160deg, rgba(12,22,38,0.97) 0%, rgba(6,12,22,0.99) 100%)'
        : 'rgba(6,10,18,0.6)',
      overflow: 'hidden',
      opacity: isLocked ? 0.5 : 1,
    }}>
      {/* Ship image banner */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: isAvailable ? 110 : 64,
        background: isAvailable
          ? 'radial-gradient(ellipse at 55% 50%, rgba(63,169,255,0.12) 0%, rgba(0,0,0,0.0) 65%), linear-gradient(180deg, rgba(8,18,32,0.0), rgba(6,12,22,0.95))'
          : 'rgba(4,8,14,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderBottom: `1px solid ${isAvailable ? 'rgba(63,169,255,0.15)' : 'rgba(63,169,255,0.06)'}`,
      }}>
        {/* Grid lines for tech feel */}
        {isAvailable && (
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.08,
            backgroundImage: 'linear-gradient(rgba(63,169,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(63,169,255,1) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }} />
        )}
        {isAvailable ? (
          <Image
            src={rocket.img}
            alt={rocket.name}
            width={240}
            height={90}
            style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 18px rgba(63,169,255,0.35))' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 22, color: 'rgba(63,169,255,0.18)', letterSpacing: '0.12em' }}>SR{rocket.tier}</span>
            <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 7, color: 'rgba(63,169,255,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Classified</span>
          </div>
        )}
        {/* Tier badge */}
        <div style={{
          position: 'absolute', top: 8, left: 8,
          fontFamily: 'var(--ln-font-mono)', fontSize: 7, fontWeight: 700, letterSpacing: '0.18em',
          color: isAvailable ? 'var(--ln-cyan)' : 'rgba(63,169,255,0.35)',
          textTransform: 'uppercase',
        }}>
          SR{rocket.tier}
        </div>
        {isLocked && (
          <div style={{
            position: 'absolute', top: 6, right: 8,
            padding: '2px 6px', borderRadius: 4,
            border: '1px solid rgba(63,169,255,0.22)',
            fontFamily: 'var(--ln-font-display)', fontSize: 7, fontWeight: 700,
            letterSpacing: '0.14em', color: 'rgba(63,169,255,0.45)',
            textTransform: 'uppercase',
          }}>
            Locked
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          <div>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 15, fontWeight: 800, color: isAvailable ? 'var(--ln-text)' : 'var(--ln-text-muted)', lineHeight: 1.1 }}>
              {rocket.name}
            </div>
            {!isAvailable && (
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 10, color: 'var(--ln-text-muted)', marginTop: 3 }}>
                {rocket.unlockHint}
              </div>
            )}
          </div>
          {isAvailable && onSelect && hasCost && (
            <button
              onClick={() => onSelect(rocket.id)}
              style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(180deg, var(--ln-crimson-bright), var(--ln-crimson-press))',
                color: '#fff', fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 900,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                boxShadow: '0 0 14px rgba(200,41,62,0.35)',
              }}
            >
              {formatFrancs(rocket.costFrancs)}
            </button>
          )}
          {isAvailable && !hasCost && (
            <div style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(57,211,106,0.4)', color: 'var(--ln-ok)', fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Standard Issue
            </div>
          )}
        </div>

        {isAvailable && rocket.stats.cargo > 0 && (
          <div style={{ display: 'grid', gap: 6 }}>
            <StatBar label="Cargo" value={rocket.stats.cargo} max={STAT_MAX.cargo} />
            <StatBar label="Max Orbit" value={rocket.stats.maxOrbit} max={STAT_MAX.maxOrbit} />
            <StatBar label={`Drill T${rocket.stats.drillTier}`} value={rocket.stats.drillTier} max={STAT_MAX.drillTier} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function HangarScreen({ francs: _francs, missionsDone, unlockedSkillNodes, onBack, onSelect }: HangarScreenProps) {
  const customizerUnlocked = hasShipCustomizer(unlockedSkillNodes)
  const [customizerOpen, setCustomizerOpen] = useState(false)

  return (
    <div className="game-screen">
      <TopBar eyebrow="LAUNCHPAD · HANGAR" title="Rocket Fleet" onBack={onBack} />
      <div className="screen-scroll" data-ui-zone={UI_ZONES.screenContent} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

        {customizerUnlocked && (
          <button
            onClick={() => setCustomizerOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid rgba(200,41,62,0.45)',
              background: 'linear-gradient(135deg, rgba(200,41,62,0.08) 0%, rgba(10,18,29,0.95) 60%)',
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: '0 0 24px rgba(200,41,62,0.12)',
            }}
          >
            {/* Icon */}
            <div style={{
              width: 36, height: 36, flexShrink: 0, borderRadius: 8,
              border: '1px solid rgba(200,41,62,0.5)',
              background: 'rgba(200,41,62,0.12)',
              display: 'grid', placeItems: 'center',
              fontFamily: 'var(--ln-font-mono)', fontSize: 16, color: 'var(--ln-crimson-bright)',
            }}>
              ⬡
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: 'var(--ln-crimson)', textTransform: 'uppercase' }}>
                Customiser Online
              </div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: 'var(--ln-text-muted)', marginTop: 2 }}>
                Configure SR1 room modules
              </div>
            </div>
            <span style={{ flexShrink: 0, fontFamily: 'var(--ln-font-display)', fontSize: 12, color: 'var(--ln-crimson-bright)', opacity: 0.7 }}>›</span>
          </button>
        )}

        {STARTER_ROCKETS.map(rocket => (
          <RocketCard key={rocket.id} rocket={rocket} missionsDone={missionsDone} onSelect={onSelect} />
        ))}
      </div>

      {customizerOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
          <ShipInteriorPreview
            rocketId="sr1"
            startingFrancs={_francs}
            missionsDone={missionsDone}
            onClose={() => setCustomizerOpen(false)}
          />
        </div>
      )}
    </div>
  )
}
