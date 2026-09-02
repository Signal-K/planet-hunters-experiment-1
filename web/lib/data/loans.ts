/**
 * Emergency-loan economy constants, shared so the Debrief screen shows the
 * same repayment the game loop is about to deduct (STS-542).
 */

export { LOAN_PRINCIPAL, TREASURY_STARTING_BALANCE } from './economy'

/**
 * What the next debrief deducts against an outstanding debt: all of it.
 *
 * There used to be a `LOAN_MAX_INSTALMENT` ceiling here, derived from a 5B
 * principal (`ceil(5B × 1.08 / 2)`) that was never updated when the principal
 * dropped to 500M. At 2.7B it sat far above any debt the game can book, so the
 * `Math.min` against it never once bound and every debrief already cleared the
 * whole debt. Removed rather than re-tuned — a repay-over-instalments rule
 * should be written deliberately if it's wanted, not left as dead arithmetic
 * implying a policy the game doesn't have.
 */
export function loanInstalmentFor(loanDebt: number | undefined): number {
  if (!loanDebt || loanDebt <= 0) return 0
  return loanDebt
}
