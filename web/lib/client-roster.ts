import type { Client } from '@/lib/data/types'
import { CLIENT_AFFINITY_MISSION_THRESHOLD, MAX_AFFINITY_BONUS, clientAffinityBonus } from '@/lib/data/clients'
import { clientAffinityLevel } from '@/lib/data/daily-client-missions'

/**
 * SSL-730: the mission board's Clients tab. Every client with your standing: level, jobs toward the next level,
 * and what affinity is worth on their payouts. A client is "met" once you have worked for them or they have an
 * offer on the board now; everyone else is listed as not met yet.
 */
export interface ClientStanding {
  client: Client
  jobs: number
  level: number
  /** Jobs done inside the current level, 0..CLIENT_AFFINITY_MISSION_THRESHOLD-1. */
  jobsInLevel: number
  jobsPerLevel: number
  /** Affinity bonus on payouts now, 0..MAX_AFFINITY_BONUS. */
  bonus: number
  bonusMaxed: boolean
  met: boolean
  offers: number
}

export function clientStanding(client: Client, jobs: number, offers = 0): ClientStanding {
  const done = Math.max(0, jobs)
  const bonus = clientAffinityBonus(client, done)
  return {
    client,
    jobs: done,
    level: clientAffinityLevel(done),
    jobsInLevel: done % CLIENT_AFFINITY_MISSION_THRESHOLD,
    jobsPerLevel: CLIENT_AFFINITY_MISSION_THRESHOLD,
    bonus,
    bonusMaxed: bonus >= MAX_AFFINITY_BONUS,
    met: done > 0 || offers > 0,
    offers,
  }
}

/** Unnamed catalogue slots ("Client Slot 04B", `contractor-04b`) are reserved for future clients, not companies yet. */
export function isPlaceholderClient(client: Pick<Client, 'id' | 'name'>): boolean {
  return client.id.startsWith('contractor-') || /^client slot\b/i.test(client.name)
}

/** Met clients first (most jobs, then most offers), then the rest in unlock order. Placeholder slots stay off the list. */
export function clientRoster(clients: readonly Client[], clientMissions: Record<string, number>, offeredClientIds: readonly string[]): ClientStanding[] {
  const offerCount = new Map<string, number>()
  for (const id of offeredClientIds) offerCount.set(id, (offerCount.get(id) ?? 0) + 1)
  return clients
    .filter(client => !isPlaceholderClient(client) || (clientMissions[client.id] ?? 0) > 0 || offerCount.has(client.id))
    .map(client => clientStanding(client, clientMissions[client.id] ?? 0, offerCount.get(client.id) ?? 0))
    .sort((a, b) => Number(b.met) - Number(a.met) || b.jobs - a.jobs || b.offers - a.offers || a.client.unlockTier - b.client.unlockTier)
}
