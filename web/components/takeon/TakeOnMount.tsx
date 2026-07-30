'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  MissionState,
  RoverSpec,
  SyncAdapter,
} from '@takeon/engine'
import { LandnamSync } from '@/lib/takeon/LandnamSync'
import {
  bindTakeonHostEvents,
  notificationForTakeonEvent,
  type TakeonHostEvent,
} from '@/lib/takeon/events'
import { scheduleLandnamPush } from '@/lib/takeon/push'
import styles from './TakeOnMount.module.css'

export interface TakeOnMountProps {
  missionId: string
  bodyId: string
  rover: RoverSpec
  roverName?: string
  seed?: number
  adapter?: SyncAdapter
  className?: string
  onEvent?: (event: TakeonHostEvent) => void
  onReady?: (mission: MissionState) => void
  onError?: (error: Error) => void
}

export default function TakeOnMount({
  missionId,
  bodyId,
  rover,
  roverName = rover.name,
  seed,
  adapter: suppliedAdapter,
  className,
  onEvent,
  onReady,
  onError,
}: TakeOnMountProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const adapter = useMemo(
    () => suppliedAdapter ?? new LandnamSync(),
    [suppliedAdapter]
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const canvasElement: HTMLCanvasElement = canvasRef.current

    let app: import('pixi.js').Application | null = null
    let mounted: import('@takeon/pixi').MountedRoverGame | null = null
    let resizeObserver: ResizeObserver | null = null
    let saveTimer: ReturnType<typeof setTimeout> | null = null
    let unbindHostEvents: (() => void) | null = null
    let unbindStateChanged: (() => void) | null = null
    let unbindPhoto: (() => void) | null = null
    let unbindDiscovery: (() => void) | null = null
    let disposed = false

    const snapshot = (): MissionState | null => {
      if (!mounted) return null
      return {
        ...mounted.game.save(),
        id: missionId,
        bodyId,
      }
    }

    const save = async () => {
      const state = snapshot()
      if (state) await adapter.saveMission(state, roverName)
    }

    const reportError = (reason: unknown) => {
      const nextError = reason instanceof Error ? reason : new Error(String(reason))
      if (!disposed) setError(nextError.message)
      onError?.(nextError)
    }

    async function init() {
      try {
        const PIXI = await import('pixi.js')
        const { mountRoverGame } = await import('@takeon/pixi')
        const { getBody } = await import('@takeon/engine')
        const body = getBody(bodyId)
        if (!body) throw new Error(`Unknown Takeon body: ${bodyId}`)

        const resume = await adapter.loadMission(missionId)
        if (disposed) return

        app = new PIXI.Application()
        await app.init({
          canvas: canvasElement,
          width: canvasElement.clientWidth || 800,
          height: canvasElement.clientHeight || 600,
          backgroundAlpha: 0,
          antialias: true,
        })
        if (disposed) {
          app.destroy()
          app = null
          return
        }

        mounted = mountRoverGame({
          pixi: PIXI as unknown as import('@takeon/pixi').PixiNamespaceLike,
          stage: app.stage as unknown as import('@takeon/pixi').PixiContainerLike,
          ticker: app.ticker as unknown as import('@takeon/pixi').PixiTickerLike,
          view: app.canvas,
          width: app.canvas.width,
          height: app.canvas.height,
          body,
          spec: rover,
          seed,
          resume: resume ?? undefined,
        })

        const handleHostEvent = (event: TakeonHostEvent) => {
          onEvent?.(event)
          const notification = notificationForTakeonEvent(event)
          if (notification) void scheduleLandnamPush(notification).catch(reportError)
        }
        unbindHostEvents = bindTakeonHostEvents(mounted.game.events, handleHostEvent)
        unbindStateChanged = mounted.game.events.on('stateChanged', () => {
          if (saveTimer) clearTimeout(saveTimer)
          saveTimer = setTimeout(() => void save().catch(reportError), 750)
        })
        unbindPhoto = mounted.game.events.on('photo', ({ photo, dataUrl }) => {
          void adapter.uploadPhoto(photo, dataUrl, missionId).catch(reportError)
        })
        unbindDiscovery = mounted.game.events.on(
          'anomalyDocumented',
          ({ anomaly }) => {
            void adapter.recordDiscovery(anomaly, bodyId, missionId).catch(reportError)
          }
        )

        resizeObserver = new ResizeObserver(entries => {
          const entry = entries[0]
          if (!entry || !mounted) return
          mounted.resize(entry.contentRect.width, entry.contentRect.height)
        })
        resizeObserver.observe(canvasElement)

        mounted.game.start()
        const initialState = snapshot()
        if (initialState) onReady?.(initialState)
      } catch (reason) {
        reportError(reason)
      }
    }

    void init()

    return () => {
      disposed = true
      if (saveTimer) clearTimeout(saveTimer)
      void save().catch(() => {
        // Unmount must remain non-blocking; the adapter already retains an
        // offline fallback when the remote write cannot complete.
      })
      resizeObserver?.disconnect()
      unbindHostEvents?.()
      unbindStateChanged?.()
      unbindPhoto?.()
      unbindDiscovery?.()
      mounted?.destroy()
      mounted = null
      if (app?.renderer) app.destroy()
      app = null
    }
  }, [
    adapter,
    bodyId,
    missionId,
    onError,
    onEvent,
    onReady,
    rover,
    roverName,
    seed,
  ])

  return (
    <div className={[styles.mount, className].filter(Boolean).join(' ')}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label={`Surface operations on ${bodyId}`}
      />
      {error && (
        <p className={styles.error} role="alert">
          Surface operations unavailable: {error}
        </p>
      )}
    </div>
  )
}
