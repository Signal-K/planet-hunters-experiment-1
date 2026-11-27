
export type ShipRoomKind =
  | 'engine'
  | 'booster'
  | 'cockpit'
  | 'payload'
  | 'fuel-stage'
  | 'fairing'
  | 'docking-port'
  | 'heat-shield'
  | 'lander'

export interface ShipRoomSlot {
  id: string
  kind: ShipRoomKind
  label: string
  x: number
  y: number
  w: number
  h: number
  // Home grid cell (column/row, in `ShipGridConfig` cell units). The hangar
  // preview highlights this kind on the shared kit rocket; gx/gy stays a
  // default arrangement, not a fixed requirement the way kind-matching is.
  gx: number
  gy: number
}

// Pixel-Starships-style interior: one continuous cell grid overlaid on the
// cutaway art, rooms occupy 1x1-2x2 footprints and can be dragged between
// open cells. `area` is the grid's bounding rect in the same x/y/w/h percent
// units as `ShipRoomSlot`, so both share one coordinate system.
export interface ShipGridConfig {
  cols: number
  rows: number
  area: { x: number; y: number; w: number; h: number }
}

export interface ShipInteriorLayout {
  rocketId: string
  exteriorSrc: string
  containerSrc: string
  grid: ShipGridConfig
  slots: ShipRoomSlot[]
}

// Grid-cell icons: bold, single-shape, high-contrast, flat-camera renders
// (`rooms.py`'s `*_icon` builds) sized for the customiser's small grid cells
// (~70-142px, several visible at once). Kept deliberately separate from
// SHIP_ROOM_DETAIL_ASSETS below — a full walls+floor+furniture diorama reads
// fine at a big single-room preview size but turns to illegible mush at grid
// scale, aspect-ratio distortion or not (2026-08-03, fourth pass: Liam's two
// reference images — a Pixel Starships grid and an Out There: Omega room
// interior — were for these two different UI contexts, not one style
// answering both).
export const SHIP_ROOM_ASSETS: Record<ShipRoomKind, string> = {
  cockpit: '/game/assets/rooms/cockpit_t1_icon.png',
  engine: '/game/assets/rooms/engine_room_t1_icon.png',
  booster: '/game/assets/rooms/booster_t1_icon.png',
  payload: '/game/assets/rooms/cargo_bay_t1_icon.png',
  'fuel-stage': '/game/assets/rooms/fuel_stage_t1_icon.png',
  fairing: '/game/assets/rooms/fairing_t1_icon.png',
  'docking-port': '/game/assets/rooms/docking_port_t1_icon.png',
  'heat-shield': '/game/assets/rooms/heat_shield_t1_icon.png',
  lander: '/game/assets/rooms/lander_t1_icon.png',
}

// Full interior dioramas (floor + walls + window + door + furniture) — the
// OTO-reference detail art, used by ShipInteriorPreview's per-step detail
// panel where a single room gets real screen space, not the grid.
export const SHIP_ROOM_DETAIL_ASSETS: Record<ShipRoomKind, string> = {
  cockpit: '/game/assets/rooms/cockpit_t1.png',
  engine: '/game/assets/rooms/engine_room_t1.png',
  booster: '/game/assets/rooms/booster_t1.png',
  payload: '/game/assets/rooms/cargo_bay_t1.png',
  'fuel-stage': '/game/assets/rooms/fuel_stage_t1.png',
  fairing: '/game/assets/rooms/fairing_t1.png',
  'docking-port': '/game/assets/rooms/docking_port_t1.png',
  'heat-shield': '/game/assets/rooms/heat_shield_t1.png',
  lander: '/game/assets/rooms/lander_t1.png',
}
