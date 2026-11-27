// SSL-462: the one resource sink that closes the mining loop. Ore hauled home
// is spent on the Laser Capacitor at Debrief, and each level adds laser
// charges to every later mining run (a longer run, so more ore per trip).

export interface LaserCapacitorTier {
  level: number
  name: string
  /** Ore units (any mineral) spent from the Earth stash. */
  costUnits: number
  /** Total extra laser charges at this level, across every later run. */
  bonusCharges: number
}

export const LASER_CAPACITOR_TIERS: readonly LaserCapacitorTier[] = [
  { level: 1, name: 'Laser Capacitor I', costUnits: 6, bonusCharges: 4 },
  { level: 2, name: 'Laser Capacitor II', costUnits: 12, bonusCharges: 8 },
  { level: 3, name: 'Laser Capacitor III', costUnits: 20, bonusCharges: 12 },
]

/** Extra laser charges granted by the installed capacitor level. */
export function laserCapacitorBonus(level: number | undefined): number {
  const owned = LASER_CAPACITOR_TIERS.filter(t => t.level <= (level ?? 0))
  return owned.length > 0 ? owned[owned.length - 1].bonusCharges : 0
}
