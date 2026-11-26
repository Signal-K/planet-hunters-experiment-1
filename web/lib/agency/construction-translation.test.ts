import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE, mergeRemoteState, normalizeAndRepair } from '@/lib/game-state'
import { agencyLevel, constructionUnlocks, mergeAgencyLevels, mergeAgencyUnlocks, translateConstruction } from './construction-translation'
import { exchangeSaleBonus } from '@/lib/data/building-levels'
import { rocketPrice } from '@/lib/rockets'
import { sellUnitPrice, storageCapacity } from '@/lib/systems/EconomySystem'

const fresh = () => ({ ...structuredClone(DEFAULT_STATE), player: { ...structuredClone(DEFAULT_STATE.player), placed: [] as string[] } })

describe('SSL-889 construction translation', () => {
  it('turns standing buildings into agency unlocks without touching progress', () => {
    const s = fresh()
    s.player.placed = ['launchpad', 'surface-silo', 'market', 'control-station']
    s.player.buildingLevels = { launchpad: 3 }
    s.player.stash = { iron: 7 }
    s.player.remoteStorage = { eros: { nickel: 2 } }
    const t = translateConstruction(s)
    expect(t.player.agencyUnlocks).toEqual(['launch', 'heavy-hulls', 'bulk-hulls', 'ore-storage', 'exchange', 'data-hub', 'remote-storage'])
    const { agencyUnlocks, agencyLevels, ...rest } = t.player
    expect(rest).toEqual(s.player)
    expect(s.player.agencyUnlocks).toBeUndefined()
  })

  it('reads the legacy flags: launchpadUpgraded and the retired controlBuilt', () => {
    const s = fresh()
    s.player.placed = ['launchpad']
    s.player.launchpadUpgraded = true
    s.player.controlBuilt = true
    expect(constructionUnlocks(s.player)).toEqual(['launch', 'heavy-hulls', 'data-hub'])
  })

  it('leaves an in-flight job alone and grants its unlock only once it completes', () => {
    const s = fresh()
    s.player.placed = ['launchpad', 'market']
    s.player.underConstruction = { market: 123 }
    const early = translateConstruction(s)
    expect(early.player.agencyUnlocks).toEqual(['launch'])
    expect(early.player.underConstruction).toEqual({ market: 123 })
    const done = translateConstruction({ ...early, player: { ...early.player, underConstruction: {} } })
    expect(done.player.agencyUnlocks).toEqual(['launch', 'exchange'])
  })

  it('is idempotent and never takes an unlock away', () => {
    const s = fresh()
    s.player.placed = ['launchpad']
    const once = translateConstruction(s)
    expect(translateConstruction(once)).toBe(once)
    const removed = translateConstruction({ ...once, player: { ...once.player, placed: [] } })
    expect(removed.player.agencyUnlocks).toEqual(['launch'])
  })

  it('merges across devices and reloads through normalizeAndRepair', () => {
    expect(mergeAgencyUnlocks(['exchange', 'zeta'], ['launch'])).toEqual(['launch', 'exchange', 'zeta'])
    const a = fresh(); a.player.placed = ['launchpad']
    const b = fresh(); b.player.placed = ['market']
    const merged = mergeRemoteState(translateConstruction(a), translateConstruction(b))
    expect(merged.player.agencyUnlocks).toEqual(expect.arrayContaining(['launch', 'exchange']))
    const reloaded = normalizeAndRepair(JSON.parse(JSON.stringify(merged)))
    expect(reloaded.player.agencyUnlocks).toEqual(merged.player.agencyUnlocks)
  })
})

describe('SSL-892 agency levels', () => {
  const upgraded = () => {
    const s = fresh()
    s.player.placed = ['launchpad', 'surface-silo', 'market', 'hangar', 'control-station']
    s.player.buildingLevels = { launchpad: 3, 'surface-silo': 3, market: 2, hangar: 3, 'control-station': 2 }
    return s
  }

  it('records each earned level and leaves the building data alone', () => {
    const s = upgraded()
    const t = translateConstruction(s)
    expect(t.player.agencyLevels).toEqual({ launch: 3, 'ore-storage': 3, exchange: 2, 'rocket-discounts': 3, 'data-hub': 2 })
    expect(t.player.buildingLevels).toEqual(s.player.buildingLevels)
    expect(t.player.placed).toEqual(s.player.placed)
  })

  it('keeps level effects when the buildings are no longer placed', () => {
    const before = upgraded().player
    const after = translateConstruction(upgraded()).player
    const gone = { ...after, placed: [] as string[] }
    expect(storageCapacity({ ...gone, subsurfaceBuilt: [] })).toBe(storageCapacity({ ...before, subsurfaceBuilt: [] }))
    expect(rocketPrice({ costFrancs: 1000 }, gone as never)).toBe(rocketPrice({ costFrancs: 1000 }, before as never))
    expect(agencyLevel(gone, 'exchange')).toBe(2)
    expect(exchangeSaleBonus(agencyLevel(gone, 'exchange'))).toBe(0.03)
    const sale = (p: typeof before) => sellUnitPrice('iron', p as never, undefined, 0).price
    expect(sale(gone)).toBe(sale(before))
  })

  it('gives an untranslated save exactly the effect it had', () => {
    const p = upgraded().player
    expect(p.agencyLevels).toBeUndefined()
    expect(agencyLevel(p, 'ore-storage')).toBe(3)
    expect(agencyLevel(fresh().player, 'exchange')).toBe(0)
  })

  it('only grows: a lower or stale level never wins in a merge', () => {
    expect(mergeAgencyLevels({ exchange: 3 }, { exchange: 1, launch: 2 })).toEqual({ exchange: 3, launch: 2 })
    expect(mergeAgencyLevels({ exchange: 9, nope: 2 } as never, undefined)).toEqual({ exchange: 3 })
    const local = translateConstruction(upgraded())
    const remote = fresh()
    remote.player.agencyLevels = { exchange: 3 }
    const merged = mergeRemoteState(local, remote)
    expect(merged.player.agencyLevels?.exchange).toBe(3)
    expect(merged.player.agencyLevels?.['ore-storage']).toBe(3)
  })

  it('survives normalize on reload', () => {
    const once = normalizeAndRepair(translateConstruction(upgraded()))
    expect(once.player.agencyLevels?.launch).toBe(3)
    expect(normalizeAndRepair(once).player.agencyLevels).toEqual(once.player.agencyLevels)
  })
})

describe('SSL-892 probe pace', () => {
  it('keeps the control station level pace with nothing placed', async () => {
    const { placeProbe } = await import('@/lib/probes/survey-probe')
    const s = fresh()
    s.player.agencyLevels = { 'data-hub': 3 }
    s.player.placed = []
    const probe = placeProbe(s.player, 'moon', 0).probes?.moon
    expect(probe?.sectorMs).toBe(3_600_000)
  })
})
