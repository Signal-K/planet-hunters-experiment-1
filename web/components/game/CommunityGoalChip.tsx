'use client'

import { debrisNow } from '@/lib/hooks/useDebrisEvent'
import { liveEventWeek } from '@/lib/research/event-week'
import { COMMUNITY_REWARD, communityBar, stampsInMonth, type CommunityResearch, type ResearchStamps } from '@/lib/research/stamps'
import styles from './CommunityGoalChip.module.css'

/**
 * SSL-685: community research is the standing event. On the Base it takes the
 * top-right event slot whenever no sky event is running, so a month between
 * showers still shows the shared goal, the progress and what it unlocks.
 */
export default function CommunityGoalChip({ stamps, community, onOpen, now = debrisNow() }: {
  stamps: ResearchStamps | undefined
  community: CommunityResearch | null | undefined
  onOpen: () => void
  now?: number
}) {
  if (liveEventWeek(now)) return null
  const d = new Date(now)
  const bar = communityBar(stampsInMonth(stamps ?? {}, d.getUTCFullYear(), d.getUTCMonth()), community)
  const sale = community?.bonusPct ?? COMMUNITY_REWARD.salePct
  const fuel = community?.fuelPct ?? COMMUNITY_REWARD.fuelPct
  return (
    <button
      type="button"
      className={styles.chip}
      data-testid="community-goal-chip"
      data-reached={bar.reached || undefined}
      aria-label={`Community research: ${bar.total} of ${bar.goal} stamps. ${bar.reached ? 'Goal reached.' : 'Reward'} Plus ${sale} percent Exchange prices and plus ${fuel} percent fuel efficiency. Open community research.`}
      onClick={onOpen}
    >
      <span className={styles.top}><b>Community</b><span>{bar.total} / {bar.goal}</span></span>
      <span className={styles.track} aria-hidden="true"><i style={{ width: `${bar.fill * 100}%` }} /></span>
      <small>{bar.reached ? 'Goal reached' : `Goal: +${sale}% prices, +${fuel}% fuel`}</small>
    </button>
  )
}
