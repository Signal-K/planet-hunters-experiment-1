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
