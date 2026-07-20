'use client'

import { useEffect, useRef, useState } from 'react'
import type { RoverGame } from '@takeon/engine'

// Standalone technical proof that the vendored @takeon/engine + @takeon/pixi
// modules actually render and simulate inside this app's PixiJS/Next.js
// stack. Deliberately has zero dependency on game-context.tsx or any
// existing mission/onboarding state — see STS-414 discussion: takeon
// replacing the existing RoverMiningScreen is a separate, later decision,
// not something this demo should touch or assume.

const BODIES = ['moon', 'mars', 'europa'] as const

interface Hud {
  battery: number
  batteryCap: number
  fuel: number
  durability: number
  cargoUsed: number
  facing: number
  structures: number
}

export default function TakeonEngineDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<RoverGame | null>(null)
  const [bodyId, setBodyId] = useState<(typeof BODIES)[number]>('mars')
  const [hud, setHud] = useState<Hud | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [structureTypes, setStructureTypes] = useState<string[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let app: import('pixi.js').Application | null = null
    let mounted: import('@takeon/pixi').MountedRoverGame | null = null
    let rafId = 0
    let destroyed = false

    async function init() {
      const PIXI = await import('pixi.js')
      const { mountRoverGame } = await import('@takeon/pixi')
      const { getBody, defaultSpec, STRUCTURES } = await import('@takeon/engine')

      if (!canvas || destroyed) return
      app = new PIXI.Application()
      await app.init({
        canvas,
        width: canvas.offsetWidth || 480,
        height: canvas.offsetHeight || 360,
        backgroundAlpha: 1,
        background: '#060d18',
        antialias: true,
      })
      if (destroyed) {
        try { app.destroy() } catch { /* pixi v8 cleanup */ }
        app = null
        return
      }

      const body = getBody(bodyId)
      if (!body) return

      mounted = mountRoverGame({
        pixi: PIXI as unknown as import('@takeon/pixi').PixiNamespaceLike,
        stage: app.stage as unknown as import('@takeon/pixi').PixiContainerLike,
        ticker: app.ticker as unknown as import('@takeon/pixi').PixiTickerLike,
        view: app.canvas,
        width: app.canvas.width,
        height: app.canvas.height,
        body,
        spec: defaultSpec(),
      })
      gameRef.current = mounted.game
      setStructureTypes(Object.keys(STRUCTURES))
      mounted.game.start()

      const events = mounted.game.events
      const appendLog = (line: string) =>
        setLog((prev) => [line, ...prev].slice(0, 8))
      events.on('moved', () => {})
      events.on('mined', ({ resource, amount }) => {
        if (resource) appendLog(`Mined ${amount} ${resource}`)
      })
      events.on('built', ({ structure }) => appendLog(`Built ${structure.type}`))
      events.on('buildFailed', ({ reason }) => appendLog(`Build failed: ${reason}`))
      events.on('rotated', ({ facing }) => appendLog(`Rotated structure → facing ${facing}`))
      events.on('demolished', ({ type }) => appendLog(`Demolished ${type}`))
      events.on('photo', () => appendLog('Photo captured'))
      events.on('scan', ({ found }) => appendLog(`Scan found ${found.length} anomalies`))

      const tick = () => {
        const r = mounted?.game.sim.rover
        if (r) {
          setHud({
            battery: Math.round(r.battery),
            batteryCap: Math.round(r.stats.batteryCapacity),
            fuel: Math.round(r.fuel),
            durability: Math.round(r.durability),
            cargoUsed: r.cargoUsed,
            facing: r.facing,
            structures: mounted?.game.sim.structures.length ?? 0,
          })
        }
        rafId = requestAnimationFrame(tick)
      }
      rafId = requestAnimationFrame(tick)
    }

    void init()

    return () => {
      cancelAnimationFrame(rafId)
      destroyed = true
      mounted?.destroy()
      gameRef.current = null
      if (app?.renderer) {
        try { app.destroy() } catch { /* pixi v8 cleanup */ }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, minHeight: '100dvh', background: '#060d18', fontFamily: 'var(--ln-font-mono)' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--ln-font-display)', fontSize: 18, fontWeight: 800, letterSpacing: '0.08em', color: '#e8f0fe', marginBottom: 4 }}>
          TAKEON ENGINE — TECHNICAL PREVIEW
        </h1>
        <p style={{ fontSize: 11, color: '#6b7fa3' }}>
          Standalone proof the vendored @takeon/engine + @takeon/pixi modules render/simulate.
          Not wired to any Landnam mission or save state.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {BODIES.map((b) => (
          <button
            key={b}
            onClick={() => setBodyId(b)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: `1px solid ${b === bodyId ? '#9beCff' : '#2a3a52'}`,
              background: b === bodyId ? '#9becff22' : 'transparent',
              color: b === bodyId ? '#9becff' : '#6b7fa3',
              fontFamily: 'var(--ln-font-display)',
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {b}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        <div style={{ position: 'relative', flex: '1 1 480px', minHeight: 360, border: '1px solid #1c2a3f', borderRadius: 10, overflow: 'hidden' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>

        <aside style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {hud && (
            <div style={{ border: '1px solid #1c2a3f', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, color: '#6b7fa3', letterSpacing: '0.1em', marginBottom: 6 }}>ROVER STATE</div>
              <HudRow label="Battery" value={`${hud.battery}/${hud.batteryCap}`} />
              <HudRow label="Fuel" value={`${hud.fuel}`} />
              <HudRow label="Durability" value={`${hud.durability}`} />
              <HudRow label="Cargo used" value={`${hud.cargoUsed}`} />
              <HudRow label="Facing" value={`${hud.facing}`} />
              <HudRow label="Structures placed" value={`${hud.structures}`} />
            </div>
          )}

          <div style={{ border: '1px solid #1c2a3f', borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 10, color: '#6b7fa3', letterSpacing: '0.1em', marginBottom: 6 }}>BUILD (facing tile)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {structureTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => gameRef.current?.build(t as Parameters<RoverGame['build']>[0])}
                  style={{ padding: '4px 8px', fontSize: 10, borderRadius: 4, border: '1px solid #2a3a52', background: 'transparent', color: '#9beCff', cursor: 'pointer' }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={{ border: '1px solid #1c2a3f', borderRadius: 8, padding: 10, flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <div style={{ fontSize: 10, color: '#6b7fa3', letterSpacing: '0.1em', marginBottom: 6 }}>EVENT LOG</div>
            {log.length === 0 && <div style={{ fontSize: 11, color: '#3d4f6b' }}>WASD/arrows to drive, M to mine, P to photo.</div>}
            {log.map((line, i) => (
              <div key={i} style={{ fontSize: 11, color: '#a9b8ce', marginBottom: 2 }}>{line}</div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

function HudRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
      <span style={{ color: '#6b7fa3' }}>{label}</span>
      <span style={{ color: '#e8f0fe', fontWeight: 700 }}>{value}</span>
    </div>
  )
}
