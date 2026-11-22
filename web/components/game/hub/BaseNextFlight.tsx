'use client'

import type { useGame } from '@/game-context'
import { baseNextFlight, nextMiningContract } from '@/lib/base-next-flight'
import { useMissionRelayModels } from '@/lib/hooks/useMissionRelayModels'
import styles from './HubLayout.module.css'

export default function BaseNextFlight({ game, onService }: { game: ReturnType<typeof useGame>; onService: () => void }) {
  const { cardModels } = useMissionRelayModels({ catalog: game.catalog, player: game.player,
    missionsDone: game.player.missionsDone, freeOperations: game.player.freeOperations, francs: game.player.francs })
  const next = baseNextFlight(game.player, game.mission, game.target, nextMiningContract(cardModels, game.catalog.targets))
  return <button type="button" className={styles.nextFlight} data-testid="base-next-flight" data-coach-id="base-next-flight" onClick={() => {
    if (next.screen === 'hub') return onService()
    if (!next.prepare) return game.go(next.screen)
    // Use normal acceptance and target selection. This buys nothing and never
    // launches; the review keeps costs and holds visible.
    game.go('missions')
    game.onPickMission(next.prepare.missionId)
    game.onPickTarget(next.prepare.targetId)
  }}>
    <span className={styles.nextFlightCopy}><strong>{next.title}</strong><span>{next.detail}</span></span>
    <span className={styles.nextFlightCta}>{next.cta} →</span>
  </button>
}
