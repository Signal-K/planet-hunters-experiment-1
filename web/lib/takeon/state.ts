import type { TakeonActionResult, TakeonTile, TakeonWorldState } from './types'

export const TAKEON_STORAGE_KEY = 'landnam.takeon.demo.v1'

export const TAKEON_TILES: TakeonTile[] = [
  { id: 'base', label: 'Landing Zone', kind: 'regolith', x: 50, y: 82, energyCost: 0, dataYield: 0, sampleYield: 0, risk: 'low' },
  { id: 'basalt-plain', label: 'Basalt Plain', kind: 'basalt', x: 30, y: 66, energyCost: 14, dataYield: 2, sampleYield: 1, risk: 'low' },
  { id: 'glass-ridge', label: 'Glass Ridge', kind: 'ridge', x: 67, y: 62, energyCost: 20, dataYield: 3, sampleYield: 1, risk: 'medium' },
  { id: 'north-crater', label: 'North Crater', kind: 'crater', x: 47, y: 42, energyCost: 26, dataYield: 4, sampleYield: 2, risk: 'medium' },
  { id: 'shadow-pocket', label: 'Shadow Pocket', kind: 'ice-shadow', x: 74, y: 34, energyCost: 34, dataYield: 5, sampleYield: 2, risk: 'high' },
  { id: 'knife-rim', label: 'Knife Rim', kind: 'ridge', x: 22, y: 28, energyCost: 30, dataYield: 4, sampleYield: 1, risk: 'high' },
]

const DEFAULT_LOG = [
  'Demo initialized offline.',
  'Rover standing by at Landing Zone.',
]

export function createInitialTakeonState(now = new Date().toISOString()): TakeonWorldState {
  return {
    schemaVersion: 1,
    target: {
      id: 'demo-koi-7923-belt',
      name: 'KOI-7923 Survey Site',
      bodyClass: 'asteroid',
    },
    rover: {
      tileId: 'base',
      energy: 100,
      energyCapacity: 100,
      data: 0,
      dataCapacity: 8,
      samples: 0,
      sampleCapacity: 5,
    },
    exploredTileIds: ['base'],
    bankedData: 0,
    bankedSamples: 0,
    missionLog: DEFAULT_LOG,
    updatedAt: now,
  }
}

export function exploreTile(state: TakeonWorldState, tileId: string, now = new Date().toISOString()): TakeonActionResult {
  const tile = TAKEON_TILES.find(item => item.id === tileId)
  if (!tile) return failure(state, `Unknown tile: ${tileId}`)
  if (tile.id === 'base') return returnToBase(state, now)
  if (state.exploredTileIds.includes(tile.id)) return failure(state, `${tile.label} has already been surveyed.`)
  if (state.rover.energy < tile.energyCost) return failure(state, `Not enough rover energy for ${tile.label}.`)
  if (state.rover.data >= state.rover.dataCapacity) return failure(state, 'Rover data storage is full. Return to base.')
  if (state.rover.samples >= state.rover.sampleCapacity && tile.sampleYield > 0) {
    return failure(state, 'Rover sample bay is full. Return to base.')
  }

  const nextData = Math.min(state.rover.dataCapacity, state.rover.data + tile.dataYield)
  const nextSamples = Math.min(state.rover.sampleCapacity, state.rover.samples + tile.sampleYield)
  const gainedData = nextData - state.rover.data
  const gainedSamples = nextSamples - state.rover.samples
  const next = {
    ...state,
    rover: {
      ...state.rover,
      tileId: tile.id,
      energy: state.rover.energy - tile.energyCost,
      data: nextData,
      samples: nextSamples,
    },
    exploredTileIds: [...state.exploredTileIds, tile.id],
    missionLog: [
      `${tile.label} surveyed: +${gainedData} data, +${gainedSamples} samples.`,
      ...state.missionLog,
    ].slice(0, 8),
    updatedAt: now,
  }

  return { state: next, ok: true, message: `${tile.label} surveyed.` }
}

export function returnToBase(state: TakeonWorldState, now = new Date().toISOString()): TakeonActionResult {
  const next = {
    ...state,
    rover: {
      ...state.rover,
      tileId: 'base',
      energy: state.rover.energyCapacity,
      data: 0,
      samples: 0,
    },
    bankedData: state.bankedData + state.rover.data,
    bankedSamples: state.bankedSamples + state.rover.samples,
    missionLog: [
      `Returned to base: banked ${state.rover.data} data and ${state.rover.samples} samples.`,
      ...state.missionLog,
    ].slice(0, 8),
    updatedAt: now,
  }

  return { state: next, ok: true, message: 'Rover returned to base.' }
}

export function resetTakeonState(now = new Date().toISOString()): TakeonWorldState {
  return createInitialTakeonState(now)
}

export function serializeTakeonState(state: TakeonWorldState): string {
  return JSON.stringify(state)
}

export function parseTakeonState(raw: string | null): TakeonWorldState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<TakeonWorldState>
    if (parsed.schemaVersion !== 1) return null
    if (!parsed.rover || !parsed.target || !Array.isArray(parsed.exploredTileIds)) return null
    return {
      ...createInitialTakeonState(),
      ...parsed,
      rover: { ...createInitialTakeonState().rover, ...parsed.rover },
      missionLog: Array.isArray(parsed.missionLog) ? parsed.missionLog.slice(0, 8) : DEFAULT_LOG,
    }
  } catch {
    return null
  }
}

export function takeonCapacitySummary(state: TakeonWorldState) {
  return {
    energyPct: Math.round((state.rover.energy / state.rover.energyCapacity) * 100),
    dataPct: Math.round((state.rover.data / state.rover.dataCapacity) * 100),
    samplePct: Math.round((state.rover.samples / state.rover.sampleCapacity) * 100),
    exploredPct: Math.round((state.exploredTileIds.length / TAKEON_TILES.length) * 100),
  }
}

function failure(state: TakeonWorldState, message: string): TakeonActionResult {
  return { state, ok: false, message }
}
