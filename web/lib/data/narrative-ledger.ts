export type NarrativeLedgerState = 'live' | 'adapt' | 'planned'

export interface NarrativeLedgerEntry {
  id: string
  title: string
  playerVerb: string
  purpose: string
  cadence: string
  owner: string
  state: NarrativeLedgerState
  dependencies: string[]
  implementation: string
}

/**
 * The single inventory for the client-led operating model (KES-285).
 *
 * This is intentionally a product ledger, not game state. It lets us make
 * planned mechanics explicit beside live ones, so a narrative promise cannot
 * silently look implemented just because an adjacent system exists.
 */
export const NARRATIVE_LEDGER: NarrativeLedgerEntry[] = [
  {
    id: 'launch-day',
    title: 'Launch day',
    playerVerb: 'Choose one launch',
    purpose: 'One clear daily invitation: client work, own infrastructure, mining, or a test launch.',
    cadence: 'WHEN READY',
    owner: 'PLAYER',
    state: 'adapt',
    dependencies: ['Client work', 'Own programme', 'Mining', 'Test launches'],
    implementation: 'Mission Board and Launchpad already provide most routes; the single launch-day framing is the next presentation pass.',
  },
  {
    id: 'client-work',
    title: 'Client work',
    playerVerb: 'Build, mine, deliver, process',
    purpose: 'Early-game balance comes from completing practical work for specialist space and Earth companies.',
    cadence: 'PER MISSION',
    owner: 'CLIENT',
    state: 'live',
    dependencies: ['Missions', 'Targets', 'Rockets', 'Debrief'],
    implementation: 'Client missions, payout, mission records, and client affinity are present. Rename and consolidate any remaining legacy terminology.',
  },
  {
    id: 'client-growth',
    title: 'Client growth',
    playerVerb: 'Enable client builds',
    purpose: 'Completed player builds give each client experience and unlock the next level of its work.',
    cadence: 'DAILY · 00:01 AEST',
    owner: 'CLIENT',
    state: 'planned',
    dependencies: ['Build completion ledger', 'Client experience', 'GitHub Action'],
    implementation: 'Needs a canonical build-event record and an idempotent scheduled GitHub Action. This is not live yet.',
  },
  {
    id: 'market',
    title: 'Demand-led market',
    playerVerb: 'Sell or hold minerals',
    purpose: 'Raw and refined mineral prices move once a day; tomorrow’s demand is partly shaped by the work clients intend to do.',
    cadence: 'DAILY · AFTER CLIENT RUN',
    owner: 'MARKET',
    state: 'adapt',
    dependencies: ['Client growth', 'Mineral catalog', 'Refined goods', 'Price snapshot'],
    implementation: 'A local market and refined-goods sale path exist. Shared, demand-led daily pricing needs the client scheduler and an audited price snapshot.',
  },
  {
    id: 'refining',
    title: 'Off-world refining',
    playerVerb: 'Refine near the source',
    purpose: 'Players gain an early advantage by turning raw cargo into refined goods away from Earth.',
    cadence: 'PER REFINERY CYCLE',
    owner: 'PLAYER',
    state: 'adapt',
    dependencies: ['Storage', 'Refinery recipe', 'Off-world site'],
    implementation: 'The refinery loop exists. Its early off-world advantage and site integration are still a design and data-model extension.',
  },
  {
    id: 'sites',
    title: 'Sites and territory',
    playerVerb: 'Buy or lease access',
    purpose: 'Clients hold target territory. Planets begin as predefined sites where operations happen automatically after access is secured.',
    cadence: 'PER SITE AGREEMENT',
    owner: 'CLIENT + PLAYER',
    state: 'adapt',
    dependencies: ['Target catalog', 'Client territory', 'Site agreement', 'Surface operations'],
    implementation: 'Client territory and site access foundations exist, but the active permit/solo semantics must be replaced with purchasable or leaseable rights.',
  },
  {
    id: 'treasury',
    title: 'Public treasury',
    playerVerb: 'Fund access through deeds',
    purpose: 'Site-deed revenue funds citizen-science contributions and bankruptcy loans instead of disappearing into generic fees.',
    cadence: 'ON SITE AGREEMENT',
    owner: 'TREASURY',
    state: 'planned',
    dependencies: ['Site agreement revenue', 'Treasury ledger', 'Contribution rewards', 'Loan rules'],
    implementation: 'The player loan and citizen-science activities exist separately. A treasury ledger and payout rules do not yet exist.',
  },
  {
    id: 'citizen-science',
    title: 'Citizen science',
    playerVerb: 'Classify and discover',
    purpose: 'Real-data contributions remain a distinct scientific activity; treasury funding rewards contribution without turning crew into a science yield.',
    cadence: 'PER CONTRIBUTION',
    owner: 'PLAYER + TREASURY',
    state: 'live',
    dependencies: ['Instrument', 'Classification', 'Contribution record'],
    implementation: 'Classification and discovery flows exist. Treasury-funded rewards are planned; crew remain outside the citizen-science system.',
  },
]

export const NARRATIVE_LEDGER_STATE_LABEL: Record<NarrativeLedgerState, string> = {
  live: 'LIVE',
  adapt: 'ADAPT',
  planned: 'PLANNED',
}
