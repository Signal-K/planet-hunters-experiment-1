import { describe, expect, it } from 'vitest'
import { STATIC_CATALOG } from '@/lib/catalog'
import { DEFAULT_STATE } from '@/lib/game-state'
import type { Player } from '@/lib/game-types'
import { RESOURCE_FOCUS_MISSION_ID } from '@/lib/data/missions'
import {
  TRANSIT_TELESCOPE_MISSION_ID,
  SATURN_IMAGER_MISSION_ID,
  buildRuntimeCatalog,
} from '@/lib/runtimeCatalog'
import { contractWswMark, eventsBoard, programChain } from './mission-board-view'

const NOW = Date.parse('2026-10-12T12:00:00Z')

function player(patch: Partial<Player> = {}): Player {
  return {
    ...DEFAULT_STATE.player,
    freeOperations: true,
    missionsDone: 3,
    placed: ['launchpad', 'surface-silo'],
    ...patch,
  }
}

describe('mission board view', () => {
  it('marks a launched instrument done and the next open step current', () => {
    const current = player({ transitSatelliteLaunchedAt: 1 })
    const catalog = buildRuntimeCatalog({ catalog: STATIC_CATALOG, freeOperations: true, missionsDone: 3, player: current })
    const steps = programChain(catalog, current, NOW)
    expect(steps.find(step => step.id === TRANSIT_TELESCOPE_MISSION_ID)?.state).toBe('done')
    expect(steps.find(step => step.id === SATURN_IMAGER_MISSION_ID)?.state).toBe('current')
    expect(steps.find(step => step.kind === 'mining')?.state).toBe('available')
    expect(steps.filter(step => step.state === 'current')).toHaveLength(1)
  })

  it('keeps a resource-focus haul available without making it the current step', () => {
    const focused = player({ resourceFocus: { label: 'Mineral Vault', minerals: { aluminium: 15 } } })
    const catalog = buildRuntimeCatalog({ catalog: STATIC_CATALOG, freeOperations: true, missionsDone: 3, player: focused })
    const steps = programChain(catalog, focused, NOW)
    const focus = steps.find(step => step.id === RESOURCE_FOCUS_MISSION_ID)
    expect(focus?.state).toBe('available')
    expect(focus?.kind).toBe('focus')
    expect(steps.find(step => step.state === 'current')?.kind).toBe('instrument')
  })

  it('counts down to Orionids and marks World Space Week ended', () => {
    const board = eventsBoard(NOW, {}, NOW)
    expect(board.orionids.status).toBe('upcoming')
    expect(board.orionids.countdownLabel).toMatch(/to start/)
    expect(board.orionids.blurb).toBe("Fly into Orion's meteor pattern, catch fragments, and mine any minerals you want while you are there.")
    expect(board.groups.find(group => group.status === 'upcoming')?.cards.map(card => card.id)).toEqual([
      'orionids-2026',
      'leonids-2026',
      'geminids-2026',
    ])
    expect(board.wsw.map(card => card.id)).toEqual([
      'draconids-2026',
      'saturn-night-2026',
      'rocket-revolution-2026',
      'new-moon-hunt-2026-10',
    ])
    expect(board.wsw.every(card => card.status === 'ended')).toBe(true)
    expect(board.groups.map(group => group.title)).toEqual(['Upcoming', 'Past events'])
    expect(board.groups.find(group => group.status === 'ended')?.cards).toHaveLength(4)
    expect(board.groups.find(group => group.status === 'ended')?.cards.every(card => card.actionLabel === 'PLAY FOR SILVER')).toBe(true)
    expect(board.groups.find(group => group.status === 'ended')?.cards.every(card => card.rewardLabel === 'REPLAY REWARD · SILVER BADGE')).toBe(true)
    expect(board.attention).toBe(true)
    expect(board.spacetober.title).toBe('Spacetober')
    expect(board.spacetober.steps.map(step => step.id)).toEqual(['world-space-week', 'orionids-peak'])
    expect(board.spacetober.steps[0]?.status).toBe('ended')
    expect(board.spacetober.steps[1]?.status).toBe('upcoming')
    expect(board.spacetober.links.map(link => link.href)).toEqual([
      'https://youratlas.cc/app/profile',
      'https://starsailors.space/game',
      'https://playlandnam.space',
    ])
  })

  it('changes the Orionids action to the next research tier', () => {
    const board = eventsBoard(Date.parse('2026-10-24T12:00:00Z'), {}, Date.parse('2026-10-24T12:00:00Z'), {}, 0, 1)
    expect(board.orionids.actionLabel).toBe('Continue research')
    expect(board.orionids.rewardLabel).toBe('Mission 2 of 3 · surface observation ready')
  })

  it('points the Orionids card at ORI-1 for mission 3, then keeps listening once the badge is earned', () => {
    const at = Date.parse('2026-10-24T12:00:00Z')
    const radio = eventsBoard(at, {}, at, {}, 0, 2)
    expect(radio.orionids.actionLabel).toBe('Listen on ORI-1')
    expect(radio.orionids.rewardLabel).toBe('Mission 3 of 3 · confirm echoes on ORI-1')
    const done = eventsBoard(at, { 'orionids-2026': { eventId: 'orionids-2026', tier: 'gold', earnedAt: at } }, at, {}, 0, 3)
    expect(done.orionids.actionLabel).toBe('Keep listening')
    expect(done.orionids.earnedTier).toBe('gold')
  })

  it('shows a WSW earned/total mark only when the mission can earn a chip', () => {
    const mark = contractWswMark(
      {},
      { 'rocket-revolution-2026': { eventId: 'rocket-revolution-2026', tier: 'silver', earnedAt: 1 } },
      NOW,
    )
    expect(mark?.label).toBe('WSW 1/4')
    expect(mark?.title.length).toBeGreaterThan(0)
  })
})
