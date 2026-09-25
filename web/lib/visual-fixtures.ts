import type { AsteroidCandidate, TessCandidate } from '@/lib/data'

// Deterministic records used only by named dev/visual presets. They make the
// release matrix render the real instrument consoles without pretending that
// a local screenshot run is proof of live PocketBase feed availability.
export const VISUAL_TESS_CANDIDATE: TessCandidate = {
  id: 'visual-tess-toi-7001',
  ticId: 'TIC 7001001',
  toi: 'TOI 7001.01',
  host: 'TOI 7001',
  sector: 'Sector 42',
  constellation: 'Cygnus',
  distanceLy: 184,
  planetRadiusEarth: 1.7,
  periodDays: 4.38,
  transitEpoch: 0.72,
  depthPpm: 910,
  signalToNoise: 13.6,
}

export const VISUAL_ASTEROID_CANDIDATE: AsteroidCandidate = {
  id: 'visual-neocp-2026-aa1',
  tempDesig: '2026 AA1',
  score: 82,
  discoveryDate: '2026-08-18',
  ra: 14.282,
  decl: -21.418,
  vMag: 20.1,
  hMag: 25.2,
  nObs: 7,
  arcDays: 0.18,
  lastSeenDays: 0.1,
  resolved: false,
}
