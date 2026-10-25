'use client'

import { useEffect, useRef, useState } from 'react'
import type { useGame } from '@/game-context'
import { ROCKET_MODELS, isOrionidsEventMission, isOwnProgramMission, rocketConfigForModel, validateBuild } from '@/lib/data'
import { feasibleTargetsFor } from '@/lib/data/targets'
import { rocketCompatibleWithMission } from '@/lib/rockets'
import { buildingLevel } from '@/lib/data/building-levels'
import { formatCurrency } from '@/lib/format'
import { siloRoomFor } from '@/lib/systems/HomeDeliverySystem'
import styles from './MissionPlanStrip.module.css'

type Game = ReturnType<typeof useGame>
type Sheet = 'destination' | 'vehicle' | null

const STEPS = ['Contract', 'Plan', 'Launch'] as const

/** Contract, Plan, Launch. The plan strip makes the auto-picked destination and vehicle visible and changeable in place. */
export default function MissionPlanStrip({ game, blockedReason, launched }: { game: Game; blockedReason: string | null; launched: boolean }) {
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
          <span>Destination</span><strong>{isOrionidsEventMission(mission) ? 'Orionids field' : target.name}</strong><em>Change</em>
        </button>
        <button type="button" className={styles.slot} data-testid="plan-vehicle" disabled={launched} onClick={() => setSheet('vehicle')}>
          <span>Vehicle</span><strong>{selectedRocket?.name ?? 'Choose vehicle'}</strong><em>{selectedRocket ? 'Change' : 'Choose'}</em>
        </button>
        <div className={styles.slot} data-testid="plan-cargo"><span>Cargo</span><strong>{isOrionidsEventMission(mission) ? 'Fragments + minerals' : (minerals.join(', ') || 'None')}</strong></div>
      </div>
      {isOrionidsEventMission(mission) && (
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

      {sheet && (
        <div className={styles.sheet} role="group" aria-label={sheet === 'destination' ? 'Choose destination' : 'Choose vehicle'} data-testid={`plan-sheet-${sheet}`}>
          <div className={styles.sheetHead}>
            <strong>{sheet === 'destination' ? 'Destination' : 'Vehicle'}</strong>
            <button type="button" onClick={() => setSheet(null)}>Close</button>
          </div>
          {sheet === 'destination' && <p>Only targets with the required minerals, range, cargo and drill are shown.</p>}
          <ul>
            {sheet === 'destination' && targets.map(t => (
              <li key={t.id}><button type="button" data-current={t.id === target.id || undefined} onClick={() => { game.onPickTarget(t.id); setSheet(null) }}>
                <strong>{t.name}</strong><span>{t.type} · orbit {t.orbit}</span>
              </button></li>
            ))}
            {sheet === 'vehicle' && rockets.map(model => {
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
            {((sheet === 'destination' && !targets.length) || (sheet === 'vehicle' && !rockets.length)) && <li><p>Nothing else fits this contract.</p></li>}
          </ul>
        </div>
      )}
    </div>
  )
}
