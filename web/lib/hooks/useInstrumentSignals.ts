'use client'

import { useEffect, useState } from 'react'
import type { Player } from '@/lib/game-types'
import { fetchReviewableAsteroidCandidates } from '@/lib/asteroid-subjects'
import { fetchReviewableSaturnCandidates } from '@/lib/saturn-subjects'
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
    const saturnOnline = !!player.freeOperations && !!player.saturnImagerLaunchedAt
    if (!transitOnline && !deepSpaceOnline && !saturnOnline) {
      setSignals([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    // One feed failing must not blank the others: a launched transit
    // telescope still reports when the Saturn or asteroid fetch is down.
    Promise.allSettled([
      transitOnline ? fetchReviewableTessCandidates() : Promise.resolve([]),
      deepSpaceOnline ? fetchReviewableAsteroidCandidates() : Promise.resolve([]),
      saturnOnline ? fetchReviewableSaturnCandidates() : Promise.resolve([]),
    ])
      .then(([tess, asteroids, saturn]) => {
        if (cancelled) return
        setSignals(collectInstrumentSignals({
          tess: tess.status === 'fulfilled' ? tess.value : [],
          asteroids: asteroids.status === 'fulfilled' ? asteroids.value : [],
          saturn: saturn.status === 'fulfilled' ? saturn.value : [],
          player,
          dateKey: instrumentDigestDateKey(),
        }))
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
    player.saturnImagerLaunchedAt,
    player.saturnClassifications,
    player.transitSatelliteLevel,
    player.deepSpaceTelescopeLevel,
    player.satelliteTargetId,
  ])

  return { signals, loading }
}
