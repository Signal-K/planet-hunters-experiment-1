import { describe, expect, it } from 'vitest'
import { STATIC_CATALOG } from '@/lib/catalog'
import { DEFAULT_STATE } from '@/lib/game-state'
import type { Player } from '@/lib/game-types'
import { REFINERY_BUILD_MISSION_ID, RESOURCE_FOCUS_MISSION_ID } from '@/lib/data/missions'
import { OWN_PROGRAM_CLIENT_ID } from '@/lib/data/mission-primers'
import {
  DEEP_SPACE_TELESCOPE_MISSION_ID,
  TRANSIT_TELESCOPE_MISSION_ID,
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
    expect(steps.find(step => step.id === DEEP_SPACE_TELESCOPE_MISSION_ID)?.state).toBe('current')
    expect(steps.find(step => step.kind === 'mining')?.state).toBe('available')
    expect(steps.filter(step => step.state === 'current')).toHaveLength(1)
  })

  it('locks the refinery until a settlement, a silo, and a build right exist', () => {
    const base = player()
    const catalog = buildRuntimeCatalog({ catalog: STATIC_CATALOG, freeOperations: true, missionsDone: 3, player: base })
    const locked = programChain(catalog, base, NOW).find(step => step.id === REFINERY_BUILD_MISSION_ID)
    expect(locked?.state).toBe('locked')
    expect(locked?.lockLine).toBe('Deliver a mining settlement and a remote silo first')

    const structuresOnly = player({
      clientStructures: [
        { targetId: 'mars', structureKind: 'mining-settlement', clientId: OWN_PROGRAM_CLIENT_ID, state: 'delivered', startedAt: 0 },
        { targetId: 'mars', structureKind: 'mineral-silo', clientId: OWN_PROGRAM_CLIENT_ID, state: 'delivered', startedAt: 0 },
      ],
    })
    const waitingOnSite = programChain(catalog, structuresOnly, NOW).find(step => step.id === REFINERY_BUILD_MISSION_ID)
    expect(waitingOnSite?.state).toBe('locked')
    expect(waitingOnSite?.lockLine).toMatch(/site you own or lease/)

    const ready = player({
      clientStructures: structuresOnly.clientStructures,
      siteRights: {
        territories: base.siteRights?.territories ?? {},
        rights: {
          'moon-build-right': {
            id: 'moon-build-right', playerId: 'local-player', clientId: 'atlas-aggregate', targetId: 'moon', siteId: 'moon-south-pole',
            mode: 'purchase' as const, activities: ['build' as const, 'mine' as const], acquiredAt: 0,
          },
        },
      },
    })
    const open = programChain(catalog, ready, NOW).find(step => step.id === REFINERY_BUILD_MISSION_ID)
    expect(open?.state).not.toBe('locked')
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
    expect(board.orionids.blurb).toBe('Mine debris at night, earn badges')
    expect(board.wsw.map(card => card.id)).toEqual([
      'draconids-2026',
      'saturn-night-2026',
      'rocket-revolution-2026',
      'new-moon-hunt-2026-10',
    ])
    expect(board.wsw.every(card => card.status === 'ended')).toBe(true)
    expect(board.attention).toBe(true)
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
