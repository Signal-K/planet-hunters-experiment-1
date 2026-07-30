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

export interface ShipRoomSlot {
  id: string
  kind: ShipRoomKind
  label: string
  x: number
  y: number
  w: number
  h: number
}

export interface ShipInteriorLayout {
  rocketId: string
  exteriorSrc: string
  containerSrc: string
  slots: ShipRoomSlot[]
}

export const SHIP_ROOM_ASSETS: Record<ShipRoomKind, string> = {
  cockpit: '/game/assets/rooms/cockpit_t1.png',
  engine: '/game/assets/rooms/engine_room_t1.png',
  booster: '/game/assets/rooms/mining_room_t1.png',
  payload: '/game/assets/rooms/cargo_bay_t1.png',
  // Dedicated art for these later room kinds is not in the current asset pack.
  // Reuse the closest existing room panels so confirmed builds never request
  // missing images while keeping the slot kinds distinct in game state.
  'fuel-stage': '/game/assets/rooms/engine_room_t1.png',
  fairing: '/game/assets/rooms/cockpit_t1.png',
  'docking-port': '/game/assets/rooms/cargo_bay_t1.png',
  'heat-shield': '/game/assets/rooms/mining_room_t1.png',
  'crew-module': '/game/assets/rooms/cockpit_t1.png',
}

export const SHIP_INTERIOR_LAYOUTS: Record<string, ShipInteriorLayout> = {
  sr1: {
    rocketId: 'sr1',
    exteriorSrc: '/game/assets/ships/ship_sr1.png',
    containerSrc: '/game/assets/ships/containers/sr1_cutaway.png',
    slots: [
      // x/y/w/h are % of canvas (720×300). Interior bays span x≈7–79%, y≈13–84%.
      // Left-to-right: cockpit (near nose), payload, booster, engine room.
      { id: 'sr1-cockpit', kind: 'cockpit',  label: 'Cockpit',     x:  7.0, y: 13.0, w: 14.5, h: 71.0 },
      { id: 'sr1-payload', kind: 'payload',  label: 'Payload Bay', x: 22.0, y: 13.0, w: 19.5, h: 71.0 },
      { id: 'sr1-booster', kind: 'booster',  label: 'Boosters',    x: 42.0, y: 13.0, w: 19.5, h: 71.0 },
      { id: 'sr1-engine',  kind: 'engine',   label: 'Engine Room', x: 62.0, y: 13.0, w: 17.0, h: 71.0 },
      // A post-onboarding bolt-on section, outside the original four-room hull.
      // It stays visually separate from the payload bay so fitting quarters
      // never replaces or obscures cargo capacity.
      { id: 'sr1-crew', kind: 'crew-module', label: 'Crew Module', x: 80.5, y: 20.0, w: 12.5, h: 57.0 },
    ],
  },
}

export function getShipInteriorLayout(rocketId: string): ShipInteriorLayout | undefined {
  return SHIP_INTERIOR_LAYOUTS[rocketId]
}
