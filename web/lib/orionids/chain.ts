// SSL-714: the Orionids badge is two missions, each handing the player a story item that lets the
// next one start: the shower run (mine) → listening on the community receiver (confirm). The badge is
// graded when the second one is done, never on mining alone. Stage 1 is retired (it was the rover
// observation, removed in cycle 8); saves at stage 1 read as stage 2.
// Shaped so a later shower can declare its own chain.

import { badgeTierFor, getSkyEvent, grantBadge } from '@/lib/data/sky-events'
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
  items: [ShowerStoryItem, ShowerStoryItem]
}

export const ORIONIDS_CHAIN: ShowerChain = {
  eventId: 'orionids-2026',
  radioTarget: 3,
  items: [
    {
      id: 'fragment-sample',
      name: 'Fragment sample',
      detail: 'A sealed Orionid fragment from your shower run. Its scorch marks show where to listen for more of the shower.',
      unlocks: 'Mission 2 is ready on the Events board: confirm meteor echoes on ORI-1.',
    },
    {
      id: 'radio-confirmation',
      name: 'Radio confirmation',
      detail: 'Recordings you checked on ORI-1, confirming the shower in real radio data from the BRAMS network.',
      unlocks: 'The Orionids record is complete.',
    },
  ],
}

/** Items the player holds at this stage. Derived from the stage, so every existing save has the right ones. */
export function showerItems(chain: ShowerChain, stage: number | undefined): ShowerStoryItem[] {
  const held = (stage ?? 0) >= 3 ? 2 : (stage ?? 0) >= 1 ? 1 : 0
  return chain.items.slice(0, held)
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

/** Community research's weekly event step, worded for where the player is in the chain. */
export function orionidsResearchStep(stage: number | undefined): { title: string; brief: string } {
  // A non-breaking hyphen keeps ORI-1 on one line in the step title.
  const callsign = chainInstrument().callsign.replace('-', '\u2011')
  switch (stage ?? 0) {
    case 0: return { title: 'Orionids 1 of 2: fly the shower run', brief: 'Catch fragments in the shower. You bring back the sample the next mission needs.' }
    case 1:
    case 2: return { title: `Orionids 2 of 2: listen on ${callsign}`, brief: `Check recordings on ${callsign}, the receiver everyone launched. Three confirm the shower.` }
    default: return { title: `Orionids: keep listening on ${callsign}`, brief: 'The record is complete. Every recording you check still fills the shared bar.' }
  }
}

/** The community instrument launched for the chain's shower. */
export function chainInstrument(chain: ShowerChain = ORIONIDS_CHAIN) {
  return getSkyEvent(chain.eventId)?.communityInstrument ?? { callsign: 'RX-1', name: 'Community receiver' }
}
