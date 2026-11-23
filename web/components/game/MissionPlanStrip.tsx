'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { useGame } from '@/game-context'
import { ROCKET_MODELS, isFreeHaulEligibleMission, isOrionidsEventMission, isOwnProgramMission } from '@/lib/data'
import { agencyTargets } from '@/lib/rockets'
import { RESOURCE_FOCUS_MISSION_ID } from '@/lib/data/missions'
import { showerForRunMission } from '@/lib/data/showers'
import { formatCurrency } from '@/lib/format'
import { applyFreeRunGoal, clampGoalAmount, maxGoalAmount } from '@/lib/freeRunGoal'
import { siloRoomFor } from '@/lib/systems/HomeDeliverySystem'
import { miningIntelligence } from '@/lib/probes/mining-intelligence'
import { loadPixiGalaxyMap } from '@/components/TargetPicker/loadPixiGalaxyMap'
import styles from './MissionPlanStrip.module.css'

// The Solar System map the target picker used; Pixi needs the browser, so it loads client-side only.
// The hub warms this loader while online. If its chunk still cannot load (offline before it was
// ever cached, or a deploy replaced it), the sheet keeps its list of destinations instead of the
// whole mission setup crashing.
const PixiGalaxyMap = dynamic(
  () => loadPixiGalaxyMap().catch(() => ({ default: MapUnavailable })),
  { ssr: false },
)

function MapUnavailable() {
  return <p className={styles.mapOffline}>The map loads when you are back online. Pick a destination from the list.</p>
}

type Game = ReturnType<typeof useGame>
type Sheet = 'destination' | 'goal' | null

const STEPS = ['Contract', 'Plan', 'Launch'] as const

/** Contract, Plan, Launch. The plan strip makes the auto-picked destination and vehicle visible and changeable in place. */
export default function MissionPlanStrip({ game, blockedReason, launched, primaryAction, primaryLabel, primaryDisabled = false }: {
  game: Game
  blockedReason: string | null
  /** SSL-750: what the hold line offers to change: another vehicle, or the rocket's parts. */
  launched: boolean
  primaryAction?: () => void
  primaryLabel?: string
  primaryDisabled?: boolean
}) {
  const [sheet, setSheet] = useState<Sheet>(null)
  const { mission, target, player } = game
  if (!mission || !target) return null

  const selectedVehicle = player.stagedRockets?.find(vehicle => vehicle.id === player.selectedStagedRocketId && (vehicle.location === 'hangar' || vehicle.location === 'launchpad'))
  const selectedRocket = selectedVehicle ? ROCKET_MODELS.find(model => model.id === selectedVehicle.rocketId) : null
  // Liam, 01.11: Cargo says what comes back (the haul and the pay) and what the rocket carries out (its payload).
  const haul = Object.entries(mission.requires.minerals).map(([id, amount]) => `${game.catalog.minerals[id]?.name ?? id} ×${amount}`)
  const pay = mission.payout?.francs ? formatCurrency(mission.payout.francs, { compact: true }) : null
  const flyingRocket = selectedVehicle?.rocket ?? game.rocket
  const drill = game.catalog.parts.drill.find(part => part.id === flyingRocket.drill)
  const payloadName = mission.customPlan?.work === 'deliver' ? 'Ore from Earth stash' : mission.payload?.name
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
  const getting = mission.customPlan?.work === 'survey' ? `Probe mapping ${mission.customPlan.amount} sectors` : mission.customPlan?.work === 'deliver' ? `Forward cache at ${target.name}` : showerRun ? 'Fragments + minerals' : [haul.join(', '), pay].filter(Boolean).join(' · ') || 'Nothing'
  const noSilo = mission.payload?.type !== 'satellite' && mission.customPlan?.work !== 'survey' && !isOrionidsEventMission(mission) && isOwnProgramMission(mission) && !mission.construction && !mission.deliveryTargetId && !siloRoomFor(player, {}).built

  // Liam, 10.11: a free mining run lets the player choose the ore and how much, up to what the rocket's hold carries.
  const goalEditable = !mission.customPlan && !launched && !showerRun && mission.id !== RESOURCE_FOCUS_MISSION_ID && isFreeHaulEligibleMission(mission)
  const holdUnits = selectedRocket?.stats.cargo ?? 6
  const drillTier = drill?.tier ?? 1
  const goalMineralId = Object.keys(mission.requires.minerals)[0]
  const goalAmount = mission.requires.minerals[goalMineralId] ?? 1
  const intelligence = miningIntelligence(player, target, id => game.catalog.minerals[id]?.rarity)
  const evidence = Object.keys(mission.requires.minerals).length > 0 && !mission.deliveryTargetId && <p className={styles.sheetLead} data-testid="fitting-probe-findings">
    <strong>Probe findings · {target.name}: </strong>
    {intelligence.sectors.length ? <>{intelligence.sectors.length}/{intelligence.totalSectors} sectors on file. {intelligence.findings.map(row => `${game.catalog.minerals[row.mineral]?.name ?? row.mineral}: about ${row.tonnes.toLocaleString('en-GB')} t`).join(' · ') || 'No deposits found.'} These are deposit estimates; your haul still has to fit the hold.</>
      : <>No downloaded or shared readings. This flight uses the body's known composition.</>}
  </p>
  const setGoal = (mineral: string, amount: number) => {
    const meta = game.catalog.minerals[mineral]
    const next = { missionId: mission.id, mineral, amount: clampGoalAmount(amount, meta, holdUnits) }
    game.setPlayer(p => ({ ...p, freeRunGoal: next }))
    // A body without this ore cannot be flown to for it: move the destination to one that has it.
    const suited = agencyTargets(applyFreeRunGoal(mission, next, game.catalog.minerals), game.catalog, player)
    if (suited.length && !suited.some(t => t.id === target.id)) game.onPickTarget(suited[0].id)
  }
  const goalOptions = sheet === 'goal'
    ? Object.entries(game.catalog.minerals).filter(([id, meta]) => meta.cargoUnits !== 0 && (meta.laserAccess ?? 1) <= drillTier && maxGoalAmount(meta, holdUnits) > 0
      && agencyTargets(applyFreeRunGoal(mission, { missionId: mission.id, mineral: id, amount: 1 }, game.catalog.minerals), game.catalog, player).length > 0)
    : []
  const targets = sheet === 'destination'
    ? agencyTargets(mission, game.catalog, player)
    : []
  return (
    <div className={styles.host} data-testid="mission-plan-strip">
      <ol className={styles.rail} aria-label={`Mission step ${step + 1} of 3`}>
        {STEPS.map((label, i) => <li key={label} data-state={i < step ? 'done' : i === step ? 'now' : 'next'}><i />{label}</li>)}
      </ol>
      <div className={styles.slots}>
        <button type="button" className={styles.slot} data-testid="plan-destination" disabled={launched || !!mission.targetId} onClick={() => setSheet('destination')}>
          <span>Destination</span><strong>{runShower ? `${runShower.name} field` : target.name}</strong>{!mission.targetId && <em>Change</em>}
        </button>
        <div className={styles.slot} data-testid="plan-vehicle">
          <span>Agency rocket</span><strong>{selectedRocket?.name ?? 'Preparing'}</strong>
          {selectedRocket && <small>{selectedRocket.stats.cargo} cargo · Range {selectedRocket.stats.maxOrbit}</small>}
        </div>
        {(() => {
          const rows = (
            <>
              <span>Cargo</span>
              <span className={styles.cargoRows}>
                <span className={styles.cargoRow} data-testid="plan-cargo-getting"><b>{mission.customPlan?.work === 'deliver' ? 'Delivering' : 'Getting'}</b>{mission.customPlan?.work === 'deliver' ? haul.join(', ') : getting}</span>
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
        </p>
      )}

      {sheet === 'destination' && (
        <div className={styles.mapSheet} role="group" aria-label="Choose destination" data-testid="plan-sheet-destination">
          <div className={styles.mapHead}>
            <strong>Destination</strong>
            <button type="button" onClick={() => setSheet(null)}>Close</button>
          </div>
          {evidence}
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
              <li key={t.id}><button type="button" aria-pressed={t.id === target.id} data-current={t.id === target.id || undefined} onClick={() => { game.onPickTarget(t.id); setSheet(null) }}>
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
          {evidence}
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

    </div>
  )
}
