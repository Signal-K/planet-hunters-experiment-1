'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { useGame } from '@/game-context'
import { ROCKET_MODELS, isOrionidsEventMission, isOwnProgramMission, rocketConfigForModel, validateBuild } from '@/lib/data'
import { feasibleTargetsFor } from '@/lib/data/targets'
import { ORIONIDS_NIGHT_RUN_ID } from '@/lib/data/missions'
import { rocketCompatibleWithMission } from '@/lib/rockets'
import { buildingLevel } from '@/lib/data/building-levels'
import { formatCurrency } from '@/lib/format'
import { siloRoomFor } from '@/lib/systems/HomeDeliverySystem'
import styles from './MissionPlanStrip.module.css'

// The Solar System map the target picker used; Pixi needs the browser, so it loads client-side only.
const PixiGalaxyMap = dynamic(() => import('@/components/TargetPicker/PixiGalaxyMap'), { ssr: false })

type Game = ReturnType<typeof useGame>
type Sheet = 'destination' | 'vehicle' | null

const STEPS = ['Contract', 'Plan', 'Launch'] as const

/** Contract, Plan, Launch. The plan strip makes the auto-picked destination and vehicle visible and changeable in place. */
export default function MissionPlanStrip({ game, blockedReason, launched, primaryAction, primaryLabel, primaryDisabled = false }: {
  game: Game
  blockedReason: string | null
  launched: boolean
  primaryAction?: () => void
  primaryLabel?: string
  primaryDisabled?: boolean
}) {
  const [sheet, setSheet] = useState<Sheet>(null)
  const { mission, target, player } = game
  const autoStaged = useRef(false)
  // A new player has one free vehicle and no staged rocket: stage it, so the pad shows a rocket and Launch is ready.
  const freeStart = !!mission && !!target && !player.stagedRockets?.length && !isOrionidsEventMission(mission)
  useEffect(() => {
    if (!freeStart || autoStaged.current || !mission || !target) return
    const free = ROCKET_MODELS.filter(model => !model.locked && model.costFrancs === 0 && model.missionsRequired <= player.missionsDone && rocketCompatibleWithMission(model, mission)
      && validateBuild({ mission, target, rocket: rocketConfigForModel(model), parts: game.catalog.parts }).ok)
    if (free.length !== 1) return
    autoStaged.current = true
    game.onPurchaseRocket(free[0].id)
  }, [freeStart, mission, target, player.missionsDone, game])
  if (!mission || !target) return null

  const selectedVehicle = player.stagedRockets?.find(vehicle => vehicle.id === player.selectedStagedRocketId && (vehicle.location === 'hangar' || vehicle.location === 'launchpad'))
  const selectedRocket = selectedVehicle ? ROCKET_MODELS.find(model => model.id === selectedVehicle.rocketId) : null
  const minerals = Object.keys(mission.requires.minerals).map(id => game.catalog.minerals[id]?.name ?? id)
  const step = launched ? 2 : 1
  // A run on your own account keeps nothing without a silo: say so before launch, not after landing.
  // Orionids fragments are event evidence rather than player cargo, and the
  // event supplies its own storage. Do not add a contradictory silo prompt.
  // SSL-714: the shower field labels belong to Orionids mission 1 only; mission 2 is a rover trip to Eros.
  const showerRun = mission?.id === ORIONIDS_NIGHT_RUN_ID
  const noSilo = !isOrionidsEventMission(mission) && isOwnProgramMission(mission) && !mission.construction && !mission.deliveryTargetId && !siloRoomFor(player, {}).built

  const targets = sheet === 'destination'
    ? feasibleTargetsFor(mission, game.catalog.targets, game.catalog.parts, player.missionsDone, player.launchpadUpgraded, buildingLevel(player, 'launchpad'))
    : []
  const rockets = sheet === 'vehicle'
    ? ROCKET_MODELS.filter(model => !model.locked && model.missionsRequired <= player.missionsDone && rocketCompatibleWithMission(model, mission)
      && validateBuild({ mission, target, rocket: rocketConfigForModel(model), parts: game.catalog.parts }).ok)
    : []

  return (
    <div className={styles.host} data-testid="mission-plan-strip">
      <ol className={styles.rail} aria-label={`Mission step ${step + 1} of 3`}>
        {STEPS.map((label, i) => <li key={label} data-state={i < step ? 'done' : i === step ? 'now' : 'next'}><i />{label}</li>)}
      </ol>
      <div className={styles.slots}>
        <button type="button" className={styles.slot} data-testid="plan-destination" disabled={launched} onClick={() => setSheet('destination')}>
          <span>Destination</span><strong>{showerRun ? 'Orionids field' : target.name}</strong><em>Change</em>
        </button>
        <button type="button" className={styles.slot} data-testid="plan-vehicle" disabled={launched} onClick={() => setSheet('vehicle')}>
          <span>Vehicle</span><strong>{selectedRocket?.name ?? 'Choose vehicle'}</strong><em>{selectedRocket ? 'Change' : 'Choose'}</em>
        </button>
        <div className={styles.slot} data-testid="plan-cargo"><span>Cargo</span><strong>{showerRun ? 'Fragments + minerals' : mission.payload?.type === 'rover' ? mission.payload.name : (minerals.join(', ') || 'None')}</strong></div>
      </div>
      {primaryAction && primaryLabel && (
        <button type="button" className={styles.primary} data-testid="plan-launch-btn" disabled={primaryDisabled} onClick={primaryAction}>{primaryLabel}</button>
      )}
      {showerRun && (
        <div className={styles.showerField} data-testid="orionids-shower-field" aria-label="Anonymous meteor points arranged in Orion's pattern">
          <svg viewBox="0 0 280 72" role="img" aria-label="Orionids shower points arranged like Orion">
            <path d="M42 19 86 34 126 18 166 35 211 20M86 34 92 58 126 18 149 57 166 35 196 59" />
            {[[42, 19], [86, 34], [126, 18], [166, 35], [211, 20], [92, 58], [149, 57], [196, 59]].map(([cx, cy], index) => <circle key={index} cx={cx} cy={cy} r="5" />)}
          </svg>
          <span><b>ORIONIDS SHOWER</b><small>Catch fragments. Mine other minerals.</small></span>
        </div>
      )}
      {noSilo && !launched && (
        <p className={styles.hold} data-testid="plan-no-silo" role="status">
          No silo: ore is sold on landing.
          <button type="button" className={styles.link} onClick={() => game.go('build')}>Build a silo</button>{' '}
          to keep it.
        </p>
      )}
      {blockedReason && <p className={styles.hold} data-testid="plan-clearance" role="status">Build hold: {blockedReason}</p>}

      {sheet === 'destination' && (
        <div className={styles.mapSheet} role="group" aria-label="Choose destination" data-testid="plan-sheet-destination">
          <div className={styles.mapHead}>
            <strong>Destination</strong>
            <button type="button" onClick={() => setSheet(null)}>Close</button>
          </div>
          <p>Lit bodies suit this mission: the minerals it needs, in range, room in the hold.</p>
          <div className={styles.mapField} data-testid="plan-destination-map">
            <PixiGalaxyMap
              mission={mission}
              targets={game.catalog.targets}
              compatibleIds={new Set(targets.map(t => t.id))}
              pickedId={target.id}
              onPick={id => { game.onPickTarget(id); setSheet(null) }}
            />
          </div>
          <ul className={styles.mapList}>
            {targets.map(t => (
              <li key={t.id}><button type="button" data-current={t.id === target.id || undefined} onClick={() => { game.onPickTarget(t.id); setSheet(null) }}>
                <strong>{t.name}</strong>
                <span>{t.type} · orbit {t.orbit} · {t.minerals.map(id => game.catalog.minerals[id]?.name ?? id).join(', ')}</span>
              </button></li>
            ))}
            {!targets.length && <li><p>Nothing in range has what this mission needs.</p></li>}
          </ul>
        </div>
      )}

      {sheet === 'vehicle' && (
        <div className={styles.sheet} role="group" aria-label="Choose vehicle" data-testid="plan-sheet-vehicle">
          <div className={styles.sheetHead}>
            <strong>Vehicle</strong>
            <button type="button" onClick={() => setSheet(null)}>Close</button>
          </div>
          <ul>
            {rockets.map(model => {
              const cost = model.costFrancs === 0 ? 'Free' : formatCurrency(model.costFrancs, { compact: true })
              return (
                <li key={model.id}><button type="button" data-current={model.id === selectedRocket?.id || undefined} onClick={() => {
                  if (player.francs < model.costFrancs) { game.addToast(`Not enough francs: you need ${formatCurrency(model.costFrancs - player.francs, { compact: true })} more`, 'warn'); return }
                  game.onPurchaseRocket(model.id)
                  setSheet(null)
                }}>
                  <img className={styles.vehicleOptionArt} src={model.img} alt="" aria-hidden="true" />
                  <strong>{model.name}<small>Tier {model.tier}</small></strong>
                  <span className={styles.vehicleOptionStats}><span>CAP {model.stats.cargo}</span><span>RANGE {model.stats.maxOrbit}</span><span>LASER {model.stats.drillTier}</span></span>
                  <span className={styles.vehicleOptionAction}>Stage · {cost}</span>
                </button></li>
              )
            })}
            {!rockets.length && <li><p>Nothing else fits this contract.</p></li>}
          </ul>
        </div>
      )}
    </div>
  )
}
