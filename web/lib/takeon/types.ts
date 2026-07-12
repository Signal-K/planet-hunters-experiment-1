export type TakeonTerrainKind = 'basalt' | 'regolith' | 'ridge' | 'crater' | 'ice-shadow'

export interface TakeonTile {
  id: string
  label: string
  kind: TakeonTerrainKind
  x: number
  y: number
  energyCost: number
  dataYield: number
  sampleYield: number
  risk: 'low' | 'medium' | 'high'
}

export interface TakeonRoverState {
  tileId: string
  energy: number
  energyCapacity: number
  data: number
  dataCapacity: number
  samples: number
  sampleCapacity: number
}

export interface TakeonWorldState {
  schemaVersion: 1
  target: {
    id: string
    name: string
    bodyClass: 'asteroid' | 'moon' | 'planet'
  }
  rover: TakeonRoverState
  exploredTileIds: string[]
  bankedData: number
  bankedSamples: number
  missionLog: string[]
  updatedAt: string
}

export interface TakeonActionResult {
  state: TakeonWorldState
  ok: boolean
  message: string
}
