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
 * silently look implemented just because an adjacent system exists. It is also
 * the roadmap: mechanics removed before launch stay listed as planned, with how
 * they were built, so none is lost.
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
    dependencies: ['Client work', 'Base build', 'Mining', 'Test launches'],
    implementation: 'Mission Board and Launchpad already provide most routes; the single launch-day framing is the next presentation pass (SSL-675).',
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
    implementation: 'Client missions, payout, mission records, and client-experience progress are present. Legacy affinity terminology is retired from active player-facing surfaces.',
  },
  {
    id: 'friends',
    title: 'Friends',
    playerVerb: 'Add a callsign, trade gifts, visit',
    purpose: 'Friends make the early game social: a short callsign, a daily gift and a read-only look at what a friend has found.',
    cadence: 'DAILY GIFTS',
    owner: 'PLAYER',
    state: 'live',
    dependencies: ['Callsign', 'Friend requests', 'Daily gifts', 'Read-only visits', 'Presence'],
    implementation: 'Callsigns, requests, daily gifts (francs, minerals, blueprints), read-only visits, a 60-second presence heartbeat and the notification bell are live on web and iOS. A visit shows the friend’s discoveries; it used to show their field builds too, which are on this roadmap under Field sandbox.',
  },
  {
    id: 'orionids',
    title: 'Orionids and World Space Week',
    playerVerb: 'Catch the shower, earn sky badges',
    purpose: 'Time-boxed sky events give the early game a reason to look up: a shower run for the Orionids and one small badge per mission type for World Space Week.',
    cadence: 'EVENT WINDOWS',
    owner: 'EVENT',
    state: 'live',
    dependencies: ['Sky event calendar', 'Shower run', 'Event badges', 'Peak reminder'],
    implementation: 'The Orionids shower run (19 Oct to 8 Nov 2026) with fragment catches, event chrome, quiz and the peak-night reminder, plus World Space Week (4 to 10 Oct) mission-type badges, gold during the window and silver after, are live. The base-sky meteor weather and the pre-event teaser exist as components but are not mounted yet.',
  },
  {
    id: 'refining',
    title: 'Refining',
    playerVerb: 'Refine raw cargo at base',
    purpose: 'Raw cargo becomes refined goods in the Earth-side refinery queue, which sells for more than the ore.',
    cadence: 'PER REFINERY CYCLE',
    owner: 'PLAYER',
    state: 'live',
    dependencies: ['Storage', 'Refinery recipe', 'Market'],
    implementation: 'The Earth-side refinery queue and its recipes are live on web and iOS. Refining off-world is on this roadmap under Off-world builds.',
  },
  {
    id: 'citizen-science',
    title: 'Citizen science',
    playerVerb: 'Classify and discover',
    purpose: 'Real-data contributions remain a distinct scientific activity, owned by instruments rather than client work.',
    cadence: 'PER CONTRIBUTION',
    owner: 'PLAYER',
    state: 'live',
    dependencies: ['Instrument', 'Classification', 'Contribution record'],
    implementation: 'Classification and discovery flows exist. Treasury-funded contribution rewards are on this roadmap under Public treasury and loans.',
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
    implementation: 'The idempotent scheduled publisher and shared snapshot store are live. A canonical completed-build event feed still needs to supply the publisher input before client growth can be presented as live.',
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
    implementation: 'Raw and refined sale paths consume the shared, auditable daily snapshot when it is published. The missing completed-build event feed keeps the client-demand input in adaptation rather than presenting it as complete.',
  },
  {
    id: 'crew',
    title: 'Crew and Academy',
    playerVerb: 'Hire and train a crew',
    purpose: 'Crew make a base feel inhabited and give long-term spending a purpose beyond buildings.',
    cadence: 'PER TRAINING SESSION',
    owner: 'PLAYER',
    state: 'planned',
    dependencies: ['Academy structure', 'Crew sources', 'Training branches', 'Upkeep'],
    implementation: 'Planned. Previously built on web and iOS: an Astronaut Academy structure, hiring from crew sources, rehiring, training branches, assignment to structures, funded or unfunded upkeep, crew rooms and crew-transport rocket parts. Removed because nothing in the first sessions needed a crew.',
  },
  {
    id: 'skills',
    title: 'Skills and licences',
    playerVerb: 'Spend skill points',
    purpose: 'A long-term progression track that rewards research, separate from francs.',
    cadence: 'PER RESEARCH MILESTONE',
    owner: 'PLAYER',
    state: 'planned',
    dependencies: ['Research XP', 'Skill points', 'Licence grades'],
    implementation: 'Planned. Previously built on web and iOS: a skill tree spending skill points earned from research XP, with perks for extra laser charges, cargo, range and unlocking the ship customizer, plus licence grades. The perks are now the base values, so the customizer is always open.',
  },
  {
    id: 'sites',
    title: 'Sites and Surface Ops',
    playerVerb: 'Buy or lease access to a site',
    purpose: 'Clients hold target territory. Planets begin as predefined sites where operations happen automatically once access is secured.',
    cadence: 'PER SITE AGREEMENT',
    owner: 'CLIENT + PLAYER',
    state: 'planned',
    dependencies: ['Target catalog', 'Client territory', 'Site agreement', 'Settlement pads'],
    implementation: 'Planned. Previously built on web and iOS: scoped purchase or lease rights per site, a one-off deed charge, settlement pads, and ferry dispatch, retry, reconcile and acknowledge with local notifications. The Saturn plot claim went with it.',
  },
  {
    id: 'treasury',
    title: 'Public treasury and loans',
    playerVerb: 'Fund access through deeds',
    purpose: 'Site-deed revenue funds citizen-science contributions and bankruptcy loans instead of disappearing into generic fees.',
    cadence: 'ON SITE AGREEMENT',
    owner: 'TREASURY',
    state: 'planned',
    dependencies: ['Site agreement revenue', 'Treasury ledger', 'Contribution rewards', 'Loan rules'],
    implementation: 'Planned. Previously built on web: a treasury system that hydrated a shared, auditable ledger from deed revenue, and a bankruptcy-loan offer. Loan and contribution payouts never had their own authenticated transaction. The PocketBase collections are still in place.',
  },
  {
    id: 'field-sandbox',
    title: 'Field sandbox',
    playerVerb: 'Build and claim on a surface',
    purpose: 'A semi-sandbox on a landed body: place structures, craft, own territory and seed life.',
    cadence: 'PER FIELD VISIT',
    owner: 'PLAYER',
    state: 'planned',
    dependencies: ['Landing', 'Structure palette', 'Crafting', 'Territory claims', 'Biosphere seeds'],
    implementation: 'Planned. Previously built on web: a structure palette and crafting, ownership of what was built, territory claims by division, biosphere seeding with life stages, a field-operation mechanic and a rover drive pad. The biome and body codes stay.',
  },
  {
    id: 'community-hub',
    title: 'Community hub',
    playerVerb: 'Share and react',
    purpose: 'A feed where players post discoveries and worlds to friends or the public, with reactions and moderated comments.',
    cadence: 'ON SHARE',
    owner: 'PLAYER',
    state: 'planned',
    dependencies: ['Friends', 'Shares', 'Reactions', 'Comments and reports'],
    implementation: 'Planned. Previously built on web: a Community hub sheet with a feed by channel, shares with friend or public visibility, reactions, comments and a report threshold that hides comments. The server routes remain; only the monthly research total is still read.',
  },
  {
    id: 'offworld-build',
    title: 'Off-world builds',
    playerVerb: 'Build for yourself away from Earth',
    purpose: 'Players gain an early advantage by building and refining away from Earth, on their own programme.',
    cadence: 'PER BUILD',
    owner: 'PLAYER',
    state: 'planned',
    dependencies: ['Own programme', 'Off-world site', 'Build right', 'Off-world refinery'],
    implementation: 'Planned. Previously built on web and iOS: two own-programme build missions (a Mars settlement and a remote silo), the remote silo structure and an off-world refinery that recorded a target-specific deployment against an active build right. Only the generic client construction stays.',
  },
]

export const NARRATIVE_LEDGER_STATE_LABEL: Record<NarrativeLedgerState, string> = {
  live: 'LIVE',
  adapt: 'ADAPT',
  planned: 'PLANNED',
}
