'use client'

import { useEffect, useState } from 'react'
import type { Player } from '@/lib/game-types'
import { fetchReviewableAsteroidCandidates } from '@/lib/asteroid-subjects'
import { fetchReviewableTessCandidates } from '@/lib/tess-subjects'
import {
  collectInstrumentSignals,
  instrumentDigestDateKey,
  type InstrumentSignal,
} from '@/lib/systems/InstrumentFeedSystem'

export function useInstrumentSignals(player: Player): {
  signals: InstrumentSignal[]
  loading: boolean
} {
  const [signals, setSignals] = useState<InstrumentSignal[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const transitOnline = !!player.freeOperations && !!player.transitSatelliteLaunchedAt
    const deepSpaceOnline = !!player.freeOperations && !!player.deepSpaceTelescopeBuilt
    if (!transitOnline && !deepSpaceOnline) {
      setSignals([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    Promise.all([
      transitOnline ? fetchReviewableTessCandidates() : Promise.resolve([]),
      deepSpaceOnline ? fetchReviewableAsteroidCandidates() : Promise.resolve([]),
    ])
      .then(([tess, asteroids]) => {
        if (cancelled) return
        setSignals(collectInstrumentSignals({
          tess,
          asteroids,
          player,
          dateKey: instrumentDigestDateKey(),
        }))
      })
      .catch(() => {
        if (!cancelled) setSignals([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [
    player.freeOperations,
    player.transitSatelliteLaunchedAt,
    player.deepSpaceTelescopeBuilt,
    player.tessClassifications,
    player.asteroidClassifications,
    player.transitSatelliteLevel,
    player.deepSpaceTelescopeLevel,
    player.satelliteTargetId,
    player.satelliteTargetChosenOn,
  ])

  return { signals, loading }
}
