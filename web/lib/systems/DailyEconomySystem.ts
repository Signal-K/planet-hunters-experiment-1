/**
 * The authoritative, once-per-AEST-day client and commodity cycle.
 *
 * This module is intentionally pure.  The scheduler owns persistence: it must
 * load the last published snapshot and the immutable build-completion events,
 * call `resolveDailyEconomy`, then atomically persist the returned snapshot
 * with `idempotencyKey` as its unique key.  Keeping the transition here makes
 * the daily result reproducible, auditable, and safe to retry.
 */

export const DAILY_ECONOMY_SCHEMA_VERSION = 1
export const CLIENT_EXPERIENCE_PER_LEVEL = 5
export const DAILY_PRICE_MIN_MULTIPLIER = 0.85
export const DAILY_PRICE_MAX_MULTIPLIER = 1.18

const MAX_CLIENT_BUILDS_PER_DAY = 6
const DEMAND_PRICE_IMPACT = 0.12
const DAILY_MARKET_VARIATION = 0.04

export type DateKey = `${number}-${number}-${number}`
export type MaterialKind = 'raw' | 'refined'

/** An immutable event emitted only when a player-built client structure is completed. */
export interface ClientBuildCompletionEvent {
  eventId: string
  clientId: string
  /** AEST calendar date on which the build completed. */
  completedOn: DateKey
  kind: 'player-built-client-work'
}

export interface ClientDemandMaterial {
  materialId: string
  /** Positive units required for each planned construction build. */
  unitsPerBuild: number
}

export interface DailyEconomyClient {
  id: string
  name: string
  /** Persisted experience before this daily run. */
  experience: number
  /** Materials this client needs when it plans its next construction work. */
  demandProfile: readonly ClientDemandMaterial[]
}

export interface DailyEconomyMaterial {
  id: string
  name: string
  kind: MaterialKind
  referencePrice: number
}

export interface DailyClientDemand {
  clientId: string
  clientName: string
  plannedBuilds: number
  materials: Readonly<Record<string, number>>
}

export interface DailyClientUpdate {
  clientId: string
  clientName: string
  experienceBefore: number
  experienceAwarded: number
  experienceAfter: number
  levelBefore: number
  levelAfter: number
  nextDayDemand: DailyClientDemand
}

export interface DailyPriceQuote {
  materialId: string
  materialName: string
  kind: MaterialKind
  referencePrice: number
  price: number
  multiplier: number
  demandUnits: number
  demandClientIds: readonly string[]
  /** Short, player-facing reason suitable for a market row. */
  explanation: string
}

export interface DailyEconomySnapshot {
  schemaVersion: typeof DAILY_ECONOMY_SCHEMA_VERSION
  snapshotDate: DateKey
  /** A unique, durable key: persistence must reject duplicate inserts. */
  idempotencyKey: string
  /** Events after this date (exclusive) were considered by this run. */
  processedWorkAfterDate: DateKey | null
  /** Events on or before this AEST date were considered by this run. */
  processedWorkThroughDate: DateKey
  completedBuildEventIds: readonly string[]
  clients: readonly DailyClientUpdate[]
  prices: Readonly<Record<string, DailyPriceQuote>>
}

export interface DailyEconomyInput {
  /** The AEST date whose prices and client work agenda are being published. */
  snapshotDate: DateKey
  clients: readonly DailyEconomyClient[]
  materials: readonly DailyEconomyMaterial[]
  completedBuildEvents: readonly ClientBuildCompletionEvent[]
  /** The last successfully published snapshot, if one exists. */
  publishedSnapshot?: DailyEconomySnapshot
}

/** Stable AEST (UTC+10, no daylight shift) date key for a scheduler run. */
export function aestDateKey(now: Date = new Date()): DateKey {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Brisbane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const field = (type: Intl.DateTimeFormatPartTypes): string => parts.find(part => part.type === type)?.value ?? ''
  return `${field('year')}-${field('month')}-${field('day')}` as DateKey
}

export function previousDateKey(dateKey: DateKey): DateKey {
  assertDateKey(dateKey, 'dateKey')
  const [year, month, day] = dateKey.split('-').map(Number)
  const previous = new Date(Date.UTC(year, month - 1, day - 1))
  return previous.toISOString().slice(0, 10) as DateKey
}

export function clientLevel(experience: number): number {
  if (!Number.isSafeInteger(experience) || experience < 0) {
    throw new Error('Client experience must be a non-negative safe integer.')
  }
  return 1 + Math.floor(experience / CLIENT_EXPERIENCE_PER_LEVEL)
}

/**
 * Produce the next immutable daily snapshot. Repeating a successfully
 * published date returns that existing snapshot unchanged, so retries cannot
 * grant client experience twice or publish a second price board.
 */
export function resolveDailyEconomy(input: DailyEconomyInput): DailyEconomySnapshot {
  assertDateKey(input.snapshotDate, 'snapshotDate')
  const idempotencyKey = dailyEconomyIdempotencyKey(input.snapshotDate)
  const published = input.publishedSnapshot
  if (published?.idempotencyKey === idempotencyKey) return published
  if (published) {
    assertDateKey(published.snapshotDate, 'publishedSnapshot.snapshotDate')
    if (published.snapshotDate >= input.snapshotDate) {
      throw new Error(`Cannot publish ${input.snapshotDate}; ${published.snapshotDate} is already the latest snapshot.`)
    }
  }

  const clients = indexUnique(input.clients, client => client.id, 'client')
  const materials = indexUnique(input.materials, material => material.id, 'material')
  validateClients(input.clients, materials)
  validateEvents(input.completedBuildEvents, clients)

  const processedWorkThroughDate = previousDateKey(input.snapshotDate)
  const processedWorkAfterDate = published?.processedWorkThroughDate ?? null
  const completedBuildEvents = input.completedBuildEvents
    .filter(event => event.completedOn <= processedWorkThroughDate && (processedWorkAfterDate == null || event.completedOn > processedWorkAfterDate))
    .sort((left, right) => left.eventId.localeCompare(right.eventId))
  const completedByClient = new Map<string, number>()
  for (const event of completedBuildEvents) {
    completedByClient.set(event.clientId, (completedByClient.get(event.clientId) ?? 0) + 1)
  }

  const clientUpdates = input.clients
    .map(client => createClientUpdate(client, completedByClient.get(client.id) ?? 0, input.snapshotDate))
    .sort((left, right) => left.clientId.localeCompare(right.clientId))
  const prices = deriveDailyPrices(input.snapshotDate, input.materials, clientUpdates)

  return {
    schemaVersion: DAILY_ECONOMY_SCHEMA_VERSION,
    snapshotDate: input.snapshotDate,
    idempotencyKey,
    processedWorkAfterDate,
    processedWorkThroughDate,
    completedBuildEventIds: completedBuildEvents.map(event => event.eventId),
    clients: clientUpdates,
    prices,
  }
}

export function dailyEconomyIdempotencyKey(snapshotDate: DateKey): string {
  assertDateKey(snapshotDate, 'snapshotDate')
  return `daily-economy:${snapshotDate}`
}

function createClientUpdate(client: DailyEconomyClient, completedBuilds: number, snapshotDate: DateKey): DailyClientUpdate {
  const experienceBefore = client.experience
  const experienceAfter = experienceBefore + completedBuilds
  const levelBefore = clientLevel(experienceBefore)
  const levelAfter = clientLevel(experienceAfter)
  return {
    clientId: client.id,
    clientName: client.name,
    experienceBefore,
    experienceAwarded: completedBuilds,
    experienceAfter,
    levelBefore,
    levelAfter,
    nextDayDemand: deriveClientDemand(client, levelAfter, snapshotDate),
  }
}

function deriveClientDemand(client: DailyEconomyClient, level: number, snapshotDate: DateKey): DailyClientDemand {
  // A level adds capacity every two levels; a one-build deterministic variation
  // avoids every client requesting the exact same bundle each morning.
  const levelCapacity = Math.floor((level - 1) / 2)
  const dailyVariation = seededUnit(`${snapshotDate}:${client.id}:builds`) < 0.5 ? 0 : 1
  const plannedBuilds = Math.min(MAX_CLIENT_BUILDS_PER_DAY, 1 + levelCapacity + dailyVariation)
  const materials = Object.fromEntries(client.demandProfile.map(material => [material.materialId, material.unitsPerBuild * plannedBuilds]))
  return { clientId: client.id, clientName: client.name, plannedBuilds, materials }
}

function deriveDailyPrices(
  snapshotDate: DateKey,
  materials: readonly DailyEconomyMaterial[],
  clients: readonly DailyClientUpdate[],
): Record<string, DailyPriceQuote> {
  const demandByMaterial = new Map<string, { units: number; clientIds: string[]; plannedBuilds: number }>()
  for (const client of clients) {
    for (const [materialId, units] of Object.entries(client.nextDayDemand.materials)) {
      const current = demandByMaterial.get(materialId) ?? { units: 0, clientIds: [], plannedBuilds: 0 }
      current.units += units
      current.clientIds.push(client.clientId)
      current.plannedBuilds += client.nextDayDemand.plannedBuilds
      demandByMaterial.set(materialId, current)
    }
  }
  const peakDemand = Math.max(0, ...[...demandByMaterial.values()].map(demand => demand.units))
  return Object.fromEntries(materials.map(material => {
    const demand = demandByMaterial.get(material.id) ?? { units: 0, clientIds: [], plannedBuilds: 0 }
    const demandImpact = peakDemand === 0 ? 0 : (demand.units / peakDemand) * DEMAND_PRICE_IMPACT
    const variation = (seededUnit(`${snapshotDate}:${material.id}:market`) * 2 - 1) * DAILY_MARKET_VARIATION
    const multiplier = clamp(1 + demandImpact + variation, DAILY_PRICE_MIN_MULTIPLIER, DAILY_PRICE_MAX_MULTIPLIER)
    const price = Math.max(1, Math.round(material.referencePrice * multiplier))
    return [material.id, {
      materialId: material.id,
      materialName: material.name,
      kind: material.kind,
      referencePrice: material.referencePrice,
      price,
      multiplier: round(multiplier, 4),
      demandUnits: demand.units,
      demandClientIds: [...demand.clientIds].sort(),
      explanation: priceExplanation(material.name, demand, clients),
    }]
  }))
}

function priceExplanation(
  materialName: string,
  demand: { units: number; clientIds: readonly string[]; plannedBuilds: number },
  clients: readonly DailyClientUpdate[],
): string {
  if (demand.clientIds.length === 0) return `No client construction demand for ${materialName} today.`
  const names = demand.clientIds
    .map(clientId => clients.find(client => client.clientId === clientId)?.clientName ?? clientId)
    .sort()
  if (names.length === 1) {
    return `${names[0]} plans ${demand.plannedBuilds} build${demand.plannedBuilds === 1 ? '' : 's'} using ${materialName}.`
  }
  return `${names.length} clients plan ${demand.plannedBuilds} builds using ${materialName}.`
}

function validateClients(clients: readonly DailyEconomyClient[], materials: ReadonlyMap<string, DailyEconomyMaterial>): void {
  for (const client of clients) {
    if (!client.name.trim()) throw new Error(`Client ${client.id} needs a name.`)
    clientLevel(client.experience)
    if (client.demandProfile.length === 0) throw new Error(`Client ${client.id} needs a construction-demand profile.`)
    const profileMaterials = new Set<string>()
    for (const demand of client.demandProfile) {
      if (!materials.has(demand.materialId)) throw new Error(`Client ${client.id} references unknown material ${demand.materialId}.`)
      if (profileMaterials.has(demand.materialId)) throw new Error(`Client ${client.id} repeats material ${demand.materialId}.`)
      profileMaterials.add(demand.materialId)
      if (!Number.isSafeInteger(demand.unitsPerBuild) || demand.unitsPerBuild <= 0) {
        throw new Error(`Client ${client.id} has an invalid unitsPerBuild for ${demand.materialId}.`)
      }
    }
  }
  for (const material of materials.values()) {
    if (!material.name.trim()) throw new Error(`Material ${material.id} needs a name.`)
    if (!Number.isSafeInteger(material.referencePrice) || material.referencePrice <= 0) {
      throw new Error(`Material ${material.id} needs a positive integer referencePrice.`)
    }
  }
}

function validateEvents(events: readonly ClientBuildCompletionEvent[], clients: ReadonlyMap<string, DailyEconomyClient>): void {
  const ids = new Set<string>()
  for (const event of events) {
    if (!event.eventId.trim()) throw new Error('Build completion events need immutable event IDs.')
    if (ids.has(event.eventId)) throw new Error(`Duplicate build completion event ${event.eventId}.`)
    ids.add(event.eventId)
    assertDateKey(event.completedOn, `build event ${event.eventId} completedOn`)
    if (event.kind !== 'player-built-client-work') throw new Error(`Build event ${event.eventId} is not player-built client work.`)
    if (!clients.has(event.clientId)) throw new Error(`Build event ${event.eventId} references unknown client ${event.clientId}.`)
  }
}

function indexUnique<T>(items: readonly T[], keyFor: (item: T) => string, label: string): Map<string, T> {
  const indexed = new Map<string, T>()
  for (const item of items) {
    const key = keyFor(item)
    if (!key.trim()) throw new Error(`${label} IDs cannot be empty.`)
    if (indexed.has(key)) throw new Error(`Duplicate ${label} ${key}.`)
    indexed.set(key, item)
  }
  return indexed
}

function assertDateKey(value: string, label: string): asserts value is DateKey {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must be an ISO calendar date.`)
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${label} is not a real calendar date.`)
  }
}

function seededUnit(seed: string): number {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 0x1_0000_0000
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, places: number): number {
  const multiplier = 10 ** places
  return Math.round(value * multiplier) / multiplier
}
