import { useEffect, useRef, useState } from 'react'
import type { Toast } from '@/components/ui/ToastLayer'
import type { GameState } from '@/lib/game-types'
import { fetchReviewableTessCandidates } from '@/lib/tess-subjects'
import { scheduleLandnamPush } from '@/lib/takeon/push'
import {
  instrumentDigestDateKey,
  instrumentDigestWasNotified,
  markInstrumentDigestNotified,
  TRANSIT_TELESCOPE_INSTRUMENT_ID,
  unresolvedTransitInstrumentDigest,
} from '@/lib/systems/InstrumentFeedSystem'

interface InstrumentFeedNotificationOpts {
  enabled: boolean
  player: GameState['player']
  setState: React.Dispatch<React.SetStateAction<GameState>>
  addToast: (message: string, kind?: Toast['kind']) => void
}

/**
 * Announces a non-empty daily digest at most once per owned instrument/date.
 * The marker lives in Player state, so reloads and remote-save round trips do
 * not turn a daily newsletter into a notification storm.
 */
export function useInstrumentFeedNotifications({
  enabled,
  player,
  setState,
  addToast,
}: InstrumentFeedNotificationOpts): void {
  const [dateKey, setDateKey] = useState(() => instrumentDigestDateKey())
  const emitted = useRef(new Set<string>())

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = instrumentDigestDateKey()
      setDateKey(current => current === next ? current : next)
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (
      !enabled
      || !player.freeOperations
      || !player.satelliteMonitoringBuilt
      || !player.transitSatelliteLaunchedAt
      || instrumentDigestWasNotified(
        player,
        TRANSIT_TELESCOPE_INSTRUMENT_ID,
        dateKey
      )
    ) {
      return
    }

    let cancelled = false
    fetchReviewableTessCandidates()
      .then(candidates => {
        if (cancelled) return
        setState(state => {
          const pending = unresolvedTransitInstrumentDigest(
            candidates,
            state.player,
            dateKey
          )
          if (
            pending.length === 0
            || instrumentDigestWasNotified(
              state.player,
              TRANSIT_TELESCOPE_INSTRUMENT_ID,
              dateKey
            )
          ) {
            return state
          }

          const notificationKey = `${TRANSIT_TELESCOPE_INSTRUMENT_ID}:${dateKey}`
          if (!emitted.current.has(notificationKey)) {
            emitted.current.add(notificationKey)
            queueMicrotask(() => {
              addToast(
                `${pending.length} instrument data item${pending.length === 1 ? '' : 's'} ready.`,
                'info'
              )
              void scheduleLandnamPush({
                title: 'INSTRUMENT DATA READY',
                body: `${pending.length} transit candidate${pending.length === 1 ? '' : 's'} arrived in today's S.M.S. downlink.`,
              }).catch(() => {})
            })
          }

          return {
            ...state,
            player: markInstrumentDigestNotified(
              state.player,
              TRANSIT_TELESCOPE_INSTRUMENT_ID,
              dateKey
            ),
          }
        })
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [
    addToast,
    dateKey,
    enabled,
    player.freeOperations,
    player.instrumentDigestNotifiedOn,
    player.satelliteMonitoringBuilt,
    player.satelliteMonitoringLevel,
    player.satelliteTargetId,
    player.tessClassifications,
    player.transitSatelliteLaunchedAt,
    player.transitSatelliteLevel,
    setState,
  ])
}
