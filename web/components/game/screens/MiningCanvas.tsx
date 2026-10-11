'use client'

import { useEffect, useRef, useState } from 'react'
import { capDpr } from '@/lib/engine/pixiDisplay'
import { Application } from 'pixi.js'
import { Scene, GameLoop, InputManager, RuntimeContext, screenToWorld } from '@/lib/engine'
import { wireShapeRenderers } from '@/lib/engine/components/ShapeRenderer'
import { MiningController, SHIP_X, SCROLL_SPEED, SCROLL_SPEED_MIN, SCROLL_SPEED_MAX } from '@/lib/engine/scripts/MiningController'
import type { MineralMeta } from '@/lib/data'
import { prefersReducedMotion } from '@/lib/pixi/launchSpriteAnim'
import { recoilOffset } from '@/lib/engine/miningJuice'
import { activeDebrisPreset, debrisRatePerMinute, type DebrisEventPreset } from '@/lib/data/sky-events'
import { debrisNow } from '@/lib/hooks/useDebrisEvent'
import { loadOrionidsArt } from '@/lib/orionids/loadArt'
import { miningCanvasIsDark } from '@/lib/orionids/theme'
import { buildLaserField, GROUND_TILE_W } from '@/lib/mining/laserLayers'
import type { LaserPalette } from '@/lib/mining/laserPalette'

// Minimum gap between shots: long enough that a mashed tap reads as
// deliberately ignored (not dropped input), short enough not to feel laggy.
const FIRE_COOLDOWN_MS = 420

interface MiningCanvasProps {
  palette: LaserPalette
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

export default function MiningCanvas({ palette, rocketImageSrc, minerals, requiredMinerals, mineralMeta, laserTier, onCollect, onReady, onFailure, fireRef, onFireRequest, scrollRef, oreNearRef, neededMineralsRef, chargingRef, trainingMiningTry = false, debrisPreset = null }: MiningCanvasProps) {
  void rocketImageSrc
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
        const shipY = Math.round(Math.min(worldH * 0.2, 120))
        // Keep the surface above the bottom dock so ore chips stay clear of the fire panel.
        const groundH = Math.round(Math.min(Math.max(worldH * 0.32, 150), worldH * 0.46))
        const surfaceY = worldH - groundH

        const [sceneData] = await Promise.all([
          Scene.load('/game/scenes/mining.scene.json'),
          app.init({
            canvas,
            width: worldW,
            height: worldH,
            background: palette.skyTop,
            antialias: false,
            autoDensity: true,
            resolution: dpr,
          }),
        ])
        if (destroyed) return

        const field = buildLaserField({ worldW, worldH, surfaceY, shipX: SHIP_X, shipY, palette })
        app.stage.addChild(field.backdrop)

        const { scene, entityData } = Scene.fromData(sceneData)
        wireShapeRenderers(app.stage, entityData, scene)

        const mineralLaserAccess = Object.fromEntries(
          Object.entries(mineralMeta).map(([id, m]) => [id, m.laserAccess ?? 1])
        )

        const shakeState = { timer: 0 }
        const shower = debrisPresetRef.current ?? activeDebrisPreset(debrisNow())
        const debrisArt = shower?.eventId === 'orionids-2026'
          ? await loadOrionidsArt(miningCanvasIsDark(palette.skyTop) ? 'dark' : 'blueprint')
          : null
        if (destroyed) return
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
          mineralSyms: Object.fromEntries(Object.entries(mineralMeta).map(([id, m]) => [id, m.sym])),
          beamColor: palette.beamCss,
          chipFill: palette.ground,
          chipShade: palette.groundDeep,
          labelInk: palette.labelInk,
          onCollect: mineral => onCollectRef.current(mineral),
          onMiss: () => {
            shakeState.timer = 0.28
            onMissRef.current?.()
          },
          onHit: () => onHitRef.current?.(),
          onScroll: scrollX => {
            field.ground.x = -(scrollX % GROUND_TILE_W)
            field.near.x = -(scrollX * 0.45 % field.nearW)
            field.far.x = -(scrollX * 0.16 % field.farW)
          },
          onOreNearby: (near) => { oreNearRef?.current?.(near) },
          neededMineralsRef,
          reducedMotion: prefersReducedMotion(),
          debrisArt,
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

        let sceneTime = 0
        let lastFireAt = -1
        app.ticker.add(ticker => {
          sceneTime += ticker.deltaMS / 1000
          const firing = lastFireAt > 0 && performance.now() - lastFireAt < 180
          field.step(sceneTime, prefersReducedMotion(), firing)
          const kick = prefersReducedMotion() || lastFireAt < 0 ? 0 : recoilOffset((performance.now() - lastFireAt) / 1000)
          field.ship.y = shipY + kick
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

        app.stage.addChild(field.beam)
        app.stage.addChild(field.spark)
        app.stage.addChild(field.ship)

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
  }, [palette.id, rocketImageSrc, fitKey])

  return (
    <div ref={containerRef} className="mining-canvas" data-testid="mining-canvas" data-palette={palette.id} data-training-mining={trainingMiningTry || undefined}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
        // Keep miss feedback at the firing lane. A full-canvas red wash reads
        // as a damaged scene rather than a localized impact response.
        background: 'radial-gradient(circle at 80px 62%, rgba(255,90,106,0.48) 0%, rgba(255,90,106,0.18) 18%, transparent 42%)',
        opacity: missFlash ? 1 : 0,
        transition: missFlash ? 'none' : 'opacity 280ms ease-out',
      }} />
      <div data-testid="mining-hit-flash" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
        // Same localized-lane treatment as the miss flash, cyan instead of red
        // so hit vs miss reads instantly without needing to watch the ore itself.
        background: 'radial-gradient(circle at 80px 62%, rgba(156,236,255,0.42) 0%, rgba(156,236,255,0.14) 18%, transparent 42%)',
        opacity: hitFlash ? 1 : 0,
        transition: hitFlash ? 'none' : 'opacity 220ms ease-out',
      }} />
      <div data-testid="mining-tap-ack" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
        // Neutral, low-opacity: a tap during the fire cooldown, distinct from
        // both the cyan hit flash and red miss flash so it never reads as a shot result.
        background: 'radial-gradient(circle at 80px 62%, rgba(255,255,255,0.22) 0%, transparent 32%)',
        opacity: tapAck ? 1 : 0,
        transition: tapAck ? 'none' : 'opacity 160ms ease-out',
      }} />
    </div>
  )
}

export { screenToWorld }
