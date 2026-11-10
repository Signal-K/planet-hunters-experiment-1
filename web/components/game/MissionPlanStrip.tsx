'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { useGame } from '@/game-context'
import { ROCKET_MODELS, isFreeHaulEligibleMission, isOrionidsEventMission, isOwnProgramMission, rocketConfigForModel, validateBuild } from '@/lib/data'
import { feasibleTargetsFor } from '@/lib/data/targets'
import { showerForRunMission } from '@/lib/data/showers'
import { pastRocketTraining, rocketCompatibleWithMission, rocketJobRoles, rocketPrice, rocketResearchId, rocketResearchXp, rocketUnlocked } from '@/lib/rockets'
import { buildingLevel } from '@/lib/data/building-levels'
import { formatCurrency } from '@/lib/format'
import { applyFreeRunGoal, clampGoalAmount, maxGoalAmount } from '@/lib/freeRunGoal'
import { siloRoomFor } from '@/lib/systems/HomeDeliverySystem'
import styles from './MissionPlanStrip.module.css'

// The Solar System map the target picker used; Pixi needs the browser, so it loads client-side only.
const PixiGalaxyMap = dynamic(() => import('@/components/TargetPicker/PixiGalaxyMap'), { ssr: false })

type Game = ReturnType<typeof useGame>
type Sheet = 'destination' | 'vehicle' | 'goal' | null

const STEPS = ['Contract', 'Plan', 'Launch'] as const

/** Contract, Plan, Launch. The plan strip makes the auto-picked destination and vehicle visible and changeable in place. */
export default function MissionPlanStrip({ game, blockedReason, blockedFix = null, launched, primaryAction, primaryLabel, primaryDisabled = false }: {
  game: Game
  blockedReason: string | null
  /** SSL-750: what the hold line offers to change: another vehicle, or the rocket's parts. */
  blockedFix?: 'vehicle' | 'customize' | null
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
    const free = ROCKET_MODELS.filter(model => !model.locked && rocketPrice(model, player) === 0 && model.missionsRequired <= player.missionsDone && rocketCompatibleWithMission(model, mission)
      && validateBuild({ mission, target, rocket: rocketConfigForModel(model), parts: game.catalog.parts }).ok)
    if (free.length !== 1) return
    autoStaged.current = true
    game.onPurchaseRocket(free[0].id)
  }, [freeStart, mission, target, player.missionsDone, game])
  // Liam, 01.11: accepting a mission sends the player through the map to choose where they are going. The body
  // auto-picked behind the scenes keeps the state valid; the map stays open until a body is tapped. Training keeps
  // its guided path, and the shower run has a fixed field.
  const mustChoose = !launched && game.destinationChosen === false && pastRocketTraining(player)
    && !!mission && !showerForRunMission(mission.id)
  useEffect(() => { if (mustChoose) setSheet('destination') }, [mustChoose, mission?.id])
  if (!mission || !target) return null

  const selectedVehicle = player.stagedRockets?.find(vehicle => vehicle.id === player.selectedStagedRocketId && (vehicle.location === 'hangar' || vehicle.location === 'launchpad'))
  const selectedRocket = selectedVehicle ? ROCKET_MODELS.find(model => model.id === selectedVehicle.rocketId) : null
  // Liam, 01.11: Cargo says what comes back (the haul and the pay) and what the rocket carries out (its payload).
  const haul = Object.entries(mission.requires.minerals).map(([id, amount]) => `${game.catalog.minerals[id]?.name ?? id} ×${amount}`)
  const pay = mission.payout?.francs ? formatCurrency(mission.payout.francs, { compact: true }) : null
  const flyingRocket = selectedVehicle?.rocket ?? game.rocket
  const drill = game.catalog.parts.drill.find(part => part.id === flyingRocket.drill)
  const payloadName = mission.payload?.name
    ?? (Object.keys(mission.requires.minerals).length > 0
      // Every drill flies as the mining laser in the laser scene; the tier is the drill's.
      ? (drill && drill.id !== 'cargo-module-t1' ? `Mining laser T${drill.tier ?? 1}` : drill?.name ?? 'Mining laser')
      : mission.construction ? 'Construction kit' : null)
  const step = launched ? 2 : 1
  // A run on your own account keeps nothing without a silo: say so before launch, not after landing.
  // Orionids fragments are event evidence rather than player cargo, and the
  // event supplies its own storage. Do not add a contradictory silo prompt.
  // SSL-714: the shower field labels belong to Orionids mission 1 only; mission 2 is a rover trip to Eros.
  const runShower = showerForRunMission(mission?.id)
  const showerRun = !!runShower
  const getting = showerRun ? 'Fragments + minerals' : [haul.join(', '), pay].filter(Boolean).join(' · ') || 'Nothing'
  const noSilo = !isOrionidsEventMission(mission) && isOwnProgramMission(mission) && !mission.construction && !mission.deliveryTargetId && !siloRoomFor(player, {}).built

  // Liam, 10.11: a free mining run lets the player choose the ore and how much, up to what the rocket's hold carries.
  const goalEditable = !launched && !showerRun && isFreeHaulEligibleMission(mission)
  const holdUnits = selectedRocket?.stats.cargo ?? 6
  const drillTier = drill?.tier ?? 1
  const goalMineralId = Object.keys(mission.requires.minerals)[0]
  const goalAmount = mission.requires.minerals[goalMineralId] ?? 1
  const setGoal = (mineral: string, amount: number) => {
    const meta = game.catalog.minerals[mineral]
    const next = { missionId: mission.id, mineral, amount: clampGoalAmount(amount, meta, holdUnits) }
    game.setPlayer(p => ({ ...p, freeRunGoal: next }))
    // A body without this ore cannot be flown to for it: move the destination to one that has it.
    const suited = feasibleTargetsFor(applyFreeRunGoal(mission, next, game.catalog.minerals), game.catalog.targets, game.catalog.parts, player.missionsDone, player.launchpadUpgraded, buildingLevel(player, 'launchpad'))
    if (suited.length && !suited.some(t => t.id === target.id)) game.onPickTarget(suited[0].id)
  }
  const goalOptions = sheet === 'goal'
    ? Object.entries(game.catalog.minerals).filter(([id, meta]) => meta.cargoUnits !== 0 && (meta.laserAccess ?? 1) <= drillTier && maxGoalAmount(meta, holdUnits) > 0
      && feasibleTargetsFor(applyFreeRunGoal(mission, { missionId: mission.id, mineral: id, amount: 1 }, game.catalog.minerals), game.catalog.targets, game.catalog.parts, player.missionsDone, player.launchpadUpgraded, buildingLevel(player, 'launchpad')).length > 0)
    : []
  const targets = sheet === 'destination'
    ? feasibleTargetsFor(mission, game.catalog.targets, game.catalog.parts, player.missionsDone, player.launchpadUpgraded, buildingLevel(player, 'launchpad'))
    : []
  // Every announced rocket, each with its role in this job: the smallest that fits is the one to fly (SSL-728).
  // Liam, 01.11: when nothing the player has can fly it, the sheet offers to research or buy one that can.
  const rockets = sheet === 'vehicle' ? ROCKET_MODELS.filter(model => !model.locked && (rocketUnlocked(model, player) || rocketResearchXp(model) > 0)) : []
  const fits = (model: (typeof ROCKET_MODELS)[number]) => rocketCompatibleWithMission(model, mission)
    && validateBuild({ mission, target, rocket: rocketConfigForModel(model), parts: game.catalog.parts }).ok
  const roles = rocketJobRoles(rockets.filter(model => rocketUnlocked(model, player)), mission, fits)
  const nothingFits = sheet === 'vehicle' && ![...roles.values()].some(role => role.kind === 'use')
  const researchable = rockets.filter(model => !rocketUnlocked(model, player) && fits(model))
  const research = (model: (typeof ROCKET_MODELS)[number]) => {
    const xp = rocketResearchXp(model)
    const have = Math.floor(player.researchXP ?? 0)
    if (have < xp) {
      game.addToast(`Research needs ${xp} XP, you have ${have}. Classify data at the Data hub to earn it.`, 'warn')
      return
    }
    game.unlockBlueprint(rocketResearchId(model.id), 0, xp, {})
    game.addToast(`${model.name} researched: it can be built now.`, 'ok')
  }

  return (
    <div className={styles.host} data-testid="mission-plan-strip">
      <ol className={styles.rail} aria-label={`Mission step ${step + 1} of 3`}>
        {STEPS.map((label, i) => <li key={label} data-state={i < step ? 'done' : i === step ? 'now' : 'next'}><i />{label}</li>)}
      </ol>
      <div className={styles.slots}>
        <button type="button" className={styles.slot} data-testid="plan-destination" disabled={launched} onClick={() => setSheet('destination')}>
          <span>Destination</span><strong>{runShower ? `${runShower.name} field` : target.name}</strong><em>Change</em>
        </button>
        <button type="button" className={styles.slot} data-testid="plan-vehicle" data-blocked={blockedFix === 'vehicle' || undefined} disabled={launched} onClick={() => setSheet('vehicle')}>
          <span>Vehicle</span><strong>{selectedRocket?.name ?? 'Choose vehicle'}</strong><em>{selectedRocket ? 'Change' : 'Choose'}</em>
        </button>
        {(() => {
          const rows = (
            <>
              <span>Cargo</span>
              <span className={styles.cargoRows}>
                <span className={styles.cargoRow} data-testid="plan-cargo-getting"><b>Getting</b>{getting}</span>
                {payloadName && <span className={styles.cargoRow} data-testid="plan-cargo-payload"><b>Payload</b>{payloadName}</span>}
              </span>
              {goalEditable && <em>Change</em>}
            </>
          )
          return goalEditable
            ? <button type="button" className={`${styles.slot} ${styles.cargoSlot}`} data-testid="plan-cargo" onClick={() => setSheet('goal')}>{rows}</button>
            : <div className={`${styles.slot} ${styles.cargoSlot}`} data-testid="plan-cargo">{rows}</div>
        })()}
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
          <span><b>{(runShower?.name ?? 'Orionids').toUpperCase()} SHOWER</b><small>Catch fragments. Mine other minerals.</small></span>
        </div>
      )}
      {noSilo && !launched && (
        <p className={styles.hold} data-testid="plan-no-silo" role="status">
          No silo: ore is sold on landing.
          <button type="button" className={styles.link} onClick={() => game.go('build')}>Build a silo</button>{' '}
          to keep it.
        </p>
      )}
      {blockedReason && !launched && (
        <p className={styles.hold} data-testid="plan-clearance" data-blocked="true" role="status">
          <span>{blockedReason}.</span>
          {blockedFix === 'vehicle' && <button type="button" className={styles.holdFix} data-testid="plan-clearance-fix" onClick={() => setSheet('vehicle')}>Change vehicle</button>}
        </p>
      )}

      {sheet === 'destination' && (
        <div className={styles.mapSheet} role="group" aria-label="Choose destination" data-testid="plan-sheet-destination">
          <div className={styles.mapHead}>
            <strong>{mustChoose ? 'Where are you flying?' : 'Destination'}</strong>
            {mustChoose
              ? <button type="button" data-testid="plan-destination-back" onClick={() => game.goBack()}>Back</button>
              : <button type="button" onClick={() => setSheet(null)}>Close</button>}
          </div>
          <p>{mustChoose ? 'Tap a lit body on the map to set the destination for ' + mission.title + '.' : 'Lit bodies suit this mission: the minerals it needs, in range, room in the hold.'}</p>
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

      {sheet === 'goal' && (
        <div className={styles.sheet} role="group" aria-label="Choose what to mine" data-testid="plan-sheet-goal">
          <div className={styles.sheetHead}>
            <strong>What to mine</strong>
            <button type="button" onClick={() => setSheet(null)}>Done</button>
          </div>
          <p className={styles.sheetLead}>Pick the ore and how much. {selectedRocket?.name ?? 'The rocket'} holds {holdUnits} units a trip.</p>
          <div className={styles.goalAmount} data-testid="plan-goal-amount">
            <button type="button" aria-label="Less" disabled={goalAmount <= 1} onClick={() => setGoal(goalMineralId, goalAmount - 1)}>−</button>
            <strong>{goalAmount} × {game.catalog.minerals[goalMineralId]?.name ?? goalMineralId}</strong>
            <button type="button" aria-label="More" disabled={goalAmount >= maxGoalAmount(game.catalog.minerals[goalMineralId], holdUnits)} onClick={() => setGoal(goalMineralId, goalAmount + 1)}>+</button>
          </div>
          <ul className={styles.goalGrid}>
            {goalOptions.map(([id, meta]) => (
              <li key={id}><button type="button" data-current={id === goalMineralId || undefined} data-testid={`plan-goal-${id}`} onClick={() => setGoal(id, goalAmount)}>
                <strong>{meta.name}</strong><small>{meta.rarity}</small>
              </button></li>
            ))}
          </ul>
        </div>
      )}

      {sheet === 'vehicle' && (
        <div className={styles.sheet} role="group" aria-label="Choose vehicle" data-testid="plan-sheet-vehicle">
          <div className={styles.sheetHead}>
            <strong>Vehicle</strong>
            <button type="button" onClick={() => setSheet(null)}>Close</button>
          </div>
          {nothingFits ? (
            <p className={styles.noFit} data-testid="plan-vehicle-none" role="status">
              No rocket you have can fly this job.{' '}
              {researchable.length > 0
                ? <>Research {researchable.map(model => model.name).join(' or ')} below, or pick another destination.</>
                : <>Pick another destination, or come back once a bigger rocket is unlocked.</>}
            </p>
          ) : (
            <p className={styles.sheetLead}>The smallest rocket that fits flies the job. Bigger ones are for more cargo or a farther orbit.</p>
          )}
          <ul>
            {rockets.map(model => {
              if (!rocketUnlocked(model, player)) {
                const xp = rocketResearchXp(model)
                const canFly = fits(model)
                return (
                  <li key={model.id}><button type="button" data-role="research" data-testid={`plan-vehicle-research-${model.id}`} disabled={!canFly} onClick={() => research(model)}>
                    <img className={styles.vehicleOptionArt} src={model.img} alt="" aria-hidden="true" />
                    <strong>{model.name}<small>{model.stats.cargo}U · ORB {model.stats.maxOrbit}</small></strong>
                    {canFly
                      ? <span className={styles.vehicleOptionAction}>Research · {xp} XP</span>
                      : <span className={styles.vehicleOptionNote}>Locked · {model.unlockHint}</span>}
                  </button></li>
                )
              }
              const role = roles.get(model.id) ?? { kind: 'too-small' as const, note: 'Cannot fly this job' }
              const price = rocketPrice(model, player)
              const cost = price === 0 ? 'No cost' : formatCurrency(price, { compact: true })
              const usable = role.kind === 'use'
              return (
                <li key={model.id}><button type="button" data-role={role.kind} data-testid={`plan-vehicle-${model.id}`} data-current={model.id === selectedRocket?.id || undefined} disabled={!usable} onClick={() => {
                  if (player.francs < price) { game.addToast(`Not enough francs: you need ${formatCurrency(price - player.francs, { compact: true })} more`, 'warn'); return }
                  game.onPurchaseRocket(model.id)
                  setSheet(null)
                }}>
                  <img className={styles.vehicleOptionArt} src={model.img} alt="" aria-hidden="true" />
                  <strong>{model.name}<small>{model.stats.cargo}U · ORB {model.stats.maxOrbit}</small></strong>
                  {usable
                    ? <span className={styles.vehicleOptionAction}>{model.id === selectedRocket?.id ? `Staged · ${cost}` : price > 0 ? `Buy · ${cost}` : `Stage · ${cost}`}</span>
                    : <span className={styles.vehicleOptionNote}>{role.note}</span>}
                </button></li>
              )
            })}
            {!rockets.length && <li><p>No rocket is unlocked yet.</p></li>}
          </ul>
        </div>
      )}
    </div>
  )
}
