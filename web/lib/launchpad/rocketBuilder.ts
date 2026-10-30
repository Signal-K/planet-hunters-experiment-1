import { PARTS } from '@/lib/data/parts'
import type { ShipRoomKind } from '@/lib/data/shipRooms'
import {
  CUSTOMIZER_PARTS,
  customizerPartById,
  type CustomizerPart,
  type InstalledCustomizerPartsByKind,
} from '@/lib/data/shipCustomizer'
import { BASE_LASER_CHARGES } from '@/lib/data/flight'
import type { RocketConfig, Target } from '@/lib/data/types'
import { paletteById, paletteForTarget } from '@/lib/mining/laserPalette'
import { layoutForPalette, type PlacedPiece } from '@/lib/mining/landscape'

/** Loadout saved on `player.shipCustomizerParts`. The mining laser uses its own key because the catalog stores lasers on the booster kind. */
export type BuilderLoadout = InstalledCustomizerPartsByKind & { 'mining-laser'?: string }

export type BuilderSlotId = 'engine' | 'fuel-tank' | 'cargo-hold' | 'mining-laser' | 'booster'

export interface BuilderSlot {
  id: BuilderSlotId
  label: string
  kind: ShipRoomKind
  /** When a kind holds two tray slots, keep parts whose id contains this. */
  match: string
  module: 'engines' | 'fuel-tank' | 'cargo-hold' | 'mining-laser' | 'booster'
  card: string
}

export const BUILDER_SLOTS: readonly BuilderSlot[] = [
  { id: 'engine', label: 'ENGINE', kind: 'engine', match: '', module: 'engines', card: '/art/scenes/launchpad/launchpad-card-engine.png' },
  { id: 'fuel-tank', label: 'FUEL TANK', kind: 'fuel-stage', match: '', module: 'fuel-tank', card: '/art/scenes/launchpad/launchpad-card-fuel-tank.png' },
  { id: 'cargo-hold', label: 'CARGO HOLD', kind: 'payload', match: '', module: 'cargo-hold', card: '/art/scenes/launchpad/launchpad-card-cargo-hold.png' },
  { id: 'mining-laser', label: 'MINING LASER', kind: 'booster', match: 'laser', module: 'mining-laser', card: '/art/scenes/launchpad/launchpad-card-mining-laser.png' },
  { id: 'booster', label: 'BOOSTER', kind: 'booster', match: 'booster', module: 'booster', card: '/art/scenes/launchpad/launchpad-card-booster.png' },
]

export const BLUEPRINT_MODULES: readonly { id: string; label: string }[] = [
  { id: 'nose', label: 'NOSE' },
  { id: 'mining-laser', label: 'MINING LASER' },
  { id: 'cargo-hold', label: 'CARGO HOLD' },
  { id: 'fuel-tank', label: 'FUEL TANK' },
  { id: 'booster', label: 'BOOSTER' },
  { id: 'engines', label: 'ENGINES' },
]

export interface RocketBuilderStats {
  capacity: number
  range: number
  laser: number
}

export interface BuilderLandscape {
  paletteId: string
  skyTop: string
  skyHorizon: string
  ground: string
  ridge: string
  tint: string
  period: number
  pieces: PlacedPiece[]
}

function channel(hex: number, shift: number): number {
  return (hex >> shift) & 255
}

/** Pull a palette colour toward blueprint paper so the pad stays a light scene. Orange leans are cooled toward blue. */
export function liftColor(hex: number, whiteMix: number): string {
  const mix = Math.min(1, Math.max(0, whiteMix))
  let r = Math.round(channel(hex, 16) + (238 - channel(hex, 16)) * mix)
  let g = Math.round(channel(hex, 8) + (243 - channel(hex, 8)) * mix)
  let b = Math.round(channel(hex, 0) + (248 - channel(hex, 0)) * mix)
  if (r > b + 24 && r >= g) {
    const pull = Math.min(48, r - b)
    r -= pull
    b = Math.min(255, b + Math.round(pull * 0.4))
  }
  return `rgb(${r}, ${g}, ${b})`
}

export function asLoadout(parts: InstalledCustomizerPartsByKind | BuilderLoadout | null | undefined): BuilderLoadout {
  return { ...(parts ?? {}) }
}

export function partsForSlot(slot: BuilderSlot, missionsDone: number): CustomizerPart[] {
  return CUSTOMIZER_PARTS.filter(part => {
    if (part.kind !== slot.kind) return false
    if ((part.unlockedAtMissions ?? 0) > missionsDone) return false
    if (slot.match && !part.id.includes(slot.match)) return false
    return true
  })
}

/** Every part a slot can hold, in catalog order, whether or not it is unlocked yet. */
export function allPartsForSlot(slot: BuilderSlot): CustomizerPart[] {
  return CUSTOMIZER_PARTS.filter(part => part.kind === slot.kind && (!slot.match || part.id.includes(slot.match)))
}

/** What a part adds to the rocket, in the same integer steps `rocketBuilderStats` uses. */
export function partEffectLabel(slot: BuilderSlot, part: CustomizerPart): string {
  switch (slot.id) {
    case 'engine': return `+${Math.floor(part.power / 5)} range`
    case 'fuel-tank': return `+${Math.floor(part.successBonus / 7)} range`
    case 'cargo-hold': return `+${Math.floor(part.successBonus / 10)} capacity`
    case 'mining-laser': return `Laser ${part.power}`
    case 'booster': return `+${Math.floor(part.power / 4)} range`
  }
}

export function partIdForSlot(installed: BuilderLoadout, slot: BuilderSlot): string | undefined {
  if (slot.id === 'mining-laser') {
    if (installed['mining-laser']) return installed['mining-laser']
    return installed.booster?.includes('laser') ? installed.booster : undefined
  }
  if (slot.id === 'booster') {
    const id = installed.booster
    return id && !id.includes('laser') ? id : undefined
  }
  return installed[slot.kind]
}

export function nextPartId(slot: BuilderSlot, installed: BuilderLoadout, missionsDone: number): string | null {
  const options = partsForSlot(slot, missionsDone)
  if (!options.length) return null
  const current = partIdForSlot(installed, slot)
  const index = options.findIndex(part => part.id === current)
  return options[(index + 1) % options.length].id
}

export function installSlot(installed: BuilderLoadout, slot: BuilderSlot, partId: string): BuilderLoadout {
  const next: BuilderLoadout = { ...installed }
  if (slot.id === 'mining-laser') {
    next['mining-laser'] = partId
    if (next.booster?.includes('laser')) delete next.booster
  } else if (slot.id === 'booster') {
    next.booster = partId
  } else {
    next[slot.kind] = partId
  }
  return next
}

function bonus(id: string | undefined, pick: (part: CustomizerPart) => number): number {
  const part = id ? customizerPartById(id) : undefined
  return part ? pick(part) : 0
}

/**
 * Capacity, range and laser charge from the rocket's chassis, propulsion and drill
 * plus the fitted customizer parts. Integer division matches the native port.
 */
export function rocketBuilderStats(
  rocket: RocketConfig,
  installed: BuilderLoadout,
  parts: typeof PARTS = PARTS,
): RocketBuilderStats {
  const chassis = parts.chassis.find(part => part.id === rocket.chassis) ?? parts.chassis[0]
  const propulsion = parts.propulsion.find(part => part.id === rocket.propulsion) ?? parts.propulsion[0]
  const drill = parts.drill.find(part => part.id === rocket.drill) ?? parts.drill[0]
  const fitted = loadoutBonuses(installed)
  const laser = partIdForSlot(installed, BUILDER_SLOTS[3])
  const laserPart = laser ? customizerPartById(laser) : undefined
  return {
    capacity: (chassis.cargo ?? 0) + fitted.capacity,
    range: (propulsion.max_orbit ?? 0) + fitted.range,
    laser: BASE_LASER_CHARGES + (laserPart ? laserPart.power : (drill.rate ?? 1)),
  }
}

/**
 * What the fitted customizer parts add on top of the chassis and propulsion. The Capacity and Range chips
 * show chassis + this, and launch review (`validateBuild`) must count the same numbers (SSL-647).
 */
export function loadoutBonuses(installed: BuilderLoadout | null | undefined): { capacity: number; range: number } {
  const fitted = installed ?? {}
  const engine = partIdForSlot(fitted, BUILDER_SLOTS[0])
  const fuel = partIdForSlot(fitted, BUILDER_SLOTS[1])
  const cargo = partIdForSlot(fitted, BUILDER_SLOTS[2])
  const booster = partIdForSlot(fitted, BUILDER_SLOTS[4])
  return {
    capacity: Math.floor(bonus(cargo, part => part.successBonus) / 10),
    range: Math.floor(bonus(engine, part => part.power) / 5)
      + Math.floor(bonus(fuel, part => part.successBonus) / 7)
      + Math.floor(bonus(booster, part => part.power) / 4),
  }
}

export function fittedModules(installed: BuilderLoadout): Record<string, boolean> {
  return {
    nose: true,
    engines: !!partIdForSlot(installed, BUILDER_SLOTS[0]),
    'fuel-tank': !!partIdForSlot(installed, BUILDER_SLOTS[1]),
    'cargo-hold': !!partIdForSlot(installed, BUILDER_SLOTS[2]),
    'mining-laser': !!partIdForSlot(installed, BUILDER_SLOTS[3]),
    booster: !!partIdForSlot(installed, BUILDER_SLOTS[4]),
  }
}

export function builderLandscape(target: Pick<Target, 'id' | 'type' | 'archetype'> | null): BuilderLandscape {
  const palette = (target ? paletteForTarget(target) : paletteById('mars')) ?? paletteForTarget({ id: 'mars', type: 'planet' })
  const layout = layoutForPalette(palette, target?.id ?? 'earth-base')
  return {
    paletteId: palette.id,
    skyTop: liftColor(palette.skyTop, 0.08),
    skyHorizon: liftColor(palette.skyHorizon, 0.16),
    ground: liftColor(palette.ground, 0.08),
    ridge: liftColor(palette.nearRidge, 0.06),
    tint: liftColor(layout.tint, 0.2),
    period: layout.period,
    pieces: layout.pieces,
  }
}
