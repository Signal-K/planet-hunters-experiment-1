export type ShipRoomKind =
  | 'engine'
  | 'booster'
  | 'cockpit'
  | 'payload'
  | 'fuel-stage'
  | 'fairing'
  | 'docking-port'
  | 'heat-shield'
  | 'crew-module'
  | 'lander'

export interface ShipRoomSlot {
  id: string
  kind: ShipRoomKind
  label: string
  x: number
  y: number
  w: number
  h: number
  // Home grid cell (column/row, in `ShipGridConfig` cell units) — where this
  // room sits the first time it's installed. The player can drag it to any
  // other open cell afterwards (ShipCustomizerCanvas), so gx/gy is a default
  // arrangement, not a fixed requirement the way kind-matching is.
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

// Grid-cell footprint per room kind — how many cells a room's icon occupies
// when placed, independent of its home position.
export const SHIP_ROOM_FOOTPRINT: Record<ShipRoomKind, { w: number; h: number }> = {
  cockpit: { w: 2, h: 2 },
  payload: { w: 2, h: 2 },
  booster: { w: 2, h: 1 },
  engine: { w: 2, h: 1 },
  'fuel-stage': { w: 2, h: 2 },
  fairing: { w: 1, h: 1 },
  'docking-port': { w: 1, h: 1 },
  'heat-shield': { w: 1, h: 1 },
  'crew-module': { w: 2, h: 1 },
  lander: { w: 2, h: 1 },
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
  booster: '/game/assets/rooms/mining_room_t1_icon.png',
  payload: '/game/assets/rooms/cargo_bay_t1_icon.png',
  'fuel-stage': '/game/assets/rooms/fuel_stage_t1_icon.png',
  fairing: '/game/assets/rooms/fairing_t1_icon.png',
  'docking-port': '/game/assets/rooms/docking_port_t1_icon.png',
  'heat-shield': '/game/assets/rooms/heat_shield_t1_icon.png',
  'crew-module': '/game/assets/rooms/crew_module_t1_icon.png',
  lander: '/game/assets/rooms/lander_t1_icon.png',
}

// Full interior dioramas (floor + walls + window + door + furniture) — the
// OTO-reference detail art, used by ShipInteriorPreview's per-step detail
// panel where a single room gets real screen space, not the grid.
export const SHIP_ROOM_DETAIL_ASSETS: Record<ShipRoomKind, string> = {
  cockpit: '/game/assets/rooms/cockpit_t1.png',
  engine: '/game/assets/rooms/engine_room_t1.png',
  booster: '/game/assets/rooms/mining_room_t1.png',
  payload: '/game/assets/rooms/cargo_bay_t1.png',
  'fuel-stage': '/game/assets/rooms/fuel_stage_t1.png',
  fairing: '/game/assets/rooms/fairing_t1.png',
  'docking-port': '/game/assets/rooms/docking_port_t1.png',
  'heat-shield': '/game/assets/rooms/heat_shield_t1.png',
  'crew-module': '/game/assets/rooms/crew_module_t1.png',
  lander: '/game/assets/rooms/lander_t1.png',
}

export const SHIP_INTERIOR_LAYOUTS: Record<string, ShipInteriorLayout> = {
  explorer: {
    rocketId: 'explorer',
    exteriorSrc: '/game/assets/ships/ship_sr1.png',
    containerSrc: '/game/assets/ships/containers/sr1_cutaway.png',
    // 9x3 cell grid over the cutaway's opened bay (x 7–93%, y 13–84%) —
    // one continuous Pixel-Starships-style grid rather than separate boxed
    // compartments; rooms are dragged between cells within it.
    grid: { cols: 9, rows: 3, area: { x: 7.0, y: 13.0, w: 86.0, h: 71.0 } },
    slots: [
      // x/y/w/h below are each room's home-cell rect in the same % units,
      // kept only so existing bounds-checks/tests have a concrete rect;
      // gx/gy (grid cell units) are what ShipCustomizerCanvas actually uses
      // to place and drag rooms.
      { id: 'explorer-cockpit', kind: 'cockpit',  label: 'Cockpit',     x:  7.0, y: 13.0, w: 19.1, h: 47.3, gx: 0, gy: 0 },
      { id: 'explorer-payload', kind: 'payload',  label: 'Payload Bay', x: 26.1, y: 13.0, w: 19.1, h: 47.3, gx: 2, gy: 0 },
      { id: 'explorer-booster', kind: 'booster',  label: 'Boosters',    x: 45.2, y: 13.0, w: 19.1, h: 23.7, gx: 4, gy: 0 },
      { id: 'explorer-engine',  kind: 'engine',   label: 'Engine Room', x: 45.2, y: 36.7, w: 19.1, h: 23.7, gx: 4, gy: 1 },
      // Post-onboarding bolt-ons — installed into the same grid, further aft.
      { id: 'explorer-crew', kind: 'crew-module', label: 'Crew Module', x: 64.3, y: 13.0, w: 19.1, h: 23.7, gx: 6, gy: 0 },
      { id: 'explorer-lander', kind: 'lander', label: 'Lander Module', x: 64.3, y: 36.7, w: 19.1, h: 23.7, gx: 6, gy: 1 },
    ],
  },
}

export function getShipInteriorLayout(rocketId: string): ShipInteriorLayout | undefined {
  return SHIP_INTERIOR_LAYOUTS[rocketId] ?? (rocketId === 'sr1' ? SHIP_INTERIOR_LAYOUTS.explorer : undefined)
}
