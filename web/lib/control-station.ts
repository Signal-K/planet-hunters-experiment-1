import type { InstrumentSignal, InstrumentSignalKind } from '@/lib/systems/InstrumentFeedSystem'
import type { PlayerBadge } from '@/lib/data/sky-events'
import { WSW_EVENT_IDS, wswChip, wswEventIdsForInstrument, type WswChip } from '@/lib/wsw'

/**
 * Control Station registry (SSL-496).
 *
 * Equipment, locations, and projects are data. A piece of equipment lists the
 * projects it feeds, and a project can be listed on more than one piece.
 * Adding a later citizen-science project is a new project row plus the
 * equipment that feeds it. The station screen does not grow a new layout.
 *
 * Map coordinates live in the 640 by 320 diagram. The screen scales that
 * diagram; it does not hard-code a second layout per body.
 *
 * Name collision: this station is the instrument-hub route. It is not the
 * retired job-board building stored on `player.controlBuilt`.
 *
 * Ground telescopes exist only once the player has built one (their structure id
 * is in `player.placed`). Until then the station shows a build prompt in their
 * place, not a standing row. A built ground telescope reads the same unresolved
 * NEOCP digest the Deep Space Telescope publishes after the player launches it
 * (signal kind `deep-space`), and Open on its row forwards the first ready
 * signal to the existing asteroid-discovery screen. The digest stays gated on
 * that launch because the classify screen will not review candidates before
 * then, and this station does not change those screens.
 */

export const MAP_WIDTH = 640
export const MAP_HEIGHT = 320

export type StationPlayerFlag = 'transitSatelliteLaunchedAt' | 'deepSpaceTelescopeBuilt' | 'saturnImagerLaunchedAt'

/** Structure id a player places to own ground telescopes. */
export const GROUND_TELESCOPE_STRUCTURE_ID = 'ground-telescope'

export interface StationPlayer {
  freeOperations?: boolean
  placed?: readonly string[]
  badges?: Record<string, PlayerBadge>
  transitSatelliteLaunchedAt?: number | null
  deepSpaceTelescopeBuilt?: boolean
  saturnImagerLaunchedAt?: number | null
}

export interface StationBody {
  id: string
  name: string
  x: number
  y: number
  r: number
  kind: 'planet' | 'ringed'
}

export interface StationLocation {
  id: string
  bodyId: string
  zone: string | null
  groupLabel: string
}

export interface StationProject {
  id: string
  label: string
  signalKind: InstrumentSignalKind
}

export interface StationEquipment {
  id: string
  name: string
  locationId: string
  /** Projects this piece feeds, first project wins when several have items. */
  projectIds: readonly string[]
  /**
   * `built` needs `structureId` in `player.placed`. `standing` is on the
   * station with no action by the player; no current equipment uses it. A flag
   * appears after that launch.
   */
  presence: 'standing' | 'built' | StationPlayerFlag
  /** Structure the player builds to own this equipment, for `presence: 'built'`. */
  structureId?: string
  /** Which launch makes this piece's queue live. `always` needs no launch. */
  feedFlag: StationPlayerFlag | 'always'
  observingLabel: string
  readyLabel: string
  standbyLabel: string
  map: { x: number; y: number }
}

export interface ControlStationCatalog {
  bodies: readonly StationBody[]
  locations: readonly StationLocation[]
  projects: readonly StationProject[]
  equipment: readonly StationEquipment[]
}

export const CONTROL_STATION_BODIES: readonly StationBody[] = [
  { id: 'earth', name: 'Earth', x: 170, y: 150, r: 48, kind: 'planet' },
  { id: 'saturn', name: 'Saturn', x: 490, y: 142, r: 36, kind: 'ringed' },
]

export const CONTROL_STATION_LOCATIONS: readonly StationLocation[] = [
  { id: 'earth-surface', bodyId: 'earth', zone: 'Surface', groupLabel: 'Earth · Surface' },
  { id: 'earth-orbit', bodyId: 'earth', zone: 'Orbit', groupLabel: 'Earth · Orbit' },
  { id: 'saturn', bodyId: 'saturn', zone: null, groupLabel: 'Saturn' },
]

export const CONTROL_STATION_PROJECTS: readonly StationProject[] = [
  { id: 'exoplanet-hunters', label: 'Exoplanet Hunters', signalKind: 'transit' },
  { id: 'asteroid-discovery', label: 'Asteroid discovery', signalKind: 'deep-space' },
  { id: 'saturn-storms', label: 'Saturn storms', signalKind: 'saturn' },
]

export const CONTROL_STATION_EQUIPMENT: readonly StationEquipment[] = [
  {
    id: 'ground-telescopes',
    name: 'Ground telescopes',
    locationId: 'earth-surface',
    projectIds: ['asteroid-discovery'],
    presence: 'built',
    structureId: GROUND_TELESCOPE_STRUCTURE_ID,
    feedFlag: 'deepSpaceTelescopeBuilt',
    observingLabel: 'Observing',
    readyLabel: 'Observing',
    standbyLabel: 'Standing by',
    map: { x: 148, y: 172 },
  },
  {
    id: 'transit-telescope',
    name: 'Transit Telescope',
    locationId: 'earth-orbit',
    projectIds: ['exoplanet-hunters'],
    presence: 'transitSatelliteLaunchedAt',
    feedFlag: 'transitSatelliteLaunchedAt',
    observingLabel: 'Observing',
    readyLabel: 'Observing',
    standbyLabel: 'Standing by',
    map: { x: 188, y: 68 },
  },
  {
    id: 'deep-space-telescope',
    name: 'Deep Space Telescope',
    locationId: 'earth-orbit',
    projectIds: ['asteroid-discovery'],
    presence: 'deepSpaceTelescopeBuilt',
    feedFlag: 'deepSpaceTelescopeBuilt',
    observingLabel: 'Observing',
    readyLabel: 'Observing',
    standbyLabel: 'Standing by',
    map: { x: 252, y: 178 },
  },
  {
    id: 'saturn-imager',
    name: 'Saturn satellite',
    locationId: 'saturn',
    projectIds: ['saturn-storms'],
    presence: 'saturnImagerLaunchedAt',
    feedFlag: 'saturnImagerLaunchedAt',
    observingLabel: 'Observing',
    readyLabel: 'Frame ready',
    standbyLabel: 'Standing by',
    map: { x: 608, y: 248 },
  },
]

export const CONTROL_STATION_CATALOG: ControlStationCatalog = {
  bodies: CONTROL_STATION_BODIES,
  locations: CONTROL_STATION_LOCATIONS,
  projects: CONTROL_STATION_PROJECTS,
  equipment: CONTROL_STATION_EQUIPMENT,
}

export interface ControlStationProjectTag {
  id: string
  label: string
}

export interface ControlStationRow {
  equipmentId: string
  name: string
  status: string
  live: boolean
  projects: ControlStationProjectTag[]
  readyCount: number
  openSignal: InstrumentSignal | null
  previewKind: InstrumentSignalKind | null
  /** True for the placeholder shown where the player has not built this equipment yet. */
  buildPrompt: boolean
  /** World Space Week badges this equipment serves. */
  wsw: WswChip[]
}

export interface ControlStationGroup {
  locationId: string
  label: string
  rows: ControlStationRow[]
}

export interface ControlStationMarker {
  equipmentId: string
  name: string
  x: number
  y: number
  readyCount: number
}

export interface ControlStationFilter {
  id: string
  label: string
}

export interface ControlStationModel {
  filters: ControlStationFilter[]
  activeBodyId: string
  bodies: StationBody[]
  markers: ControlStationMarker[]
  groups: ControlStationGroup[]
  emptyLabel: string | null
  /** Every World Space Week sky-event badge with its earned or open state. */
  skyBadges: WswChip[]
}

function flagOn(player: StationPlayer, flag: StationPlayerFlag | 'always'): boolean {
  if (flag === 'always') return true
  const value = player[flag]
  return value === true || (typeof value === 'number' && value > 0)
}

function isBuilt(equipment: StationEquipment, player: StationPlayer): boolean {
  if (equipment.presence === 'standing') return true
  if (equipment.presence === 'built') return !!equipment.structureId && !!player.placed?.includes(equipment.structureId)
  return flagOn(player, equipment.presence)
}

function isListed(equipment: StationEquipment, player: StationPlayer): boolean {
  return !!player.freeOperations && isBuilt(equipment, player)
}

/** Equipment the player can build but has not: shown as a prompt, never as a live row. */
function isBuildPrompt(equipment: StationEquipment, player: StationPlayer): boolean {
  return !!player.freeOperations && equipment.presence === 'built' && !isBuilt(equipment, player)
}

function readySignals(
  equipment: StationEquipment,
  projects: readonly StationProject[],
  signals: readonly InstrumentSignal[],
): InstrumentSignal[] {
  const seen = new Set<string>()
  const ready: InstrumentSignal[] = []
  for (const projectId of equipment.projectIds) {
    const project = projects.find(item => item.id === projectId)
    if (!project) continue
    for (const signal of signals) {
      const key = `${signal.kind}:${signal.id}`
      if (signal.kind !== project.signalKind || seen.has(key)) continue
      seen.add(key)
      ready.push(signal)
    }
  }
  return ready
}

function rowFor(
  equipment: StationEquipment,
  projects: readonly StationProject[],
  signals: readonly InstrumentSignal[],
  player: StationPlayer,
  hold: boolean,
  now: number,
): ControlStationRow {
  const wsw = wswEventIdsForInstrument(equipment.id).flatMap(id => wswChip(id, player.badges, now) ?? [])
  const feedLive = flagOn(player, equipment.feedFlag)
  const tags = equipment.projectIds.flatMap(projectId => {
    const project = projects.find(item => item.id === projectId)
    return project ? [{ id: project.id, label: project.label }] : []
  })
  const ready = feedLive && !hold ? readySignals(equipment, projects, signals) : []
  const status = !feedLive
    ? equipment.standbyLabel
    : hold
      ? 'Acquiring'
      : ready.length > 0
        ? equipment.readyLabel
        : equipment.observingLabel
  return {
    equipmentId: equipment.id,
    name: equipment.name,
    status,
    live: feedLive && !hold,
    projects: tags,
    readyCount: ready.length,
    openSignal: ready[0] ?? null,
    previewKind: ready[0]?.kind ?? null,
    buildPrompt: false,
    wsw,
  }
}

function promptRow(equipment: StationEquipment, projects: readonly StationProject[]): ControlStationRow {
  return {
    equipmentId: equipment.id,
    name: equipment.name,
    status: 'None built',
    live: false,
    projects: equipment.projectIds.flatMap(projectId => {
      const project = projects.find(item => item.id === projectId)
      return project ? [{ id: project.id, label: project.label }] : []
    }),
    readyCount: 0,
    openSignal: null,
    previewKind: null,
    buildPrompt: true,
    wsw: [],
  }
}

export function buildControlStation(input: {
  player: StationPlayer
  signals: readonly InstrumentSignal[]
  bodyId: string
  /** True only while the first feed response is still outstanding. */
  loading?: boolean
  catalog?: ControlStationCatalog
  now?: number
}): ControlStationModel {
  const now = input.now ?? Date.now()
  const catalog = input.catalog ?? CONTROL_STATION_CATALOG
  const hold = !!input.loading
  const listed = catalog.equipment.filter(equipment => isListed(equipment, input.player))
  const prompts = catalog.equipment.filter(equipment => isBuildPrompt(equipment, input.player))
  const locationOf = (equipment: StationEquipment) => catalog.locations.find(location => location.id === equipment.locationId)
  const bodyIds = new Set([...listed, ...prompts].flatMap(equipment => {
    const location = locationOf(equipment)
    return location ? [location.bodyId] : []
  }))
  const bodies = catalog.bodies.filter(body => bodyIds.has(body.id))
  const filters: ControlStationFilter[] = [
    { id: 'all', label: 'All' },
    ...bodies.map(body => ({ id: body.id, label: body.name })),
  ]
  const activeBodyId = filters.some(filter => filter.id === input.bodyId) ? input.bodyId : 'all'
  const inBody = (equipment: StationEquipment) => activeBodyId === 'all' || locationOf(equipment)?.bodyId === activeBodyId
  const visible = listed.filter(equipment => {
    if (activeBodyId === 'all') return true
    return locationOf(equipment)?.bodyId === activeBodyId
  })

  const groups: ControlStationGroup[] = []
  for (const location of catalog.locations) {
    const rows = [
      ...prompts.filter(equipment => equipment.locationId === location.id && inBody(equipment)).map(equipment => promptRow(equipment, catalog.projects)),
      ...visible
        .filter(equipment => equipment.locationId === location.id)
        .map(equipment => rowFor(equipment, catalog.projects, input.signals, input.player, hold, now)),
    ]
    if (rows.length === 0) continue
    groups.push({ locationId: location.id, label: location.groupLabel, rows })
  }

  const markers: ControlStationMarker[] = listed.map(equipment => {
    const row = rowFor(equipment, catalog.projects, input.signals, input.player, hold, now)
    return {
      equipmentId: equipment.id,
      name: equipment.name,
      x: equipment.map.x,
      y: equipment.map.y,
      readyCount: row.readyCount,
    }
  })

  const emptyLabel = groups.length > 0
    ? null
    : input.player.freeOperations
      ? 'No equipment at this location.'
      : 'Equipment links once Free Operations is open.'

  const skyBadges = WSW_EVENT_IDS.flatMap(id => wswChip(id, input.player.badges, now) ?? [])
  return { filters, activeBodyId, bodies, markers, groups, emptyLabel, skyBadges }
}
