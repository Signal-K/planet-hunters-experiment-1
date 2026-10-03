/** Shots that miss the vein, or hit the wrong mineral, spend a charge.
 *  One remaining charge per unit still owed is not enough to finish. */
export const RECHARGE_ATTEMPTS_PER_UNIT = 3

export function unitsStillNeeded(
  required: Record<string, number>,
  cargo: Record<string, number>,
): number {
  return Object.entries(required).reduce(
    (sum, [id, amount]) => sum + Math.max(0, amount - (cargo[id] ?? 0)),
    0,
  )
}

/** True when the remaining magazine cannot reliably finish the order.
 *  The player can recharge without losing cargo already collected. */
export function miningNeedsRecharge(laserCharges: number, stillNeeded: number): boolean {
  if (stillNeeded <= 0) return false
  return laserCharges < stillNeeded * RECHARGE_ATTEMPTS_PER_UNIT
}
