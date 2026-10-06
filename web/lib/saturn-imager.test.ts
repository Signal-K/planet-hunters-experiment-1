import { describe, expect, it } from 'vitest'
import { STATIC_CATALOG } from './catalog'
import { buildRuntimeCatalog, SATURN_IMAGER_MISSION_ID, SATURN_IMAGER_TARGET_ID } from './runtimeCatalog'
import { DEFAULT_STATE, normalizeAndRepair } from './game-state'
import {
  SATURN_FALLBACK_CANDIDATES,
  SATURN_QUESTION,
  dailySaturnCandidates,
  resolveSaturnBadgeTier,
  toSaturnCandidate,
} from './data'
import { collectInstrumentSignals } from './systems/InstrumentFeedSystem'

describe('saturn candidates', () => {
  it('ships real Cassini frames with OPUS ids and image urls', () => {
    expect(SATURN_FALLBACK_CANDIDATES.length).toBeGreaterThanOrEqual(20)
    for (const c of SATURN_FALLBACK_CANDIDATES) {
      expect(c.opusId).toMatch(/^co-iss-/)
      expect(c.imageUrl).toMatch(/^https:\/\//)
    }
    expect(SATURN_QUESTION).toBe('Is there a storm cloud in the image?')
  })

  it('picks deterministically per UTC day and varies across days', () => {
    const a = dailySaturnCandidates(SATURN_FALLBACK_CANDIDATES, '2026-10-07')
    expect(a).toHaveLength(1)
    expect(dailySaturnCandidates(SATURN_FALLBACK_CANDIDATES, '2026-10-07')).toEqual(a)
    const ids = new Set(['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']
      .map(day => dailySaturnCandidates(SATURN_FALLBACK_CANDIDATES, day)[0].id))
    expect(ids.size).toBeGreaterThan(1)
    expect(dailySaturnCandidates([], '2026-10-07')).toEqual([])
  })

  it('maps a future pool record to a candidate', () => {
    expect(toSaturnCandidate({ id: 'rec1', subject_id: 42, opus_id: 'co-iss-n1', image_url: 'https://x/y.png' }))
      .toEqual({ id: 'rec1', subjectId: '42', opusId: 'co-iss-n1', imageUrl: 'https://x/y.png' })
  })

  it('tiers the badge by date played (SSL-491)', () => {
    expect(resolveSaturnBadgeTier(Date.parse('2026-10-07T12:00:00Z'))).toBe('gold')
    expect(resolveSaturnBadgeTier(Date.parse('2026-10-11T00:00:00Z'))).toBe('silver')
  })
})

describe('saturn imager launch offer', () => {
  const opts = { catalog: STATIC_CATALOG, freeOperations: true, missionsDone: 4 }

  it('offers a no-payout satellite mission once and stops after launch', () => {
    const offered = buildRuntimeCatalog({ ...opts, player: { ...DEFAULT_STATE.player, freeOperations: true } })
    expect(offered.targets.some(t => t.id === SATURN_IMAGER_TARGET_ID)).toBe(true)
    expect(offered.missions.find(m => m.id === SATURN_IMAGER_MISSION_ID)).toMatchObject({
      payload: { type: 'satellite', instrumentId: 'saturn-imager' },
      payout: { francs: 0, affinity: 0 },
    })
    const launched = buildRuntimeCatalog({ ...opts, player: { ...DEFAULT_STATE.player, freeOperations: true, saturnImagerLaunchedAt: Date.now() } })
    expect(launched.missions.some(m => m.id === SATURN_IMAGER_MISSION_ID)).toBe(false)
  })

  it('is not offered before Free Operations', () => {
    const c = buildRuntimeCatalog({ ...opts, freeOperations: false, player: { ...DEFAULT_STATE.player } })
    expect(c.missions.some(m => m.id === SATURN_IMAGER_MISSION_ID)).toBe(false)
  })
})

describe('saturn state and feed', () => {
  it('sanitises a malformed saturnClassifications field', () => {
    const state = normalizeAndRepair({
      ...DEFAULT_STATE,
      player: { ...DEFAULT_STATE.player, saturnClassifications: 'bad' as never },
    })
    expect(state.player.saturnClassifications).toEqual({})
  })

  it('feeds today frame only after launch and drops it once classified', () => {
    const base = { ...DEFAULT_STATE.player, freeOperations: true }
    const args = { tess: [], asteroids: [], saturn: SATURN_FALLBACK_CANDIDATES, dateKey: '2026-10-07' }
    expect(collectInstrumentSignals({ ...args, player: base })).toEqual([])
    const online = collectInstrumentSignals({ ...args, player: { ...base, saturnImagerLaunchedAt: 1 } })
    expect(online).toHaveLength(1)
    expect(online[0]).toMatchObject({ kind: 'saturn', inspectorScreen: 'saturn-storm-search' })
    const done = collectInstrumentSignals({
      ...args,
      player: {
        ...base,
        saturnImagerLaunchedAt: 1,
        saturnClassifications: { [online[0].id]: { candidateId: online[0].id, verdict: 'maybe', submittedAt: 1, badgeTier: null } },
      },
    })
    expect(done.some(s => s.id === online[0].id)).toBe(false)
  })
})
