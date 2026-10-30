/**
 * Builds the scheduler's DailyEconomyInput from the game's own catalogs plus
 * what production already stores: every player's recorded client-build
 * events and the last published snapshot. Pure, so the daily job stays
 * reproducible from the same records.
 */

import { CLIENT_SLOTS } from '../data/clients.ts'
import { MINERAL_META, isArtifactMineralId } from '../data/minerals.ts'
import type {
  ClientBuildCompletionEvent,
  DailyEconomyClient,
  DailyEconomyInput,
  DailyEconomyMaterial,
  DailyEconomySnapshot,
  DateKey,
} from './DailyEconomySystem.ts'

// Rarer ore is needed in smaller quantities per build, so one completed build
// moves a rare price about as much as a common one.
const UNITS_PER_BUILD_BY_RARITY: Record<string, number> = { common: 3, uncommon: 2, rare: 1, exotic: 1 }

export function dailyEconomyMaterials(): DailyEconomyMaterial[] {
  return Object.entries(MINERAL_META)
    .filter(([id]) => !isArtifactMineralId(id))
    .map(([id, meta]) => ({ id, name: meta.name, kind: 'raw' as const, referencePrice: meta.price }))
}

export function dailyEconomyClients(publishedSnapshot?: DailyEconomySnapshot): DailyEconomyClient[] {
  const materials = new Set(dailyEconomyMaterials().map(material => material.id))
  return CLIENT_SLOTS.map(slot => ({
    id: slot.id,
    name: slot.name,
    // Experience carries forward only through the published snapshot, which
    // is the single durable record of each client's progress.
    experience: publishedSnapshot?.clients.find(client => client.clientId === slot.id)?.experienceAfter ?? 0,
    demandProfile: slot.mineralPreferences
      .filter(materialId => materials.has(materialId))
      .map(materialId => ({ materialId, unitsPerBuild: UNITS_PER_BUILD_BY_RARITY[MINERAL_META[materialId].rarity] ?? 1 })),
  }))
}

/** Collects unique, well-formed build events for known clients from saved game states. */
export function collectClientBuildEvents(savedStates: readonly unknown[]): ClientBuildCompletionEvent[] {
  const clientIds = new Set(CLIENT_SLOTS.map(slot => slot.id))
  const byId = new Map<string, ClientBuildCompletionEvent>()
  for (const state of savedStates) {
    const events = (state as { player?: { clientBuildEvents?: unknown } } | null)?.player?.clientBuildEvents
    if (!Array.isArray(events)) continue
    for (const event of events as Partial<ClientBuildCompletionEvent>[]) {
      if (
        typeof event?.eventId !== 'string' || !event.eventId.trim()
        || typeof event.clientId !== 'string' || !clientIds.has(event.clientId)
        || typeof event.completedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(event.completedOn)
        || event.kind !== 'player-built-client-work'
      ) continue
      if (!byId.has(event.eventId)) byId.set(event.eventId, event as ClientBuildCompletionEvent)
    }
  }
  return [...byId.values()].sort((left, right) => left.eventId.localeCompare(right.eventId))
}

export function buildDailyEconomyInput(options: {
  snapshotDate: DateKey
  savedStates: readonly unknown[]
  publishedSnapshot?: DailyEconomySnapshot
}): DailyEconomyInput {
  return {
    snapshotDate: options.snapshotDate,
    clients: dailyEconomyClients(options.publishedSnapshot),
    materials: dailyEconomyMaterials(),
    completedBuildEvents: collectClientBuildEvents(options.savedStates),
    publishedSnapshot: options.publishedSnapshot,
  }
}
