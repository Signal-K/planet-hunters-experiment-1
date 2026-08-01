'use client'

import { useState } from 'react'
import { PrimaryBtn, GhostBtn } from '@/components/ui/Button'
import type { Mission } from '@/lib/data'
import TutorialHighlight from '@/components/game/TutorialHighlight'
import StatCard from '@/components/ui/StatCard'
import CostSummaryRow from '@/components/game/CostSummaryRow'
import MissionSetupShell, {
  MissionSetupCard,
  MissionSetupFrame,
} from '@/components/game/screens/MissionSetupShell'
import { formatCurrency } from '@/lib/format'
import { getRequiredRocketModel } from '@/lib/rockets'
import { calibrateOnboardingPayout } from '@/lib/data'
import RocketCutaway, { type RocketRoomKey } from '@/components/game/RocketCutaway'

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

function ModuleChip({ label }: { label: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '5px 10px', borderRadius: 6,
      background: 'rgba(112,217,234,0.08)',
      border: '1px solid rgba(112,217,234,0.22)',
      fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700,
      letterSpacing: '0.1em', color: 'var(--ln-cyan)', textTransform: 'uppercase',
    }}>
      {label}
    </div>
  )
}

interface RocketPurchaseScreenProps {
  missionsDone: number
  francs: number
  mission?: Mission | null
  deliveryTargetName?: string | null
  onPurchase: (rocketId: string) => void
  onBack: () => void
  hasCoach?: boolean
}

export default function RocketPurchaseScreen({ missionsDone, francs, mission, deliveryTargetName, onPurchase, onBack, hasCoach }: RocketPurchaseScreenProps) {
  const [activeRoom, setActiveRoom] = useState<RocketRoomKey | null>(null)
  const rocket = getRequiredRocketModel(missionsDone)
  const isFree = rocket.costFrancs === 0
  const canAfford = francs >= rocket.costFrancs
  const missionPayout = mission ? calibrateOnboardingPayout(mission.payout.francs, missionsDone) : undefined
  const estProfit = missionPayout !== undefined ? missionPayout - rocket.costFrancs : undefined

  const modules: string[] = [
    'Unibody Airframe',
    'Standard Drive',
    rocket.stats.drillTier > 0 ? `Drill Head T${rocket.stats.drillTier}` : 'Cargo Module',
    `Cargo Bay · ${rocket.stats.cargo}U`,
  ]

  return (
    <MissionSetupShell
      className="mission-setup-screen--rocket"
      eyebrow="LAUNCHPAD · VEHICLE"
      title="Select Rocket"
      onBack={onBack}
      hasCoach={hasCoach}
      coachManual={hasCoach}
      step="Rocket"
      stepDescription={
        isFree
          ? `${rocket.name} is included — continue to the Relay preflight check.`
          : canAfford
            ? `Purchase ${rocket.name} to continue to the Relay preflight check.`
            : `Purchase ${rocket.name} to continue — insufficient Francs right now.`
      }
      actions={isFree ? (
        <PrimaryBtn kind="cyan" onClick={() => onPurchase(rocket.id)}>
          Launch with {rocket.name}
        </PrimaryBtn>
      ) : (
        <>
          <div style={{ marginBottom: 8 }}><GhostBtn full onClick={onBack}>Back</GhostBtn></div>
          <PrimaryBtn kind="cyan" disabled={!canAfford} onClick={() => onPurchase(rocket.id)}>
            Purchase · {formatCurrency(rocket.costFrancs, { compact: true })}
          </PrimaryBtn>
        </>
      )}
    >
      <MissionSetupFrame style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 54%, rgba(112,217,234,0.16) 0%, rgba(112,217,234,0.05) 36%, transparent 72%)',
      }}>
        {hasCoach && <TutorialHighlight borderRadius={14} />}
        {deliveryTargetName && (
          <div style={{
            position: 'absolute', top: 12, left: 12, right: 12,
            padding: '8px 12px', borderRadius: 6,
            background: 'rgba(11,11,13,0.78)', border: '1px solid rgba(112,217,234,0.35)',
            fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.08em', color: 'var(--ln-cyan)', textTransform: 'uppercase', textAlign: 'center',
          }}>
            Two-stop job · Deliver to {deliveryTargetName} before returning to Earth
          </div>
        )}
        <RocketCutaway rocket={rocket} activeRoom={activeRoom} onToggle={room => setActiveRoom(current => current === room ? null : room)} />
        <div style={{
          position: 'absolute', top: deliveryTargetName ? 54 : 14, right: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
          zIndex: 2,
        }}>
          <span style={{
            padding: '4px 12px', borderRadius: 999,
            background: isFree ? 'rgba(57,211,106,0.18)' : 'rgba(245,166,35,0.18)',
            border: `1px solid ${isFree ? 'rgba(57,211,106,0.5)' : 'rgba(245,166,35,0.5)'}`,
            fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: isFree ? '#39d36a' : '#f5a623',
          }}>
            TIER {rocket.tier} · {isFree ? 'INCLUDED' : formatCurrency(rocket.costFrancs, { compact: true })}
          </span>
        </div>
      </MissionSetupFrame>

      <MissionSetupCard scrollStyle={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 22, fontWeight: 800, color: 'var(--ln-text)', letterSpacing: '-0.01em' }}>
              {rocket.name}
            </div>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12.5, color: '#7a8fa5', marginTop: 5, lineHeight: 1.5 }}>
              Unibody prebuilt vehicle. Assigned to this mission — single-use,
              no modifications required. Fuelled and ready at the launchpad.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <StatCard
              label="Cargo"
              value={`${rocket.stats.cargo}U`}
              detail={cargoLabel(rocket.stats.cargo)}
            />
            <StatCard
              label="Max Orbit"
              value={`ORB ${rocket.stats.maxOrbit}`}
              detail={orbitLabel(rocket.stats.maxOrbit)}
            />
            <StatCard
              label="Drill"
              value={`T${rocket.stats.drillTier}`}
              detail={drillLabel(rocket.stats.drillTier)}
            />
          </div>

          <div>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
              Installed Modules
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {modules.map(m => <ModuleChip key={m} label={m} />)}
            </div>
          </div>

          {!isFree && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: 'rgba(11,11,13,0.5)', borderRadius: 10, border: '1px solid rgba(112,217,234,0.12)', overflow: 'hidden' }}>
              {missionPayout !== undefined && (
                <CostSummaryRow label="Mission Payout (base)" value={formatCurrency(missionPayout, { compact: true })} color="var(--ln-cyan)" />
              )}
              <CostSummaryRow label="Vehicle Cost" value={formatCurrency(rocket.costFrancs, { compact: true })} color="var(--ln-amber)" />
              {estProfit !== undefined && (
                <CostSummaryRow label="Est. Profit" value={formatCurrency(estProfit, { compact: true, signed: true })} color={estProfit >= 0 ? 'var(--ln-ok)' : 'var(--ln-crimson)'} />
              )}
              <CostSummaryRow label="Your Balance" value={formatCurrency(francs, { compact: true })} color={canAfford ? 'var(--ln-text)' : 'var(--ln-crimson)'} last />
              {missionPayout !== undefined && (
                <div style={{ padding: '6px 14px 10px', fontFamily: 'var(--ln-font-body)', fontSize: 10, color: '#6a7e94', borderTop: '1px solid rgba(112,217,234,0.08)' }}>
                  The rocket is a one-time purchase; the mission payout is what you collect at debrief. Client premiums and affinity bonuses can raise the payout above the base figure shown.
                </div>
              )}
              {!canAfford && (
                <div style={{ padding: '8px 14px 10px', fontFamily: 'var(--ln-font-display)', fontSize: 11, color: 'var(--ln-crimson)', letterSpacing: '0.06em', borderTop: '1px solid rgba(220,50,50,0.2)' }}>
                  Insufficient Francs — sell minerals or complete client missions to raise funds.
                </div>
              )}
            </div>
          )}

          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, color: '#445566', letterSpacing: '0.08em', lineHeight: 1.6, paddingBottom: 8 }}>
            Rockets are single-use. Each mission requires a fresh vehicle.
          </div>
      </MissionSetupCard>
    </MissionSetupShell>
  )
}
