import { describe, expect, it } from 'vitest'
import type { Player } from '@/lib/game-types'
import { contentUpdateTargeting, derivePlayerPlaystyle, parseContentUpdatePayload } from './content-updates'

function player(overrides: Partial<Player> = {}): Player {
  return {
    francs: 0,
    activeMission: null,
    missionCount: 0,
    pendingLaunch: false,
    placed: ['launchpad'],
    placementPlots: { launchpad: 0 },
    controlBuilt: false,
    missionsDone: 1,
    freeOperations: false,
    clientMissions: {},
    clientCooldowns: {},
    researchAnnotations: 0,
    refineryBuilt: false,
    refineryQueue: [],
    refinedGoods: {},
    launchpadUpgraded: false,
    loanDebt: 0,
    loanOffered: false,
    ...overrides,
  }
}

describe('content update personalisation', () => {
  it('derives a dominant playstyle from actual program activity', () => {
    expect(derivePlayerPlaystyle(player({ researchAnnotations: 8 }))).toBe('science')
    expect(derivePlayerPlaystyle(player({ refineryBuilt: true, refinedGoods: { alloy: 5 } }))).toBe('industry')
    expect(derivePlayerPlaystyle(player({ hasLanded: true, roverDeployments: [{ roverId: 'r1', targetId: 'eros', clientId: 'c1', timestamp: 1 }] }))).toBe('exploration')
  })

  it('emits compact PostHog targeting properties', () => {
    expect(contentUpdateTargeting(player({ freeOperations: true, missionsDone: 8, satelliteMonitoringBuilt: true }))).toMatchObject({
      landnam_progression_stage: 'established_program',
      landnam_missions_done: 8,
      landnam_has_monitoring_station: true,
    })
  })

  it('accepts a safe message payload and rejects malformed or unsafe navigation', () => {
    expect(parseContentUpdatePayload({
      id: 's12-01',
      headline: 'Surface operations online',
      missions: ['Lunar prospecting', 'Lander trials'],
      impact: 'Your exploration program can now establish surface routes.',
      ctaLabel: 'Open missions',
      ctaScreen: 'missions',
    })).toMatchObject({ id: 's12-01', ctaScreen: 'missions' })

    expect(parseContentUpdatePayload({ id: 'x', headline: 'x', missions: [], impact: 'x' })).toBeNull()
    expect(parseContentUpdatePayload({ id: 'x', headline: 'x', missions: ['x'], impact: 'x', ctaScreen: 'debrief' }))
      .toMatchObject({ ctaScreen: undefined })
  })
})
