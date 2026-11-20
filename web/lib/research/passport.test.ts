import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE, mergeRemoteState, normalizeAndRepair } from '@/lib/game-state'
import { addStamp } from './stamps'
import { claimResearchReward, traderSteps, weekKey } from './paths'
import { passportDays, mergeFirstStamps, passportWeekRange, withPassportRewards, type PassportWeek } from './passport'
import { weeklyRocketPart, weeklyRocketPartById } from '@/lib/data/weeklyRocketParts'
import { workshopParts } from '@/lib/launchpad/workshop'
import { BUILDER_SLOTS, installSlot, rocketBuilderStats } from '@/lib/launchpad/rocketBuilder'
import { applyConfirmShipCustomizerBuild } from '@/lib/systems/EconomySystem'
const now = Date.UTC(2026, 10, 20, 12)
const week = '2026-11-16'
const row = (change: Partial<PassportWeek> = {}): PassportWeek => ({ week, total: 100, mine: 1, goal: 100, reachedAt: now, earned: true, ...change })

describe('weekly research passport', () => {
  it('inks seven places with the first work, including after later stamps and a cross-device merge', () => {
    const first = addStamp(structuredClone(DEFAULT_STATE).player, 'gift', now)
    const later = addStamp(first, 'classification', now + 1000)
    const days = passportDays(later, week, now + 2000)
    expect(days).toHaveLength(7)
    expect(days[4].kind).toBe('gift')
    expect(days[5].future).toBe(true)
    const remote = addStamp(structuredClone(DEFAULT_STATE).player, 'survey', now - 1000)
    const merged = mergeFirstStamps(later.researchFirstStamps, remote.researchFirstStamps)
    expect(merged['2026-11-20'].kind).toBe('survey')
    expect(weekKey(Date.UTC(2026, 10, 23))).toBe('2026-11-23')
  })
  it('does not award for an unconfirmed full bar, a spectator, or a personal path milestone', () => {
    const player = structuredClone(DEFAULT_STATE).player
    expect(withPassportRewards(player, { weeks: [row({ total: 99, mine: 0, earned: false, reachedAt: null })] }).researchRocketParts ?? []).toEqual([])
    expect(withPassportRewards(player, { weeks: [row({ mine: 0, earned: false })] }).researchRocketParts ?? []).toEqual([])
    const personal = claimResearchReward({ ...player, researchPath: { week, path: 'trader' as const } }, traderSteps({ eventName: null })[1], { have: 1, need: 1 }, now)
    expect(personal.researchRocketParts ?? []).toEqual([])
  })
  it('awards a unique weekly part once, fits it free, and survives old saves and week rollover', () => {
    const state = structuredClone(DEFAULT_STATE)
    const response = { weeks: [row()] }
    state.player = withPassportRewards(state.player, response)
    expect(withPassportRewards(state.player, response)).toBe(state.player)
    const part = weeklyRocketPart(week)!
    const unearned = structuredClone(DEFAULT_STATE)
    expect(applyConfirmShipCustomizerBuild(unearned, { payload: part.id }, {}).ok).toBe(false)
    expect(state.player.researchRocketParts).toContain(part.id)
    const slot = BUILDER_SLOTS.find(slot => workshopParts(slot, state.player).some(candidate => candidate.id === part.id))!
    const result = applyConfirmShipCustomizerBuild(state, installSlot({}, slot, part.id), {})
    expect(result.ok).toBe(true)
    expect(result.state.player.francs).toBe(state.player.francs)
    expect(rocketBuilderStats(state.rocket, result.state.player.shipCustomizerParts ?? {}).capacity).toBe(8)
    const restored = normalizeAndRepair(JSON.parse(JSON.stringify(result.state)))
    const merged = mergeRemoteState(restored, DEFAULT_STATE)
    expect(merged.player.researchPassportWeeks?.[week].earned).toBe(true)
    expect(merged.player.researchRocketParts).toContain(part.id)
    expect(passportWeekRange(merged.player, now + 7 * 86_400_000)).toEqual(['2026-11-23', '2026-11-16'])
    expect(weeklyRocketPart('2026-11-23')?.id).not.toBe(part.id)
  })
  it('validates permanent issue ids and never puts future work on an older passport page', () => {
    const part = weeklyRocketPart(week)!
    expect(weeklyRocketPartById(part.id)).toEqual(part)
    expect(weeklyRocketPartById('research-engine-2026-11-16')).toBeUndefined()
    expect(weeklyRocketPart('2026-11-17')).toBeUndefined()
    expect(weeklyRocketPart('2026-02-31')).toBeUndefined()
    const player = { researchStamps: { '2026-11-22': ['event' as const] } }
    expect(passportDays(player, week, now).some(day => day.kind)).toBe(false)
  })
})
