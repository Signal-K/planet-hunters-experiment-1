import { describe, expect, it } from 'vitest'
import { STATIC_CATALOG } from '../catalog'
import { buildRuntimeCatalog } from '../runtimeCatalog'
import { missionCategory, tagMissionCategories } from './mission-generator'

describe('mission categories', () => {
  it('assigns every authored and generated catalog mission to one of the six groups', () => {
    const catalog = buildRuntimeCatalog({ catalog: STATIC_CATALOG, freeOperations: true, missionsDone: 4 })
    const missions = tagMissionCategories(catalog.missions)
    expect(missions.length).toBeGreaterThan(0)
    expect(missions.every(mission => mission.category)).toBe(true)
  })

  it.each([
    [{ client: 'client-a', tag: 'CONSTRUCT' }, 'contracts'],
    [{ tag: 'FREE OPS' }, 'free-mining'],
    [{ construction: { structureKind: 'settlement', requiredMaterials: {}, placementMode: 'confirm', buildTimeMs: 0 }, tag: 'PROGRAM' }, 'construction'],
    [{ tag: 'EXPLORE' }, 'explore'],
    [{ tag: 'CITIZEN SCIENCE HUB' }, 'citizen-science-hubs'],
    [{ tag: 'STORY' }, 'missions'],
  ] as const)('maps %j to %s', (mission, expected) => {
    expect(missionCategory({ ...mission, tag: 'tag' in mission ? mission.tag : 'STORY' })).toBe(expected)
  })
})
