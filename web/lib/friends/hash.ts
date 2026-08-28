// Deterministic 32-bit string hash (FNV-1a) shared by the avatar and
// username generators — same seed always produces the same output, which is
// the whole point (a player's avatar/default name shouldn't reshuffle every
// render).
export function hashString(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

// Deterministic PRNG (mulberry32) seeded from hashString — gives repeatable
// draws for avatar facet colors without pulling in a dependency.
export function mulberry32(seed: number): () => number {
  let a = seed
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
