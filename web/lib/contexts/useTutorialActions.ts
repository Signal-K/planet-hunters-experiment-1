import { useCallback } from 'react'
import { PROGRESSION_STEPS } from '@/lib/data'
import { applyTutorialSkip } from '@/lib/tutorial-skip'
import type { GameState } from '@/lib/game-types'

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

  return { setTutorial, skipTutorial, setDoneSteps, completeStep, coachManualNext }
}
