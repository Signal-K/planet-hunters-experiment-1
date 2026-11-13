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
export function chainInstrument(chain: Pick<ShowerChain, 'eventId'> = ORIONIDS_CHAIN) {
  return getSkyEvent(chain.eventId)?.communityInstrument ?? { callsign: 'RX-1', name: 'Community receiver' }
}

// ---- Later showers (SSL-831) ------------------------------------------------
// The Leonids are two missions: the shower run hands over the fragment sample and the community
// launches LEO-1; checking recordings on LEO-1 hands over the radio confirmation and grades the
// badge. State lives in player.showerChains, keyed by shower id. The Orionids keep their own fields.

export interface TwoStepChain {
  eventId: string
  /** Recordings to check on the community receiver, counted from the moment the run was finished. */
  radioTarget: number
  /** Mission 1 hands over items[0], mission 2 items[1]. */
  items: [ShowerStoryItem, ShowerStoryItem]
}

export const LEONIDS_CHAIN: TwoStepChain = {
  eventId: 'leonids-2026',
  radioTarget: 3,
  items: [
    {
      id: 'fragment-sample',
      name: 'Leonid fragment sample',
      detail: 'A sealed Leonid fragment, shed by comet Tempel-Tuttle. Leonids hit the air at 71 km/s, faster than any other shower, so their trails ring loud on the radio.',
      unlocks: 'The community has launched LEO-1. Check 3 of its recordings to confirm the Leonids and earn the badge.',
    },
    {
      id: 'radio-confirmation',
      name: 'Radio confirmation',
      detail: 'Three LEO-1 recordings checked by you: the Leonids are confirmed by radio, not just by eye.',
      unlocks: 'The Leonids record is complete. LEO-1 keeps listening: every recording you check still fills the shared bar.',
    },
  ],
}

/** Every later shower that has its own mission chain. */
export const SHOWER_CHAINS: ReadonlyArray<TwoStepChain> = [LEONIDS_CHAIN]

export function getShowerChain(eventId: string | undefined): TwoStepChain | undefined {
  return SHOWER_CHAINS.find(chain => chain.eventId === eventId)
}

type TwoStepPlayer = Pick<Player, 'showerChains' | 'radioMeteorClassifications' | 'badges'>

/** 0 before the run, 1 after it (LEO-1 open), 2 once the radio confirmation is in. */
export function chainStage(player: Pick<Player, 'showerChains'>, eventId: string): number {
  const stage = player.showerChains?.[eventId]?.stage
  return typeof stage === 'number' && Number.isFinite(stage) ? Math.max(0, Math.min(2, Math.floor(stage))) : 0
}

/** Story items held: one per finished mission. */
export function chainItems(player: Pick<Player, 'showerChains'>, chain: TwoStepChain): ShowerStoryItem[] {
  return chain.items.slice(0, chainStage(player, chain.eventId))
}

/** Recordings checked on the receiver since the shower run was finished. Earlier recordings (ORI-1) do not count. */
type RecordingPlayer = Pick<Player, 'showerChains'> & { radioMeteorClassifications?: Record<string, { submittedAt?: number }> }

export function chainRecordings(player: RecordingPlayer, chain: TwoStepChain): number {
  const state = player.showerChains?.[chain.eventId]
  if (!state || chainStage(player, chain.eventId) < 1) return 0
  return Object.values(player.radioMeteorClassifications ?? {}).filter(record => typeof record?.submittedAt === 'number' && record.submittedAt >= state.at).length
}

function withStage<T extends TwoStepPlayer>(player: T, eventId: string, stage: number, at: number): T {
  return { ...player, showerChains: { ...(player.showerChains ?? {}), [eventId]: { stage, at } } }
}

/** The shower run is home: mission 1 is done and LEO-1 is open. No badge yet. Returns the same player when nothing changes. */
export function completeChainRun<T extends TwoStepPlayer>(player: T, chain: TwoStepChain, at: number): T {
  return chainStage(player, chain.eventId) >= 1 ? player : withStage(player, chain.eventId, 1, at)
}

/** After a recording is checked: with enough recordings since the run, mission 2 completes and the badge is graded now. */
export function completeChainRadio<T extends TwoStepPlayer>(player: T, chain: TwoStepChain, at: number): { player: T; completed: boolean } {
  if (chainStage(player, chain.eventId) !== 1 || chainRecordings(player, chain) < chain.radioTarget) return { player, completed: false }
  const staged = withStage(player, chain.eventId, 2, at)
  return { player: badgeTierFor(chain.eventId, at) ? grantBadge(staged, chain.eventId, at) : staged, completed: true }
}

/** The chained shower whose window is open now, if any. */
export function liveShowerChain(now: number): TwoStepChain | undefined {
  return SHOWER_CHAINS.find(chain => badgeTierFor(chain.eventId, now) === 'gold')
}

/** Where the event step's GO leads for a chained shower: its run on the Events board, or its receiver once the run is home. */
export function chainNextScreen(player: Pick<Player, 'showerChains'>, chain: TwoStepChain): 'events' | 'radio-meteors' {
  return chainStage(player, chain.eventId) >= 1 ? 'radio-meteors' : 'events'
}

/** The shower whose receiver the radio desk is tuned to: the latest chain the player has reached LEO-1 in, else the Orionids. */
export function receiverEventId(player: Pick<Player, 'showerChains'>): string {
  return [...SHOWER_CHAINS].reverse().find(chain => chainStage(player, chain.eventId) >= 1)?.eventId ?? ORIONIDS_CHAIN.eventId
}

/** Community research's event step for a chained shower, naming the player's next mission. */
export function chainResearchStep(player: RecordingPlayer, chain: TwoStepChain): { title: string; brief: string } {
  const name = getShower(chain.eventId)?.name ?? 'Shower'
  // A non-breaking hyphen keeps LEO-1 on one line in the step title.
  const callsign = chainInstrument(chain).callsign.replace('-', '‑')
  const stage = chainStage(player, chain.eventId)
  if (stage === 0) return { title: `${name}: fly the shower run`, brief: `Mission 1 of 2. Fly into the ${name} and catch 20 fragments. Bringing them home launches ${callsign} for everyone.` }
  if (stage === 1) {
    const left = Math.max(0, chain.radioTarget - chainRecordings(player, chain))
    return { title: `${name}: check ${chain.radioTarget} recordings on ${callsign}`, brief: `Mission 2 of 2. ${callsign} is listening. Box the meteor echoes on ${left} more recording${left === 1 ? '' : 's'} to confirm the shower and earn the badge.` }
  }
  return { title: `${name}: confirmed by radio`, brief: `Both missions are done. ${callsign} is still listening: every recording you check fills the shared bar.` }
}

/** Merge two saves' chains. Stages only move up; the earlier time wins at the same stage. */
export function mergeShowerChains(
  current: Record<string, { stage: number; at: number }> | undefined,
  remote: Record<string, { stage: number; at: number }> | undefined,
): Record<string, { stage: number; at: number }> | undefined {
  const ids = new Set([...Object.keys(current ?? {}), ...Object.keys(remote ?? {})])
  if (ids.size === 0) return undefined
  return Object.fromEntries([...ids].map(id => {
    const a = current?.[id]
    const b = remote?.[id]
    if (!a || !b) return [id, (a ?? b)!]
    if (a.stage !== b.stage) return [id, a.stage > b.stage ? a : b]
    return [id, a.at <= b.at ? a : b]
  }))
}
