import { describe, expect, it } from 'vitest'
import { generateAvatarFacets } from './avatar'

describe('generateAvatarFacets', () => {
  it('is deterministic for the same seed', () => {
    expect(generateAvatarFacets('user-123')).toEqual(generateAvatarFacets('user-123'))
  })

  it('produces six facets', () => {
    expect(generateAvatarFacets('user-123')).toHaveLength(6)
  })

  it('mirrors opposite wedges', () => {
    const facets = generateAvatarFacets('user-123')
    expect(facets[0].color).toBe(facets[3].color)
    expect(facets[1].color).toBe(facets[4].color)
    expect(facets[2].color).toBe(facets[5].color)
  })

  it('varies across different seeds', () => {
    const a = generateAvatarFacets('user-123')
    const b = generateAvatarFacets('user-456')
    expect(a.map(f => f.color)).not.toEqual(b.map(f => f.color))
  })
})
