import { describe, expect, it } from 'vitest'
import { assistedClimb, reachableColumns, type DrivableWorld } from './drivable'

function worldFrom(heights: number[][]): DrivableWorld {
  const size = heights.length
  return {
    size,
    inBounds: (x, y) => x >= 0 && y >= 0 && x < size && y < size,
    isSolid: () => true,
    step: (x, y, nx, ny) => heights[ny][nx] - heights[y][x],
  }
}

describe('drivable ground', () => {
  it('counts the columns reachable within the climb limit', () => {
    const flat = worldFrom(Array.from({ length: 4 }, () => [0, 0, 0, 0]))
    expect(reachableColumns(flat, { x: 0, y: 0 }, 1)).toBe(16)
  })

  it('raises the climb limit when the landing site is ringed by a cliff', () => {
    const size = 12
    const heights = Array.from({ length: size }, (_, y) =>
      Array.from({ length: size }, (_, x) => (x <= 1 && y <= 1 ? 0 : 3)),
    )
    const world = worldFrom(heights)
    expect(reachableColumns(world, { x: 0, y: 0 }, 2)).toBe(4)
    expect(assistedClimb(world, { x: 0, y: 0 }, 2)).toBe(3)
  })

  it('leaves an open landing site alone', () => {
    const world = worldFrom(Array.from({ length: 12 }, () => Array(12).fill(1)))
    expect(assistedClimb(world, { x: 5, y: 5 }, 2)).toBe(2)
  })
})
