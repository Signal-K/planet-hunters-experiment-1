/**
 * Deterministic randomness for the base world. FNV-1a hashes a key to a seed and mulberry32 draws from it, so a
 * date and an event id give the same numbers on every device. Native mirrors this exactly
 * (LandnamCore World/WorldRandom.swift); world-fixture.json pins both to the same values.
 */
export function hashSeed(key: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

export class WorldRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  static from(key: string): WorldRandom {
    return new WorldRandom(hashSeed(key))
  }

  /** Uniform in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next()
  }
}
