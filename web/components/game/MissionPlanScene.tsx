'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { Catalog } from '@/lib/catalog'
import type { Mission, Target } from '@/lib/data'
import PixiGalaxyMap from '@/components/TargetPicker/PixiGalaxyMap'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { HangarModules, LaunchpadModules } from '@/components/game/hub/EarthBaseModules'
import base from './MissionSetupRoutes.module.css'
import styles from './MissionPlanScene.module.css'

export type PlanStep = 'target' | 'vehicle' | 'review'
export const PLAN_STEPS: PlanStep[] = ['target', 'vehicle', 'review']
const STEP_LABEL: Record<PlanStep, string> = { target: 'Target', vehicle: 'Rocket and cargo', review: 'Review' }

interface VehicleChoice { id: string; name: string }

interface MissionPlanSceneProps {
  step: PlanStep
  onStep: (step: PlanStep) => void
  mission: Mission
  target: Target
  catalog: Catalog
  compatibleTargets: Target[]
  onPickTarget: (id: string) => void
  vehicle: VehicleChoice
  vehicles: VehicleChoice[]
  onPickVehicle: (id: string) => void
  rocketImg: string
  rocketAlt: string
  artStage: 'workshop' | 'pad'
  padParts: Parameters<typeof LaunchpadModules>[0]['parts']
  freeHaul: boolean
  preparing: boolean
  ready: boolean
  holdReason?: string
  busy: boolean
  canCustomize: boolean
  onCustomize: () => void
  primaryLabel: string
  primaryDisabled: boolean
  primaryTestId: string
  onPrimary: () => void
  help?: ReactNode
}

function Glyph({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
}

const STEP_ICON: Record<PlanStep, string> = {
  target: 'M12 3v4M12 17v4M3 12h4M17 12h4M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
  vehicle: 'M12 2c4 3 6 7 6 12l-6 7-6-7c0-5 2-9 6-12ZM12 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
  review: 'm5 12 4.5 4.5L19 7',
}

function Pips({ step, onStep }: { step: PlanStep; onStep: (s: PlanStep) => void }) {
  const at = PLAN_STEPS.indexOf(step)
  return <ol className={styles.pips} aria-label="Mission steps">
    {PLAN_STEPS.map((id, i) => <li key={id}>
      <button type="button" className={styles.pip} data-state={i < at ? 'done' : i === at ? 'now' : 'next'} disabled={i > at} aria-current={i === at ? 'step' : undefined} aria-label={STEP_LABEL[id]} data-testid={`plan-step-${id}`} onClick={() => onStep(id)}>
        <Glyph d={STEP_ICON[id]} />
      </button>
    </li>)}
  </ol>
}

function Arrow({ dir, label, disabled, onClick }: { dir: 'prev' | 'next'; label: string; disabled: boolean; onClick: () => void }) {
  return <button type="button" className={styles.arrow} aria-label={label} disabled={disabled} onClick={onClick}>
    <Glyph d={dir === 'prev' ? 'm15 5-7 7 7 7' : 'm9 5 7 7-7 7'} />
  </button>
}

function Cargo({ minerals, catalog }: { minerals: Record<string, number>; catalog: Catalog['minerals'] }) {
  const rows = Object.entries(minerals).filter(([id]) => catalog[id])
  return <ul className={styles.cargo} data-testid="required-cargo-readout" aria-label="Cargo">
    {rows.map(([id, amount]) => <li key={id} style={{ '--mineral-accent': catalog[id].color } as CSSProperties}>
      <i>{catalog[id].sym}</i><strong>×{amount}</strong><span>{catalog[id].name}</span>
    </li>)}
  </ul>
}

function typeLabel(type: Target['type']): string {
  return type === 'asteroid' ? 'Asteroid' : type === 'exoplanet' ? 'Exoplanet' : 'Planet'
}

function step(list: { id: string }[], currentId: string, offset: number): string {
  const i = Math.max(0, list.findIndex(item => item.id === currentId))
  return list[(i + offset + list.length) % list.length].id
}

/**
 * One continuous base scene with three in-scene steps: pick the target on a
 * map, choose the rocket and see its cargo, then review and launch. The pad
 * stays empty until a vehicle is prepared; the same landscape stays behind
 * every step so the player never leaves the base.
 */
export default function MissionPlanScene(p: MissionPlanSceneProps) {
  const { step: now } = p
  const reachable = new Set(p.compatibleTargets.map(t => t.id))
  const at = PLAN_STEPS.indexOf(now)
  const showRocket = now !== 'target' && (p.artStage === 'pad' || now === 'vehicle' || now === 'review')
  const next = () => p.onStep(PLAN_STEPS[Math.min(at + 1, PLAN_STEPS.length - 1)])
  const back = () => p.onStep(PLAN_STEPS[Math.max(at - 1, 0)])
  return <section className={styles.plan} data-step={now} data-testid="mission-launch-review">
    <div className={`${base.launchArt} ${styles.world}`} data-testid="launch-art" data-stage={p.artStage}>
      <HubWorldBackground phase="day" composition="earth-base-wide" />
      <div className={base.hangar} aria-hidden="true"><HangarModules /></div>
      <div className={base.launchpad} aria-hidden="true"><LaunchpadModules parts={p.padParts} /></div>
      {showRocket && <img data-testid="launch-rocket" src={p.rocketImg} alt={p.rocketAlt} />}
    </div>

    <div className={styles.top}>
      <Pips step={now} onStep={p.onStep} />
      {p.help}
    </div>

    {now === 'target' && <div className={styles.mapSheet} data-testid="launch-review-map" aria-label="Choose a destination">
      <PixiGalaxyMap mission={p.mission} targets={p.catalog.targets} compatibleIds={reachable} pickedId={p.target.id} onPick={p.onPickTarget} />
    </div>}

    {now === 'vehicle' && <div className={styles.bay}>
      <Arrow dir="prev" label="Previous vehicle" disabled={p.vehicles.length < 2} onClick={() => p.onPickVehicle(step(p.vehicles, p.vehicle.id, -1))} />
      <div className={styles.bayCard}>
        <span>ROCKET</span><strong>{p.vehicle.name}</strong>
        {!p.freeHaul && <Cargo minerals={p.mission.requires.minerals} catalog={p.catalog.minerals} />}
      </div>
      <Arrow dir="next" label="Next vehicle" disabled={p.vehicles.length < 2} onClick={() => p.onPickVehicle(step(p.vehicles, p.vehicle.id, 1))} />
    </div>}

    <div className={styles.rail} data-testid="plan-rail">
      {now === 'target' && <>
        <Arrow dir="prev" label="Previous destination" disabled={p.compatibleTargets.length < 2} onClick={() => p.onPickTarget(step(p.compatibleTargets, p.target.id, -1))} />
        <div className={styles.railText}><span>{typeLabel(p.target.type)}</span><strong>{p.target.name}</strong></div>
        <Arrow dir="next" label="Next destination" disabled={p.compatibleTargets.length < 2} onClick={() => p.onPickTarget(step(p.compatibleTargets, p.target.id, 1))} />
      </>}
      {now === 'vehicle' && <>
        <div className={styles.railText}><span>TO {p.target.name.toUpperCase()}</span><strong>{p.vehicle.name}</strong></div>
        {p.canCustomize && <button type="button" className={styles.ghost} data-testid="launch-review-customize-btn" disabled={p.busy} onClick={p.onCustomize}>CUSTOMISE</button>}
      </>}
      {now === 'review' && <>
        <div className={styles.railText}>
          <span>{p.mission.title}</span>
          <strong>{p.target.name} · {p.vehicle.name}</strong>
          <small data-ready={p.ready && !p.preparing}>{p.preparing ? 'PREPARING VEHICLE' : p.ready ? 'ALL PARAMETERS PASS' : 'BUILD HOLD'}{!p.ready && p.holdReason ? ` · ${p.holdReason}` : ''}</small>
        </div>
        {!p.freeHaul && <Cargo minerals={p.mission.requires.minerals} catalog={p.catalog.minerals} />}
      </>}
      <div className={styles.railActions}>
        {now !== 'target' && <button type="button" className={styles.ghost} onClick={back} data-testid="plan-back">BACK</button>}
        {now !== 'review'
          ? <button type="button" className={styles.go} data-testid="plan-next" onClick={next}>NEXT</button>
          : <button type="button" className={styles.go} data-testid={p.primaryTestId} disabled={p.primaryDisabled} onClick={p.onPrimary}>{p.primaryLabel}</button>}
      </div>
    </div>
  </section>
}
