import { ORIONIDS_NIGHT_RUN_ID } from '@/lib/data/missions'

/**
 * SSL-711: the second action button in a mining run, beside FIRE. FIRE always
 * mines ground seams; a run that needs a second verb (catching falling debris
 * today) declares it here, and MiningScreen shows the button, its key and its
 * how-to-play line from this one entry. Add a case for a new mission or event
 * instead of building another button.
 */
export interface MiningSecondaryAction {
  /** What the button does in the scene. `catch` takes falling debris out of the collector beam above the ship. */
  kind: 'catch'
  label: string
  /** KeyboardEvent.code that presses it on desktop. */
  key: string
  keyLabel: string
  /** One line for the start card. */
  brief: string
  /** The menu's How to play entry. */
  howTo: string
}

const CATCH: Omit<MiningSecondaryAction, 'brief' | 'howTo'> = { kind: 'catch', label: 'Catch', key: 'KeyC', keyLabel: 'C' }

/** The run's second action, or null when FIRE is the only one. */
export function miningSecondaryAction(missionId: string): MiningSecondaryAction | null {
  if (missionId === ORIONIDS_NIGHT_RUN_ID) {
    return {
      ...CATCH,
      brief: 'Steer a fragment into the beam above the ship, then press Catch.',
      howTo: 'Blue fragments fall from the shower. Steer so one drops into the light beam above the ship; Catch lights up, then press it (C). A fragment that reaches the ground breaks up. Fire is only for ground seams. Catches count toward the run and cannot be dropped.',
    }
  }
  return null
}
