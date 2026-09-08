'use client'

import { useEffect, useState } from 'react'
import RoutedScreenCoach from './RoutedScreenCoach'

// Step content for the Academy management view's first-run walkthrough.
// Rendering shell lives in RoutedScreenCoach (KES-341) — a shared, non-
// overlaying coach slot that reserves layout space instead of floating over
// the scene/tabs the way the old screen-local overlay pattern did.
const STEPS = [
  {
    title: 'FUNDING KEEPS IT RUNNING',
    body: 'Every rostered astronaut costs daily upkeep. While funding is on, training and staffing keep running. Pause it and both stop until you restore it.',
  },
  {
    title: 'TRAIN OR HIRE',
    body: "Training a new candidate is free but takes real time. Hiring brings in an instant level-3 astronaut for francs, capped at 2 hires a week. Former crew you've let go can be re-hired at their mortgage value.",
  },
  {
    title: 'PUT THEM TO WORK',
    body: 'Assign a fit astronaut to the Refinery or Diplomacy Desk in Staffing for a passive bonus — faster processing or better contract terms.',
  },
  {
    title: 'GROW THE PROGRAM',
    body: 'Research Crew Quarters to fly astronauts on missions, and share flight charts with trusted clients in Partners to build the affinity that unlocks more crew sources.',
  },
]

const STORAGE_KEY = 'landnam_academy_coach_seen_v1'

export function useAcademyCoach() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      // localStorage unavailable (private mode, etc.) — just skip the coach
    }
  }, [])

  function dismiss() {
    setVisible(false)
    try { window.localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
  }

  return { visible, dismiss }
}

export default function AcademyCoach({ onDismiss }: { onDismiss: () => void }) {
  return <RoutedScreenCoach testId="academy-coach" tone="light" steps={STEPS} onDismiss={onDismiss} />
}
