'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { Target } from '@/lib/data'
import { MINERAL_META } from '@/lib/data'
import VirtualJoystick from '@/components/ui/VirtualJoystick'

interface Props {
  target: Target
  done: boolean
}

export default function RoverMiningCanvas({ target, done }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const joystickRef = useRef({ dx: 0, dy: 0 })
  const doneRef = useRef(done)
  doneRef.current = done

  const handleJoystick = useCallback((dx: number, dy: number) => {
    joystickRef.current = { dx, dy }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let app: import('pixi.js').Application | null = null
    let rafId = 0
    let lastT = 0
    let elapsed = 0
    let destroyed = false

    const mineralColors: Record<string, string> = {}
    for (const m of target.minerals) {
      mineralColors[m] = MINERAL_META[m]?.color ?? '#888888'
    }

    async function init() {
      const { Application } = await import('pixi.js')
      const { buildRoverScene } = await import('@/lib/pixi/roverScene')

      if (!canvas || destroyed) return
      app = new Application()
      await app.init({
        canvas,
        width: canvas.offsetWidth || 320,
        height: canvas.offsetHeight || 300,
        backgroundAlpha: 0,
        antialias: true,
      })

      // Check destroyed AFTER init — if unmount raced the async init, clean up
      // now and bail. Guard with try/catch: PixiJS v8 _cancelResize can throw
      // if the renderer never fully initialised.
      if (destroyed) {
        try { app.destroy() } catch (_) { /* pixi v8 cleanup */ }
        app = null
        return
      }

      const scene = buildRoverScene(app, {
        targetName: target.name,
        minerals: target.minerals,
        mineralColors,
        getDone: () => doneRef.current,
        getJoystick: () => joystickRef.current,
      })

      function loop(t: number) {
        const dt = Math.min((t - lastT) / 1000, 0.1)
        lastT = t
        elapsed += dt
        scene.update(elapsed, dt)
        rafId = requestAnimationFrame(loop)
      }
      lastT = performance.now()
      rafId = requestAnimationFrame(loop)
    }

    void init()

    return () => {
      cancelAnimationFrame(rafId)
      destroyed = true
      if (app?.renderer) {
        try { app.destroy() } catch (_) { /* pixi v8 cleanup */ }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      {/* Joystick — bottom-left, only show when not done */}
      {!done && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 10,
        }}>
          <VirtualJoystick
            size={80}
            onChange={handleJoystick}
            label="DRIVE"
          />
        </div>
      )}
      {/* Target name badge */}
      <div style={{
        position: 'absolute',
        top: 8,
        right: 8,
        fontFamily: 'var(--ln-font-display)',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.2em',
        color: 'rgba(155,236,255,0.55)',
        textTransform: 'uppercase',
      }}>
        {target.name}
      </div>
    </div>
  )
}
