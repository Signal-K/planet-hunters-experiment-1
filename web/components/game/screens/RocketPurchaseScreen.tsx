'use client'

import { useState } from 'react'
import { PrimaryBtn, GhostBtn } from '@/components/ui/Button'
import type { Mission, RocketModel } from '@/lib/data'
import { ROCKET_MODELS } from '@/lib/data'
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

function rocketRole(rocket: RocketModel): string {
  if (rocket.id === 'explorer') return 'Entry vehicle · balanced starter range'
  if (rocket.id === 'prospector') return 'Larger vehicle · more cargo and range'
  return `Tier ${rocket.tier} vehicle · expanded mission capability`
}

function ModuleChip({ label }: { label: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '5px 10px', borderRadius: 6,
      background: 'var(--ln-bp-blue-soft, var(--ln-cyan-soft))',
      border: '1px solid var(--ln-cyan-border)',
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
  const [modulesOpen, setModulesOpen] = useState(true)
  const defaultRocket = getRequiredRocketModel(missionsDone)
  const availableRockets = ROCKET_MODELS.filter(model => !model.locked && model.missionsRequired <= missionsDone)
  const [selectedRocketId, setSelectedRocketId] = useState(defaultRocket.id)
  const rocket = availableRockets.find(model => model.id === selectedRocketId) ?? defaultRocket
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
      className="mission-setup-screen--rocket theme-blueprint"
      eyebrow="LAUNCHPAD · VEHICLE"
      title="Select Rocket"
      onBack={onBack}
      hasCoach={hasCoach}
      coachManual={hasCoach}
      step="Rocket"
      stepDescription={isFree ? 'Choose a vehicle, then continue to preflight.' : 'Choose a vehicle, then purchase it to continue to preflight.'}
      actions={isFree ? (
        <div className="rocket-actions">
          <PrimaryBtn full={false} kind="cyan" onClick={() => onPurchase(rocket.id)}>
          Continue with {rocket.name}
          </PrimaryBtn>
        </div>
      ) : (
        <div className="rocket-actions">
          <GhostBtn full={false} onClick={onBack}>Back</GhostBtn>
          <PrimaryBtn full={false} kind="cyan" disabled={!canAfford} onClick={() => onPurchase(rocket.id)}>
            Purchase · {formatCurrency(rocket.costFrancs, { compact: true })}
          </PrimaryBtn>
        </div>
      )}
    >
      <div className="rocket-vehicle-stage">
        {deliveryTargetName && (
          <div className="rocket-route-notice">
            Two-stop job · Deliver to {deliveryTargetName} before returning to Earth
          </div>
        )}
        <MissionSetupFrame className="rocket-vehicle-frame" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at 50% 54%, var(--ln-bp-blue-soft, var(--ln-cyan-soft)) 0%, transparent 70%)',
        }}>
          {hasCoach && <TutorialHighlight borderRadius={14} />}
          <div className="rocket-tier-badge" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
            zIndex: 2,
          }}>
            <span style={{
              padding: '4px 12px', borderRadius: 999,
              background: isFree ? 'var(--ln-ok-soft, rgba(57,211,106,0.18))' : 'var(--ln-bp-pink-soft, rgba(245,166,35,0.18))',
              border: `1px solid ${isFree ? 'var(--ln-ok)' : 'var(--ln-bp-pink-border, var(--ln-cyan-border))'}`,
              fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: isFree ? 'var(--ln-ok)' : 'var(--ln-bp-pink, var(--ln-cyan))',
            }}>
              TIER {rocket.tier} · {isFree ? 'INCLUDED' : formatCurrency(rocket.costFrancs, { compact: true })}
            </span>
          </div>
          <RocketCutaway rocket={rocket} activeRoom={activeRoom} onToggle={room => setActiveRoom(current => current === room ? null : room)} />
        </MissionSetupFrame>
      </div>

      <MissionSetupCard className="rocket-summary-card" scrollClassName="rocket-summary-scroll" scrollStyle={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="rocket-selector" role="radiogroup" aria-label="Available rocket types">
            <div className="rocket-selector-heading">
              <span className="rocket-selector-label">Choose vehicle</span>
              <span className="rocket-selector-hint">Each launch uses one vehicle</span>
            </div>
            <div className="rocket-choice-grid">
              {availableRockets.map(option => {
                const selected = option.id === rocket.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-testid={`rocket-choice-${option.id}`}
                    className={`rocket-choice${selected ? ' is-selected' : ''}`}
                    onClick={() => {
                      setSelectedRocketId(option.id)
                      setActiveRoom(null)
                      setModulesOpen(false)
                    }}
                  >
                    <span className="rocket-choice-topline">
                      <span>TIER {option.tier}</span>
                      <strong>{option.costFrancs === 0 ? 'INCLUDED' : formatCurrency(option.costFrancs, { compact: true })}</strong>
                    </span>
                    <span className="rocket-choice-name">{option.name}</span>
                    <span className="rocket-choice-role">{rocketRole(option)}</span>
                    <span className="rocket-choice-stats">{option.stats.cargo}U · ORB {option.stats.maxOrbit} · DRILL T{option.stats.drillTier}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 22, fontWeight: 800, color: 'var(--ln-text)', letterSpacing: '-0.01em' }}>
              {rocket.name}
            </div>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12.5, color: 'var(--ln-text-muted)', marginTop: 5, lineHeight: 1.5 }}>
              Unibody prebuilt vehicle. Assigned to this mission — single-use,
              no modifications required. Fuelled and ready at the launchpad.
            </div>
          </div>

          <div className="rocket-stat-grid" style={{ display: 'flex', gap: 8 }}>
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

          {modules.length > 0 && (
            <details className="rocket-modules" open={modulesOpen} onToggle={event => setModulesOpen(event.currentTarget.open)}>
              <summary>Installed Modules</summary>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {modules.map(m => <ModuleChip key={m} label={m} />)}
              </div>
            </details>
          )}

          {!isFree && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: 'var(--ln-panel-2)', borderRadius: 10, border: '1px solid var(--ln-cyan-border)', overflow: 'hidden' }}>
              {missionPayout !== undefined && (
                <CostSummaryRow label="Mission Payout (base)" value={formatCurrency(missionPayout, { compact: true })} color="var(--ln-cyan)" />
              )}
              <CostSummaryRow label="Vehicle Cost" value={formatCurrency(rocket.costFrancs, { compact: true })} color="var(--ln-amber)" />
              {estProfit !== undefined && (
                <CostSummaryRow label="Est. Profit" value={formatCurrency(estProfit, { compact: true, signed: true })} color={estProfit >= 0 ? 'var(--ln-ok)' : 'var(--ln-crimson)'} />
              )}
              <CostSummaryRow label="Your Balance" value={formatCurrency(francs, { compact: true })} color={canAfford ? 'var(--ln-text)' : 'var(--ln-crimson)'} last />
              {missionPayout !== undefined && (
                <div style={{ padding: '6px 14px 10px', fontFamily: 'var(--ln-font-body)', fontSize: 10, color: 'var(--ln-text-muted)', borderTop: '1px solid var(--ln-hairline)' }}>
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

          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, color: 'var(--ln-text-dim)', letterSpacing: '0.08em', lineHeight: 1.6, paddingBottom: 8 }}>
            Rockets are single-use. Each mission requires a fresh vehicle.
          </div>
      </MissionSetupCard>
    </MissionSetupShell>
  )
}
