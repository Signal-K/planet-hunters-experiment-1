'use client'

import Image from 'next/image'
import TopBar from '@/components/ui/TopBar'
import { PrimaryBtn, GhostBtn } from '@/components/ui/Button'
import { STARTER_ROCKETS } from '@/lib/data'
import type { StarterRocket } from '@/lib/data'
import { UI_ZONES } from '@/lib/ui-zones'
import TutorialHighlight from '@/components/game/TutorialHighlight'

function formatFrancs(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B ▲`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M ▲`
  return `${n.toLocaleString()} ▲`
}

function orbitLabel(maxOrbit: number): string {
  if (maxOrbit <= 3) return 'Near-Earth'
  if (maxOrbit <= 5) return 'Inner Belt'
  if (maxOrbit <= 7) return 'Mid Belt'
  return 'Outer Belt'
}

function drillLabel(tier: number): string {
  if (tier === 0) return 'No drill'
  if (tier === 1) return 'Fe · Si · Basalt'
  if (tier === 2) return 'T1 + Ni · Co'
  return `T1–T${tier} minerals`
}

function cargoLabel(cargo: number): string {
  if (cargo <= 6) return 'Small payload'
  if (cargo <= 10) return 'Medium payload'
  return 'Large payload'
}

function StatBlock({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{
      flex: 1, padding: '10px 10px 8px',
      background: 'rgba(6,12,22,0.6)',
      borderRadius: 8,
      border: '1px solid rgba(135,207,250,0.14)',
    }}>
      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 18, fontWeight: 800, color: 'var(--ln-cyan)', marginTop: 4, letterSpacing: '-0.01em' }}>{value}</div>
      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 10, color: '#6a7e94', marginTop: 3, lineHeight: 1.3 }}>{sub}</div>
    </div>
  )
}

function ModuleChip({ label }: { label: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '5px 10px', borderRadius: 6,
      background: 'rgba(63,169,255,0.08)',
      border: '1px solid rgba(63,169,255,0.22)',
      fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700,
      letterSpacing: '0.1em', color: 'var(--ln-cyan)', textTransform: 'uppercase',
    }}>
      {label}
    </div>
  )
}

function getRequiredRocket(missionsDone: number): StarterRocket {
  const eligible = STARTER_ROCKETS.filter(r => !r.locked && r.missionsRequired <= missionsDone)
  return eligible.sort((a, b) => b.tier - a.tier)[0] ?? STARTER_ROCKETS[0]
}

interface RocketPurchaseScreenProps {
  missionsDone: number
  francs: number
  onPurchase: (rocketId: string) => void
  onBack: () => void
  hasCoach?: boolean
}

export default function RocketPurchaseScreen({ missionsDone, francs, onPurchase, onBack, hasCoach }: RocketPurchaseScreenProps) {
  const rocket = getRequiredRocket(missionsDone)
  const isFree = rocket.costFrancs === 0
  const canAfford = francs >= rocket.costFrancs

  const modules: string[] = [
    'Unibody Airframe',
    'Standard Drive',
    rocket.stats.drillTier > 0 ? `Drill Head T${rocket.stats.drillTier}` : 'Cargo Module',
    `Cargo Bay · ${rocket.stats.cargo}U`,
  ]

  return (
    <div className="game-screen">
      <TopBar eyebrow="LAUNCHPAD · VEHICLE" title="Select Rocket" onBack={onBack} />
      <div className={`screen-scroll${hasCoach ? ' screen-scroll--coach-manual' : ''}`} data-ui-zone={UI_ZONES.screenContent} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Rocket hero image */}
        <div style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 180,
          background: 'radial-gradient(ellipse at 50% 60%, rgba(63,169,255,0.12) 0%, transparent 70%)',
          borderBottom: '1px solid rgba(135,207,250,0.1)',
          marginBottom: 20,
        }}>
          {hasCoach && <TutorialHighlight borderRadius={0} />}
          <Image
            src={rocket.img}
            alt={rocket.name}
            width={200} height={140}
            style={{ objectFit: 'contain', filter: 'drop-shadow(0 8px 24px rgba(63,169,255,0.35))' }}
            priority
          />
          <div style={{
            position: 'absolute', bottom: 12, left: 0, right: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span style={{
              padding: '3px 10px', borderRadius: 999,
              background: isFree ? 'rgba(57,211,106,0.18)' : 'rgba(245,166,35,0.18)',
              border: `1px solid ${isFree ? 'rgba(57,211,106,0.5)' : 'rgba(245,166,35,0.5)'}`,
              fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: isFree ? '#39d36a' : '#f5a623',
            }}>
              SR{rocket.tier} · {isFree ? 'INCLUDED' : formatFrancs(rocket.costFrancs)}
            </span>
          </div>
        </div>

        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Name + description */}
          <div>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 22, fontWeight: 800, color: 'var(--ln-text)', letterSpacing: '-0.01em' }}>
              {rocket.name}
            </div>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12.5, color: '#7a8fa5', marginTop: 5, lineHeight: 1.5 }}>
              Unibody prebuilt vehicle. Assigned to this mission — single-use,
              no modifications required. Fuelled and ready at the launchpad.
            </div>
          </div>

          {/* Stat blocks */}
          <div style={{ display: 'flex', gap: 8 }}>
            <StatBlock
              label="Cargo"
              value={`${rocket.stats.cargo}U`}
              sub={cargoLabel(rocket.stats.cargo)}
            />
            <StatBlock
              label="Max Orbit"
              value={`ORB ${rocket.stats.maxOrbit}`}
              sub={orbitLabel(rocket.stats.maxOrbit)}
            />
            <StatBlock
              label="Drill"
              value={`T${rocket.stats.drillTier}`}
              sub={drillLabel(rocket.stats.drillTier)}
            />
          </div>

          {/* Installed modules */}
          <div>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
              Installed Modules
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {modules.map(m => <ModuleChip key={m} label={m} />)}
            </div>
          </div>

          {/* Cost section (paid rockets only) */}
          {!isFree && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: 'rgba(6,12,22,0.5)', borderRadius: 10, border: '1px solid rgba(135,207,250,0.12)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid rgba(135,207,250,0.08)' }}>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>Vehicle Cost</span>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 15, fontWeight: 800, color: 'var(--ln-amber)' }}>{formatFrancs(rocket.costFrancs)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>Your Balance</span>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 15, fontWeight: 800, color: canAfford ? 'var(--ln-text)' : 'var(--ln-crimson)' }}>{formatFrancs(francs)}</span>
              </div>
              {!canAfford && (
                <div style={{ padding: '8px 14px 10px', fontFamily: 'var(--ln-font-display)', fontSize: 11, color: 'var(--ln-crimson)', letterSpacing: '0.06em', borderTop: '1px solid rgba(220,50,50,0.2)' }}>
                  Insufficient Francs — sell minerals or complete contractor missions to raise funds.
                </div>
              )}
            </div>
          )}

          {/* Footer note */}
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, color: '#445566', letterSpacing: '0.08em', lineHeight: 1.6, paddingBottom: 8 }}>
            Rockets are single-use. Each mission requires a fresh vehicle.
          </div>
        </div>
      </div>

      <div className="sticky-actions" data-ui-zone={UI_ZONES.bottomActions}>
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
