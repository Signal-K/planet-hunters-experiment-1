// SSL-569: a veteran account (many missions flown, old onboarding) must load in
// Free Ops with an unlocked board and the space telescope mission offered.
import { describe, expect, it, vi } from 'vitest'

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, useState: <T,>(initial: T) => [initial, () => undefined] as const }
})

import { STATIC_CATALOG } from './catalog'
import { normalizeState, type PartialSave } from './game-state'
import { buildRuntimeCatalog, TRANSIT_TELESCOPE_MISSION_ID } from './runtimeCatalog'
import { useMissionRelayModels } from './hooks/useMissionRelayModels'
import { freeOperationsUnlocked } from './systems/AgencyOnboardingSystem'

const legacySave = (player: Record<string, unknown>): PartialSave => ({
  screen: 'hub',
  tutorial: true,
  doneSteps: ['welcome', 'first-launch', 'm1-complete', 'm2-prospector', 'm3-complete'],
  player: { francs: 42_000, placed: ['launchpad', 'surface-silo'], ...player },
} as unknown as PartialSave)

const fixtures: Array<[string, PartialSave]> = [
  ['10 missions, freeOperations missing', legacySave({ missionsDone: 10 })],
  ['10 missions, stale freeOperations false', legacySave({ missionsDone: 10, freeOperations: false })],
  ['10 missions, flight plan opened later (hint shown, mining try replayed)', legacySave({
    missionsDone: 10,
    freeOperations: false,
    flightPlan: { completed: { mining: true }, hidden: false, activeSince: 1_760_000_000_000, replayTry: 'scan' },
  })],
  ['counter missing, mission log has 6 runs', legacySave({
    missionsDone: undefined,
    completedMissions: Array.from({ length: 6 }, (_, i) => ({ id: `m${i}`, title: 'Lunar ore haul', targetId: 'moon', completedAt: 1_750_000_000_000 + i })),
  })],
]

describe('SSL-569 legacy players are in Free Ops', () => {
  it.each(fixtures)('%s', (_name, save) => {
    const state = normalizeState(save)
    expect(state.player.freeOperations).toBe(true)
    expect(state.tutorial).toBe(false)
    expect(state.player.missionsDone).toBeGreaterThanOrEqual(3)

    const catalog = buildRuntimeCatalog({
      catalog: STATIC_CATALOG,
      freeOperations: state.player.freeOperations,
      transitSatelliteLaunchedAt: state.player.transitSatelliteLaunchedAt ?? null,
      missionsDone: state.player.missionsDone,
      player: state.player,
    })
    expect(catalog.missions.some(m => m.id === TRANSIT_TELESCOPE_MISSION_ID)).toBe(true)

    const { cardModels } = useMissionRelayModels({
      catalog,
      missionsDone: state.player.missionsDone,
      freeOperations: state.player.freeOperations,
      francs: state.player.francs,
      player: state.player,
    })
    const clientCards = cardModels.filter(card => !card.mission.jointProject && card.mission.id !== 'academy-intro')
    expect(clientCards.length).toBeGreaterThan(0)
    expect(clientCards.some(card => card.unlocked)).toBe(true)
    expect(clientCards.every(card => card.cardState === 'available' || card.lockedDetail !== 'L1')).toBe(true)
  })

  it('never re-locks: opening the flight plan after Free Ops keeps it', () => {
    expect(freeOperationsUnlocked({ missionsDone: 10, flightPlan: { completed: {}, hidden: false, activeSince: 1 } })).toBe(true)
  })

  it('a fresh player is still in onboarding', () => {
    const state = normalizeState({ player: { missionsDone: 1 } } as unknown as PartialSave)
    expect(state.player.freeOperations).toBe(false)
  })
})
