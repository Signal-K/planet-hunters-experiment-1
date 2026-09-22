import { describe, expect, it } from 'vitest'
import { buildHubBuildingDefs } from './hub-building-defs'
import type { EntityData } from '@/lib/engine/types'

const plotEntities: EntityData[] = [
  {
    id: 'plot-0',
    name: 'Plot 0',
    transform: { position: { x: 60, y: 570 }, rotation: 0, scale: { x: 1, y: 1 } },
    components: [{ type: 'BuildPlot', index: 0 }],
  },
  {
    id: 'plot-1',
    name: 'Plot 1',
    transform: { position: { x: 154, y: 570 }, rotation: 0, scale: { x: 1, y: 1 } },
    components: [{ type: 'BuildPlot', index: 1 }],
  },
]

describe('buildHubBuildingDefs', () => {
  it('maps placed structures onto hub plot coordinates', () => {
    const defs = buildHubBuildingDefs({
      placed: ['launchpad', 'surface-silo'],
      placementPlots: { launchpad: 1, 'surface-silo': 0 },
      underConstruction: {},
      pendingLaunch: false,
      deepSpaceTelescopeBuilt: false,
    }, plotEntities)

    expect(defs).toHaveLength(2)
    expect(defs.find(def => def.kind === 'launchpad')?.plotX).toBe(154)
    expect(defs.find(def => def.kind === 'surface-silo')?.plotX).toBe(60)
  })
})
