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
import { recipeIsAffordable, rocketCompositionForId } from '@/lib/data/rocket-composition'

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
  onFabricatePart: (rocketId: string, componentId: string) => void
  onAssembleFabricatedRocket: (rocketId: string) => void
  siloOnline: boolean
  stash: Record<string, number>
  fabricatedParts: Record<string, number>
  onBack: () => void
  hasCoach?: boolean
}

export default function RocketPurchaseScreen({ missionsDone, francs, mission, deliveryTargetName, onPurchase, onFabricatePart, onAssembleFabricatedRocket, siloOnline, stash, fabricatedParts, onBack, hasCoach }: RocketPurchaseScreenProps) {
  const [activeRoom, setActiveRoom] = useState<RocketRoomKey | null>(null)
  const [blueprintOpen, setBlueprintOpen] = useState(false)
  const [modulesOpen, setModulesOpen] = useState(true)
  const defaultRocket = getRequiredRocketModel(missionsDone)
  const availableRockets = ROCKET_MODELS.filter(model => !model.locked && model.missionsRequired <= missionsDone)
  const [selectedRocketId, setSelectedRocketId] = useState(defaultRocket.id)
  const rocket = availableRockets.find(model => model.id === selectedRocketId) ?? defaultRocket
  const isFree = rocket.costFrancs === 0
  const canAfford = francs >= rocket.costFrancs
  const missionPayout = mission ? calibrateOnboardingPayout(mission.payout.francs, missionsDone) : undefined
  const estProfit = missionPayout !== undefined ? missionPayout - rocket.costFrancs : undefined
  const composition = rocketCompositionForId(rocket.id)
  const fabricationReady = composition.recipes.every(recipe => (fabricatedParts[recipe.id] ?? 0) > 0)

  const modules: string[] = [
    `${composition.stages.length} recoverable stage`,
    `${composition.boosters.count}× ${composition.boosters.label}`,
    composition.payload.label,
    ...composition.stages.flatMap(stage => stage.rooms.map(room => room.label)),
  ]

  return (
    <MissionSetupShell
      className="mission-setup-screen--rocket theme-deep"
      eyebrow="LAUNCHPAD · VEHICLE"
      title="Select Rocket"
      onBack={onBack}
      hasCoach={hasCoach}
      coachManual={hasCoach}
      step="Rocket"
      stepDescription={isFree ? 'Choose a vehicle, then continue to preflight.' : 'Buy a shipment or fabricate its parts from silo minerals, then send it to the Hangar.'}
      actions={fabricationReady && siloOnline ? (
        <div className="rocket-actions">
          <GhostBtn full={false} onClick={onBack}>Back</GhostBtn>
          <PrimaryBtn full={false} kind="cyan" onClick={() => onAssembleFabricatedRocket(rocket.id)}>
            Assemble from Silo Parts
          </PrimaryBtn>
        </div>
      ) : isFree ? (
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
          background: 'radial-gradient(ellipse at 50% 58%, var(--ln-cyan-soft) 0%, transparent 62%), linear-gradient(180deg, var(--ln-surface), var(--ln-void))',
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
          {blueprintOpen ? (
            <div className="rocket-blueprint-panel">
              <RocketCutaway rocket={rocket} activeRoom={activeRoom} onToggle={room => setActiveRoom(current => current === room ? null : room)} />
              <button type="button" className="rocket-view-toggle" onClick={() => setBlueprintOpen(false)}>RETURN TO VEHICLE VIEW</button>
            </div>
          ) : (
            <div className="rocket-inspection-bay" data-testid="rocket-inspection-bay">
              <div className="rocket-inspection-bay__gantry" aria-hidden="true"><i /><i /><i /></div>
              <img className="rocket-inspection-bay__rocket" src={rocket.img} alt={`${rocket.name} in the inspection bay`} />
              <div className="rocket-inspection-bay__plume" aria-hidden="true" />
              <div className="rocket-inspection-bay__readout">
                <span>BUILD BAY 01 · STAGED VEHICLE</span>
                <strong>{rocket.name.toUpperCase()}</strong>
                <small>{composition.stages[0].label} · {composition.boosters.count} BOOSTERS · {composition.payload.label}</small>
              </div>
              <button type="button" className="rocket-view-toggle rocket-view-toggle--bay" onClick={() => setBlueprintOpen(true)}>INSPECT BLUEPRINT</button>
            </div>
          )}
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
                      setBlueprintOpen(false)
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
              Prebuilt staged vehicle. The operating stage carries its rooms; the mining laser is the payload beneath its fairing. Assigned to this mission and ready for automated launch.
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

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, border: '1px solid var(--ln-cyan-border)', borderRadius: 10, background: 'var(--ln-panel-2)' }} data-testid="rocket-fabrication-recipes">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span className="ln-section-label">Silo Fabrication</span>
              <span style={{ font: '700 10px var(--ln-font-display)', letterSpacing: '0.08em', textTransform: 'uppercase', color: siloOnline ? 'var(--ln-ok)' : 'var(--ln-text-muted)' }}>
                {siloOnline ? fabricationReady ? 'Vehicle ready' : 'Parts required' : 'Silo required'}
              </span>
            </div>
            {!siloOnline ? (
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, lineHeight: 1.45, color: 'var(--ln-text-muted)' }}>
                Build an Earth mineral silo or vault, then save mined minerals to fabricate local rocket parts.
              </div>
            ) : composition.recipes.map(recipe => {
              const built = fabricatedParts[recipe.id] ?? 0
              const affordable = recipeIsAffordable(recipe, stash)
              const cost = Object.entries(recipe.ingredients).map(([mineral, amount]) => `${amount} ${mineral}`).join(' · ')
              return (
                <div key={recipe.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: '1px solid var(--ln-hairline)' }}>
                  <div>
                    <div style={{ font: '700 11px var(--ln-font-display)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ln-text)' }}>{recipe.label}</div>
                    <div style={{ marginTop: 3, font: '11px var(--ln-font-mono)', color: affordable || built > 0 ? 'var(--ln-text-muted)' : 'var(--ln-crimson)' }}>{cost}</div>
                  </div>
                  {built > 0 ? (
                    <span style={{ font: '800 10px var(--ln-font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ln-ok)' }}>Built</span>
                  ) : (
                    <GhostBtn full={false} disabled={!affordable} onClick={() => onFabricatePart(rocket.id, recipe.id)}>Fabricate</GhostBtn>
                  )}
                </div>
              )
            })}
          </section>

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
