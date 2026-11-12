import type { InstrumentSignal, InstrumentSignalKind } from '@/lib/systems/InstrumentFeedSystem'
import type { ControlStationModel, ControlStationRow } from '@/lib/control-station'
import { parseRadioFilename } from '@/lib/radio-meteors'
import { chainRecordings, chainStage, LEONIDS_CHAIN } from '@/lib/orionids/chain'
import { probeSectorsWaiting, probesInOrbit } from '@/lib/probes/survey-probe'

/**
 * Control station sky (SSL-730, Liam's drawing of 2026-11-01).
 *
 * The station is a sky map you look at through your telescopes. Each dot is an
 * anomaly: unexplored ones are waiting for you to classify (tapping one opens
 * its tool), explored ones you have already classified, and catalogue ones are
 * objects you know about that are not citizen-science items (bodies your
 * instruments watch, exoplanets you discovered). The View switch picks which
 * set shows; choosing a telescope filters the map to what that telescope finds.
 *
 * Telescopes are one row per place, not per equipment record: the Space
 * Telescope is one telescope with two feeds (SSL-531). Community instruments
 * (ORI-1, later shower receivers) are rows in COMMUNITY_INSTRUMENTS: they
 * join once the community launches them and open their own screen, since
 * their recordings come from a live queue, not the daily instrument feed.
 */

/** What an anomaly is: one of the instrument feeds, or a community radio recording. */
export type SkyKind = InstrumentSignalKind | 'radio' | 'probe'

export type SkyView = 'explored' | 'unexplored' | 'all'
export type AnomalyState = 'unexplored' | 'explored' | 'catalogue'
export type AnomalyShape = 'planet' | 'asteroid' | 'ringed' | 'body' | 'echo' | 'probe'

export const SKY_VIEWS: readonly { id: SkyView; label: string }[] = [
  { id: 'explored', label: 'Explored' },
  { id: 'unexplored', label: 'Unexplored' },
  { id: 'all', label: 'All' },
]

export interface StationTelescopeDef {
  id: string
  name: string
  /** Where it sits in the horizon strip under the map. */
  place: 'surface' | 'orbit' | 'offworld' | 'relay' | 'probe'
  /** Equipment records (control-station.ts) this telescope stands for. */
  equipmentIds: readonly string[]
  /** What it finds, in the player's words. */
  finds: string
}

export const STATION_TELESCOPES: readonly StationTelescopeDef[] = [
  { id: 'ground', name: 'Ground telescope', place: 'surface', equipmentIds: ['ground-telescopes'], finds: 'Asteroids' },
  { id: 'space', name: 'Space telescope', place: 'orbit', equipmentIds: ['transit-telescope', 'deep-space-telescope'], finds: 'Planets · asteroids' },
  { id: 'saturn', name: 'Saturn satellite', place: 'offworld', equipmentIds: ['saturn-imager'], finds: 'Storms' },
]

export interface CommunityInstrumentDef {
  id: string
  callsign: string
  finds: string
  /** The screen its recordings are checked on. */
  screen: 'radio-meteors'
  launched: (player: SkyPlayer) => boolean
  /** Recordings the player still owes the current mission, 0 when none is open. */
  owed: (player: SkyPlayer) => number
}

/** Recordings Orionids mission 3 asks for (web lib/orionids/chain.ts). */
const ORI1_MISSION_CHECKS = 3

export const COMMUNITY_INSTRUMENTS: readonly CommunityInstrumentDef[] = [
  {
    id: 'ori-1',
    callsign: 'ORI-1',
    finds: 'Meteor echoes',
    screen: 'radio-meteors',
    // The community launches ORI-1 after Orionids mission 2 (the rover debrief).
    launched: player => (player.orionidsEventStage ?? 0) >= 2,
    owed: player => (player.orionidsEventStage === 2 ? Math.max(0, ORI1_MISSION_CHECKS - Object.keys(player.radioMeteorClassifications ?? {}).length) : 0),
  },
  {
    // SSL-831: the community launches LEO-1 when the player's Leonids shower run comes home.
    id: 'leo-1',
    callsign: 'LEO-1',
    finds: 'Meteor echoes',
    screen: 'radio-meteors',
    launched: player => chainStage(player, LEONIDS_CHAIN.eventId) >= 1,
    owed: player => (chainStage(player, LEONIDS_CHAIN.eventId) === 1 ? Math.max(0, LEONIDS_CHAIN.radioTarget - chainRecordings(player, LEONIDS_CHAIN)) : 0),
  },
]

/** Which signal kinds each piece of equipment can see. Asteroids are seen from the ground and from orbit. */
const EQUIPMENT_KINDS: Record<string, readonly InstrumentSignalKind[]> = {
  'ground-telescopes': ['deep-space'],
  'transit-telescope': ['transit'],
  'deep-space-telescope': ['deep-space'],
  'saturn-imager': ['saturn'],
}

export interface StationTelescope {
  id: string
  name: string
  place: StationTelescopeDef['place']
  finds: string
  /** Built or launched. False only for a build prompt (the ground telescope before it is built). */
  built: boolean
  live: boolean
  status: string
  readyCount: number
  kinds: SkyKind[]
  /** Community instruments say whose they are. */
  community: boolean
}

export interface SkyAnomaly {
  id: string
  label: string
  detail: string
  state: AnomalyState
  shape: AnomalyShape
  kind: SkyKind | null
  /** 0..1 across and down the map. */
  x: number
  y: number
  /** Set for unexplored anomalies: opening it brings up the classify tool. */
  signal: InstrumentSignal | null
  /** Set for a community instrument's live queue: opening it goes to that screen. */
  screen: CommunityInstrumentDef['screen'] | 'probe-scan' | null
}

export interface SkyPlayer {
  tessClassifications?: Record<string, { verdict?: string; submittedAt?: number }>
  asteroidClassifications?: Record<string, { verdict?: string; submittedAt?: number }>
  saturnClassifications?: Record<string, { verdict?: string; submittedAt?: number }>
  discoveredExoplanetTargets?: Record<string, { id: string; name: string }>
  saturnImagerLaunchedAt?: number | null
  orionidsEventStage?: number
  showerChains?: Record<string, { stage: number; at: number }>
  probes?: Record<string, import('@/lib/probes/survey-probe').ProbeRecord>
  radioMeteorClassifications?: Record<string, { filename?: string; boxes?: readonly unknown[]; submittedAt?: number }>
}

export interface StationHistory {
  total: number
  recent: { id: string; label: string; detail: string }[]
}

function hash(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** A stable spot in the sky for an id, kept off the map's edges. */
export function skySpot(id: string): { x: number; y: number } {
  const h = hash(id)
  return { x: 0.07 + ((h & 0xffff) / 0xffff) * 0.86, y: 0.12 + (((h >>> 16) & 0xffff) / 0xffff) * 0.76 }
}

const SHAPE_FOR_KIND: Record<InstrumentSignalKind, AnomalyShape> = { transit: 'planet', 'deep-space': 'asteroid', saturn: 'ringed' }
const KIND_NOUN: Record<InstrumentSignalKind, string> = { transit: 'Transit', 'deep-space': 'Asteroid', saturn: 'Storm frame' }

const VERDICT_WORDS: Record<string, string> = {
  planet: 'Planet candidate',
  not_planet: 'Not a planet',
  likely_real: 'Likely real',
  likely_artifact: 'Artifact',
  yes: 'Storm seen',
  no: 'No storm',
  maybe: 'Maybe a storm',
  unsure: 'Unsure',
}

function verdictText(verdict: string | undefined): string {
  const words = verdict ? VERDICT_WORDS[verdict] : undefined
  return words ? `Classified · ${words}` : 'Classified'
}

function shortId(id: string): string {
  const tail = id.slice(id.lastIndexOf('-') + 1)
  return tail.length > 10 ? tail.slice(-8) : tail
}

/** Most recent first, capped so a long career does not fill the map. */
const EXPLORED_CAP = 36

function explored(player: SkyPlayer): (SkyAnomaly & { at: number })[] {
  const sources: [InstrumentSignalKind, SkyPlayer['tessClassifications']][] = [
    ['transit', player.tessClassifications],
    ['deep-space', player.asteroidClassifications],
    ['saturn', player.saturnClassifications],
  ]
  const out: (SkyAnomaly & { at: number })[] = []
  for (const [kind, records] of sources) {
    for (const [id, record] of Object.entries(records ?? {})) {
      out.push({
        id: `${kind}:${id}`,
        label: `${KIND_NOUN[kind]} ${shortId(id)}`,
        detail: verdictText(record?.verdict),
        state: 'explored',
        shape: SHAPE_FOR_KIND[kind],
        kind,
        ...skySpot(`${kind}:${id}`),
        signal: null,
        screen: null,
        at: record?.submittedAt ?? 0,
      })
    }
  }
  for (const [id, record] of Object.entries(player.radioMeteorClassifications ?? {})) {
    const echoes = record?.boxes?.length ?? 0
    out.push({
      id: `radio:${id}`,
      label: `Echo · ${parseRadioFilename(record?.filename ?? '').station}`,
      detail: echoes === 1 ? 'Checked · 1 echo' : `Checked · ${echoes} echoes`,
      state: 'explored',
      shape: 'echo',
      kind: 'radio',
      ...skySpot(`radio:${id}`),
      signal: null,
      screen: null,
      at: record?.submittedAt ?? 0,
    })
  }
  return out.sort((a, b) => b.at - a.at)
}

/** Saturn's place on the map when no telescope is singled out. */
export const SATURN_SPOT = { x: 0.86, y: 0.24 }

function catalogue(player: SkyPlayer): SkyAnomaly[] {
  const out: SkyAnomaly[] = []
  if (player.saturnImagerLaunchedAt) {
    out.push({ id: 'body:saturn', label: 'Saturn', detail: 'Watched by your Saturn satellite', state: 'catalogue', shape: 'ringed', kind: 'saturn', ...SATURN_SPOT, signal: null, screen: null })
  }
  for (const target of Object.values(player.discoveredExoplanetTargets ?? {})) {
    out.push({ id: `exo:${target.id}`, label: target.name, detail: 'Exoplanet you discovered', state: 'catalogue', shape: 'body', kind: 'transit', ...skySpot(`exo:${target.id}`), signal: null, screen: null })
  }
  return out
}

export function stationTelescopes(model: ControlStationModel): StationTelescope[] {
  const rows = model.groups.flatMap(group => group.rows)
  return STATION_TELESCOPES.flatMap(def => {
    const mine: ControlStationRow[] = rows.filter(row => def.equipmentIds.includes(row.equipmentId))
    if (mine.length === 0) return []
    const built = mine.some(row => !row.buildPrompt)
    const live = mine.some(row => row.live)
    const readyCount = mine.reduce((sum, row) => sum + row.readyCount, 0)
    const status = !built ? 'Not built' : readyCount > 0 ? `${readyCount} ready` : live ? 'Observing' : mine[0].status
    const kinds = [...new Set(def.equipmentIds.flatMap(id => EQUIPMENT_KINDS[id] ?? []))]
    return [{ id: def.id, name: def.name, place: def.place, finds: def.finds, built, live, status, readyCount, kinds, community: false }]
  })
}

export function communityTelescopes(player: SkyPlayer): StationTelescope[] {
  return COMMUNITY_INSTRUMENTS.filter(def => def.launched(player)).map(def => {
    const owed = def.owed(player)
    return {
      id: def.id,
      name: def.callsign,
      place: 'relay' as const,
      finds: def.finds,
      built: true,
      live: true,
      status: owed > 0 ? `${owed} to check` : 'Listening',
      readyCount: owed,
      kinds: ['radio' as const],
      community: true,
    }
  })
}

/** SSL-773: every survey probe in orbit, as one instrument. Its readings waiting today are the ready count. */
export function probeTelescopes(player: SkyPlayer, now: number): StationTelescope[] {
  const bodies = probesInOrbit(player)
  if (!bodies.length) return []
  const left = probeSectorsWaiting(player, now)
  return [{
    id: 'probes',
    name: bodies.length === 1 ? 'Survey probe' : `${bodies.length} survey probes`,
    place: 'probe',
    finds: 'Deposits',
    built: true,
    live: true,
    status: left > 0 ? `${left} new sector${left === 1 ? '' : 's'} mapped` : 'Mapping',
    readyCount: left,
    kinds: ['probe'],
    community: false,
  }]
}

/** The probes' waiting readings, as one unexplored anomaly that opens the probe console. */
function probeQueue(player: SkyPlayer, now: number): SkyAnomaly[] {
  if (probeSectorsWaiting(player, now) <= 0) return []
  return [{
    id: 'queue:probes',
    label: 'Probe survey',
    detail: 'New sectors mapped · deposits found',
    state: 'unexplored',
    shape: 'probe',
    kind: 'probe',
    ...skySpot('queue:probes'),
    signal: null,
    screen: 'probe-scan',
  }]
}

/** The live queue of each launched community instrument, as one unexplored anomaly that opens its screen. */
function communityQueues(player: SkyPlayer): SkyAnomaly[] {
  return COMMUNITY_INSTRUMENTS.filter(def => def.launched(player)).map(def => ({
    id: `queue:${def.id}`,
    label: `${def.callsign} recordings`,
    detail: `${def.finds} · ready to check`,
    state: 'unexplored' as const,
    shape: 'echo' as const,
    kind: 'radio' as const,
    ...skySpot(`queue:${def.id}`),
    signal: null,
    screen: def.screen,
  }))
}

export function buildStationSky(input: {
  player: SkyPlayer
  signals: readonly InstrumentSignal[]
  view: SkyView
  /** Only what this telescope finds; null for every telescope. */
  telescope: StationTelescope | null
  /** For the probes' daily downlink. */
  now?: number
}): SkyAnomaly[] {
  const open: SkyAnomaly[] = input.signals.map(signal => ({
    id: `${signal.kind}:${signal.id}`,
    label: signal.title,
    detail: `${KIND_NOUN[signal.kind]} · ready to classify`,
    state: 'unexplored',
    shape: SHAPE_FOR_KIND[signal.kind],
    kind: signal.kind,
    ...skySpot(`${signal.kind}:${signal.id}`),
    signal,
    screen: null,
  }))
  open.push(...communityQueues(input.player), ...probeQueue(input.player, input.now ?? Date.now()))
  const done = explored(input.player).slice(0, EXPLORED_CAP).map(({ at: _at, ...rest }) => rest)
  const known = catalogue(input.player)
  const shown = input.view === 'unexplored' ? open : input.view === 'explored' ? done : [...known, ...done, ...open]
  const kinds = input.telescope?.kinds
  const filtered = spreadSpots(kinds ? shown.filter(item => item.kind !== null && kinds.includes(item.kind)) : shown)
  return input.telescope?.id === 'saturn' ? focusSaturn(filtered, known) : filtered
}

/** Where Saturn sits on the map when the Saturn satellite is on: the middle of the reticle. */
export const SATURN_FOCUS = { x: 0.5, y: 0.5 }

/**
 * SSL-826: switching the Saturn satellite on swings the map to Saturn. Saturn sits in the middle of the reticle in
 * every view, and the storm frames the satellite took sit in a ring around it, so the map shows where it is looking.
 */
export function focusSaturn(items: readonly SkyAnomaly[], known: readonly SkyAnomaly[]): SkyAnomaly[] {
  const body = known.find(item => item.id === 'body:saturn')
  const rest = items.filter(item => item.id !== 'body:saturn')
  const ring = rest.map((item, i) => {
    const band = Math.floor(i / 6)
    const angle = -Math.PI / 2 + ((i % 6) + band / 2) * (Math.PI / 3)
    const r = 0.17 + 0.09 * band
    return { ...item, x: SATURN_FOCUS.x + (Math.cos(angle) * r) / FIELD_ASPECT, y: SATURN_FOCUS.y + Math.sin(angle) * r }
  })
  return body ? [{ ...body, ...SATURN_FOCUS }, ...ring] : ring
}

/** The sky field is about this much wider than tall, so a gap across reads shorter than the same gap down. */
const FIELD_ASPECT = 1.35
/** About one 44px tap target on the iPad field. */
const MIN_GAP = 0.085

/**
 * SSL-748: hashed spots can land two targets on top of each other (a gold blip under Saturn on Liam's iPad). Push any
 * pair closer than one tap target apart, a few passes, keeping them inside the field. Deterministic: same input, same map.
 */
export function spreadSpots<T extends { x: number; y: number }>(items: readonly T[], gap = MIN_GAP): T[] {
  const spots = items.map(item => ({ x: item.x, y: item.y }))
  const clampX = (x: number) => Math.min(0.93, Math.max(0.07, x))
  const clampY = (y: number) => Math.min(0.88, Math.max(0.12, y))
  for (let pass = 0; pass < 24; pass++) {
    let moved = false
    for (let i = 0; i < spots.length; i++) {
      for (let j = i + 1; j < spots.length; j++) {
        const a = spots[i], b = spots[j]
        let dx = (b.x - a.x) * FIELD_ASPECT
        let dy = b.y - a.y
        let dist = Math.hypot(dx, dy)
        if (dist >= gap) continue
        if (dist < 1e-6) { dx = 0.6; dy = 0.8; dist = 1 } // exactly stacked: part them on a fixed diagonal
        const push = (gap - Math.min(dist, gap)) / 2 + 0.002
        const ux = dx / dist, uy = dy / dist
        a.x = clampX(a.x - (ux * push) / FIELD_ASPECT); a.y = clampY(a.y - uy * push)
        b.x = clampX(b.x + (ux * push) / FIELD_ASPECT); b.y = clampY(b.y + uy * push)
        moved = true
      }
    }
    if (!moved) break
  }
  return items.map((item, i) => (spots[i].x === item.x && spots[i].y === item.y ? item : { ...item, ...spots[i] }))
}

export function stationHistory(player: SkyPlayer): StationHistory {
  const all = explored(player)
  return { total: all.length, recent: all.slice(0, 3).map(item => ({ id: item.id, label: item.label, detail: item.detail })) }
}
