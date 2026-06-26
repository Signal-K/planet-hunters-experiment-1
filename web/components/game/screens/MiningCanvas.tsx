'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Application, Assets, Container, Graphics, type Texture } from 'pixi.js'
import { Scene, GameLoop, InputManager, RuntimeContext, screenToWorld } from '@/lib/engine'
import { wireShapeRenderers } from '@/lib/engine/components/ShapeRenderer'
import type { ShapeKind } from '@/lib/engine/components/ShapeRenderer'
import { MiningController, SHIP_X, SCROLL_SPEED, SCROLL_SPEED_MIN, SCROLL_SPEED_MAX } from '@/lib/engine/scripts/MiningController'
import type { MineralMeta } from '@/lib/data'
import VirtualJoystick from '@/components/ui/VirtualJoystick'

// Tile width must be a multiple of 16 (ridgeH period) for seamless wrapping
const SURFACE_TILE_W = 320

const MINERAL_SHAPES: Record<string, ShapeKind> = {
  iron:    'circle',
  silicon: 'diamond',
  ice:     'circle',
  carbon:  'rect',
  nickel:  'diamond',
  cobalt:  'triangle',
  gold:    'circle',
  rare:    'diamond',
}

const SKY_COLOR = 0x03060c

function buildStars(worldW: number, surfaceY: number): Graphics {
  const g = new Graphics()
  const stars: [number, number, number, number][] = [
    [0.08, 0.13, 1.2, 0.30], [0.20, 0.42, 0.8, 0.18], [0.35, 0.08, 1.5, 0.28],
    [0.44, 0.55, 1.0, 0.15], [0.55, 0.22, 0.9, 0.22], [0.63, 0.48, 1.2, 0.12],
    [0.72, 0.10, 1.0, 0.25], [0.80, 0.35, 0.8, 0.18], [0.88, 0.58, 1.3, 0.20],
    [0.15, 0.60, 1.0, 0.14], [0.50, 0.38, 1.5, 0.10], [0.92, 0.25, 1.0, 0.22],
    [0.28, 0.30, 0.8, 0.16], [0.68, 0.62, 1.2, 0.18], [0.04, 0.75, 1.0, 0.12],
  ]
  for (const [fx, fy, r, alpha] of stars) {
    g.circle(fx * worldW, fy * (surfaceY - 8), r).fill({ color: 0xffffff, alpha })
  }
  return g
}

function buildSurfaceTile(tileH: number): Graphics {
  const g = new Graphics()
  g.rect(0, 6, SURFACE_TILE_W, tileH - 6).fill(0x1a1006)
  const ridgeH = [0, -10, -14, -7, -18, -11, -5, -16, -12, -8, -15, -9, -19, -6, -13, -10, -17, -4, -11, -8]
  const edge: number[] = [0, tileH]
  for (let i = 0; i <= SURFACE_TILE_W; i += 16) {
    edge.push(i, 6 + ridgeH[Math.floor(i / 16) % ridgeH.length])
  }
  edge.push(SURFACE_TILE_W, tileH)
  g.poly(edge).fill(0x2d1e0c)
  const patches: [number, number][] = [
    [32, 14], [85, 22], [140, 10], [195, 18], [248, 12], [295, 20],
    [60, 8],  [125, 26], [175, 9],  [230, 16], [275, 24], [310, 11],
  ]
  for (const [px, pr] of patches) {
    g.circle(px, 22, pr).fill({ color: 0x110c04, alpha: 0.6 })
  }
  return g
}

function buildAimGuide(shipY: number, surfaceY: number): Graphics {
  const g = new Graphics()
  for (let y = shipY + 22; y < surfaceY - 10; y += 11) {
    g.circle(SHIP_X, y, 1.2).fill({ color: 0x9becff, alpha: 0.18 })
  }
  return g
}

function buildShip(shipY: number): Graphics {
  const g = new Graphics()

  // Engine exhaust layers
  g.ellipse(-30, 0, 18, 10).fill({ color: 0xff2200, alpha: 0.18 })
  g.ellipse(-27, 0, 12, 7).fill({ color: 0xff6600, alpha: 0.45 })
  g.ellipse(-24, 0, 7, 4).fill({ color: 0xffcc22, alpha: 0.82 })
  g.circle(-22, 0, 3).fill({ color: 0xfff0aa, alpha: 1 })

  // Swept delta wings (drawn behind fuselage)
  g.poly([-6, 6, 18, 6, 10, 24, -20, 18]).fill(0x0d2040)
  g.poly([-6, -6, 18, -6, 10, -24, -20, -18]).fill(0x0d2040)
  // Wing leading-edge highlight
  g.poly([18, -6, 18, -8, -4, -8, -6, -6]).fill({ color: 0x2f6aaa, alpha: 0.55 })
  g.poly([18, 6, 18, 8, -4, 8, -6, 6]).fill({ color: 0x2f6aaa, alpha: 0.55 })

  // Engine cowling (rear block)
  g.rect(-26, -5, 10, 10).fill(0x071220)
  g.rect(-25, -3, 5, 6).fill(0x132c50)

  // Main fuselage — elongated torpedo
  g.poly([-18, -8, 30, -6, 42, 0, 30, 6, -18, 8, -23, 4, -23, -4]).fill(0x1a4282)

  // Fuselage dorsal highlight (top third, lighter)
  g.poly([-2, -7, 28, -5.5, 28, -2, -2, -3]).fill({ color: 0x3a78c8, alpha: 0.42 })

  // Wing-root fairings where wings meet body
  g.poly([-2, -6, 16, -6, 14, -10, -8, -10]).fill(0x12305c)
  g.poly([-2, 6, 16, 6, 14, 10, -8, 10]).fill(0x12305c)

  // Cockpit surround
  g.ellipse(14, 0, 14, 8).fill(0x050d1a)
  // Cockpit glass with two-tone reflection
  g.ellipse(15, -1, 11, 5.5).fill({ color: 0x1e66bb, alpha: 0.65 })
  g.ellipse(17, -2, 6, 2.8).fill({ color: 0x6ab8f0, alpha: 0.75 })
  g.ellipse(19, -2.5, 2.5, 1.2).fill({ color: 0xc4e8ff, alpha: 0.6 })

  // Nose cone
  g.poly([30, -5.5, 44, 0, 30, 5.5]).fill(0x1e5096)
  g.poly([30, -3, 42, 0, 30, 3]).fill({ color: 0x4a90d8, alpha: 0.45 })

  // Laser emitter barrel
  g.rect(42, -1.8, 10, 3.6).fill(0x0a1e3a)
  g.rect(43, -0.8, 8, 1.6).fill(0x1a4470)
  // Emitter tip glow
  g.circle(52, 0, 3).fill({ color: 0x44bbff, alpha: 0.9 })
  g.circle(52, 0, 1.6).fill({ color: 0xccf2ff, alpha: 1 })

  g.x = SHIP_X
  g.y = shipY
  return g
}

interface MiningCanvasProps {
  minerals: string[]
  mineralMeta: Record<string, MineralMeta>
  onCollect: (mineral: string) => void
  fireRef: React.MutableRefObject<(() => void) | null>
}

export default function MiningCanvas({ minerals, mineralMeta, onCollect, fireRef }: MiningCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onCollectRef = useRef(onCollect)
  onCollectRef.current = onCollect
  const controllerRef = useRef<MiningController | null>(null)
  const joystickDxRef = useRef(0)
  const [missFlash, setMissFlash] = useState(false)
  const missFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onMissRef = useRef<(() => void) | null>(null)
  onMissRef.current = () => {
    if (missFlashTimerRef.current) clearTimeout(missFlashTimerRef.current)
    setMissFlash(true)
    missFlashTimerRef.current = setTimeout(() => setMissFlash(false), 280)
  }

  const handleJoystick = useCallback((dx: number, _dy: number) => {
    joystickDxRef.current = dx
    const controller = controllerRef.current
    if (!controller) return
    // dx: -1 = slow down, 0 = normal, +1 = fast forward
    const speed = SCROLL_SPEED + dx * (dx > 0 ? SCROLL_SPEED_MAX - SCROLL_SPEED : SCROLL_SPEED - SCROLL_SPEED_MIN)
    controller.setScrollSpeed(speed)
  }, [])

  useEffect(() => {
    const parent = containerRef.current
    if (!parent) return

    const canvas = document.createElement('canvas')
    canvas.dataset.testid = 'mining-canvas'
    canvas.style.cssText = 'display:block;width:100%;height:100%;'
    parent.appendChild(canvas)

    const app = new Application()
    let loop: GameLoop | null = null
    let input: InputManager | null = null
    let destroyed = false

    ;(async () => {
      try {
        const worldW = Math.max(300, parent.clientWidth)
        const worldH = Math.max(200, parent.clientHeight)
        const dpr = window.devicePixelRatio || 1
        const surfaceY = Math.round(worldH * 0.62)
        const shipY = Math.round(worldH * 0.22)
        const tileH = worldH - surfaceY

        // Preload ore sprites — one PNG per mineral key
        const oreTextures: Record<string, Texture> = {}
        await Promise.allSettled(
          minerals.map(id =>
            Assets.load(`/game/assets/ores/ore_${id}.png`)
              .then((t: Texture) => { oreTextures[id] = t })
              .catch(() => {})
          )
        )

        const [sceneData] = await Promise.all([
          Scene.load('/game/scenes/mining.scene.json'),
          app.init({
            canvas,
            width: worldW,
            height: worldH,
            background: SKY_COLOR,
            antialias: true,
            autoDensity: true,
            resolution: dpr,
          }),
        ])
        if (destroyed) return

        app.stage.addChild(buildStars(worldW, surfaceY))

        const surfaceContainer = new Container()
        surfaceContainer.y = surfaceY
        for (let i = 0; i < 3; i++) {
          const t = buildSurfaceTile(tileH)
          t.x = i * SURFACE_TILE_W
          surfaceContainer.addChild(t)
        }
        app.stage.addChild(surfaceContainer)

        const { scene, entityData } = Scene.fromData(sceneData)
        wireShapeRenderers(app.stage, entityData, scene)

        const mineralLaserAccess = Object.fromEntries(
          Object.entries(mineralMeta).map(([id, m]) => [id, m.laserAccess ?? 1])
        )

        const shakeState = { timer: 0 }
        const controllerObj = scene.find('mining-controller')
        const controller = new MiningController(new RuntimeContext(), {
          container: app.stage,
          worldWidth: worldW,
          worldHeight: worldH,
          surfaceY,
          shipY,
          minerals,
          mineralColors: Object.fromEntries(Object.entries(mineralMeta).map(([id, m]) => [id, m.color])),
          mineralLaserAccess,
          mineralShapes: MINERAL_SHAPES,
          mineralTextures: oreTextures,
          onCollect: mineral => onCollectRef.current(mineral),
          onMiss: () => {
            shakeState.timer = 0.28
            onMissRef.current?.()
          },
          onScroll: scrollX => {
            surfaceContainer.x = -(scrollX % SURFACE_TILE_W)
          },
        })

        app.ticker.add(ticker => {
          if (shakeState.timer > 0) {
            shakeState.timer -= ticker.deltaMS / 1000
            const t = Math.max(0, shakeState.timer / 0.28)
            app.stage.x = (Math.random() - 0.5) * 6 * t
            app.stage.y = (Math.random() - 0.5) * 4 * t
          } else if (app.stage.x !== 0 || app.stage.y !== 0) {
            app.stage.x = 0
            app.stage.y = 0
          }
        })
        controllerObj?.addComponent(controller)
        controllerRef.current = controller

        input = new InputManager(canvas, worldW, worldH)
        input.onAny(event => {
          if (event.type === 'pointerdown') controller.fireLaser()
        })
        fireRef.current = () => controller.fireLaser()

        app.stage.addChild(buildAimGuide(shipY, surfaceY))
        app.stage.addChild(buildShip(shipY))

        loop = new GameLoop(scene, app)
        loop.start()
      } catch (err) {
        console.error('[MiningCanvas] init failed:', err)
      }
    })()

    return () => {
      destroyed = true
      fireRef.current = null
      controllerRef.current = null
      loop?.stop()
      input?.destroy()
      if (app.renderer) {
        try { app.destroy() } catch (_) { /* pixi v8 cleanup */ }
        canvas.remove()
      }
      // else: async init returns early (destroyed=true), canvas stays briefly then is GC'd with parent
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={containerRef} className="mining-canvas" data-testid="mining-canvas" style={{ position: 'relative' }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
        background: 'rgba(255,34,0,0.22)',
        opacity: missFlash ? 1 : 0,
        transition: missFlash ? 'none' : 'opacity 280ms ease-out',
      }} />
      {/* Joystick for scroll speed: left = slow, right = fast forward */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        zIndex: 20,
        pointerEvents: 'auto',
      }}>
        <VirtualJoystick
          size={72}
          onChange={handleJoystick}
          label="SPEED"
        />
      </div>
    </div>
  )
}

export { screenToWorld }
