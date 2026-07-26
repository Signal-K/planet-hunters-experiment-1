// Off-world structure blueprints — placed at targets by client construction missions.
// These are distinct from Earth-base StructureBlueprints in structures.ts.

import type { TargetStructureBlueprint } from './types'

export const TARGET_STRUCTURES: TargetStructureBlueprint[] = [
  // Helios (prospect client) — propellant and thrust infrastructure
  {
    id: 'fuel-depot',
    name: 'Fuel Depot',
    kind: 'fuel-depot',
    clientRole: 'prospect',
    requiredMaterials: { hydrogen: 8, aluminium: 6 },
    buildTimeMs: 20 * 60 * 1000,
    description: 'Propellant storage and transfer station for in-situ refuelling operations.',
  },
  {
    id: 'thrust-stand',
    name: 'Thrust Test Stand',
    kind: 'thrust-stand',
    clientRole: 'prospect',
    requiredMaterials: { iron: 10, copper: 4 },
    buildTimeMs: 30 * 60 * 1000,
    description: 'Evaluates engine efficiency and propellant consumption under target gravity.',
  },
  {
    id: 'propellant-cache',
    name: 'Propellant Cache',
    kind: 'propellant-cache',
    clientRole: 'prospect',
    requiredMaterials: { hydrogen: 12, carbon: 3 },
    buildTimeMs: 15 * 60 * 1000,
    description: 'Pre-positioned propellant reserve for follow-on missions.',
  },

  // Arcturus (command client) — power and communications infrastructure
  {
    id: 'battery-station',
    name: 'Battery Station',
    kind: 'battery-station',
    clientRole: 'command',
    requiredMaterials: { cobalt: 6, nickel: 4, copper: 4 },
    buildTimeMs: 25 * 60 * 1000,
    description: 'High-capacity energy storage node for surface power distribution.',
  },
  {
    id: 'relay-mast',
    name: 'Relay Mast',
    kind: 'relay-mast',
    clientRole: 'command',
    requiredMaterials: { aluminium: 8, copper: 6 },
    buildTimeMs: 18 * 60 * 1000,
    description: 'Extends comms range and enables telemetry uplink from remote targets.',
  },
  {
    id: 'power-node',
    name: 'Power Conditioning Node',
    kind: 'power-node',
    clientRole: 'command',
    requiredMaterials: { cobalt: 4, gold: 2, copper: 6 },
    buildTimeMs: 22 * 60 * 1000,
    description: 'Regulates and distributes surface power to adjacent installations.',
  },

  // Ferrum (bulk client) — fabrication and ore handling
  {
    id: 'fabrication-pad',
    name: 'Fabrication Pad',
    kind: 'fabrication-pad',
    clientRole: 'bulk',
    requiredMaterials: { iron: 12, silicon: 6, aluminium: 4 },
    buildTimeMs: 35 * 60 * 1000,
    description: 'On-site manufacturing platform for structural components and spare parts.',
  },
  {
    id: 'structural-frame',
    name: 'Structural Frame',
    kind: 'structural-frame',
    clientRole: 'bulk',
    requiredMaterials: { iron: 16, carbon: 4 },
    buildTimeMs: 28 * 60 * 1000,
    description: 'Modular load-bearing frame that anchors future installations at the target.',
  },
  {
    id: 'ore-staging-gantry',
    name: 'Ore Staging Gantry',
    kind: 'ore-staging-gantry',
    clientRole: 'bulk',
    requiredMaterials: { iron: 10, aluminium: 8, carbon: 3 },
    buildTimeMs: 32 * 60 * 1000,
    description: 'Automated sorting and loading gantry for high-throughput ore extraction.',
  },
]

export function findTargetStructure(kind: string): TargetStructureBlueprint | undefined {
  return TARGET_STRUCTURES.find(s => s.kind === kind)
}
