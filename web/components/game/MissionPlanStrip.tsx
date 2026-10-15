'use client'

import { useState } from 'react'
import type { useGame } from '@/game-context'
import { ROCKET_MODELS, rocketConfigForModel, rocketModelForConfig, validateBuild } from '@/lib/data'
import { feasibleTargetsFor } from '@/lib/data/targets'
import { rocketCompatibleWithMission } from '@/lib/rockets'
import { buildingLevel } from '@/lib/data/building-levels'
import { formatCurrency } from '@/lib/format'
import styles from './MissionPlanStrip.module.css'

type Game = ReturnType<typeof useGame>
type Sheet = 'destination' | 'vehicle' | null

const STEPS = ['Contract', 'Plan', 'Launch'] as const

/** Contract, Plan, Launch. The plan strip makes the auto-picked destination and vehicle visible and changeable in place. */
export default function MissionPlanStrip({ game, blockedReason, launched }: { game: Game; blockedReason: string | null; launched: boolean }) {
  const [sheet, setSheet] = useState<Sheet>(null)
  const { mission, target, player } = game
  if (!mission || !target) return null

  const rocket = rocketModelForConfig(game.rocket)
  const minerals = Object.keys(mission.requires.minerals).map(id => game.catalog.minerals[id]?.name ?? id)
  const step = launched ? 2 : 1

  const targets = sheet === 'destination'
    ? feasibleTargetsFor(mission, game.catalog.targets, game.catalog.parts, player.missionsDone, player.launchpadUpgraded, player.unlockedSkillNodes ?? [], buildingLevel(player, 'launchpad'))
    : []
  const rockets = sheet === 'vehicle'
    ? ROCKET_MODELS.filter(model => !model.locked && model.missionsRequired <= player.missionsDone && rocketCompatibleWithMission(model, mission)
      && validateBuild({ mission, target, rocket: rocketConfigForModel(model), parts: game.catalog.parts, unlockedSkillNodes: player.unlockedSkillNodes ?? [] }).ok)
    : []

  return (
    <div className={styles.host} data-testid="mission-plan-strip">
      <ol className={styles.rail} aria-label={`Mission step ${step + 1} of 3`}>
        {STEPS.map((label, i) => <li key={label} data-state={i < step ? 'done' : i === step ? 'now' : 'next'}><i />{label}</li>)}
      </ol>
      <div className={styles.slots}>
        <button type="button" className={styles.slot} data-testid="plan-destination" disabled={launched} onClick={() => setSheet('destination')}>
          <span>Destination</span><strong>{target.name}</strong><em>Change</em>
        </button>
        <button type="button" className={styles.slot} data-testid="plan-vehicle" disabled={launched} onClick={() => setSheet('vehicle')}>
          <span>Vehicle</span><strong>{rocket.name}</strong><em>Change</em>
        </button>
        <div className={styles.slot} data-testid="plan-cargo"><span>Cargo</span><strong>{minerals.join(', ') || 'None'}</strong></div>
      </div>
      {blockedReason && <p className={styles.hold} data-testid="plan-clearance" role="status">Build hold: {blockedReason}</p>}

      {sheet && (
        <div className={styles.sheet} role="dialog" aria-label={sheet === 'destination' ? 'Choose destination' : 'Choose vehicle'} data-testid={`plan-sheet-${sheet}`}>
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
                <li key={model.id}><button type="button" data-current={model.id === rocket.id || undefined} onClick={() => {
                  if (player.francs < model.costFrancs) { game.addToast(`Not enough francs: you need ${formatCurrency(model.costFrancs - player.francs, { compact: true })} more`, 'warn'); return }
                  game.onPurchaseRocket(model.id)
                  setSheet(null)
                }}>
                  <strong>{model.name}</strong><span>Build · {cost}</span>
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
