import type { AsteroidCandidate, TessCandidate } from '@/lib/data'

/**
 * The candidate feed for the account-free test stage. Every instrument feed (transit, asteroid, Saturn) reads from
 * the shared PocketBase pool, which the stage has no sign-in for, so its scenes saw an empty sky. On the stage the
 * three feeds return these fixed records instead. `?feed=off` on the stage URL turns it off to see the empty feed.
 * Records only; nothing here is sent anywhere. Saturn already has a static frame set (getSaturnFallbackCandidates).
 */
export function stageFeedOn(): boolean {
  return typeof window !== 'undefined' && (window as unknown as { __LANDNAM_STAGE_FEED?: boolean }).__LANDNAM_STAGE_FEED === true
}

const tess = (n: number, host: string, constellation: string, radius: number, period: number, depth: number, snr: number): TessCandidate => ({
  id: `stage-tess-toi-${n}`,
  ticId: `TIC ${n}001`,
  toi: `TOI ${n}.01`,
  host,
  sector: `Sector ${30 + (n % 40)}`,
  constellation,
  distanceLy: 120 + (n % 9) * 37,
  planetRadiusEarth: radius,
  periodDays: period,
  transitEpoch: 0.4 + (n % 5) * 0.11,
  depthPpm: depth,
  signalToNoise: snr,
})

export const STAGE_TESS_FEED: TessCandidate[] = [
  tess(7001, 'TOI 7001', 'Cygnus', 1.7, 4.38, 910, 13.6),
  tess(7002, 'TOI 7002', 'Lyra', 2.4, 6.12, 1480, 18.2),
  tess(7003, 'TOI 7003', 'Draco', 0.9, 2.31, 420, 8.1),
  tess(7004, 'TOI 7004', 'Pavo', 3.1, 9.7, 2310, 22.5),
]

const asteroid = (n: string, score: number, ra: number, decl: number, vMag: number): AsteroidCandidate => ({
  id: `stage-neocp-${n.toLowerCase().replace(/\s/g, '-')}`,
  tempDesig: n,
  score,
  discoveryDate: '2026-08-18',
  ra,
  decl,
  vMag,
  hMag: 25.2,
  nObs: 7,
  arcDays: 0.18,
  lastSeenDays: 0.1,
  resolved: false,
})

export const STAGE_ASTEROID_FEED: AsteroidCandidate[] = [
  asteroid('2026 AA1', 82, 14.282, -21.418, 20.1),
  asteroid('2026 AB4', 64, 133.9, 12.3, 20.8),
  asteroid('2026 AC7', 91, 251.4, -33.6, 19.6),
]
