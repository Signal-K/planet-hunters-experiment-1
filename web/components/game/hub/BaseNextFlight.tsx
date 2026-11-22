'use client'

import type { useGame } from '@/game-context'
import { baseNextFlight, nextMiningContract } from '@/lib/base-next-flight'
import { useMissionRelayModels } from '@/lib/hooks/useMissionRelayModels'
import styles from './HubLayout.module.css'

export default function BaseNextFlight({ game, onService }: { game: ReturnType<typeof useGame>; onService: () => void }) {
  const { cardModels } = useMissionRelayModels({ catalog: game.catalog, player: game.player,
    missionsDone: game.player.missionsDone, freeOperations: game.player.freeOperations, francs: game.player.francs })
  const next = baseNextFlight(game.player, game.mission, game.target, nextMiningContract(cardModels, game.catalog.targets))
  return <section className={styles.nextFlightPanel} aria-label="Next activity">
    {next.prepare && <p className={styles.nextFlightSuggestion}>Suggested flight</p>}
    <button type="button" className={styles.nextFlight} data-testid="base-next-flight" data-coach-id="base-next-flight" onClick={() => {
      if (next.screen === 'hub') return onService()
      if (!next.prepare) return game.go(next.screen)
      // Normal acceptance and target selection; purchases and launch remain explicit.
      game.goToMissions()
      game.onPickMission(next.prepare.missionId)
      game.onPickTarget(next.prepare.targetId)
    }}>
      <span className={styles.nextFlightCopy}><strong>{next.title}</strong><span>{next.detail}</span></span>
      <span className={styles.nextFlightCta}>{next.cta} →</span>
    </button>
    {next.prepare && <nav className={styles.nextFlightChoices} aria-label="Choose your own work">
      <button type="button" data-testid="base-choose-flight" onClick={() => game.goToMissions()}>Choose another flight</button>
      {game.player.freeOperations && <button type="button" data-testid="base-plan-flight" onClick={() => game.go('mission-planner')}>Plan my own flight</button>}
    </nav>}
  </section>
}
