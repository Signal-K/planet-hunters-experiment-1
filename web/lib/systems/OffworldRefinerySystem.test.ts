import { describe, expect, it } from 'vitest'
import { OWN_PROGRAM_BUILD_MISSIONS } from '@/lib/data/missions'
import {
  hasActiveSiteRight,
  planOffworldRefinery,
  resolveOffworldRefinery,
} from './OffworldRefinerySystem'

const refineryMission = OWN_PROGRAM_BUILD_MISSIONS.find(
  mission => mission.id === 'program-build-refinery',
)

describe('OffworldRefinerySystem', () => {
  it('plans a player-owned refinery at an owned site without client or XP gates', () => {
    expect(refineryMission).toBeDefined()
    const result = planOffworldRefinery(refineryMission!, {
      targetId: 'psyche',
      siteId: 'psyche-north-ridge',
      kind: 'owned',
    }, 10_000)

    expect(result).toEqual({
      ok: true,
      deployment: {
        owner: 'player',
        structureKind: 'refinery',
        targetId: 'psyche',
        siteId: 'psyche-north-ridge',
        rightKind: 'owned',
        state: 'under-construction',
        startedAt: 10_000,
        completesAt: 2_710_000,
      },
    })
  })

  it('allows an active lease and makes the deployment operational after its build time', () => {
    const result = planOffworldRefinery(refineryMission!, {
      targetId: 'mars-arcadia',
      siteId: 'arcadia-plain',
      kind: 'leased',
      expiresAt: 20_000,
    }, 10_000)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(resolveOffworldRefinery(result.deployment, 2_709_999).state).toBe('under-construction')
    expect(resolveOffworldRefinery(result.deployment, 2_710_000).state).toBe('operational')
  })

  it('rejects a missing or expired site right', () => {
    expect(planOffworldRefinery(refineryMission!, undefined, 10_000)).toEqual({
      ok: false,
      reason: 'missing-site-right',
    })
    expect(planOffworldRefinery(refineryMission!, {
      targetId: 'bennu',
      siteId: 'bennu-south',
      kind: 'leased',
      expiresAt: 10_000,
    }, 10_000)).toEqual({
      ok: false,
      reason: 'expired-site-lease',
    })
    expect(hasActiveSiteRight({ targetId: 'bennu', siteId: 'bennu-south', kind: 'leased', expiresAt: 10_001 }, 10_000)).toBe(true)
  })

  it('does not treat another construction mission as a refinery deployment', () => {
    const nonRefinery = OWN_PROGRAM_BUILD_MISSIONS.find(
      mission => mission.id === 'program-build-remote-silo',
    )
    expect(planOffworldRefinery(nonRefinery!, {
      targetId: 'bennu',
      siteId: 'bennu-south',
      kind: 'owned',
    }, 10_000)).toEqual({
      ok: false,
      reason: 'not-refinery-mission',
    })
  })
})
