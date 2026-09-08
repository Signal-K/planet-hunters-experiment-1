/**
 * Tutorial missions are single-threaded so the authored sequence cannot be
 * bypassed by accepting a second contract. Once Free Ops begins, the board is
 * repeatable and this tutorial-only lock no longer applies.
 */
export function isTutorialMissionInProgress(freeOperations: boolean, hasActiveMission: boolean): boolean {
  return !freeOperations && hasActiveMission
}
