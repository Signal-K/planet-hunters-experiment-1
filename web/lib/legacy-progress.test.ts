import { describe, expect, it, vi } from 'vitest'
import type PocketBase from 'pocketbase'
import { DEFAULT_STATE, mergeRemoteState } from './game-state'
import { importLegacyProgress, readLegacyProgress, type LegacyProgress } from './legacy-progress'
import { stampLedger } from './sync/ledger'

const data: LegacyProgress = {
  minerals: [{ id: 'ore1', mineralType: 'Iron', quantity: 12 }, { id: 'ore2', mineralType: 'old-ore', quantity: 3 }],
  links: [
    { id: 'link1', anomalyId: 42, automaton: 'Telescope', date: '' },
    { id: 'link2', anomalyId: 42, automaton: 'Rover', date: '2024-01-01' },
  ],
}
const fresh = () => structuredClone(DEFAULT_STATE)

describe('SSL-781 legacy import', () => {
  it('adds Earth stock, preserves unknown minerals, deduplicates discoveries and keeps rovers on site', () => {
    const start = fresh()
    start.player.stash = { iron: 2 }
    const imported = importLegacyProgress(start, data)
    expect(imported.player.stash).toMatchObject({ iron: 14, 'old-ore': 3 })
    expect(imported.player.seen_planets).toEqual(['legacy-anomaly-42'])
    expect(imported.player.legacyDiscoveredBodies).toEqual({ 'legacy-anomaly-42': { anomalyId: 42, rover: true } })
    expect(imported.player.roverDeployments).toHaveLength(1)
    expect(importLegacyProgress(imported, data)).toBe(imported)
    expect(start.player.legacyProgressImported).toBeUndefined()
  })
  it('does not duplicate stock across devices or restore spent imported stock on replay', () => {
    const a = importLegacyProgress(fresh(), data)
    const b = importLegacyProgress(fresh(), data)
    const merged = mergeRemoteState(a, b)
    expect(merged.player.stash?.iron).toBe(12)
    const spent = stampLedger({ ...merged, player: { ...merged.player, stash: { ...merged.player.stash, iron: 4 } } }, 'spender')
    const replay = mergeRemoteState(spent, b)
    expect(replay.player.stash?.iron).toBe(4)
    expect(replay.player.legacyProgressImported).toBe(true)
    expect(replay.player.roverDeployments).toHaveLength(1)
    expect(mergeRemoteState(b, spent).player.stash?.iron).toBe(4)
  })
  it('keeps completion and discoveries when merging a stale pre-import save', () => {
    const stale = fresh()
    stale.player.missionsDone = 20
    const merged = mergeRemoteState(importLegacyProgress(fresh(), data), stale)
    expect(merged.player.legacyProgressImported).toBe(true)
    expect(merged.player.legacyDiscoveredBodies?.['legacy-anomaly-42'].rover).toBe(true)
  })
  it('preserves repeated modern rover deployments across different sites', () => {
    const start = fresh()
    start.player.roverDeployments = [
      { roverId: 'rover', targetId: 'mars', clientId: 'client', timestamp: 1 },
      { roverId: 'rover', targetId: 'moon', clientId: 'client', timestamp: 2 },
    ]
    const imported = importLegacyProgress(start, data)
    expect(mergeRemoteState(imported, start).player.roverDeployments).toHaveLength(3)
  })
  it('leaves invalid imports retryable and completes empty accounts', () => {
    const start = fresh()
    expect(() => importLegacyProgress(start, { ...data, links: [{ ...data.links[0], anomalyId: NaN }] })).toThrow()
    expect(start.player.legacyProgressImported).toBeUndefined()
    expect(importLegacyProgress(start, { minerals: [], links: [] }).player.legacyProgressImported).toBe(true)
  })
  it('pages only the two source collections with projected fields and owner filters', async () => {
    const getList = vi.fn(async (page: number, perPage: number, options: unknown) => ({ items: [], totalPages: 2 }))
    const collection = vi.fn((name: string) => ({ getList }))
    const filter = vi.fn((expr, params) => expr.replace('{:user}', params.user))
    await readLegacyProgress({ collection, filter } as unknown as PocketBase, 'player1')
    expect(collection.mock.calls.map(call => call[0])).toEqual(expect.arrayContaining(['user_mineral_inventory', 'linked_anomalies']))
    expect(getList).toHaveBeenCalledTimes(4)
    for (const call of getList.mock.calls) expect(call[1]).toBe(100)
    expect(getList).toHaveBeenCalledWith(2, 100, expect.objectContaining({ fields: 'id,mineralType,quantity', filter: 'userId = player1' }))
  })
})
