import type { InstrumentSignal, InstrumentSignalKind } from '@/lib/systems/InstrumentFeedSystem'

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
 * Ground telescopes are a standing Earth-surface network. They have no
 * candidate pool of their own. They read the same unresolved NEOCP digest the
 * Deep Space Telescope publishes after the player launches it (signal kind
 * `deep-space`). Both rows show that one queue, and Open on either row
 * forwards the first ready signal to the existing asteroid-discovery screen.
 * The digest stays gated on that launch because the classify screen will not
 * review candidates before then, and this station does not change those
 * screens. Before the launch the ground row is listed with nothing to open.
 */

export const MAP_WIDTH = 640
export const MAP_HEIGHT = 320

export type StationPlayerFlag = 'transitSatelliteLaunchedAt' | 'deepSpaceTelescopeBuilt' | 'saturnImagerLaunchedAt'

export interface StationPlayer {
  freeOperations?: boolean
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
  /** `standing` is on the station without a launch. A flag appears after that launch. */
  presence: 'standing' | StationPlayerFlag
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
    presence: 'standing',
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
}

function flagOn(player: StationPlayer, flag: StationPlayerFlag | 'always'): boolean {
  if (flag === 'always') return true
  const value = player[flag]
  return value === true || (typeof value === 'number' && value > 0)
}

function isListed(equipment: StationEquipment, player: StationPlayer): boolean {
  if (!player.freeOperations) return false
  if (equipment.presence === 'standing') return true
  return flagOn(player, equipment.presence)
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
): ControlStationRow {
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
  }
}

export function buildControlStation(input: {
  player: StationPlayer
  signals: readonly InstrumentSignal[]
  bodyId: string
  /** True only while the first feed response is still outstanding. */
  loading?: boolean
  catalog?: ControlStationCatalog
}): ControlStationModel {
  const catalog = input.catalog ?? CONTROL_STATION_CATALOG
  const hold = !!input.loading
  const listed = catalog.equipment.filter(equipment => isListed(equipment, input.player))
  const locationOf = (equipment: StationEquipment) => catalog.locations.find(location => location.id === equipment.locationId)
  const bodyIds = new Set(listed.flatMap(equipment => {
    const location = locationOf(equipment)
    return location ? [location.bodyId] : []
  }))
  const bodies = catalog.bodies.filter(body => bodyIds.has(body.id))
  const filters: ControlStationFilter[] = [
    { id: 'all', label: 'All' },
    ...bodies.map(body => ({ id: body.id, label: body.name })),
  ]
  const activeBodyId = filters.some(filter => filter.id === input.bodyId) ? input.bodyId : 'all'
  const visible = listed.filter(equipment => {
    if (activeBodyId === 'all') return true
    return locationOf(equipment)?.bodyId === activeBodyId
  })

  const groups: ControlStationGroup[] = []
  for (const location of catalog.locations) {
    const rows = visible
      .filter(equipment => equipment.locationId === location.id)
      .map(equipment => rowFor(equipment, catalog.projects, input.signals, input.player, hold))
    if (rows.length === 0) continue
    groups.push({ locationId: location.id, label: location.groupLabel, rows })
  }

  const markers: ControlStationMarker[] = listed.map(equipment => {
    const row = rowFor(equipment, catalog.projects, input.signals, input.player, hold)
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

  return { filters, activeBodyId, bodies, markers, groups, emptyLabel }
}
