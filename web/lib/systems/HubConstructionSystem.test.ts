import { describe, expect, it } from 'vitest'
import { hubConstructionProgress, isUnderConstruction, structureBuildMs, STRUCTURE_BUILD_MS } from './HubConstructionSystem'

describe('HubConstructionSystem', () => {
  it('resolves a fresh placement as 0% progress and under construction', () => {
    expect(hubConstructionProgress(10_000, 'surface-silo', 10_000)).toBe(0)
    expect(isUnderConstruction(10_000, 'surface-silo', 10_000)).toBe(true)
  })

  it('resolves progress linearly across the build window', () => {
    const buildMs = structureBuildMs('surface-silo')
    expect(hubConstructionProgress(0, 'surface-silo', buildMs / 2)).toBeCloseTo(0.5)
  })

  it('resolves an elapsed build to complete and no longer under construction', () => {
    const buildMs = structureBuildMs('refinery')
    expect(hubConstructionProgress(0, 'refinery', buildMs)).toBe(1)
    expect(isUnderConstruction(0, 'refinery', buildMs)).toBe(false)
    expect(isUnderConstruction(0, 'refinery', buildMs + 1)).toBe(false)
  })

  it('treats an undefined startedAt as already complete', () => {
    expect(hubConstructionProgress(undefined, 'launchpad')).toBe(1)
    expect(isUnderConstruction(undefined, 'launchpad')).toBe(false)
  })

  it('falls back to the default build time for an unlisted kind', () => {
    expect(structureBuildMs('some-future-structure')).toBe(10_000)
    expect(STRUCTURE_BUILD_MS['surface-silo']).toBe(10_000)
  })
})
