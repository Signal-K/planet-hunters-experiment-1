'use client'

import { useEffect, useState } from 'react'
import RoutedScreenCoach from './RoutedScreenCoach'

// Step content for the Deep Space Telescope's NEOCP feed (KES-128).
// Rendering shell lives in RoutedScreenCoach (KES-342) — a shared, non-
// overlaying coach slot, replacing the old screen-local absolute overlay.
//
// Copy stays strictly factual (repo narrative rule: real science, real
// terminology, no fictional wrapper on mainline content) — this is a live
// read of the actual Minor Planet Center NEOCP, not a story beat.
const STEPS = [
  {
    title: 'A REAL UNCONFIRMED OBJECT FEED',
    body: "Every candidate here comes from the Minor Planet Center's Near-Earth Object Confirmation Page — objects seen once or twice that haven't been confirmed yet. Nothing here is simulated.",
  },
  {
    title: 'READ THE SKY POSITION',
    body: 'The plot below shows the candidate’s real right ascension and declination, plus its brightness and how long it has been tracked — the same fields real observatories use to prioritise follow-up.',
  },
  {
    title: 'FLAG, MARK, OR SKIP',
    body: '"Flag Likely Real" prioritises a candidate for follow-up. "Mark Artifact" flags it as a probable satellite glint, cosmic ray, or processing error. "Skip" leaves it unresolved for today.',
  },
]

const STORAGE_KEY = 'landnam_asteroid_discovery_coach_seen_v1'

export function useAsteroidDiscoveryCoach() {
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

export default function AsteroidDiscoveryCoach({ onDismiss }: { onDismiss: () => void }) {
  return <RoutedScreenCoach testId="asteroid-discovery-coach" tone="deep" steps={STEPS} onDismiss={onDismiss} finalLabel="Start ›" />
}
