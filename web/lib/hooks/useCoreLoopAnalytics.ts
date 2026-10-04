'use client'

import { useEffect, useRef } from 'react'
import type { Screen } from '@/lib/game-types'
import type { FlightPlanProgress, TrainingTryId } from '@/lib/systems/FlightPlanSystem'
import { TRAINING_TRY_IDS } from '@/lib/systems/FlightPlanSystem'
import { captureGameEvent } from '@/lib/posthog'

export type CoreLoopStep = 'base' | 'contract' | 'launch' | 'mine' | 'debrief' | 'build'

const CORE_LOOP_SCREEN_STEPS: Partial<Record<Screen, CoreLoopStep>> = {
  hub: 'base',
  missions: 'contract',
  transit: 'launch',
  mining: 'mine',
  debrief: 'debrief',
  build: 'build',
}

export function coreLoopStepForScreen(screen: Screen): CoreLoopStep | null {
  return CORE_LOOP_SCREEN_STEPS[screen] ?? null
}

type CompletedTries = FlightPlanProgress['completed'] | undefined

export function newlyCompletedTrainingTries(
  previous: CompletedTries,
  current: CompletedTries,
): TrainingTryId[] {
  return TRAINING_TRY_IDS.filter(tryId => !previous?.[tryId] && !!current?.[tryId])
}

/**
 * Cycle 4's funnel is route-based: Base > Contract > Launch > Mine > Debrief
 * > Build. PostHog automatically adds the current URL/host, so the live
 * insight can filter these events to staging without coupling app code to a
 * deployment hostname.
 */
export function useCoreLoopAnalytics(screen: Screen, flightPlan?: FlightPlanProgress) {
  const previousCompletedRef = useRef<CompletedTries>(flightPlan?.completed)

  useEffect(() => {
    const step = coreLoopStepForScreen(screen)
    if (!step) return
    captureGameEvent(`core_loop_${step}_viewed`, { step })
  }, [screen])

  useEffect(() => {
    const current = flightPlan?.completed
    for (const tryId of newlyCompletedTrainingTries(previousCompletedRef.current, current)) {
      captureGameEvent('training_try_completed', { try_id: tryId })
    }
    previousCompletedRef.current = current
  }, [flightPlan?.completed])
}
