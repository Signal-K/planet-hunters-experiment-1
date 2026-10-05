'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Screen } from '@/lib/game-types'
import { captureGameEvent } from '@/lib/posthog'
import { advanceRun, completeAction, currentStep, idleRun, startRun, stopRun, type CoachRun } from '@/lib/help/coach'
import { acquireHelpOpen } from '@/lib/help/open-state'
import { getHelpTopic } from '@/lib/help/topics'
import HelpButton from './HelpButton'
import HelpCoachMarks from './HelpCoachMarks'
import HelpSheet from './HelpSheet'

/**
 * Wires the shared help (SSL-432) into a screen. `button` goes in the screen's
 * header (TopBar `right` or the SetupFrame header), `layer` renders anywhere
 * in the screen, and `reportAction` tells a running "Show me" that the player
 * did the thing it asked for. Both are null when the screen has no topic.
 * Nothing here opens by itself: the sheet needs a tap on the "?".
 */
export function useHelp(screen: Screen, options: { onReplayTraining?: () => void } = {}): {
  button: ReactNode
  layer: ReactNode
  reportAction: (actionId: string) => void
  open: boolean
} {
  const topic = useMemo(() => getHelpTopic(screen), [screen])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [run, setRun] = useState<CoachRun>(() => idleRun(topic))
  const step = currentStep(run)
  const open = sheetOpen || step != null
  const { onReplayTraining } = options

  // A different screen means a different topic: drop any open help.
  useEffect(() => {
    setSheetOpen(false)
    setRun(idleRun(topic))
  }, [topic])

  // Pause the Flight Plan beacon and 8s hint while help is on screen.
  useEffect(() => (open ? acquireHelpOpen() : undefined), [open])

  const track = useCallback((event: string, props?: Record<string, unknown>) => {
    if (topic) captureGameEvent(event, { topic: topic.id, screen, ...props })
  }, [screen, topic])

  const openSheet = useCallback(() => { setSheetOpen(true); track('help_opened') }, [track])
  const closeSheet = useCallback(() => { setSheetOpen(false); track('help_closed', { via: 'sheet' }) }, [track])

  const trackStep = useCallback((target: CoachRun) => {
    const next = currentStep(target)
    if (next && target.index != null) track('help_coach_step', { step_id: next.id, step_index: target.index, total_steps: target.steps.length })
  }, [track])

  const showMe = useCallback(() => {
    setSheetOpen(false)
    const started = startRun(idleRun(topic))
    setRun(started)
    trackStep(started)
  }, [topic, trackStep])

  const next = useCallback(() => {
    const advanced = advanceRun(run)
    setRun(advanced)
    if (advanced.index == null) track('help_closed', { via: 'coach_done' })
    else trackStep(advanced)
  }, [run, track, trackStep])

  const stop = useCallback(() => {
    setRun(stopRun(run))
    track('help_closed', { via: 'coach_stop', step_id: step?.id })
  }, [run, step?.id, track])

  const reportAction = useCallback((actionId: string) => {
    setRun(prev => {
      const advanced = completeAction(prev, actionId)
      if (advanced !== prev) queueMicrotask(() => (advanced.index == null ? track('help_closed', { via: 'coach_done' }) : trackStep(advanced)))
      return advanced
    })
  }, [track, trackStep])

  if (!topic) return { button: null, layer: null, reportAction, open: false }

  return {
    button: <HelpButton onClick={openSheet} label={`Help: ${topic.title}`} />,
    layer: (
      <>
        {sheetOpen && (
          <HelpSheet
            topic={topic}
            onClose={closeSheet}
            onShowMe={topic.coach?.length ? showMe : undefined}
            onReplayTraining={onReplayTraining ? () => { setSheetOpen(false); onReplayTraining() } : undefined}
          />
        )}
        {step && run.index != null && <HelpCoachMarks step={step} index={run.index} total={run.steps.length} onNext={next} onStop={stop} />}
      </>
    ),
    reportAction,
    open,
  }
}
