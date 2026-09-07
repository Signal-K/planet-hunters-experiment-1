import type { TessCandidate } from '@/lib/data/tess-candidates'

// A single hardcoded, fully synthetic candidate for the /demo citizen-science
// track (KES-264) — tessLightcurvePoints() generates a deterministic
// lightcurve from these fields with no backend/subject fetch needed, so the
// demo route can render a realistic-looking classification interaction while
// staying entirely local-only.
export const DEMO_TESS_CANDIDATE: TessCandidate = {
  id: 'demo-toi-0001',
  ticId: 'TIC 000000001',
  toi: 'TOI-0001.01',
  host: 'Demo Host Star',
  sector: 'S01',
  constellation: 'Lyra',
  distanceLy: 214,
  planetRadiusEarth: 2.1,
  periodDays: 4.12,
  transitEpoch: 1.8,
  depthPpm: 2700,
  signalToNoise: 18.4,
  starTeffK: 5600,
}
