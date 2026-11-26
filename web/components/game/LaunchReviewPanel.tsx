'use client'

import { useEffect, useRef } from 'react'
import type { useGame } from '@/game-context'
import { ROCKET_MODELS, isOrionidsEventMission, isOwnProgramMission, rocketConfigForModel, validateBuild } from '@/lib/data'
import { buildingLevel } from '@/lib/data/building-levels'
import { rocketCompatibleWithMission, rocketUnlocked } from '@/lib/rockets'
import { formatCurrency } from '@/lib/format'
import styles from './LaunchReviewPanel.module.css'

type Game = ReturnType<typeof useGame>

/**
 * Launch review for the map-first loop. There is one rocket, so there is nothing to choose: the review states the
 * place, the work, the cargo and the rocket, then launches. Back returns to the solar-system map to choose another place.
 */
export default function LaunchReviewPanel({ game, blockedReason, launched, primaryAction, primaryLabel, primaryDisabled = false }: {
  game: Game
  blockedReason: string | null
  launched: boolean
  primaryAction: () => void
  primaryLabel: string
  primaryDisabled?: boolean
}) {
  const { mission, target, player } = game
  const staged = useRef(false)
  // The agency's rocket is the smallest one it owns that can do this job. Stage it so the pad shows it.
  useEffect(() => {
    if (staged.current || !mission || !target || player.stagedRockets?.length || isOrionidsEventMission(mission)) return
    const fit = ROCKET_MODELS.find(model => !model.locked && rocketUnlocked(model, player) && rocketCompatibleWithMission(model, mission)
      && validateBuild({ mission, target, rocket: rocketConfigForModel(model), parts: game.catalog.parts, launchpadLevel: buildingLevel(player, 'launchpad') }).ok)
    if (!fit) return
    staged.current = true
    game.onPurchaseRocket(fit.id)
  }, [mission, target, player, game])
  if (!mission || !target) return null

  const vehicle = player.stagedRockets?.find(v => v.id === player.selectedStagedRocketId)
  const rocket = vehicle ? ROCKET_MODELS.find(model => model.id === vehicle.rocketId) : null
  const haul = Object.entries(mission.requires.minerals).map(([id, amount]) => `${game.catalog.minerals[id]?.name ?? id} ×${amount}`)
  const pay = mission.payout?.francs ? formatCurrency(mission.payout.francs, { compact: true }) : null
  const cargo = mission.customPlan?.work === 'survey' ? `Probe mapping ${mission.customPlan.amount} sectors`
    : mission.customPlan?.work === 'deliver' ? `Forward cache at ${target.name}`
    : mission.payload?.name ?? ([haul.join(', '), pay].filter(Boolean).join(' · ') || 'Nothing')
  const kind = isOwnProgramMission(mission) ? 'Agency mission' : 'Client mission'

  return (
    <div className={styles.host} data-testid="launch-review">
      <section className={styles.card} data-kind={isOwnProgramMission(mission) ? 'agency' : 'client'}>
        <p className={styles.kind}>{kind}</p>
        <h2>{mission.title}</h2>
        <dl>
          <div><dt>Destination</dt><dd data-testid="review-destination">{target.name}</dd></div>
          <div><dt>Cargo</dt><dd data-testid="review-cargo">{cargo}</dd></div>
          <div><dt>Rocket</dt><dd data-testid="review-rocket">{rocket?.name ?? 'Preparing'}</dd></div>
        </dl>
        {blockedReason && !launched && <p className={styles.hold} data-testid="review-hold" role="status">{blockedReason}.</p>}
        <div className={styles.actions}>
          <button type="button" className={styles.launch} data-testid="review-launch" disabled={primaryDisabled} onClick={primaryAction}>{primaryLabel}</button>
        </div>
      </section>
    </div>
  )
}
