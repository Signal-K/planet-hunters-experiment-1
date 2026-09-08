import { hashString } from './hash'

// Space/mining-themed word lists — no narrative wrapper (a username is
// flavor, not a story beat), just terms that fit Landnam's vocabulary.
const PREFIXES = [
  'IRON', 'COPPER', 'SILICON', 'COBALT', 'XENON', 'PLATINUM', 'CRIMSON',
  'CYAN', 'LUNAR', 'SOLAR', 'ORBITAL', 'DEEP', 'QUARTZ', 'TITAN', 'VOID',
  'ASTRO', 'RUST', 'NOVA', 'DRIFT', 'ZERO',
]
const SUFFIXES = [
  'DRIFTER', 'PROSPECTOR', 'RANGER', 'HAULER', 'SURVEYOR', 'PILOT',
  'MINER', 'SCOUT', 'RUNNER', 'ENGINEER', 'NAVIGATOR', 'FORGE', 'CREW',
  'OUTPOST', 'BEACON', 'RIG',
]

/**
 * A stable default username derived from the player's email — editable
 * afterward via the username-set endpoint. Same email always yields the
 * same default so re-rolling isn't possible by re-triggering generation.
 */
export function generateDefaultUsername(email: string): string {
  const seed = hashString(email.trim().toLowerCase())
  const prefix = PREFIXES[seed % PREFIXES.length]
  const suffix = SUFFIXES[Math.floor(seed / PREFIXES.length) % SUFFIXES.length]
  const number = (seed % 900) + 100 // 100-999, keeps it a fixed 3 digits
  return `${prefix}_${suffix}_${number}`
}

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,24}$/

export function isValidUsername(name: string): boolean {
  return USERNAME_PATTERN.test(name)
}
