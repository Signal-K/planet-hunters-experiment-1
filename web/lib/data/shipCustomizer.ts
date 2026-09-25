import type { ShipRoomKind } from './shipRooms'
import { SHIP_ROOM_ASSETS, SHIP_ROOM_DETAIL_ASSETS } from './shipRooms'
import { CREW_MODULE_PRICE, LANDER_MODULE_PRICE } from './economy'

export const CUSTOMIZER_BUILD_SEQUENCE: ShipRoomKind[] = ['engine', 'booster', 'cockpit', 'payload']

export const BUILD_SEQUENCES: Record<number, ShipRoomKind[]> = {
  1: ['engine', 'booster', 'cockpit', 'payload'],
  2: ['fuel-stage', 'engine', 'booster', 'cockpit', 'fairing', 'payload'],
  3: ['fuel-stage', 'engine', 'booster', 'cockpit', 'fairing', 'payload', 'docking-port'],
  4: ['fuel-stage', 'engine', 'booster', 'cockpit', 'fairing', 'payload', 'docking-port', 'heat-shield'],
}

export function getBuildSequence(
  missionsDone: number,
  crewModuleResearched = false,
  landingResearched = false,
): ShipRoomKind[] {
  const bonus: ShipRoomKind[] = [
    ...(crewModuleResearched ? (['crew-module'] as const) : []),
    ...(landingResearched ? (['lander'] as const) : []),
  ]
  if (missionsDone >= 6) return [...BUILD_SEQUENCES[4], ...bonus]
  if (missionsDone >= 4) return [...BUILD_SEQUENCES[3], ...bonus]
  if (missionsDone >= 2) return BUILD_SEQUENCES[2]
  return BUILD_SEQUENCES[1]
}

export interface CustomizerPart {
  id: string
  name: string
  kind: ShipRoomKind
  price: number
  successBonus: number
  mass: number
  power: number
  description: string
  unlockedAtMissions?: number
  // Tiered room art (mining laser/booster, storage silos/payload, engine,
  // crew-module — see tools/blender/models/rooms.py's 2026-08-04 pass).
  // `tier` is cosmetic/display only, same role as `Part.tier` in parts.ts —
  // `unlockedAtMissions` is what actually gates availability. `img`/
  // `detailImg` override the kind-level SHIP_ROOM_ASSETS/DETAIL_ASSETS
  // default (see getRoomArt in shipRooms.ts) for parts whose kind has real
  // tiered art; kinds that don't (cockpit, fuel-stage, fairing,
  // docking-port, heat-shield, lander) omit these and fall back to the
  // single shared asset.
  tier?: number
  img?: string
  detailImg?: string
}

export interface OwnedCustomizerPart {
  uid: string
  partId: string
}

export type InstalledCustomizerParts = Record<string, string | undefined>
export type InstalledCustomizerPartsByKind = Partial<Record<ShipRoomKind, string>>

export interface CustomizerBuildState {
  balance: number
  installed: InstalledCustomizerPartsByKind
  confirmed: boolean
}

export interface CustomizerBuildResult {
  state: CustomizerBuildState
  ok: boolean
  reason?: 'confirmed' | 'incomplete-build' | 'insufficient-balance' | 'unknown-part'
}

export const CUSTOMIZER_PARTS: CustomizerPart[] = [
  // ── Engine ──────────────────────────────────────────────────────────
  {
    id: 'ion-thruster-t1',
    name: 'Ion Thruster T1',
    kind: 'engine',
    price: 6_400_000,
    successBonus: 16,
    mass: 2,
    power: 5,
    description: 'Reliable starter engine. Improves launch stability and near-orbit reach.',
    tier: 1,
    img: '/game/assets/rooms/engine_room_t1_icon.png',
    detailImg: '/game/assets/rooms/engine_room_t1.png',
  },
  {
    id: 'pulse-thruster-t1',
    name: 'Pulse Thruster T1',
    kind: 'engine',
    price: 7_600_000,
    successBonus: 20,
    mass: 2,
    power: 6,
    description: 'Higher thrust margin. Better chance on heavier payload builds.',
    tier: 1,
    img: '/game/assets/rooms/engine_room_t1_icon.png',
    detailImg: '/game/assets/rooms/engine_room_t1.png',
  },
  {
    id: 'fusion-thruster-t2',
    name: 'Fusion Thruster T2',
    kind: 'engine',
    price: 10_500_000,
    successBonus: 26,
    mass: 3,
    power: 8,
    description: 'Twin-fed fusion burn. Noticeably steadier ascent on heavier hulls.',
    unlockedAtMissions: 2,
    tier: 2,
    img: '/game/assets/rooms/engine_room_t2_icon.png',
    detailImg: '/game/assets/rooms/engine_room_t2.png',
  },
  {
    id: 'plasma-thruster-t3',
    name: 'Plasma Thruster T3',
    kind: 'engine',
    price: 14_500_000,
    successBonus: 32,
    mass: 3,
    power: 10,
    description: 'Dual-turbine plasma bank with a shared containment ring.',
    unlockedAtMissions: 4,
    tier: 3,
    img: '/game/assets/rooms/engine_room_t3_icon.png',
    detailImg: '/game/assets/rooms/engine_room_t3.png',
  },
  {
    id: 'array-thruster-t4',
    name: 'Array Thruster T4',
    kind: 'engine',
    price: 19_500_000,
    successBonus: 38,
    mass: 4,
    power: 13,
    description: 'Redundant twin-turbine array with secondary venting for long burns.',
    unlockedAtMissions: 6,
    tier: 4,
    img: '/game/assets/rooms/engine_room_t4_icon.png',
    detailImg: '/game/assets/rooms/engine_room_t4.png',
  },
  {
    id: 'antimatter-thruster-t5',
    name: 'Antimatter Thruster T5',
    kind: 'engine',
    price: 26_000_000,
    successBonus: 45,
    mass: 4,
    power: 17,
    description: 'Triple-turbine bank with a stabilised containment core. Top-line reach and reliability.',
    unlockedAtMissions: 8,
    tier: 5,
    img: '/game/assets/rooms/engine_room_t5_icon.png',
    detailImg: '/game/assets/rooms/engine_room_t5.png',
  },

  // ── Booster / Mining Laser ──────────────────────────────────────────
  {
    id: 'strap-booster-t1',
    name: 'Strap Booster Pair',
    kind: 'booster',
    price: 3_800_000,
    successBonus: 10,
    mass: 1,
    power: 3,
    description: 'Cheap ascent help. Offsets starter hull mass during launch.',
    tier: 1,
    img: '/game/assets/rooms/mining_room_t1_icon.png',
    detailImg: '/game/assets/rooms/mining_room_t1.png',
  },
  {
    id: 'vulcan-booster-t1',
    name: 'Vulcan Booster Pair',
    kind: 'booster',
    price: 5_200_000,
    successBonus: 15,
    mass: 2,
    power: 4,
    description: 'Stronger booster pack. More reliable with industrial payloads.',
    tier: 1,
    img: '/game/assets/rooms/mining_room_t1_icon.png',
    detailImg: '/game/assets/rooms/mining_room_t1.png',
  },
  {
    id: 'focused-laser-t2',
    name: 'Focused Mining Laser T2',
    kind: 'booster',
    price: 7_500_000,
    successBonus: 22,
    mass: 2,
    power: 6,
    description: 'Wider barrel and brighter lens. Faster extraction on harder ore.',
    unlockedAtMissions: 2,
    tier: 2,
    img: '/game/assets/rooms/mining_room_t2_icon.png',
    detailImg: '/game/assets/rooms/mining_room_t2.png',
  },
  {
    id: 'ringed-laser-t3',
    name: 'Ringed Mining Laser T3',
    kind: 'booster',
    price: 10_500_000,
    successBonus: 28,
    mass: 3,
    power: 8,
    description: 'Adds a focusing ring around the emitter for a tighter, hotter beam.',
    unlockedAtMissions: 4,
    tier: 3,
    img: '/game/assets/rooms/mining_room_t3_icon.png',
    detailImg: '/game/assets/rooms/mining_room_t3.png',
  },
  {
    id: 'twin-emitter-laser-t4',
    name: 'Twin-Emitter Mining Laser T4',
    kind: 'booster',
    price: 14_000_000,
    successBonus: 34,
    mass: 3,
    power: 10,
    description: 'A second emitter barrel doubles extraction throughput.',
    unlockedAtMissions: 6,
    tier: 4,
    img: '/game/assets/rooms/mining_room_t4_icon.png',
    detailImg: '/game/assets/rooms/mining_room_t4.png',
  },
  {
    id: 'resonant-laser-t5',
    name: 'Resonant Mining Laser T5',
    kind: 'booster',
    price: 19_000_000,
    successBonus: 42,
    mass: 4,
    power: 13,
    description: 'Twin emitters with a resonant cyan-core beam. Top-tier extraction rate.',
    unlockedAtMissions: 8,
    tier: 5,
    img: '/game/assets/rooms/mining_room_t5_icon.png',
    detailImg: '/game/assets/rooms/mining_room_t5.png',
  },

  // ── Cockpit ─────────────────────────────────────────────────────────
  {
    id: 'cockpit-command-t1',
    name: 'Command Cockpit T1',
    kind: 'cockpit',
    price: 3_000_000,
    successBonus: 12,
    mass: 1,
    power: -1,
    description: 'Basic navigation, comms, and launch authority.',
  },
  {
    id: 'guidance-cockpit-t1',
    name: 'Guidance Cockpit T1',
    kind: 'cockpit',
    price: 4_600_000,
    successBonus: 17,
    mass: 1,
    power: -1,
    description: 'Better flight computer. Improves mission review confidence.',
  },

  // ── Payload / Storage Silos ─────────────────────────────────────────
  {
    id: 'cargo-payload-t1',
    name: 'Cargo Bay T1',
    kind: 'payload',
    price: 4_200_000,
    successBonus: 10,
    mass: 2,
    power: -1,
    description: 'Secured mineral racks. Best for client delivery runs.',
    tier: 1,
    img: '/game/assets/rooms/cargo_bay_t1_icon.png',
    detailImg: '/game/assets/rooms/cargo_bay_t1.png',
  },
  {
    id: 'mining-payload-t1',
    name: 'Mining Payload T1',
    kind: 'payload',
    price: 5_600_000,
    successBonus: 14,
    mass: 2,
    power: -2,
    description: 'Drill control and sample hopper. Best for extraction missions.',
    tier: 1,
    img: '/game/assets/rooms/cargo_bay_t1_icon.png',
    detailImg: '/game/assets/rooms/cargo_bay_t1.png',
  },
  {
    id: 'storage-silo-t2',
    name: 'Storage Silo Bank T2',
    kind: 'payload',
    price: 8_000_000,
    successBonus: 20,
    mass: 3,
    power: -1,
    description: 'Three upright silos in place of loose racks. More capacity per run.',
    unlockedAtMissions: 2,
    tier: 2,
    img: '/game/assets/rooms/cargo_bay_t2_icon.png',
    detailImg: '/game/assets/rooms/cargo_bay_t2.png',
  },
  {
    id: 'storage-silo-t3',
    name: 'Storage Silo Bank T3',
    kind: 'payload',
    price: 11_000_000,
    successBonus: 26,
    mass: 3,
    power: -1,
    description: 'Four silos on a shared gantry rail. Higher capacity, faster loading.',
    unlockedAtMissions: 4,
    tier: 3,
    img: '/game/assets/rooms/cargo_bay_t3_icon.png',
    detailImg: '/game/assets/rooms/cargo_bay_t3.png',
  },
  {
    id: 'storage-silo-t4',
    name: 'Storage Silo Bank T4',
    kind: 'payload',
    price: 15_000_000,
    successBonus: 32,
    mass: 4,
    power: -1,
    description: 'Five taller silos. Built for sustained bulk-hauling runs.',
    unlockedAtMissions: 6,
    tier: 4,
    img: '/game/assets/rooms/cargo_bay_t4_icon.png',
    detailImg: '/game/assets/rooms/cargo_bay_t4.png',
  },
  {
    id: 'storage-silo-t5',
    name: 'Storage Silo Bank T5',
    kind: 'payload',
    price: 20_000_000,
    successBonus: 40,
    mass: 4,
    power: -1,
    description: 'Six tall silos on a full gantry rail. Top-tier bulk capacity.',
    unlockedAtMissions: 8,
    tier: 5,
    img: '/game/assets/rooms/cargo_bay_t5_icon.png',
    detailImg: '/game/assets/rooms/cargo_bay_t5.png',
  },

  // ── Fuel Stage ──────────────────────────────────────────────────────
  {
    id: 'kerosene-stage-t1',
    name: 'Kerosene Stage T1',
    kind: 'fuel-stage',
    price: 2_900_000,
    successBonus: 8,
    mass: 3,
    power: 0,
    description: 'Dense storable propellant. Low cost per delta-v, suits short orbital hops.',
    unlockedAtMissions: 2,
  },
  {
    id: 'lox-lh2-stage-t1',
    name: 'LOX/LH₂ Stage T1',
    kind: 'fuel-stage',
    price: 4_400_000,
    successBonus: 14,
    mass: 2,
    power: 0,
    description: 'High specific impulse. Better mass fraction for longer transfers.',
    unlockedAtMissions: 2,
  },

  // ── Fairing ─────────────────────────────────────────────────────────
  {
    id: 'standard-fairing-t1',
    name: 'Standard Fairing T1',
    kind: 'fairing',
    price: 1_800_000,
    successBonus: 6,
    mass: 1,
    power: 0,
    description: 'Nose cone protects cargo during ascent. Jettisoned at separation altitude.',
    unlockedAtMissions: 2,
  },
  {
    id: 'heavy-fairing-t1',
    name: 'Heavy Fairing T1',
    kind: 'fairing',
    price: 2_900_000,
    successBonus: 10,
    mass: 1,
    power: 0,
    description: 'Wider shroud for bulkier cargo. Needed for oversized mineral containers.',
    unlockedAtMissions: 2,
  },

  // ── Docking Port ────────────────────────────────────────────────────
  {
    id: 'standard-port-t1',
    name: 'Standard Port T1',
    kind: 'docking-port',
    price: 2_600_000,
    successBonus: 8,
    mass: 1,
    power: -1,
    description: 'Enables cargo handoff at orbital relay depots and stations.',
    unlockedAtMissions: 4,
  },
  {
    id: 'magnetic-port-t1',
    name: 'Magnetic Port T1',
    kind: 'docking-port',
    price: 3_900_000,
    successBonus: 13,
    mass: 1,
    power: -1,
    description: 'Active magnetic capture — faster approach lock, higher docking success.',
    unlockedAtMissions: 4,
  },

  // ── Heat Shield ─────────────────────────────────────────────────────
  {
    id: 'ablative-shield-t1',
    name: 'Ablative Shield T1',
    kind: 'heat-shield',
    price: 3_400_000,
    successBonus: 10,
    mass: 2,
    power: 0,
    description: 'Single-use ablative layer. Sufficient for standard re-entry profiles.',
    unlockedAtMissions: 6,
  },
  {
    id: 'ceramic-shield-t1',
    name: 'Ceramic Shield T1',
    kind: 'heat-shield',
    price: 5_100_000,
    successBonus: 15,
    mass: 2,
    power: 0,
    description: 'Refractory ceramic tiles. Handles steeper re-entry angles and heavier return cargo.',
    unlockedAtMissions: 6,
  },
  {
    id: 'crew-quarters-t1',
    name: 'Crew Quarters T1',
    kind: 'crew-module',
    price: CREW_MODULE_PRICE,
    successBonus: 8,
    mass: 3,
    power: -3,
    description: 'Pressurised two-seat quarters for trained astronauts. Requires a larger post-onboarding hull.',
    unlockedAtMissions: 4,
    tier: 1,
    img: '/game/assets/rooms/crew_module_t1_icon.png',
    detailImg: '/game/assets/rooms/crew_module_t1.png',
  },
  {
    id: 'crew-transport-t2',
    name: 'Crew Transport T2',
    kind: 'crew-module',
    price: Math.round(CREW_MODULE_PRICE * 1.4),
    successBonus: 13,
    mass: 4,
    power: -3,
    description: 'Stacked double bunk. Same footprint, higher crew capacity.',
    unlockedAtMissions: 5,
    tier: 2,
    img: '/game/assets/rooms/crew_module_t2_icon.png',
    detailImg: '/game/assets/rooms/crew_module_t2.png',
  },
  {
    id: 'crew-transport-t3',
    name: 'Crew Transport T3',
    kind: 'crew-module',
    price: Math.round(CREW_MODULE_PRICE * 1.8),
    successBonus: 18,
    mass: 4,
    power: -3,
    description: 'Two stacked bunk levels — the room reads as a real crew berth, not one bed.',
    unlockedAtMissions: 6,
    tier: 3,
    img: '/game/assets/rooms/crew_module_t3_icon.png',
    detailImg: '/game/assets/rooms/crew_module_t3.png',
  },
  {
    id: 'crew-transport-t4',
    name: 'Crew Transport T4',
    kind: 'crew-module',
    price: Math.round(CREW_MODULE_PRICE * 2.3),
    successBonus: 24,
    mass: 5,
    power: -4,
    description: 'A second berth against the far wall doubles pressurised sleeping capacity.',
    unlockedAtMissions: 7,
    tier: 4,
    img: '/game/assets/rooms/crew_module_t4_icon.png',
    detailImg: '/game/assets/rooms/crew_module_t4.png',
  },
  {
    id: 'crew-transport-t5',
    name: 'Crew Transport T5',
    kind: 'crew-module',
    price: Math.round(CREW_MODULE_PRICE * 2.9),
    successBonus: 30,
    mass: 5,
    power: -4,
    description: 'Two full double-bunk berths. Top-tier crew transport capacity.',
    unlockedAtMissions: 8,
    tier: 5,
    img: '/game/assets/rooms/crew_module_t5_icon.png',
    detailImg: '/game/assets/rooms/crew_module_t5.png',
  },
  {
    id: 'lander-module-t1',
    name: 'Lander Module T1',
    kind: 'lander',
    price: LANDER_MODULE_PRICE,
    successBonus: 8,
    mass: 3,
    power: -2,
    description: 'Detaches to descend and land on a target, then re-docks with the ship in orbit for the return leg.',
    unlockedAtMissions: 4,
  },
]

export function customizerPartById(id: string): CustomizerPart | undefined {
  return CUSTOMIZER_PARTS.find(part => part.id === id)
}

export function partsForKind(kind: ShipRoomKind, missionsDone = 0): CustomizerPart[] {
  return CUSTOMIZER_PARTS.filter(
    part => part.kind === kind && (part.unlockedAtMissions ?? 0) <= missionsDone
  )
}

/** Grid-cell icon art for an installed room: the chosen part's tiered `img`
 * if it has one, else the kind's single default (SHIP_ROOM_ASSETS) — so
 * kinds without tiered art (cockpit, fuel-stage, fairing, docking-port,
 * heat-shield, lander) keep working unchanged. */
export function getRoomIconArt(kind: ShipRoomKind, installedPartId: string | undefined): string {
  const part = installedPartId ? customizerPartById(installedPartId) : undefined
  return part?.img ?? SHIP_ROOM_ASSETS[kind]
}

/** Big detail-diorama art for an installed room — same fallback rule as
 * `getRoomIconArt`, against SHIP_ROOM_DETAIL_ASSETS instead. */
export function getRoomDetailArt(kind: ShipRoomKind, installedPartId: string | undefined): string {
  const part = installedPartId ? customizerPartById(installedPartId) : undefined
  return part?.detailImg ?? SHIP_ROOM_DETAIL_ASSETS[kind]
}

export function installedPartIds(owned: OwnedCustomizerPart[], installed: InstalledCustomizerParts): string[] {
  const byUid = new Map(owned.map(part => [part.uid, part.partId]))
  return Object.values(installed)
    .map(uid => (uid ? byUid.get(uid) : undefined))
    .filter((id): id is string => !!id)
}

export function calculateShipSuccessChance(
  partIds: string[],
  sequence: ShipRoomKind[] = CUSTOMIZER_BUILD_SEQUENCE,
): number {
  const parts = partIds.map(customizerPartById).filter((part): part is CustomizerPart => !!part)
  const presentKinds = new Set(parts.map(part => part.kind))
  let chance = 28
  for (const kind of sequence) {
    if (presentKinds.has(kind)) chance += 8
  }
  chance += parts.reduce((sum, part) => sum + part.successBonus, 0)
  const massPenalty = Math.max(0, parts.reduce((sum, part) => sum + part.mass, 0) - 6) * 2
  return Math.max(5, Math.min(96, chance - massPenalty))
}

export function canInstallPartInSlot(part: CustomizerPart, slotKind: ShipRoomKind): boolean {
  return part.kind === slotKind
}

export function createCustomizerBuildState(balance: number): CustomizerBuildState {
  return { balance, installed: {}, confirmed: false }
}

export function selectedCustomizerPartIds(
  installed: InstalledCustomizerPartsByKind,
  sequence: ShipRoomKind[] = CUSTOMIZER_BUILD_SEQUENCE,
): string[] {
  return sequence
    .map(kind => installed[kind])
    .filter((id): id is string => !!id)
}

export function canConfirmCustomizerBuild(
  installed: InstalledCustomizerPartsByKind,
  sequence: ShipRoomKind[] = CUSTOMIZER_BUILD_SEQUENCE,
): boolean {
  return sequence.every(kind => !!installed[kind])
}

export function chooseCustomizerPart(state: CustomizerBuildState, partId: string): CustomizerBuildResult {
  if (state.confirmed) return { state, ok: false, reason: 'confirmed' }
  const part = customizerPartById(partId)
  if (!part) return { state, ok: false, reason: 'unknown-part' }

  const current = state.installed[part.kind] ? customizerPartById(state.installed[part.kind]!) : undefined
  const refundedBalance = state.balance + (current?.price ?? 0)
  if (refundedBalance < part.price) return { state, ok: false, reason: 'insufficient-balance' }

  return {
    ok: true,
    state: {
      ...state,
      balance: refundedBalance - part.price,
      installed: { ...state.installed, [part.kind]: part.id },
    },
  }
}

export function refundCustomizerPart(state: CustomizerBuildState, kind: ShipRoomKind): CustomizerBuildResult {
  if (state.confirmed) return { state, ok: false, reason: 'confirmed' }
  const current = state.installed[kind] ? customizerPartById(state.installed[kind]!) : undefined
  if (!current) return { state, ok: true }

  const installed = { ...state.installed }
  delete installed[kind]
  return {
    ok: true,
    state: {
      ...state,
      balance: state.balance + current.price,
      installed,
    },
  }
}

export function confirmCustomizerBuild(
  state: CustomizerBuildState,
  sequence: ShipRoomKind[] = CUSTOMIZER_BUILD_SEQUENCE,
): CustomizerBuildResult {
  if (!canConfirmCustomizerBuild(state.installed, sequence)) {
    return { state, ok: false, reason: 'incomplete-build' }
  }
  return { ok: true, state: { ...state, confirmed: true } }
}
