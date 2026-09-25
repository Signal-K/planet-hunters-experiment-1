// Programme standard for citizen-science and creative mechanics (SSL-319).
//
// Every citizen-science feed and every creative/sharing mechanic in Landnam —
// current and future — is described by one `ProgrammeDefinition`. The shape
// encodes the ecosystem rule from the Star Sailors Community Research
// Programme decision: a programme asks a real question; players create or
// improve contributions; other players (or a rule) turn them into an accepted
// result; a named recipient receives it; and the result is shared back.
//
// Canonical write-up: ZenNotes
// `projects/landnam/decisions/citizen-science-and-creative-programme-standard.md`.
// This file is the executable half of that standard: screens, feeds and the
// community hub read programmes from `PROGRAMMES`, never from ad-hoc copy.

export type ProgrammeKind = 'citizen-science' | 'creative'

/**
 * The lifecycle every contribution moves through. Stages are ordered; a
 * programme may skip `review` (single-player creative work) but never
 * `contribute` or `shared`.
 */
export type ProgrammeStage = 'observe' | 'contribute' | 'review' | 'accepted' | 'shared'

export const PROGRAMME_STAGES: readonly ProgrammeStage[] = ['observe', 'contribute', 'review', 'accepted', 'shared']

/** How much fictional framing a programme may carry (narrative boundary decision, 2026-07-08). */
export type FramingTier = 'none' | 'speculative'

/** Which in-game entity a programme's feed hangs off. Citizen science is a feed from an owned instrument, never a mission. */
export type ProgrammeSource =
  | { kind: 'instrument'; instrumentId: string }
  | { kind: 'field'; surface: 'takeon' }
  | { kind: 'player'; surface: 'base' | 'world' }

/** The scientific or creative verb a programme adds to the ecosystem. */
export type ProgrammeVerb = 'classify' | 'time' | 'reconcile' | 'measure' | 'discover' | 'document' | 'build' | 'share'

export interface ConsensusRule {
  /** Independent agreeing contributions needed for acceptance. 1 = no peer review. */
  agreeing: number
  /** Who or what performs the acceptance step. */
  reviewer: 'peers' | 'rule' | 'partner'
}

export interface ProgrammeRecipient {
  /** Real project or partner name, e.g. "Planet Hunters TESS". Never a fictional org. */
  name: string
  url?: string
  /** What the recipient receives once a result is accepted. */
  receives: string
}

export interface ProgrammeSharing {
  /** Where an accepted result surfaces for other players. */
  hubChannel: HubChannel
  /** Default visibility of a new share from this programme. */
  defaultVisibility: ShareVisibility
  /** Whether other players may comment on a shared result. */
  discussion: boolean
}

export interface ProgrammeRewardPolicy {
  /** Never francs for citizen science (the work is the mechanic). */
  francs: false | number
  /** Progression consequence, if any. */
  progression?: 'discovery-record' | 'instrument-history' | 'territory' | 'biosphere'
}

export interface ProgrammeDefinition {
  id: string
  kind: ProgrammeKind
  verb: ProgrammeVerb
  title: string
  /** One-line real-world framing, in plain terms. No lore. */
  question: string
  /** Named dataset or activity the player works on. */
  dataset: string
  /** Provenance string shown wherever a contribution or result is displayed. */
  provenance: string
  source: ProgrammeSource
  /** UTC-daily, per-visit, or on-demand. */
  cadence: 'daily' | 'per-visit' | 'on-demand'
  stages: readonly ProgrammeStage[]
  consensus: ConsensusRule
  recipient: ProgrammeRecipient
  sharing: ProgrammeSharing
  reward: ProgrammeRewardPolicy
  framing: FramingTier
  /** PostHog milestone events, one per stage the programme emits. */
  events: Partial<Record<ProgrammeStage, string>>
  /** Screens/components that implement the programme, for agents. */
  surfaces: readonly string[]
  /** True when a real, live producer exists in code today. */
  live: boolean
}

// ── Community hub vocabulary (shared with lib/data/community.ts) ───────────

export type HubChannel = 'discoveries' | 'creations' | 'worlds' | 'discussion'

export type ShareVisibility = 'private' | 'friends' | 'public'

// ── Registry ───────────────────────────────────────────────────────────────

const TESS_TRANSIT_SEARCH: ProgrammeDefinition = {
  id: 'tess-transit-search',
  kind: 'citizen-science',
  verb: 'classify',
  title: 'Transit search',
  question: 'Does this TESS light curve show a planet passing in front of its star?',
  dataset: 'TESS candidate light curves',
  provenance: 'Real candidate data · NASA TESS via Planet Hunters TESS',
  source: { kind: 'instrument', instrumentId: 'transit-telescope' },
  cadence: 'daily',
  stages: ['observe', 'contribute', 'review', 'accepted', 'shared'],
  consensus: { agreeing: 5, reviewer: 'peers' },
  recipient: { name: 'Planet Hunters TESS', url: 'https://www.zooniverse.org/projects/nora-dot-eisner/planet-hunters-tess', receives: 'Consensus classifications with candidate ids' },
  sharing: { hubChannel: 'discoveries', defaultVisibility: 'public', discussion: true },
  reward: { francs: false, progression: 'discovery-record' },
  framing: 'none',
  events: { contribute: 'tess_classification', accepted: 'exoplanet_confirmed' },
  surfaces: ['TessDiscoveryScreen', 'InstrumentFeedSystem', 'ObservatoryChart'],
  live: true,
}

const NEOCP_ASTEROID_CONFIRMATION: ProgrammeDefinition = {
  id: 'neocp-asteroid-confirmation',
  kind: 'citizen-science',
  verb: 'classify',
  title: 'Asteroid confirmation',
  question: 'Is this near-Earth object candidate a real moving body?',
  dataset: 'Minor Planet Center NEO Confirmation Page',
  provenance: 'Real candidate data · Minor Planet Center NEOCP',
  source: { kind: 'instrument', instrumentId: 'deep-space-telescope' },
  cadence: 'daily',
  stages: ['observe', 'contribute', 'review', 'accepted', 'shared'],
  consensus: { agreeing: 5, reviewer: 'peers' },
  recipient: { name: 'Minor Planet Center', url: 'https://minorplanetcenter.net/iau/NEO/toconfirm_tabular.html', receives: 'Consensus confirmations with NEOCP designations' },
  sharing: { hubChannel: 'discoveries', defaultVisibility: 'public', discussion: true },
  reward: { francs: false, progression: 'discovery-record' },
  framing: 'none',
  events: { contribute: 'asteroid_classification', accepted: 'asteroid_confirmed' },
  surfaces: ['AsteroidDiscoveryScreen', 'InstrumentFeedSystem'],
  live: true,
}

const FIELD_ANOMALY_SURVEY: ProgrammeDefinition = {
  id: 'field-anomaly-survey',
  kind: 'citizen-science',
  verb: 'document',
  title: 'Field anomaly survey',
  question: 'What unusual surface features does the rover find, and where?',
  dataset: 'Rover field scans on visited bodies',
  provenance: 'Simulated terrain · procedural, not a real dataset',
  source: { kind: 'field', surface: 'takeon' },
  cadence: 'per-visit',
  stages: ['observe', 'contribute', 'shared'],
  consensus: { agreeing: 1, reviewer: 'rule' },
  recipient: { name: 'The Collective', receives: 'Documented anomalies on the shared body record' },
  sharing: { hubChannel: 'worlds', defaultVisibility: 'friends', discussion: true },
  reward: { francs: false, progression: 'territory' },
  framing: 'none',
  events: { contribute: 'anomaly_documented' },
  surfaces: ['TakeOnMount', 'SurfaceOpsScreen'],
  live: true,
}

const SURFACE_BUILDS: ProgrammeDefinition = {
  id: 'surface-builds',
  kind: 'creative',
  verb: 'build',
  title: 'Surface builds',
  question: 'What can you build on a world you have reached?',
  dataset: 'Player field structures (roads, refineries, factories, habitats)',
  provenance: 'Player creation',
  source: { kind: 'field', surface: 'takeon' },
  cadence: 'on-demand',
  stages: ['contribute', 'shared'],
  consensus: { agreeing: 1, reviewer: 'rule' },
  recipient: { name: 'Community hub', receives: 'A read-only snapshot of the build' },
  sharing: { hubChannel: 'creations', defaultVisibility: 'friends', discussion: true },
  reward: { francs: false, progression: 'territory' },
  framing: 'none',
  events: { contribute: 'sandbox_structure_built', shared: 'creation_shared' },
  surfaces: ['SandboxBuildPalette', 'SurfaceOpsScreen', 'RoverMiningScreen'],
  live: true,
}

const BASE_SHOWCASE: ProgrammeDefinition = {
  id: 'base-showcase',
  kind: 'creative',
  verb: 'share',
  title: 'Base showcase',
  question: 'How has your Earth base grown?',
  dataset: 'Earth base layout and unlocked blueprints',
  provenance: 'Player creation',
  source: { kind: 'player', surface: 'base' },
  cadence: 'on-demand',
  stages: ['contribute', 'shared'],
  consensus: { agreeing: 1, reviewer: 'rule' },
  recipient: { name: 'Friends', receives: 'A read-only base visit' },
  sharing: { hubChannel: 'creations', defaultVisibility: 'friends', discussion: true },
  reward: { francs: false },
  framing: 'none',
  events: { shared: 'base_shared' },
  surfaces: ['FriendsSheet', 'friends.go /api/friends/base'],
  live: true,
}

const BIOSPHERE_SEEDING: ProgrammeDefinition = {
  id: 'biosphere-seeding',
  kind: 'creative',
  verb: 'discover',
  title: 'Biosphere seeding',
  question: 'Could life take hold on a world you discovered?',
  dataset: 'Discovered exoplanet candidates with habitable radius and equilibrium temperature',
  provenance: 'Fictional extrapolation from real TESS candidate parameters',
  source: { kind: 'player', surface: 'world' },
  cadence: 'on-demand',
  stages: ['observe', 'contribute', 'accepted', 'shared'],
  consensus: { agreeing: 1, reviewer: 'rule' },
  recipient: { name: 'SETI programme (in-game)', receives: 'Seeded-world record' },
  sharing: { hubChannel: 'worlds', defaultVisibility: 'public', discussion: true },
  reward: { francs: false, progression: 'biosphere' },
  // Latest-unlocked tier only: gated behind the full tech tree and the SETI
  // programme, so the speculative framing never reaches early/mid game.
  framing: 'speculative',
  events: { contribute: 'biosphere_seeded' },
  surfaces: ['TargetSphere', 'TransitScreen', 'OwnershipSystem'],
  live: true,
}

export const PROGRAMMES: readonly ProgrammeDefinition[] = [
  TESS_TRANSIT_SEARCH,
  NEOCP_ASTEROID_CONFIRMATION,
  FIELD_ANOMALY_SURVEY,
  SURFACE_BUILDS,
  BASE_SHOWCASE,
  BIOSPHERE_SEEDING,
]

export function programmeById(id: string): ProgrammeDefinition | undefined {
  return PROGRAMMES.find(p => p.id === id)
}

export function programmesForChannel(channel: HubChannel): ProgrammeDefinition[] {
  return PROGRAMMES.filter(p => p.sharing.hubChannel === channel)
}

// ── Template + validation ──────────────────────────────────────────────────

/**
 * Starting point for a new programme. Fill every field; `validateProgramme`
 * rejects the template as-is so a placeholder can never ship.
 */
export function programmeTemplate(id: string, kind: ProgrammeKind): ProgrammeDefinition {
  return {
    id,
    kind,
    verb: kind === 'creative' ? 'build' : 'classify',
    title: '',
    question: '',
    dataset: '',
    provenance: '',
    source: kind === 'creative' ? { kind: 'field', surface: 'takeon' } : { kind: 'instrument', instrumentId: '' },
    cadence: kind === 'creative' ? 'on-demand' : 'daily',
    stages: kind === 'creative' ? ['contribute', 'shared'] : ['observe', 'contribute', 'review', 'accepted', 'shared'],
    consensus: kind === 'creative' ? { agreeing: 1, reviewer: 'rule' } : { agreeing: 5, reviewer: 'peers' },
    recipient: { name: '', receives: '' },
    sharing: { hubChannel: kind === 'creative' ? 'creations' : 'discoveries', defaultVisibility: 'friends', discussion: true },
    reward: { francs: false },
    framing: 'none',
    events: {},
    surfaces: [],
    live: false,
  }
}

export interface ProgrammeValidation {
  ok: boolean
  problems: string[]
}

export function validateProgramme(p: ProgrammeDefinition): ProgrammeValidation {
  const problems: string[] = []
  if (!p.id) problems.push('id is required')
  if (!p.title) problems.push('title is required')
  if (!p.question) problems.push('question is required: say what the player is finding out, in plain terms')
  if (!p.dataset) problems.push('dataset is required: name the real project or the player activity')
  if (!p.provenance) problems.push('provenance is required: shown wherever a contribution appears')
  if (!p.recipient.name || !p.recipient.receives) problems.push('recipient must name who receives accepted results and what they get')
  if (p.source.kind === 'instrument' && !p.source.instrumentId) problems.push('instrument programmes must name the owned instrument')
  if (!p.stages.includes('contribute')) problems.push('stages must include contribute')
  if (!p.stages.includes('shared')) problems.push('stages must include shared: every programme surfaces in the hub')
  const order = p.stages.map(s => PROGRAMME_STAGES.indexOf(s))
  if (order.some((v, i) => i > 0 && v <= order[i - 1])) problems.push('stages must follow observe → contribute → review → accepted → shared')
  if (p.kind === 'citizen-science') {
    if (p.reward.francs !== false) problems.push('citizen science never pays francs: the work is the mechanic')
    if (p.consensus.agreeing > 1 && !p.stages.includes('review')) problems.push('peer consensus needs a review stage')
    if (p.stages.includes('review') && !p.stages.includes('accepted')) problems.push('review must lead to an accepted stage')
    if (p.framing === 'speculative') problems.push('citizen-science programmes carry no fictional framing; speculative framing is for the latest creative tier only')
  }
  if (p.consensus.agreeing < 1) problems.push('consensus.agreeing must be at least 1')
  if (p.framing === 'speculative' && p.reward.progression !== 'biosphere') problems.push('speculative framing is only permitted on the biosphere (latest-unlocked) tier')
  if (!p.events.contribute && !p.events.shared) problems.push('at least one PostHog milestone event is required')
  return { ok: problems.length === 0, problems }
}
