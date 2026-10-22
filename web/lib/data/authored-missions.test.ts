import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { AUTHORED_MISSIONS, FREE_OPS_MISSION_SEQUENCE, TRANSPORT_SEQUENCE, SELF_DIRECTED_MINING_MISSION_ID, authoredMission, missionFromDeclaration } from './missions'
import { missionPayoutFloor } from './payouts'

// The two missions below were literals in missions.ts before they moved to shared/authoring/missions/*.toml. These are
// those literals, so moving them cannot change the game. The one intended difference is the Belt Courier Run brief:
// native already had it without the em dash, and the TOML source now gives both platforms that one wording.
const BELT_COURIER_RUN = {
  id: 'lnm_m3_relay_bennu_vesta',
  title: 'Belt Courier Run',
  brief: "Atlas Aggregate needs iron and carbon lifted from Bennu, then dropped at their Vesta depot for off-world construction. Bulk metals like these are too plentiful on Earth to ship home, but Vesta has none. You're paid for both jobs: mining the ore and running the relay to Vesta.",
  client: 'atlas-aggregate',
  tag: 'TRANSPORT',
  difficulty: 'L1',
  locked: false,
  sequence: TRANSPORT_SEQUENCE,
  unlockAt: 'Complete 1 contract',
  targetId: 'bennu',
  deliveryTargetId: 'vesta',
  requires: { minerals: { iron: 3, carbon: 2 }, cargo_min: 5, drill_tier: 1, max_orbit: 4 },
  payout: { francs: missionPayoutFloor(3), affinity: 3 },
}

const SELF_DIRECTED_MINING_RUN = {
  id: 'freeops-self-directed-mining',
  title: 'Self-Directed Mining Run',
  brief: 'No client, no daily limit. Pick any reachable target, mine what looks valuable, and sell the haul yourself at market price.',
  tag: 'FREE OPS',
  difficulty: 'L2',
  locked: false,
  sequence: FREE_OPS_MISSION_SEQUENCE,
  unlockAt: 'Reach Free Operations',
  requires: { minerals: { nickel: 1 }, cargo_min: 1, drill_tier: 1, max_orbit: 2 },
  payout: { francs: 0, affinity: 0 },
}

describe('missions compiled from shared/authoring/missions', () => {
  it('builds the client contract exactly as the literal did', () => {
    expect(authoredMission('lnm_m3_relay_bennu_vesta')).toStrictEqual(BELT_COURIER_RUN)
  })

  it('builds the free mining run exactly as the literal did', () => {
    expect(authoredMission(SELF_DIRECTED_MINING_MISSION_ID)).toStrictEqual(SELF_DIRECTED_MINING_RUN)
  })

  it('keeps every authored mission in its original board order', () => {
    expect(AUTHORED_MISSIONS.map(m => m.id)).toEqual([
      'program-build-mars-mining-settlement',
      'program-build-remote-silo',
      'story-astronaut-academy',
      'lnm_m3_relay_bennu_vesta',
      'lnm_m3_relay_itokawa_eros',
      'lnm_relay_psyche_ceres',
      'freeops-self-directed-mining',
      'freeops-crewed-prospecting',
    ])
  })

  it('follows the payout curve instead of freezing a number', () => {
    const base = {
      id: 'x', title: 'X', brief: 'x', tag: 'T', difficulty: 'L1', locked: false, sequence: 'transport' as const,
      requires: { minerals: { iron: 1 }, cargo_min: 1, drill_tier: 1, max_orbit: 1 },
    }
    expect(missionFromDeclaration({ ...base, payout: { floor_sequence: 4, affinity: 1 } }).payout.francs).toBe(missionPayoutFloor(4))
    expect(missionFromDeclaration({ ...base, payout: { francs: 123, affinity: 1 } }).payout.francs).toBe(123)
    expect(missionFromDeclaration({ ...base, sequence: 'free-ops', payout: { francs: 0, affinity: 0 } }).sequence).toBe(FREE_OPS_MISSION_SEQUENCE)
  })

  it('stays identical to the shared copy that native reads', () => {
    const shared = readFileSync(join(process.cwd(), '..', 'shared/missions/authored-missions.json'), 'utf8')
    const web = readFileSync(join(process.cwd(), 'lib/data/authored-missions.json'), 'utf8')
    expect(web).toBe(shared)
  })
})
