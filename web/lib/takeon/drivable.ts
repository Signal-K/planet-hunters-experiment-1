/**
 * Rougher Landnam terrain (SSL-718) can box the rover in: Takeon refuses any step
 * taller than the wheels' climb limit, and a landing site ringed by cliffs left
 * the player with one tile to drive on. Before the field starts we measure how
 * much ground the rover can reach both ways (up and back down), and raise its
 * climb limit one step at a time until there is room to play.
 */

export interface DrivableWorld {
  size: number
  inBounds(x: number, y: number): boolean
  isSolid(x: number, y: number): boolean
  /** Signed height change driving from (x, y) to (nx, ny). */
  step(x: number, y: number, nx: number, ny: number): number
}

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [[1, 0], [0, 1], [-1, 0], [0, -1]]

/** Columns reachable from `from` when every step, up or down, is within `maxClimb`. */
export function reachableColumns(world: DrivableWorld, from: { x: number; y: number }, maxClimb: number): number {
  const { size } = world
  if (!world.inBounds(from.x, from.y) || !world.isSolid(from.x, from.y)) return 0
  const seen = new Uint8Array(size * size)
  const queue = [from.y * size + from.x]
  seen[queue[0]] = 1
  let count = 0
  while (queue.length > 0) {
    const cur = queue.pop() as number
    count++
    const x = cur % size
    const y = (cur - x) / size
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx
      const ny = y + dy
      if (!world.inBounds(nx, ny) || !world.isSolid(nx, ny)) continue
      const ni = ny * size + nx
      if (seen[ni]) continue
      if (Math.abs(world.step(x, y, nx, ny)) > maxClimb) continue
      seen[ni] = 1
      queue.push(ni)
    }
  }
  return count
}

/** Ground the rover should be able to reach from where it lands: a quarter of the map, up to 400 tiles. */
export function drivableTarget(size: number): number {
  return Math.min(400, Math.floor((size * size) / 4))
}

/** Highest climb limit we will hand out: past this the terrain is a wall, not a slope. */
export const MAX_ASSISTED_CLIMB = 4

/**
 * The smallest climb limit, starting from the rover's own, that opens enough ground.
 * Returns the rover's own limit when it already does, and never goes past MAX_ASSISTED_CLIMB.
 */
export function assistedClimb(world: DrivableWorld, from: { x: number; y: number }, maxClimb: number): number {
  const target = drivableTarget(world.size)
  let climb = maxClimb
  while (climb < MAX_ASSISTED_CLIMB && reachableColumns(world, from, climb) < target) climb++
  return climb
}
