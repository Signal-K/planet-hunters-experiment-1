import type { Ballot, BallotsResponse } from './ballots'

/**
 * Account-free stage fixtures for the ballots panel (`/game/stage?preset=ui-community-research&ballots=open|voted|closed`).
 * They mirror the shape pocketbase/ballots.go returns; dates are relative to `now` so the closing label is stable.
 */
export type BallotFixtureState = 'open' | 'voted' | 'closed'

export function ballotFixture(state: BallotFixtureState, now: number): BallotsResponse {
  const day = 86_400_000
  const astronomy: Ballot = {
    key: 'astronomy-2026-11', category: 'astronomy', title: 'What should we observe next?',
    blurb: 'The winner sets what we build next.',
    disclaimer: 'Dates come from published sky calendars.',
    phase: state === 'closed' ? 'closed' : 'open',
    opensAt: now - day, closesAt: state === 'closed' ? now - 3_600_000 : now + 4 * day + 3_600_000,
    options: [
      { id: 'geminids-2026', label: 'Geminids meteor shower', detail: 'Peak night 13 to 14 December. Dark skies, and GEM-1 is ready.', windowStart: '2026-12-13', windowEnd: '2026-12-15', sourceLabel: 'IMO meteor calendar, checked against EarthSky', sourceUrl: 'https://www.imo.net/resources/calendar/', verifiedAt: '2026-11-04', policy: { template: 'observatory-instrument', focusRef: 'geminids-2026' } },
      { id: 'jupiter-opposition-2027', label: 'Jupiter at opposition', detail: 'Brightest of the year, up all night.', windowStart: '2027-02-11', sourceLabel: 'Astronomy Engine, checked against EarthSky', sourceUrl: 'https://earthsky.org/astronomy-essentials/jupiter-at-opposition/', verifiedAt: '2026-11-04', policy: { template: 'observatory-instrument', focusRef: 'jupiter-opposition-2027' } },
      { id: 'mars-opposition-2027', label: 'Mars at opposition', detail: 'Closest in two years. A bright Moon dims the sky.', windowStart: '2027-02-19', sourceLabel: 'Astronomy Engine, checked against Sky at Night', sourceUrl: 'https://skyatnightmagazine.com/advice/skills/mars-opposition', verifiedAt: '2026-11-04', policy: { template: 'observatory-instrument', focusRef: 'mars-opposition-2027' } },
    ],
    ...(state === 'open' ? {} : { myVote: 'jupiter-opposition-2027', counts: { 'geminids-2026': 12, 'jupiter-opposition-2027': 17, 'mars-opposition-2027': 5 }, total: 34 }),
    ...(state === 'closed' ? { winner: 'jupiter-opposition-2027' } : {}),
  }
  const launch: Ballot = {
    key: 'launch-2026-11', category: 'launch', title: 'Which launch do we follow next?',
    blurb: 'We follow Electron first.',
    disclaimer: 'Launch dates change often.',
    phase: 'pending', opensAt: 0, closesAt: 0, defaultOption: 'electron-mountain-god-rises',
    options: [
      { id: 'electron-mountain-god-rises', label: 'Electron: The Mountain God Rises', detail: 'Rocket Lab, from New Zealand. Planned 10 November, time to be confirmed.', windowStart: '2026-11-10', sourceLabel: 'Launch Library 2 listing, not yet confirmed by Rocket Lab', sourceUrl: 'https://www.spacelaunchschedule.com/launch/electron-the-mountain-god-rises-iqps-launch-10/', policy: { template: 'spaceport-launch-site', focusRef: 'electron-mountain-god-rises' } },
    ],
  }
  return { ballots: [astronomy, launch], now }
}
