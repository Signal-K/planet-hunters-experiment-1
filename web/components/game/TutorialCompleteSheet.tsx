'use client'

import type { AgencyTrainingStage, AgencyTrainingStep, FreeOpsActivity } from '@/lib/systems/AgencyOnboardingSystem'
import PageSurface from '@/components/ui/PageSurface'
import styles from './TutorialCompleteSheet.module.css'

// What each training stage taught, shown when the player reviews training
// from the menu. Free Ops is the destination, not a lesson.
const STAGE_SUMMARIES: Record<Exclude<AgencyTrainingStage, 'free-ops'>, string> = {
  mining: 'Complete a mine-and-return client order.',
  scan: 'Classify a real transit light curve.',
  part: 'Fit a module in each ship stage and confirm.',
  launchpad: 'Every mission launches from your pad.',
  extraction: 'Mine ore for a client and bring it home.',
  transport: 'Mine at one site, deliver to another.',
  storage: 'Keep ore on Earth instead of selling every haul.',
}

interface TutorialCompleteSheetProps {
  /** SSL-332 agency training track (launchpad, extraction, transport,
   *  storage, Free Ops). */
  track: AgencyTrainingStep[]
  /** The three Free Ops activities: client work, space telescope, refinery. */
  activities: FreeOpsActivity[]
  /** 'handoff' when the silo has just opened Free Ops; 'review' when the
   *  player reopens their training from the menu. */
  mode?: 'handoff' | 'review'
  onChoose: (activity: FreeOpsActivity) => void
  onClose: () => void
}

/** The Free Ops handoff: the finished training track, then the three agency
 * activities the player can start straight away. Reopened from the menu, it
 * doubles as the training review. */
export function TutorialCompleteSheet({ track, activities, mode = 'handoff', onChoose, onClose }: TutorialCompleteSheetProps) {
  const review = mode === 'review'
  return (
    <PageSurface zIndex={200} contentClassName={styles.surface} testId="tutorial-complete-sheet">
      <section className={styles.intro}>
        <span className={styles.eyebrow}>{review ? 'AGENCY TRAINING' : 'AGENCY TRAINING COMPLETE'}</span>
        <h1>{review ? 'How your agency works' : 'Your agency is operating'}</h1>
        <ol className={styles.track} aria-label="Agency training">
          {track.map(step => (
            <li key={step.stage} className={styles.trackStep} data-status={step.status} data-testid={`agency-track-${step.stage}`}>
              <span className={styles.trackMarker} aria-hidden="true" />
              <span>{step.label}</span>
              {review && step.stage !== 'free-ops'
                ? <span className={styles.trackSummary}>{STAGE_SUMMARIES[step.stage]}</span>
                : <span className={styles.trackStatus}>{step.status === 'done' ? 'Done' : step.status === 'current' ? 'Now' : 'Later'}</span>}
            </li>
          ))}
        </ol>
        <p>{review
          ? 'Mining, transport and construction are separate jobs your agency can take on at any time. Pick one to start now.'
          : 'Mining, transport and construction are now yours to run. Choose what your agency does first; the rest stays available from your base.'}</p>
      </section>
      <div className={styles.activityGrid}>
        {activities.map(activity => (
          <button
            key={activity.id}
            type="button"
            className={styles.activity}
            data-testid={`free-ops-activity-${activity.id}`}
            onClick={() => onChoose(activity)}
          >
            <strong>{activity.label}</strong>
            <span>{activity.body}</span>
            <em>{activity.cta}</em>
          </button>
        ))}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} data-testid="tutorial-complete-close" onClick={onClose}>
          {review ? 'CLOSE' : 'BACK TO BASE'}
        </button>
      </div>
    </PageSurface>
  )
}
