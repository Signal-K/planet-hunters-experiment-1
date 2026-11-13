import type PocketBase from 'pocketbase'
import type { GameState } from './game-types'
import { deviceId } from './sync/deviceId'
import { ledgerValues, stampLedger } from './sync/ledger'

export interface LegacyMineral { id: string; mineralType: string; quantity: number }
export interface LegacyLink { id: string; anomalyId: number; automaton: string; date: string }
export interface LegacyProgress { minerals: LegacyMineral[]; links: LegacyLink[] }
export interface LegacyBody { anomalyId: number; rover: boolean }

/** Read only the player's legacy rows, including links hidden by Garden's UI. */
export async function readLegacyProgress(pb: PocketBase, userId: string): Promise<LegacyProgress> {
  async function pages<T>(collection: string, owner: string, fields: string): Promise<T[]> {
    const rows: T[] = []
    for (let page = 1; ; page++) {
      const result = await pb.collection(collection).getList(page, 100, {
        filter: pb.filter(`${owner} = {:user}`, { user: userId }),
        fields, sort: 'id', requestKey: null,
      })
      rows.push(...result.items as unknown as T[])
      if (page >= result.totalPages) return rows
    }
  }
  const [minerals, links] = await Promise.all([
    pages<LegacyMineral>('user_mineral_inventory', 'userId', 'id,mineralType,quantity'),
    pages<LegacyLink>('linked_anomalies', 'author', 'id,anomalyId,automaton,date'),
  ])
  const data = { minerals, links }
  validateLegacyProgress(data)
  return data
}

function validateLegacyProgress(data: LegacyProgress): void {
  for (const row of data.minerals) {
    if (!row.id || typeof row.mineralType !== 'string' || !row.mineralType.trim() || !Number.isFinite(row.quantity) || row.quantity < 0) throw new Error('Invalid legacy mineral row')
  }
  for (const row of data.links) {
    if (!row.id || !Number.isSafeInteger(row.anomalyId) || row.anomalyId <= 0) throw new Error('Invalid legacy anomaly row')
  }
}

/** Immutable source-row contributors make concurrent imports merge without
 * double credit. Receipt and credits share one save. Retain unknown minerals
 * and anomaly IDs without inventing modern gameplay destinations. */
export function importLegacyProgress(state: GameState, data: LegacyProgress): GameState {
  if (state.player.legacyProgressImported) return state
  validateLegacyProgress(data)
  const stamped = stampLedger(state, deviceId())
  const ledger = stamped.syncLedger!
  const devices = { ...ledger.devices }
  for (const row of data.minerals) {
    const mineral = typeof row.mineralType === 'string' ? row.mineralType.trim().toLowerCase() : ''
    devices[`legacy-mineral:${row.id}`] ??= { seq: 1, plus: { [`stash.${mineral}`]: row.quantity }, minus: {} }
  }
  const bodies = { ...state.player.legacyDiscoveredBodies }
  const rovers = [...(state.player.roverDeployments ?? [])]
  const seen = new Set(state.player.seen_planets ?? [])
  for (const row of data.links) {
    const targetId = `legacy-anomaly-${row.anomalyId}`
    const rover = row.automaton === 'Rover'
    bodies[targetId] = { anomalyId: row.anomalyId, rover: rover || !!bodies[targetId]?.rover }
    seen.add(targetId)
    if (rover && !rovers.some(r => r.roverId === `legacy-rover-${row.id}`)) {
      const date = Date.parse(row.date)
      rovers.push({ roverId: `legacy-rover-${row.id}`, targetId, clientId: '', timestamp: Number.isFinite(date) ? date : 0 })
    }
  }
  const syncLedger = { ...ledger, devices }
  const stash = { ...state.player.stash }
  for (const [key, value] of Object.entries(ledgerValues(syncLedger))) {
    if (key.startsWith('stash.')) stash[key.slice(6)] = Math.max(0, Math.round(value))
  }
  return { ...stamped, syncLedger, player: { ...state.player, stash, legacyProgressImported: true,
    legacyDiscoveredBodies: bodies, seen_planets: [...seen], roverDeployments: rovers } }
}
