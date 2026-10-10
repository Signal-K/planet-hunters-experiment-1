export const TRAINING_TRY_IDS = ['mining', 'scan', 'part'] as const

export type TrainingTryId = typeof TRAINING_TRY_IDS[number]
export type FlightPlanEvent = 'mining-debriefed' | 'tess-classified' | 'part-tweaked'

export interface FlightPlanProgress {
  completed: Partial<Record<TrainingTryId, true>>
  hidden: boolean
  replayTry?: TrainingTryId
  activeSince?: number
  hintShownFor?: TrainingTryId
}

export const EMPTY_FLIGHT_PLAN: FlightPlanProgress = { completed: {}, hidden: false }

const EVENT_TRY: Record<FlightPlanEvent, TrainingTryId> = {
  'mining-debriefed': 'mining',
  'tess-classified': 'scan',
  'part-tweaked': 'part',
}

export function currentTrainingTry(progress?: FlightPlanProgress): TrainingTryId | null {
  const completed = progress?.completed ?? {}
  return progress?.replayTry ?? TRAINING_TRY_IDS.find(id => !completed[id]) ?? null
}

export function isTrainingComplete(progress?: FlightPlanProgress): boolean {
  return TRAINING_TRY_IDS.every(id => progress?.completed?.[id])
}

export function startFlightPlan(progress: FlightPlanProgress | undefined, now: number): FlightPlanProgress {
  const next = { ...EMPTY_FLIGHT_PLAN, ...progress, completed: { ...(progress?.completed ?? {}) } }
  return { ...next, activeSince: now, hintShownFor: undefined }
}

export function revealFlightPlanHint(progress: FlightPlanProgress | undefined, now: number): FlightPlanProgress {
  const next = startFlightPlan(progress, progress?.activeSince ?? now)
  const active = currentTrainingTry(next)
  if (!active || next.hintShownFor === active || now - (next.activeSince ?? now) < 8_000) return next
  return { ...next, hintShownFor: active }
}

export function completeFlightPlanEvent(progress: FlightPlanProgress | undefined, event: FlightPlanEvent): FlightPlanProgress {
  let next = startFlightPlan(progress, Date.now())
  const tryId = EVENT_TRY[event]
  // SSL-478: a replay of an already-finished try must not outlive the player
  // moving on. Any other real try event (mining -> cargo -> debrief -> hub)
  // drops the replay so the objective follows the live plan again.
  // A replay of a try that was never finished (Menu -> Flight Plan) used to
  // swallow every other event too, so a finished mining run was never recorded.
  if (next.replayTry && next.replayTry !== tryId) {
    next = { ...next, replayTry: undefined, hintShownFor: undefined }
  }
  if (currentTrainingTry(next) !== tryId) return next
  return { ...next, completed: { ...next.completed, [tryId]: true }, replayTry: undefined, hidden: false, activeSince: undefined, hintShownFor: undefined }
}

export function replayFlightPlanTry(progress: FlightPlanProgress | undefined, tryId: TrainingTryId): FlightPlanProgress {
  return { ...startFlightPlan(progress, Date.now()), replayTry: tryId, hidden: false }
}

export function skipFlightPlan(progress: FlightPlanProgress | undefined): FlightPlanProgress {
  return { ...startFlightPlan(progress, Date.now()), completed: { mining: true, scan: true, part: true }, replayTry: undefined, hidden: true }
}
