'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { FlightBodyLook, FlightConfig, FlightCraftLook, FlightEvent, FlightSceneHandle, FlightSnapshot } from '@takeon/engine'

export interface TakeOnFlightHandle {
  /** Hold a nudge, each axis -1..1 (x right, y up). */
  steer: (x: number, y: number) => void
  /** Spend a boost charge. False when none is ready. */
  boost: () => boolean
  snapshot: () => FlightSnapshot | null
}

interface Props {
  config: FlightConfig
  destination: FlightBodyLook
  craft: FlightCraftLook
  /** Host-paced flights: where the trip clock is, 0..1. */
  progress?: number
  onEvent?: (event: FlightEvent) => void
  onSnapshot?: (snapshot: FlightSnapshot) => void
  className?: string
  testId?: string
}

/**
 * SSL-848: Takeon's space flight scene on one canvas. The engine owns the rules, the 3D view and the keyboard and
 * pointer steering; Landnam owns the trip clock, the controls drawn on top and what a boost is worth.
 */
const TakeOnFlight = forwardRef<TakeOnFlightHandle, Props>(function TakeOnFlight({ config, destination, craft, progress, onEvent, onSnapshot, className, testId = 'takeon-flight' }, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sceneRef = useRef<FlightSceneHandle | null>(null)
  const latest = useRef({ onEvent, onSnapshot, progress, craft })
  latest.current = { onEvent, onSnapshot, progress, craft }
  // A flight is its config and where it is going: a change starts a new flight.
  const key = JSON.stringify([config, destination])

  useImperativeHandle(ref, () => ({
    steer: (x, y) => sceneRef.current?.steer(x, y),
    boost: () => sceneRef.current?.boost() ?? false,
    snapshot: () => sceneRef.current?.snapshot() ?? null,
  }), [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let scene: FlightSceneHandle | null = null
    let cancelled = false
    let poll = 0
    let observer: ResizeObserver | null = null
    void import('@takeon/engine').then(engine => {
      if (cancelled) return
      scene = engine.createFlightScene({ canvas, config, destination, craft: latest.current.craft, onEvent: event => latest.current.onEvent?.(event) })
      sceneRef.current = scene
      const fit = () => scene?.resize(canvas.clientWidth, canvas.clientHeight, 2)
      fit()
      observer = new ResizeObserver(fit)
      observer.observe(canvas)
      if (latest.current.progress !== undefined) scene.setProgress(latest.current.progress)
      scene.start()
      canvas.dataset.ready = 'true'
      poll = window.setInterval(() => {
        if (!scene) return
        const snap = scene.snapshot()
        canvas.dataset.phase = snap.phase
        latest.current.onSnapshot?.(snap)
      }, 120)
    })
    return () => {
      cancelled = true
      window.clearInterval(poll)
      observer?.disconnect()
      scene?.destroy()
      sceneRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => { if (progress !== undefined) sceneRef.current?.setProgress(progress) }, [progress])
  useEffect(() => { sceneRef.current?.setCraft(craft) }, [craft])

  return <canvas ref={canvasRef} className={className} data-testid={testId} style={{ touchAction: 'none' }} />
})

export default TakeOnFlight
