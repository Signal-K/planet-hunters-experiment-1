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
  // Preflight and the flight itself are one Launch step. The first of the two
  // wins so a retry of either does not add a second launch (SSL-465).
  fab: 'launch',
  transit: 'launch',
  mining: 'mine',
  debrief: 'debrief',
  build: 'build',
}

export function coreLoopStepForScreen(screen: Screen): CoreLoopStep | null {
  return CORE_LOOP_SCREEN_STEPS[screen] ?? null
}

type CompletedTries = FlightPlanProgress['completed'] | undefined

export interface LoopVisit {
  fired: CoreLoopStep[]
  loopId: string
}

export interface LoopVisitResult {
  fired: CoreLoopStep[]
  loopId: string
  capture: { step: CoreLoopStep; loopId: string } | null
}

/** One capture per step inside a loop. Debrief closes the loop: the same
 * debrief does not count again, and the next Base starts a new loop id. */
export function advanceLoopVisit(screen: Screen, visit: LoopVisit, nextLoopId: string): LoopVisitResult {
  const step = coreLoopStepForScreen(screen)
  if (!step) return { fired: visit.fired, loopId: visit.loopId, capture: null }
  let fired = visit.fired
  let loopId = visit.loopId
  if (fired.includes('debrief') && step !== 'debrief') fired = []
  if (fired.includes(step)) return { fired, loopId, capture: null }
  fired = [...fired, step]
  const capture = { step, loopId }
  if (step === 'debrief') loopId = nextLoopId
  return { fired, loopId, capture }
}

let loopSeq = 0
function mintLoopId(): string {
  loopSeq += 1
  return `loop-${loopSeq}`
}

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
  const visitRef = useRef<LoopVisit>({ fired: [], loopId: mintLoopId() })

  useEffect(() => {
    const next = advanceLoopVisit(screen, visitRef.current, mintLoopId())
    visitRef.current = { fired: next.fired, loopId: next.loopId }
    if (!next.capture) return
    captureGameEvent(`core_loop_${next.capture.step}_viewed`, {
      step: next.capture.step,
      loop_id: next.capture.loopId,
    })
  }, [screen])

  useEffect(() => {
    const current = flightPlan?.completed
    for (const tryId of newlyCompletedTrainingTries(previousCompletedRef.current, current)) {
      captureGameEvent('training_try_completed', { try_id: tryId })
    }
    previousCompletedRef.current = current
  }, [flightPlan?.completed])
}
