'use client'

import { useState } from 'react'
import { PrimaryBtn, GhostBtn } from '@/components/ui/Button'
import { calibrateOnboardingPayout, type Mission } from '@/lib/data'
import TutorialHighlight from '@/components/game/TutorialHighlight'
import StatCard from '@/components/ui/StatCard'
import CostSummaryRow from '@/components/game/CostSummaryRow'
import MissionSetupShell, {
  MissionSetupCard,
  MissionSetupFrame,
} from '@/components/game/screens/MissionSetupShell'
import { formatCurrency } from '@/lib/format'
import {
  rocketCompatibleWithMission,
  rocketMissionFit,
  selectRocketForMission,
  unlockedRocketModels,
} from '@/lib/rockets'
import { recipeIsAffordable, rocketCompositionForId } from '@/lib/data/rocket-composition'
import MissionSceneBackdrop from '@/components/game/screens/MissionSceneBackdrop'

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

function missionPayloadLabel(mission: Mission): string {
  if (mission.payload) return mission.payload.name
  const minerals = Object.entries(mission.requires.minerals)
  if (minerals.length === 0) return 'No cargo pickup'
  return minerals.map(([name, amount]) => `${amount} ${name}`).join(' · ')
}

function ModuleChip({ label }: { label: string }) {
  return (
    <div className="rocket-module-chip">
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
  const [specsOpen, setSpecsOpen] = useState(false)
  const defaultRocket = selectRocketForMission(missionsDone, mission)
  const availableRockets = unlockedRocketModels(missionsDone)
  const [selectedRocketId, setSelectedRocketId] = useState(defaultRocket.id)
  const rocket = availableRockets.find(model => model.id === selectedRocketId) ?? defaultRocket
  const isFree = rocket.costFrancs === 0
  const canAfford = francs >= rocket.costFrancs
  const fitChecks = mission ? rocketMissionFit(rocket, mission) : []
  const compatible = !mission || rocketCompatibleWithMission(rocket, mission)
  const canCommit = compatible && (isFree || canAfford)
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

  const commitPurchase = () => {
    if (!canCommit) return
    onPurchase(rocket.id)
  }

  const commitAssemble = () => {
    if (!compatible) return
    onAssembleFabricatedRocket(rocket.id)
  }

  return (
    <MissionSetupShell
      className="mission-setup-screen--rocket"
      eyebrow="LAUNCHPAD · VEHICLE"
      title="Select Rocket"
      onBack={onBack}
      hasCoach={hasCoach}
      coachManual={hasCoach}
      sceneBackground={<MissionSceneBackdrop composition="earth-base-pad" />}
      actions={fabricationReady && siloOnline ? (
        <div className="rocket-actions">
          <GhostBtn full={false} onClick={onBack}>Back</GhostBtn>
          <PrimaryBtn full={false} kind="cyan" disabled={!compatible} onClick={commitAssemble}>
            {compatible ? 'Assemble from Silo Parts' : 'Incompatible'}
          </PrimaryBtn>
        </div>
      ) : isFree ? (
        <div className="rocket-actions">
          <GhostBtn full={false} onClick={onBack}>Back</GhostBtn>
          <PrimaryBtn full={false} kind="cyan" disabled={!compatible} onClick={commitPurchase}>
            {compatible ? `Continue with ${rocket.name}` : 'Incompatible'}
          </PrimaryBtn>
        </div>
      ) : (
        <div className="rocket-actions">
          <GhostBtn full={false} onClick={onBack}>Back</GhostBtn>
          <PrimaryBtn full={false} kind="cyan" disabled={!canCommit} onClick={commitPurchase}>
            {compatible ? `Purchase · ${formatCurrency(rocket.costFrancs, { compact: true })}` : 'Incompatible'}
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
        <MissionSetupFrame className="rocket-vehicle-frame">
          {hasCoach && <TutorialHighlight borderRadius={14} />}
          <div className="rocket-tier-badge">
            <span className={isFree ? 'is-included' : undefined}>
              TIER {rocket.tier} · {isFree ? 'INCLUDED' : formatCurrency(rocket.costFrancs, { compact: true })}
            </span>
          </div>
          <div className="rocket-inspection-bay" data-testid="rocket-inspection-bay">
            <div className="rocket-inspection-bay__gantry" aria-hidden="true"><i /><i /><i /></div>
            <img className="rocket-inspection-bay__rocket" src={rocket.img} alt={`${rocket.name} on the launchpad`} />
            <div className="rocket-inspection-bay__plume" aria-hidden="true" />
            <div className="rocket-inspection-bay__readout">
              <strong>{rocket.name.toUpperCase()}</strong>
            </div>
          </div>
        </MissionSetupFrame>
      </div>

      <MissionSetupCard className="rocket-summary-card" scrollClassName="rocket-summary-scroll">
          <div className="rocket-selector" role="radiogroup" aria-label="Available rocket types">
            <div className="rocket-selector-heading">
              <span className="rocket-selector-label">Rocket type</span>
            </div>
            <div className="rocket-choice-grid">
              {availableRockets.map(option => {
                const selected = option.id === rocket.id
                const optionFits = !mission || rocketCompatibleWithMission(option, mission)
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-testid={`rocket-choice-${option.id}`}
                    className={`rocket-choice${selected ? ' is-selected' : ''}${optionFits ? '' : ' is-blocked'}`}
                    onClick={() => setSelectedRocketId(option.id)}
                  >
                    <span className="rocket-choice-topline">
                      <span>TIER {option.tier}</span>
                      <strong>{option.costFrancs === 0 ? 'INCLUDED' : formatCurrency(option.costFrancs, { compact: true })}</strong>
                    </span>
                    <span className="rocket-choice-name">{option.name}</span>
                    <span className={`rocket-choice-fit${optionFits ? ' is-ok' : ''}`}>
                      {optionFits ? 'Fits this job' : 'Cannot fly this job'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <section className="rocket-job" data-testid="rocket-mission-fit">
            <div className="rocket-job-row">
              <span>Mission</span>
              <strong>{mission?.title ?? 'Unassigned'}</strong>
            </div>
            {mission && (
              <div className="rocket-job-row">
                <span>Payload</span>
                <strong>{missionPayloadLabel(mission)}</strong>
              </div>
            )}
            {fitChecks.length > 0 && (
              <ul className="rocket-fit-list">
                {fitChecks.map(check => (
                  <li key={check.key} className={check.ok ? 'is-ok' : 'is-blocked'} data-testid={`rocket-fit-${check.key}`}>
                    <span className="rocket-fit-mark" aria-hidden="true" />
                    <span className="rocket-fit-label">{check.label}</span>
                    <strong>{check.have} · {check.need}</strong>
                  </li>
                ))}
              </ul>
            )}
            {!compatible && (
              <p className="rocket-fit-reject">This vehicle cannot carry the job. Pick a compatible rocket.</p>
            )}
          </section>

          {!isFree && (
            <div className="rocket-cost-card">
              {missionPayout ? (
                <CostSummaryRow label="Mission Payout (base)" value={formatCurrency(missionPayout, { compact: true })} color="var(--ln-cyan)" />
              ) : null}
              <CostSummaryRow label="Vehicle Cost" value={formatCurrency(rocket.costFrancs, { compact: true })} color="var(--ln-crimson)" />
              {missionPayout ? (
                <CostSummaryRow label="Est. Profit" value={formatCurrency(estProfit ?? 0, { compact: true, signed: true })} color={(estProfit ?? 0) >= 0 ? 'var(--ln-ok)' : 'var(--ln-crimson)'} />
              ) : null}
              <CostSummaryRow label="Your Balance" value={formatCurrency(francs, { compact: true })} color={canAfford ? 'var(--ln-text)' : 'var(--ln-crimson)'} last />
              {!canAfford && (
                <div className="rocket-cost-warn">
                  Insufficient Francs — sell minerals or complete client missions to raise funds.
                </div>
              )}
            </div>
          )}

          <details className="rocket-specs" open={specsOpen} onToggle={event => setSpecsOpen(event.currentTarget.open)}>
            <summary>Vehicle specs</summary>
            <div className="rocket-stat-grid">
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
              <div className="rocket-module-row">
                {modules.map(m => <ModuleChip key={m} label={m} />)}
              </div>
            )}

            <section className="rocket-fab" data-testid="rocket-fabrication-recipes">
              <div className="rocket-fab-heading">
                <span className="ln-section-label">Silo Fabrication</span>
                <span className={siloOnline ? 'is-online' : undefined}>
                  {siloOnline ? fabricationReady ? 'Vehicle ready' : 'Parts required' : 'Silo required'}
                </span>
              </div>
              {!siloOnline ? (
                <p>Build an Earth mineral silo or vault, then save mined minerals to fabricate local rocket parts.</p>
              ) : composition.recipes.map(recipe => {
                const built = fabricatedParts[recipe.id] ?? 0
                const affordable = recipeIsAffordable(recipe, stash)
                const cost = Object.entries(recipe.ingredients).map(([mineral, amount]) => `${amount} ${mineral}`).join(' · ')
                return (
                  <div key={recipe.id} className="rocket-fab-row">
                    <div>
                      <div className="rocket-fab-name">{recipe.label}</div>
                      <div className={affordable || built > 0 ? undefined : 'is-blocked'}>{cost}</div>
                    </div>
                    {built > 0 ? (
                      <span className="rocket-fab-built">Built</span>
                    ) : (
                      <GhostBtn full={false} disabled={!affordable} onClick={() => onFabricatePart(rocket.id, recipe.id)}>Fabricate</GhostBtn>
                    )}
                  </div>
                )
              })}
            </section>
            <p className="rocket-specs-note">Rockets are single-use. Each mission requires a fresh vehicle.</p>
          </details>
      </MissionSetupCard>
    </MissionSetupShell>
  )
}