import type { HelpCoachStep, HelpTopic } from './topics'

/** Pure sequencing for the "Show me" run so it can be tested without a DOM. */
export interface CoachRun {
  steps: readonly HelpCoachStep[]
  /** Index of the step on screen, or null when the run is not active. */
  index: number | null
}

export function idleRun(topic: HelpTopic | null): CoachRun {
  return { steps: topic?.coach ?? [], index: null }
}

export function startRun(run: CoachRun): CoachRun {
  return run.steps.length ? { ...run, index: 0 } : run
}

export function currentStep(run: CoachRun): HelpCoachStep | null {
  return run.index == null ? null : run.steps[run.index] ?? null
}

/** Moves to the next step, or ends the run after the last one. */
export function advanceRun(run: CoachRun): CoachRun {
  if (run.index == null) return run
  const next = run.index + 1
  return { ...run, index: next >= run.steps.length ? null : next }
}

/**
 * The screen reports that the player did something. Only the step that
 * names that action advances; anything else is ignored, so an early or
 * repeated action never skips a step.
 */
export function completeAction(run: CoachRun, actionId: string): CoachRun {
  const step = currentStep(run)
  return step && step.completeOn === actionId ? advanceRun(run) : run
}

export function stopRun(run: CoachRun): CoachRun {
  return { ...run, index: null }
}
