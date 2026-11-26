import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE, mergeRemoteState, normalizeAndRepair } from '@/lib/game-state'
import { constructionUnlocks, mergeAgencyUnlocks, translateConstruction } from './construction-translation'

const fresh = () => structuredClone(DEFAULT_STATE)

describe('SSL-889 construction translation', () => {
  it('turns standing buildings into agency unlocks without touching progress', () => {
    const s = fresh()
    s.player.placed = ['launchpad', 'surface-silo', 'market', 'control-station']
    s.player.buildingLevels = { launchpad: 3 }
    s.player.stash = { iron: 7 }
    s.player.remoteStorage = { eros: { nickel: 2 } }
    const t = translateConstruction(s)
    expect(t.player.agencyUnlocks).toEqual(['launch', 'heavy-hulls', 'bulk-hulls', 'ore-storage', 'exchange', 'data-hub', 'remote-storage'])
    const { agencyUnlocks, ...rest } = t.player
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
