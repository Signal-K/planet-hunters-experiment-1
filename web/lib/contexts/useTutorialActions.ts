import { useCallback } from 'react'
import { PROGRESSION_STEPS } from '@/lib/data'
import { applyTutorialSkip } from '@/lib/tutorial-skip'
import type { GameState } from '@/lib/game-types'
import { completeFlightPlanEvent, replayFlightPlanTry, revealFlightPlanHint, skipFlightPlan as applyFlightPlanSkip, startFlightPlan as beginFlightPlan, type FlightPlanEvent, type TrainingTryId } from '@/lib/systems/FlightPlanSystem'

export function useTutorialActions(
  setState: React.Dispatch<React.SetStateAction<GameState>>,
) {
  const setTutorial = useCallback((v: boolean) => {
    setState(s => ({ ...s, tutorial: v }))
  }, [setState])

  const skipTutorial = useCallback((stepIds: number[]) => {
    setState(s => applyTutorialSkip(s, stepIds))
  }, [setState])

  const setDoneSteps: React.Dispatch<React.SetStateAction<Record<number, boolean>>> = useCallback(
    (update) => setState(s => ({
      ...s,
      doneSteps: typeof update === 'function' ? update(s.doneSteps) : update,
    })),
    [setState],
  )

  const completeStep = useCallback((id: number) => {
    setState(s => ({ ...s, doneSteps: { ...s.doneSteps, [id]: true } }))
  }, [setState])

  const coachManualNext = useCallback(() => {
    setState(s => {
      const stepsHere = s.tutorial
        ? PROGRESSION_STEPS.filter(step => step.screen === s.screen && !s.doneSteps[step.id])
        : []
      const coach = stepsHere[0]
      if (!coach) return s
      return { ...s, doneSteps: { ...s.doneSteps, [coach.id]: true } }
    })
  }, [setState])

  const startFlightPlan = useCallback(() => {
    setState(s => ({ ...s, player: { ...s.player, flightPlan: beginFlightPlan(s.player.flightPlan, Date.now()) } }))
  }, [setState])

  const completeFlightPlan = useCallback((event: FlightPlanEvent) => {
    setState(s => ({ ...s, player: { ...s.player, flightPlan: completeFlightPlanEvent(s.player.flightPlan, event) } }))
  }, [setState])

  const showFlightPlanHint = useCallback(() => {
    setState(s => ({ ...s, player: { ...s.player, flightPlan: revealFlightPlanHint(s.player.flightPlan, Date.now()) } }))
  }, [setState])

  const replayTrainingTry = useCallback((tryId: TrainingTryId) => {
    setState(s => ({ ...s, player: { ...s.player, flightPlan: replayFlightPlanTry(s.player.flightPlan, tryId) } }))
  }, [setState])

  const openTrainingTry = useCallback((tryId: TrainingTryId) => {
    setState(s => ({
      ...s,
      screen: tryId === 'scan' ? 'galaxy' : tryId === 'part' ? 'hangar' : 'launchpad',
      visualFixture: tryId === 'scan' ? 'tess' : undefined,
      player: { ...s.player, flightPlan: replayFlightPlanTry(s.player.flightPlan, tryId) },
    }))
  }, [setState])

  const skipFlightPlan = useCallback(() => {
    setState(s => {
      const flightPlan = applyFlightPlanSkip(s.player.flightPlan)
      return { ...s, tutorial: false, player: { ...s.player, flightPlan, freeOperations: true } }
    })
  }, [setState])

  return { setTutorial, skipTutorial, setDoneSteps, completeStep, coachManualNext, startFlightPlan, completeFlightPlan, showFlightPlanHint, replayTrainingTry, openTrainingTry, skipFlightPlan }
}
