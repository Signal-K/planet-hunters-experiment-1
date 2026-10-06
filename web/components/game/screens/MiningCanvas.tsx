'use client'

import { useEffect, useRef, useState } from 'react'
import { capDpr } from '@/lib/engine/pixiDisplay'
import { Application, Assets, Container, Graphics, Sprite, type Texture } from 'pixi.js'
import { Scene, GameLoop, InputManager, RuntimeContext, screenToWorld } from '@/lib/engine'
import { wireShapeRenderers } from '@/lib/engine/components/ShapeRenderer'
import { MiningController, SHIP_X, SCROLL_SPEED, SCROLL_SPEED_MIN, SCROLL_SPEED_MAX } from '@/lib/engine/scripts/MiningController'
import type { MineralMeta } from '@/lib/data'
import { ROCKET_ASSETS } from '@/lib/rocket-assets'
import { prefersReducedMotion } from '@/lib/pixi/launchSpriteAnim'
import { recoilOffset } from '@/lib/engine/miningJuice'
import { debrisRatePerMinute, type DebrisEventPreset } from '@/lib/data/sky-events'
import { debrisNow } from '@/lib/hooks/useDebrisEvent'

// Keep every mineral visibly grounded in the mining scene. The authored set
// covers the most common late-game ores; the neutral iron crystal is a
// deliberate generic fallback for early/free-ops minerals until bespoke art
// exists. Tint + the in-node chemistry symbol preserve identification without
// returning to the old invisible/shape-only deposits (KES-175).
const TEXTURED_ORE_IDS = new Set([
  'carbon', 'cobalt', 'gold', 'ice', 'iron', 'nickel', 'rare', 'silicon',
])
const GENERIC_ORE_TEXTURE_ID = 'iron'

// Tile width must be a multiple of 16 (ridgeH period) for seamless wrapping
const SURFACE_TILE_W = 320

const SKY_COLOR = 0xdfe9f3

// Minimum gap between shots: long enough that a mashed tap reads as
// deliberately ignored (not dropped input), short enough not to feel laggy.
const FIRE_COOLDOWN_MS = 420

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
    g.circle(fx * worldW, fy * (surfaceY - 8), r).fill({ color: 0x0f2436, alpha })
  }
  return g
}

function buildSurfaceTile(tileH: number): Graphics {
  const g = new Graphics()
  g.rect(0, 6, SURFACE_TILE_W, tileH - 6).fill(0x9fc8e2)
  const ridgeH = [0, -10, -14, -7, -18, -11, -5, -16, -12, -8, -15, -9, -19, -6, -13, -10, -17, -4, -11, -8]
  const edge: number[] = [0, tileH]
  for (let i = 0; i <= SURFACE_TILE_W; i += 16) {
    edge.push(i, 6 + ridgeH[Math.floor(i / 16) % ridgeH.length])
  }
  edge.push(SURFACE_TILE_W, tileH)
  g.poly(edge).fill(0x7aabc9)
  const patches: [number, number][] = [
    [32, 14], [85, 22], [140, 10], [195, 18], [248, 12], [295, 20],
    [60, 8],  [125, 26], [175, 9],  [230, 16], [275, 24], [310, 11],
  ]
  for (const [px, pr] of patches) {
    g.circle(px, 22, pr).fill({ color: 0x5d8fac, alpha: 0.32 })
  }
  return g
}

function buildAimGuide(shipY: number, surfaceY: number): Graphics {
  const g = new Graphics()
  for (let y = shipY + 22; y < surfaceY - 10; y += 11) {
    g.circle(SHIP_X, y, 1.2).fill({ color: 0x1f78c1, alpha: 0.22 })
  }
  return g
}

function buildEnginePlume(): Graphics {
  const g = new Graphics()

  // Engine exhaust layers: teal -> cyan -> white, same palette as the v2 launch flame (SSL-458)
  g.ellipse(-30, 0, 18, 10).fill({ color: 0x3fb8cc, alpha: 0.18 })
  g.ellipse(-27, 0, 12, 7).fill({ color: 0x70d9ea, alpha: 0.45 })
  g.ellipse(-24, 0, 7, 4).fill({ color: 0xa3ecf5, alpha: 0.82 })
  g.circle(-22, 0, 3).fill({ color: 0xe0f8ff, alpha: 1 })

  return g
}

interface MiningCanvasProps {
  rocketImageSrc?: string
  minerals: string[]
  requiredMinerals?: string[]
  mineralMeta: Record<string, MineralMeta>
  /** Equipped drill/laser part tier (1-3). Gates how deep the laser can reach. */
  laserTier?: number
  onCollect: (mineral: string) => void
  /** Signals that the rendered scene is ready to receive operator input. */
  onReady?: () => void
  /** Signals an initialization failure so the enclosing screen can recover. */
  onFailure?: () => void
  fireRef: React.MutableRefObject<(() => void) | null>
  /** Direct canvas tap/click must route back through the screen's fireLaser() so the charge-budget and gate checks it owns aren't bypassed — see the pointerdown handler below. */
  onFireRequest?: () => void
  scrollRef: React.MutableRefObject<((dx: number) => void) | null>
  oreNearRef?: React.MutableRefObject<((near: boolean) => void) | null>
  /** Live-updating set of mineral keys still needed to fill the order — see MiningControllerOptions.neededMineralsRef. */
  neededMineralsRef?: React.MutableRefObject<Set<string> | null>
  /** Pushed true immediately after a shot fires, false once the cooldown clears. Mirrors the oreNearRef push pattern so the screen can show ready/charging state without owning the timer. */
  chargingRef?: React.MutableRefObject<((charging: boolean) => void) | null>
  trainingMiningTry?: boolean
  /** SSL-475: sky-event debris. Omit (or event inactive) for the unchanged scene. */
  debrisPreset?: DebrisEventPreset | null
}

export default function MiningCanvas({ rocketImageSrc, minerals, requiredMinerals, mineralMeta, laserTier, onCollect, onReady, onFailure, fireRef, onFireRequest, scrollRef, oreNearRef, neededMineralsRef, chargingRef, trainingMiningTry = false, debrisPreset = null }: MiningCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const debrisPresetRef = useRef(debrisPreset)
  debrisPresetRef.current = debrisPreset
  const onCollectRef = useRef(onCollect)
  onCollectRef.current = onCollect
  const onFireRequestRef = useRef(onFireRequest)
  onFireRequestRef.current = onFireRequest
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const onFailureRef = useRef(onFailure)
  onFailureRef.current = onFailure
  const controllerRef = useRef<MiningController | null>(null)
  // The Pixi world is sized once at init. When the viewport changes size after
  // mount (rotation, window resize) bump fitKey so the world is rebuilt to the
  // new container and the playfield keeps filling it.
  const [fitKey, setFitKey] = useState(0)
  const fittedSizeRef = useRef<{ w: number; h: number } | null>(null)
  useEffect(() => {
    const parent = containerRef.current
    if (!parent || typeof ResizeObserver === 'undefined') return
    let timer: ReturnType<typeof setTimeout> | null = null
    const observer = new ResizeObserver(() => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        const fitted = fittedSizeRef.current
        if (!fitted) return
        if (Math.abs(parent.clientWidth - fitted.w) > 24 || Math.abs(parent.clientHeight - fitted.h) > 24) {
          setFitKey(k => k + 1)
        }
      }, 200)
    })
    observer.observe(parent)
    return () => { observer.disconnect(); if (timer) clearTimeout(timer) }
  }, [])
  const [missFlash, setMissFlash] = useState(false)
  const missFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onMissRef = useRef<(() => void) | null>(null)
  onMissRef.current = () => {
    if (missFlashTimerRef.current) clearTimeout(missFlashTimerRef.current)
    setMissFlash(true)
    missFlashTimerRef.current = setTimeout(() => setMissFlash(false), 280)
  }
  const [hitFlash, setHitFlash] = useState(false)
  const hitFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onHitRef = useRef<(() => void) | null>(null)
  onHitRef.current = () => {
    if (hitFlashTimerRef.current) clearTimeout(hitFlashTimerRef.current)
    setHitFlash(true)
    hitFlashTimerRef.current = setTimeout(() => setHitFlash(false), 220)
  }
  const [tapAck, setTapAck] = useState(false)
  const tapAckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onTapAckRef = useRef<(() => void) | null>(null)
  onTapAckRef.current = () => {
    if (tapAckTimerRef.current) clearTimeout(tapAckTimerRef.current)
    setTapAck(true)
    tapAckTimerRef.current = setTimeout(() => setTapAck(false), 160)
  }

  useEffect(() => {
    const parent = containerRef.current
    if (!parent) return

    const canvas = document.createElement('canvas')
    canvas.dataset.testid = 'mining-canvas'
    canvas.style.cssText = 'display:block;position:absolute;inset:0;'
    parent.appendChild(canvas)

    const app = new Application()
    let loop: GameLoop | null = null
    let input: InputManager | null = null
    let destroyed = false
    let rafId = 0
    let chargeTimer: ReturnType<typeof setTimeout> | null = null

    const doInit = async () => {
      try {
        const worldW = Math.max(300, parent.clientWidth)
        const worldH = Math.max(200, parent.clientHeight)
        fittedSizeRef.current = { w: parent.clientWidth, h: parent.clientHeight }
        const dpr = capDpr()
        // Ship-to-surface gap is where the laser fires and ore drifts — the
        // only part of the sky that's actually gameplay, not empty
        // starfield. Percentage-of-height sizing (0.62/0.22, gap ~40% of
        // worldH) looks fine at the aspect ratios this was tuned against,
        // but on a tall narrow phone viewport worldH balloons well past
        // those and the *pixel* gap balloons with it — most of the screen
        // ends up empty sky above a small static ship. Cap shipY and the
        // gap to roughly the original fixed-scene proportions (SHIP_Y=112,
        // SURFACE_Y=320 → 208px gap) and let any extra height become ground
        // (tileH below), which already reads as filled/intentional via the
        // dirt texture rather than empty.
        const shipY = Math.round(Math.min(worldH * 0.22, 140))
        const surfaceY = Math.round(Math.min(worldH * 0.62, shipY + 220))
        const tileH = worldH - surfaceY

        // Preload ore sprites — one PNG per mineral key. Missing authored
        // variants reuse the neutral crystal art rather than rendering an
        // untextured placeholder.
        const oreTextures: Record<string, Texture> = {}
        await Promise.allSettled(
          minerals.map(id => {
            const textureId = TEXTURED_ORE_IDS.has(id) ? id : GENERIC_ORE_TEXTURE_ID
            return Assets.load(`/game/assets/ores/ore_${textureId}.png`)
              .then((t: Texture) => { oreTextures[id] = t })
              .catch(() => {})
          })
        )

        let rocketTexture: Texture | null = null
        try {
          rocketTexture = await Assets.load<Texture>(rocketImageSrc ?? ROCKET_ASSETS.explorer.exterior)
        } catch {
          try { rocketTexture = await Assets.load<Texture>(ROCKET_ASSETS.explorer.exterior) } catch { rocketTexture = null }
        }

        const [sceneData] = await Promise.all([
          Scene.load('/game/scenes/mining.scene.json'),
          app.init({
            canvas,
            width: worldW,
            height: worldH,
            background: SKY_COLOR,
            antialias: false,
            autoDensity: true,
            resolution: dpr,
          }),
        ])
        if (destroyed) return

        app.stage.addChild(buildStars(worldW, surfaceY))

        const surfaceContainer = new Container()
        surfaceContainer.y = surfaceY
        const numTiles = Math.ceil(worldW / SURFACE_TILE_W) + 2
        for (let i = 0; i < numTiles; i++) {
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
          requiredMinerals,
          mineralColors: Object.fromEntries(Object.entries(mineralMeta).map(([id, m]) => [id, m.color])),
          mineralLaserAccess,
          maxLaserTier: laserTier,
          mineralShapes: Object.fromEntries(Object.entries(mineralMeta).map(([id, m]) => [id, m.shape ?? 'circle'])),
          mineralTextures: oreTextures,
          // Sym label rides on top of every ore node — the PNG-textured minerals
          // never get a distinguishing shape, so this is what tells them apart.
          mineralSyms: Object.fromEntries(Object.entries(mineralMeta).map(([id, m]) => [id, m.sym])),
          onCollect: mineral => onCollectRef.current(mineral),
          onMiss: () => {
            shakeState.timer = 0.28
            onMissRef.current?.()
          },
          onHit: () => onHitRef.current?.(),
          onScroll: scrollX => {
            surfaceContainer.x = -(scrollX % SURFACE_TILE_W)
          },
          onOreNearby: (near) => { oreNearRef?.current?.(near) },
          neededMineralsRef,
          reducedMotion: prefersReducedMotion(),
          debris: {
            getSpawn: () => {
              const preset = debrisPresetRef.current
              if (!preset) return null
              return {
                mineral: preset.resourceId,
                speedFactor: preset.speedFactor,
                ratePerMinute: debrisRatePerMinute(preset, debrisNow()),
              }
            },
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

        // Cooldown lives here, not in MiningScreen, because it must gate BOTH
        // entry points to controller.fireLaser(): the FIRE LASER button (via
        // fireRef) and a direct tap/click on the canvas itself (pointerdown
        // below). isCharging is pushed up through chargingRef the same way
        // oreNearRef pushes ore-proximity — the screen just mirrors it, it
        // never owns the timer.
        let isCharging = false
        let lastFireAt = -1
        const attemptFire = () => {
          if (isCharging) {
            onTapAckRef.current?.()
            return
          }
          controller.fireLaser()
          lastFireAt = performance.now()
          isCharging = true
          chargingRef?.current?.(true)
          if (chargeTimer) clearTimeout(chargeTimer)
          chargeTimer = setTimeout(() => {
            isCharging = false
            chargingRef?.current?.(false)
          }, FIRE_COOLDOWN_MS)
        }

        input = new InputManager(canvas, worldW, worldH)
        // SSL-411: a tap fires, a horizontal drag scrolls the field. The shot
        // is decided on release so a drag never spends a charge. Dragging left
        // pulls the field forward (fast), dragging right slows it, and the
        // field returns to normal speed on release.
        canvas.style.touchAction = 'none'
        let dragStartX: number | null = null
        let dragging = false
        const DRAG_THRESHOLD_PX = 10
        const DRAG_FULL_SPEED_PX = 120
        const endDrag = () => {
          if (dragging) scrollRef.current?.(0)
          dragStartX = null
          dragging = false
        }
        input.onAny(event => {
          if (event.type === 'pointerdown') {
            dragStartX = event.screen.x
            dragging = false
          } else if (event.type === 'pointermove' && dragStartX !== null) {
            const delta = event.screen.x - dragStartX
            if (!dragging && Math.abs(delta) >= DRAG_THRESHOLD_PX) dragging = true
            if (dragging) scrollRef.current?.(Math.max(-1, Math.min(1, -delta / DRAG_FULL_SPEED_PX)))
          } else if (event.type === 'pointerup') {
            const wasDrag = dragging
            endDrag()
            // A direct canvas tap must go through the screen's fireLaser(), not
            // straight to attemptFire(), so the charge-budget and gate checks
            // it owns are not bypassed.
            if (!wasDrag) onFireRequestRef.current?.()
          }
        })
        canvas.addEventListener('pointercancel', endDrag)
        fireRef.current = attemptFire
        scrollRef.current = (dx: number) => {
          const speed = SCROLL_SPEED + dx * (dx > 0 ? SCROLL_SPEED_MAX - SCROLL_SPEED : SCROLL_SPEED - SCROLL_SPEED_MIN)
          controller.setScrollSpeed(speed)
        }

        app.stage.addChild(buildAimGuide(shipY, surfaceY))
        const plume = buildEnginePlume()
        plume.x = SHIP_X - 48
        plume.y = shipY
        app.stage.addChild(plume)

        if (rocketTexture) {
          const ship = new Sprite(rocketTexture)
          const shipWidth = Math.min(112, worldW * 0.26)
          const shipScale = shipWidth / rocketTexture.width
          ship.anchor.set(0.5)
          ship.scale.set(-shipScale, shipScale)
          ship.x = SHIP_X
          ship.y = shipY
          app.stage.addChild(ship)
          let plumePhase = 0
          app.ticker.add(ticker => {
            plumePhase += ticker.deltaMS / 1000
            const pulse = 0.92 + Math.sin(plumePhase * 18) * 0.08
            plume.scale.set(pulse, 0.94 + Math.sin(plumePhase * 13) * 0.06)
            plume.alpha = 0.84 + Math.sin(plumePhase * 11) * 0.10
            // Recoil kick on each shot; the plume rides with the hull.
            const kick = prefersReducedMotion() || lastFireAt < 0 ? 0 : recoilOffset((performance.now() - lastFireAt) / 1000)
            ship.y = shipY + kick
            plume.y = shipY + kick
          })
        }

        loop = new GameLoop(scene, app)
        loop.start()
        if (!destroyed) onReadyRef.current?.()
      } catch (err) {
        console.error('[MiningCanvas] init failed:', err)
        if (!destroyed) onFailureRef.current?.()
      }
    }

    // Defer one rAF so the browser finishes flex layout before we measure
    rafId = requestAnimationFrame(() => { doInit() })

    return () => {
      cancelAnimationFrame(rafId)
      destroyed = true
      if (chargeTimer) clearTimeout(chargeTimer)
      if (missFlashTimerRef.current) clearTimeout(missFlashTimerRef.current)
      if (hitFlashTimerRef.current) clearTimeout(hitFlashTimerRef.current)
      if (tapAckTimerRef.current) clearTimeout(tapAckTimerRef.current)
      chargingRef?.current?.(false)
      fireRef.current = null
      scrollRef.current = null
      if (oreNearRef) oreNearRef.current = null
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
  }, [rocketImageSrc, fitKey])

  return (
    <div ref={containerRef} className="mining-canvas" data-testid="mining-canvas" data-training-mining={trainingMiningTry || undefined}>
      {trainingMiningTry && <div className="mining-training-seam" aria-hidden="true" />}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
        // Keep miss feedback at the firing lane. A full-canvas red wash reads
        // as a damaged scene rather than a localized impact response.
        background: 'radial-gradient(circle at 50% 52%, rgba(255,90,106,0.48) 0%, rgba(255,90,106,0.18) 18%, transparent 42%)',
        opacity: missFlash ? 1 : 0,
        transition: missFlash ? 'none' : 'opacity 280ms ease-out',
      }} />
      <div data-testid="mining-hit-flash" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
        // Same localized-lane treatment as the miss flash, cyan instead of red
        // so hit vs miss reads instantly without needing to watch the ore itself.
        background: 'radial-gradient(circle at 50% 52%, rgba(156,236,255,0.42) 0%, rgba(156,236,255,0.14) 18%, transparent 42%)',
        opacity: hitFlash ? 1 : 0,
        transition: hitFlash ? 'none' : 'opacity 220ms ease-out',
      }} />
      <div data-testid="mining-tap-ack" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
        // Neutral, low-opacity: a tap during the fire cooldown, distinct from
        // both the cyan hit flash and red miss flash so it never reads as a shot result.
        background: 'radial-gradient(circle at 50% 52%, rgba(255,255,255,0.22) 0%, transparent 32%)',
        opacity: tapAck ? 1 : 0,
        transition: tapAck ? 'none' : 'opacity 160ms ease-out',
      }} />
    </div>
  )
}

export { screenToWorld }
