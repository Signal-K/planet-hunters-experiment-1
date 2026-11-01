import type { InstrumentSignal, InstrumentSignalKind } from '@/lib/systems/InstrumentFeedSystem'
import type { ControlStationModel, ControlStationRow } from '@/lib/control-station'

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
 * Telescope is one telescope with two feeds (SSL-531). A later instrument
 * (ORI-1, a shower receiver) is one more entry in STATION_TELESCOPES.
 */

export type SkyView = 'explored' | 'unexplored' | 'all'
export type AnomalyState = 'unexplored' | 'explored' | 'catalogue'
export type AnomalyShape = 'planet' | 'asteroid' | 'ringed' | 'body'

export const SKY_VIEWS: readonly { id: SkyView; label: string }[] = [
  { id: 'explored', label: 'Explored' },
  { id: 'unexplored', label: 'Unexplored' },
  { id: 'all', label: 'All' },
]

export interface StationTelescopeDef {
  id: string
  name: string
  /** Where it sits in the horizon strip under the map. */
  place: 'surface' | 'orbit' | 'offworld'
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
  kinds: InstrumentSignalKind[]
}

export interface SkyAnomaly {
  id: string
  label: string
  detail: string
  state: AnomalyState
  shape: AnomalyShape
  kind: InstrumentSignalKind | null
  /** 0..1 across and down the map. */
  x: number
  y: number
  /** Set for unexplored anomalies: opening it brings up the classify tool. */
  signal: InstrumentSignal | null
}

export interface SkyPlayer {
  tessClassifications?: Record<string, { verdict?: string; submittedAt?: number }>
  asteroidClassifications?: Record<string, { verdict?: string; submittedAt?: number }>
  saturnClassifications?: Record<string, { verdict?: string; submittedAt?: number }>
  discoveredExoplanetTargets?: Record<string, { id: string; name: string }>
  saturnImagerLaunchedAt?: number | null
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
        at: record?.submittedAt ?? 0,
      })
    }
  }
  return out.sort((a, b) => b.at - a.at)
}

function catalogue(player: SkyPlayer): SkyAnomaly[] {
  const out: SkyAnomaly[] = []
  if (player.saturnImagerLaunchedAt) {
    out.push({ id: 'body:saturn', label: 'Saturn', detail: 'Watched by your Saturn satellite', state: 'catalogue', shape: 'ringed', kind: 'saturn', x: 0.86, y: 0.24, signal: null })
  }
  for (const target of Object.values(player.discoveredExoplanetTargets ?? {})) {
    out.push({ id: `exo:${target.id}`, label: target.name, detail: 'Exoplanet you discovered', state: 'catalogue', shape: 'body', kind: 'transit', ...skySpot(`exo:${target.id}`), signal: null })
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
    return [{ id: def.id, name: def.name, place: def.place, finds: def.finds, built, live, status, readyCount, kinds }]
  })
}

export function buildStationSky(input: {
  player: SkyPlayer
  signals: readonly InstrumentSignal[]
  view: SkyView
  /** Only what this telescope finds; null for every telescope. */
  telescope: StationTelescope | null
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
  }))
  const done = explored(input.player).slice(0, EXPLORED_CAP).map(({ at: _at, ...rest }) => rest)
  const known = catalogue(input.player)
  const shown = input.view === 'unexplored' ? open : input.view === 'explored' ? done : [...known, ...done, ...open]
  const kinds = input.telescope?.kinds
  return kinds ? shown.filter(item => item.kind !== null && kinds.includes(item.kind)) : shown
}

export function stationHistory(player: SkyPlayer): StationHistory {
  const all = explored(player)
  return { total: all.length, recent: all.slice(0, 3).map(item => ({ id: item.id, label: item.label, detail: item.detail })) }
}
