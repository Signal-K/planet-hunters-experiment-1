import { describe, expect, it } from 'vitest'
import { resolvePreset } from '@/lib/devPresets'
import { validateBuild } from '@/lib/data/parts'
import { TARGETS } from '@/lib/data'
import { loadoutBonuses } from './rocketBuilder'
import { DEFAULT_STATE, normalizeAndRepair, mergeRemoteState } from '@/lib/game-state'
import { applyConfirmShipCustomizerBuild } from '@/lib/systems/EconomySystem'
import { claimResearchReward, traderSteps } from '@/lib/research/paths'
import { BUILDER_SLOTS, installSlot, rocketBuilderStats } from './rocketBuilder'
import { earnedRocketParts, sanitizeLivery, workshopParts } from './workshop'

describe('rocket workshop', () => {
  it('clears the fixture mission limits with the earned parts and opens without a selected mission', () => {
    const fixture = resolvePreset('ui-rocket-workshop')!
    const mission = fixture.player!.dailyClientPool!.missions[0]
    const target = TARGETS.find(target => target.id === mission.targetId)!
    const rocket = fixture.rocket!
    expect(validateBuild({ mission, target, rocket }).holds?.map(hold => hold.kind)).toEqual(['orbit', 'cargo', 'drill'])
    const loadout = { engine: 'fusion-thruster-t2', payload: 'storage-silo-t2', 'mining-laser': 'ringed-laser-t3' }
    expect(validateBuild({ mission, target, rocket, loadoutBonus: loadoutBonuses(loadout) }).ok).toBe(true)
    expect(normalizeAndRepair({ ...structuredClone(DEFAULT_STATE), screen: 'rocket-workshop' }).screen).toBe('rocket-workshop')
  })
  it('earns a weekly part once, fits it below its mission unlock, and keeps it after a new week', () => {
    const state = structuredClone(DEFAULT_STATE)
    state.player.researchPath = { week: '2026-11-16', path: 'trader' }
    const step = traderSteps({ eventName: null })[1]
    const player = claimResearchReward(state.player, step, { have: 1, need: 1 }, 100)
    expect(player.researchRocketParts).toEqual(['storage-silo-t2'])
    expect(claimResearchReward(player, step, { have: 1, need: 1 }, 200)).toBe(player)
    expect(workshopParts(BUILDER_SLOTS[2], player).map(part => part.id)).toContain('storage-silo-t2')
    const fitted = applyConfirmShipCustomizerBuild({ ...state, player }, installSlot({}, BUILDER_SLOTS[2], 'storage-silo-t2'), {})
    expect(fitted.ok).toBe(true)
    expect(fitted.state.player.francs).toBe(player.francs)
    expect(rocketBuilderStats(state.rocket, fitted.state.player.shipCustomizerParts ?? {}).capacity).toBe(8)
    fitted.state.player.researchPath = { week: '2026-11-23', path: 'explorer' }
    expect(earnedRocketParts(normalizeAndRepair(JSON.parse(JSON.stringify(fitted.state))).player)).toContain('storage-silo-t2')
  })
  it('never refunds free parts or trusts a forged previous loadout; rejects wrong slots and locked parts', () => {
    const state = structuredClone(DEFAULT_STATE)
    state.player.francs = 0
    state.player.researchRocketParts = ['storage-silo-t2']
    state.player.shipCustomizerParts = { payload: 'storage-silo-t2' }
    expect(applyConfirmShipCustomizerBuild(state, {}, { payload: 'storage-silo-t5' }).state.player.francs).toBe(0)
    expect(applyConfirmShipCustomizerBuild(state, { engine: 'storage-silo-t2' }, {}).ok).toBe(false)
    expect(applyConfirmShipCustomizerBuild(state, { engine: 'antimatter-thruster-t5' }, {}).ok).toBe(false)
    expect(applyConfirmShipCustomizerBuild(state, { engine: 'ion-thruster-t1' }, { engine: 'antimatter-thruster-t5' }).ok).toBe(false)
  })
  it('migrates past breakthroughs and keeps earned parts and newer livery through stale saves', () => {
    const local = structuredClone(DEFAULT_STATE)
    local.player.badges = { 'community-research-2026-11-09': { eventId: 'community-research-2026-11-09', tier: 'gold', earnedAt: 100 } }
    local.player.rocketLivery = { hull: 'blue', trim: 'cream', decal: 'star', updatedAt: 200 }
    const remote = structuredClone(DEFAULT_STATE)
    remote.player.rocketLivery = { hull: 'ink', trim: 'cyan', decal: 'orbit', updatedAt: 100 }
    const merged = mergeRemoteState(local, remote)
    expect(earnedRocketParts(merged.player)).toHaveLength(3)
    expect(merged.player.rocketLivery).toEqual(local.player.rocketLivery)
    expect(normalizeAndRepair(JSON.parse(JSON.stringify(merged))).player.rocketLivery).toEqual(local.player.rocketLivery)
    expect(sanitizeLivery({ hull: 'bad' as 'blue', updatedAt: NaN })).toMatchObject({ hull: 'cream', updatedAt: 0 })
  })
})
