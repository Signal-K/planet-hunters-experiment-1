// The Orionids event is the shower run: catch fragments and bring them home for the community record.
// Finishing the run hands over the fragment sample and grades the badge, never mining alone. ORI-1 keeps
// listening afterwards as ordinary community research. (Stage 1 was the rover step and is retired; stage 2
// is the old "listen on ORI-1" step, kept so saves already there can still finish it.)
// Shaped so a later shower can declare its own chain.

import { badgeTierFor, getSkyEvent, grantBadge } from '@/lib/data/sky-events'
import { getShower, showerInstrument } from '@/lib/data/showers'
import type { Player } from '@/lib/game-types'

export type OrionidsStage = 0 | 1 | 2 | 3

export interface ShowerStoryItem {
  id: string
  name: string
  /** What the item is, in one sentence. */
  detail: string
  /** What it lets the player do next. */
  unlocks: string
}

export interface ShowerChain {
  eventId: string
  /** Recordings to check on the community receiver for the last mission. */
  radioTarget: number
  /** One item per mission, in order. Mission n hands over items[n - 1]. */
  items: [ShowerStoryItem]
}

export const ORIONIDS_CHAIN: ShowerChain = {
  eventId: 'orionids-2026',
  radioTarget: 3,
  items: [
    {
      id: 'fragment-sample',
      name: 'Fragment sample',
      detail: 'A sealed Orionid fragment from your shower run. Its scorch marks show where to listen for more of the shower.',
      unlocks: 'The Orionids record is complete. ORI-1 keeps listening: every recording you check still fills the shared bar.',
    },
  ],
}

/** Items the player holds at this stage. Derived from the stage, so every existing save has the right ones. */
export function showerItems(chain: ShowerChain, stage: number | undefined): ShowerStoryItem[] {
  return (stage ?? 0) >= 1 ? chain.items.slice(0, 1) : []
}

export function radioChecked(player: Pick<Player, 'radioMeteorClassifications'>): number {
  return Object.keys(player.radioMeteorClassifications ?? {}).length
}

type ChainPlayer = Pick<Player, 'orionidsEventStage' | 'radioMeteorClassifications' | 'badges'>

/**
 * After a radio classification: with the shower run done and enough recordings checked, the
 * third mission completes and the badge is graded now. Returns the same player when nothing changes.
 */
export function completeRadioMission<T extends ChainPlayer>(player: T, at: number, chain: ShowerChain = ORIONIDS_CHAIN): { player: T; completed: boolean } {
  if ((player.orionidsEventStage ?? 0) !== 2 || radioChecked(player) < chain.radioTarget) return { player, completed: false }
  const staged = { ...player, orionidsEventStage: 3 as const }
  return { player: badgeTierFor(chain.eventId, at) ? grantBadge(staged, chain.eventId, at) : staged, completed: true }
}

/** Community research's weekly event step, worded for where the player is in the chain. Read from the shower's declaration. */
export function orionidsResearchStep(stage: number | undefined, eventId: string = ORIONIDS_CHAIN.eventId): { title: string; brief: string } {
  const shower = getShower(eventId)
  if (!shower) return { title: 'Meteor shower', brief: 'Take part in the shower for the community record.' }
  // A non-breaking hyphen keeps ORI-1 on one line in the step title.
  const callsign = showerInstrument(eventId).callsign.replace('-', '\u2011')
  return (stage ?? 0) >= 1 ? shower.step.done(callsign) : shower.step.open
}

/** The community instrument launched for the chain's shower. */
export function chainInstrument(chain: ShowerChain = ORIONIDS_CHAIN) {
  return getSkyEvent(chain.eventId)?.communityInstrument ?? { callsign: 'RX-1', name: 'Community receiver' }
}
