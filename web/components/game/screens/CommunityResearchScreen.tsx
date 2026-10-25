'use client'

import { ResearchCalendar } from '@/components/game/control-station/ResearchCalendar'
import { liveEventWeek } from '@/lib/research/event-week'
import type { CommunityResearch } from '@/lib/research/stamps'
import type { Player } from '@/lib/game-types'
import styles from './CommunityResearchScreen.module.css'

interface CommunityResearchScreenProps {
  player: Player
  communityResearch?: CommunityResearch | null
  onBack: () => void
  onOpenEvents: () => void
}

/** Event stamps this player earned since the shower started. */
function eventStampsSince(stamps: Player['researchStamps'], now: number, daysLeftEnd: number): number {
  const from = new Date(now - (30 - daysLeftEnd) * 86_400_000).toISOString().slice(0, 10)
  return Object.entries(stamps ?? {}).filter(([day, kinds]) => day >= from && kinds.includes('event')).length
}

/** Daily stamps, the shared bar, and the meteor shower week when one is running. Reachable without a control station. */
export default function CommunityResearchScreen({ player, communityResearch, onBack, onOpenEvents }: CommunityResearchScreenProps) {
  const now = Date.now()
  const week = liveEventWeek(now)
  const mine = week ? eventStampsSince(player.researchStamps, now, week.daysLeft) : 0
  return (
    <section className="screen-scroll theme-light" data-testid="community-research-screen">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Shared with every player</div>
            <h1 className={styles.title}>Community research</h1>
          </div>
          <button type="button" className={styles.back} onClick={onBack}>Back</button>
        </header>
        {week && (
          <section className={styles.event} data-testid="community-research-event" aria-label={`${week.name} research week`}>
            <div className={styles.live}>Live event week</div>
            <h2 className={styles.eventTitle}>{week.name}</h2>
            <p className={styles.note}>
              Everyone is catching debris this week. Each catch day earns an event stamp that fills the same community bar below.
              {' '}{week.daysLeft > 0 ? `${week.daysLeft} day${week.daysLeft === 1 ? '' : 's'} left.` : 'Last day.'}
            </p>
            <div className={styles.mine} data-testid="community-research-event-mine">{mine} event stamp{mine === 1 ? '' : 's'} from you</div>
            <button type="button" className={styles.cta} data-testid="community-research-join" onClick={onOpenEvents}>Join the {week.name}</button>
          </section>
        )}
        <ResearchCalendar
          stamps={player.researchStamps}
          now={now}
          community={communityResearch}
          hasDiscovery={Object.keys(player.discoveredExoplanetTargets ?? {}).length > 0}
        />
      </div>
    </section>
  )
}
