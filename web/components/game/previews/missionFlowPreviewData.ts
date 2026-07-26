// Ported from the Open Design prototype at
// open-design/.od/projects/00593938-0432-4fe2-ab6f-c5213e91038a/landnam-client-bonus.html
// (the `jobs` object in its inline <script>). Local-only preview data — not
// wired to the real catalog (compare `lib/data.ts` MISSION_TEMPLATES/CLIENT_SLOTS).

export type JobKey = 'helios' | 'meridian' | 'vanta' | 'orbitex' | 'market'

export interface JobDef {
  key: JobKey
  avatar: string
  biome: 'silicon' | 'dust' | 'metal' | 'space' | 'market'
  token: string
  sceneLabel: string
  jobType: string
  kind: 'client' | 'market'
  kicker: string
  title: string
  subline: string
  map: string
  summary: string
  cargo: string
  premium: string
  affinity: string
  yield: string
  target: string
  hold: string
  chips: { label: string; value: string; empty?: boolean }[]
  copy: string
}

export const JOBS: Record<JobKey, JobDef> = {
  helios: {
    key: 'helios',
    avatar: 'helios',
    biome: 'silicon',
    token: 'HP',
    sceneLabel: '8 Si',
    jobType: 'Client job',
    kind: 'client',
    kicker: 'Live client job',
    title: 'Array Feed',
    subline: 'Helios wants Silicon',
    map: 'Bring 8 Silicon. The +20% changes credits, not mining yield.',
    summary: 'Cargo Required: 8 Silicon. Client Premium: +20% payout on this job.',
    cargo: 'Bring 8 Silicon.',
    premium: '+20% payout on this job.',
    affinity: '+2.5% per completed Helios job. Cap +15%.',
    yield: 'Does not increase silicon mined.',
    target: 'Select a body that can produce 8 Silicon. The bonus still only changes the final payout.',
    hold: '8 Silicon cargo slot.',
    copy: 'Cargo: 8 Silicon. Premium: +20% payout on this job.',
    chips: [
      { label: 'Cargo', value: '8 Si' },
      { label: 'Premium', value: '+20%' },
      { label: 'Affinity', value: '+2.5%' },
    ],
  },
  meridian: {
    key: 'meridian',
    avatar: 'meridian',
    biome: 'dust',
    token: 'MO',
    sceneLabel: '6 Si',
    jobType: 'Client job',
    kind: 'client',
    kicker: 'Live client job',
    title: 'Dust Sinter',
    subline: 'Meridian wants Silicon',
    map: 'Bring 6 Silicon. Affinity grows after completed Meridian jobs.',
    summary: 'Cargo Required: 6 Silicon. Affinity grows after completed Meridian jobs.',
    cargo: 'Bring 6 Silicon.',
    premium: '+16% payout on this job.',
    affinity: '+1.5% per completed Meridian job. Cap +15%.',
    yield: 'Does not increase silicon mined.',
    target: 'Select a body that can produce 6 Silicon. Premium changes payout only.',
    hold: '6 Silicon cargo slot.',
    copy: 'Cargo: 6 Silicon. Affinity grows after completed Meridian jobs.',
    chips: [
      { label: 'Cargo', value: '6 Si' },
      { label: 'Premium', value: '+16%' },
      { label: 'Affinity', value: '+1.5%' },
    ],
  },
  vanta: {
    key: 'vanta',
    avatar: 'vanta',
    biome: 'metal',
    token: 'VL',
    sceneLabel: '7 Ni',
    jobType: 'Client job',
    kind: 'client',
    kicker: 'Live client job',
    title: 'Nickel Bite',
    subline: 'Vanta wants Nickel',
    map: 'Bring 7 Nickel. Premium changes credits, not cargo collected.',
    summary: 'Cargo Required: 7 Nickel. Premium changes credits, not cargo collected.',
    cargo: 'Bring 7 Nickel.',
    premium: '+18% payout on this job.',
    affinity: '+2.0% per completed Vanta job. Cap +15%.',
    yield: 'Does not increase nickel mined.',
    target: 'Select a body that can produce 7 Nickel. Premium changes payout only.',
    hold: '7 Nickel cargo slot.',
    copy: 'Cargo: 7 Nickel. Premium changes credits, not cargo collected.',
    chips: [
      { label: 'Cargo', value: '7 Ni' },
      { label: 'Premium', value: '+18%' },
      { label: 'Affinity', value: '+2.0%' },
    ],
  },
  orbitex: {
    key: 'orbitex',
    avatar: 'orbitex',
    biome: 'space',
    token: 'OS',
    sceneLabel: 'Payload',
    jobType: 'Launch job',
    kind: 'client',
    kicker: 'Non-mining job',
    title: 'Relay Loft',
    subline: 'Orbitex wants a satellite launch',
    map: 'Payload: 1 relay satellite. The +14% changes launch payout only.',
    summary: 'Payload Required: 1 relay satellite. Client Premium: +14% launch payout.',
    cargo: 'Launch 1 relay satellite.',
    premium: '+14% payout on this launch job.',
    affinity: '+2.0% per completed Orbitex job. Cap +15%.',
    yield: 'No mined cargo is added by this bonus.',
    target: 'Pick a valid orbital slot. This is a launch job, not a mining run.',
    hold: '1 satellite payload bay.',
    copy: 'Payload: 1 relay satellite. Premium changes launch payout only.',
    chips: [
      { label: 'Payload', value: '1 Sat' },
      { label: 'Premium', value: '+14%' },
      { label: 'Affinity', value: '+2.0%' },
    ],
  },
  market: {
    key: 'market',
    avatar: 'market',
    biome: 'market',
    token: 'MV',
    sceneLabel: 'Market',
    jobType: 'Market run',
    kind: 'market',
    kicker: 'Self-directed run',
    title: 'Open Haul',
    subline: 'Self-directed market run',
    map: 'No client bonus. Sell the haul at market value.',
    summary: 'No client bonus. Pick a target and sell the haul at market value.',
    cargo: 'Any cargo you choose.',
    premium: 'No client premium.',
    affinity: 'No affinity gain.',
    yield: 'Market value only.',
    target: 'Pick any valid target. No client premium or affinity applies.',
    hold: 'Any configured cargo slot.',
    copy: 'No client bonus. Mine what you want and sell the haul at market value.',
    chips: [
      { label: 'Cargo', value: 'Any' },
      { label: 'Premium', value: 'None', empty: true },
      { label: 'Affinity', value: 'None', empty: true },
    ],
  },
}

export const JOB_ORDER: JobKey[] = ['helios', 'meridian', 'vanta', 'orbitex', 'market']

export type StageKey = 'mission' | 'target' | 'rocket' | 'relay'

export const GUIDE_CARDS = [
  { icon: 'Si', title: 'Cargo required', body: 'Collect the listed cargo. Example: Cargo Required: 8 Silicon.' },
  { icon: '+20', title: 'Client premium', body: 'Extra payout on this client job. It does not increase silicon mined.' },
  { icon: '+2.5', title: 'Affinity', body: 'Relationship bonus that grows after completed jobs for the same client. Cap +15%.' },
  { icon: 'MV', title: 'Market run', body: 'No client bonus. Sell the haul at market value.' },
]
