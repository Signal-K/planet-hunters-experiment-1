import type { ShipRoomKind } from './shipRooms'

export const CUSTOMIZER_BUILD_SEQUENCE: ShipRoomKind[] = ['engine', 'booster', 'cockpit', 'payload']

export const BUILD_SEQUENCES: Record<number, ShipRoomKind[]> = {
  1: ['engine', 'booster', 'cockpit', 'payload'],
  2: ['fuel-stage', 'engine', 'booster', 'cockpit', 'fairing', 'payload'],
  3: ['fuel-stage', 'engine', 'booster', 'cockpit', 'fairing', 'payload', 'docking-port'],
  4: ['fuel-stage', 'engine', 'booster', 'cockpit', 'fairing', 'payload', 'docking-port', 'heat-shield'],
}

export function getBuildSequence(missionsDone: number): ShipRoomKind[] {
  if (missionsDone >= 6) return BUILD_SEQUENCES[4]
  if (missionsDone >= 4) return BUILD_SEQUENCES[3]
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
    price: 640_000_000,
    successBonus: 16,
    mass: 2,
    power: 5,
    description: 'Reliable starter engine. Improves launch stability and near-orbit reach.',
  },
  {
    id: 'pulse-thruster-t1',
    name: 'Pulse Thruster T1',
    kind: 'engine',
    price: 760_000_000,
    successBonus: 20,
    mass: 2,
    power: 6,
    description: 'Higher thrust margin. Better chance on heavier payload builds.',
  },

  // ── Booster ─────────────────────────────────────────────────────────
  {
    id: 'strap-booster-t1',
    name: 'Strap Booster Pair',
    kind: 'booster',
    price: 380_000_000,
    successBonus: 10,
    mass: 1,
    power: 3,
    description: 'Cheap ascent help. Offsets starter hull mass during launch.',
  },
  {
    id: 'vulcan-booster-t1',
    name: 'Vulcan Booster Pair',
    kind: 'booster',
    price: 520_000_000,
    successBonus: 15,
    mass: 2,
    power: 4,
    description: 'Stronger booster pack. More reliable with industrial payloads.',
  },

  // ── Cockpit ─────────────────────────────────────────────────────────
  {
    id: 'cockpit-command-t1',
    name: 'Command Cockpit T1',
    kind: 'cockpit',
    price: 300_000_000,
    successBonus: 12,
    mass: 1,
    power: -1,
    description: 'Basic navigation, comms, and launch authority.',
  },
  {
    id: 'guidance-cockpit-t1',
    name: 'Guidance Cockpit T1',
    kind: 'cockpit',
    price: 460_000_000,
    successBonus: 17,
    mass: 1,
    power: -1,
    description: 'Better flight computer. Improves mission review confidence.',
  },

  // ── Payload ─────────────────────────────────────────────────────────
  {
    id: 'cargo-payload-t1',
    name: 'Cargo Bay T1',
    kind: 'payload',
    price: 420_000_000,
    successBonus: 10,
    mass: 2,
    power: -1,
    description: 'Secured mineral racks. Best for contractor delivery runs.',
  },
  {
    id: 'mining-payload-t1',
    name: 'Mining Payload T1',
    kind: 'payload',
    price: 560_000_000,
    successBonus: 14,
    mass: 2,
    power: -2,
    description: 'Drill control and sample hopper. Best for extraction missions.',
  },

  // ── Fuel Stage ──────────────────────────────────────────────────────
  {
    id: 'kerosene-stage-t1',
    name: 'Kerosene Stage T1',
    kind: 'fuel-stage',
    price: 290_000_000,
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
    price: 440_000_000,
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
    price: 180_000_000,
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
    price: 290_000_000,
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
    price: 260_000_000,
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
    price: 390_000_000,
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
    price: 340_000_000,
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
    price: 510_000_000,
    successBonus: 15,
    mass: 2,
    power: 0,
    description: 'Refractory ceramic tiles. Handles steeper re-entry angles and heavier return cargo.',
    unlockedAtMissions: 6,
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
