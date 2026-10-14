'use client'

import { useEffect, useRef, useState } from 'react'
import { capDpr } from '@/lib/engine/pixiDisplay'
import { Application, Container } from 'pixi.js'
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
import { buildLaserField, depositKindFor, obstacleHeightAt } from '@/lib/mining/laserLayers'
import type { LaserPalette } from '@/lib/mining/laserPalette'

// Minimum gap between shots: long enough that a mashed tap reads as
// deliberately ignored (not dropped input), short enough not to feel laggy.
const FIRE_COOLDOWN_MS = 420

interface MiningCanvasProps {
  palette: LaserPalette
  /** Target id; varies the landscape arrangement (SSL-536). */
  landscapeKey?: string
  rocketImageSrc?: string
  minerals: string[]
  leadMinerals?: string[]
  scrollScreens?: number
  /** Hold the field still when `?scroll=` is set, so the offset can be checked. */
  pinScroll?: boolean
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
  /** Climb (-1), hold (0) or descend (1). Set by the d-pad, keys and vertical drags (SSL-536). */
  altitudeRef?: React.MutableRefObject<((dir: number) => void) | null>
  /** The hull clipped a mountain or ridge: bumped up and damaged, never an instant fail. */
  onBump?: () => void
  oreNearRef?: React.MutableRefObject<((near: boolean) => void) | null>
  onTargetCueRef?: React.MutableRefObject<((mineral: string | null, inRange: boolean) => void) | null>
  onObstacleAheadRef?: React.MutableRefObject<((ahead: boolean) => void) | null>
  /** Live-updating set of mineral keys still needed to fill the order — see MiningControllerOptions.neededMineralsRef. */
  neededMineralsRef?: React.MutableRefObject<Set<string> | null>
  /** Pushed true immediately after a shot fires, false once the cooldown clears. Mirrors the oreNearRef push pattern so the screen can show ready/charging state without owning the timer. */
  chargingRef?: React.MutableRefObject<((charging: boolean) => void) | null>
  trainingMiningTry?: boolean
  /** SSL-475: sky-event debris. Omit (or event inactive) for the unchanged scene. */
  debrisPreset?: DebrisEventPreset | null
}

export default function MiningCanvas({ palette, landscapeKey, rocketImageSrc, minerals, leadMinerals, scrollScreens = 0, pinScroll = false, requiredMinerals, mineralMeta, laserTier, onCollect, onReady, onFailure, fireRef, onFireRequest, scrollRef, altitudeRef, onBump, oreNearRef, onTargetCueRef, onObstacleAheadRef, neededMineralsRef, chargingRef, trainingMiningTry = false, debrisPreset = null }: MiningCanvasProps) {
  void rocketImageSrc
  const containerRef = useRef<HTMLDivElement>(null)
  const debrisPresetRef = useRef(debrisPreset)
  debrisPresetRef.current = debrisPreset
  const onCollectRef = useRef(onCollect)
  onCollectRef.current = onCollect
  const onFireRequestRef = useRef(onFireRequest)
  onFireRequestRef.current = onFireRequest
  const onReadyRef = useRef(onReady)
  const onBumpRef = useRef(onBump)
  onBumpRef.current = onBump
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
        // Same proportions as the native laser scene: surface halfway down
        // (never less than 200px of ground), ship hovering above it.
        // Ground is the bottom third (min 150px) so there is sky to fly in (SSL-536).
        // Phones keep a clear control strip under the deposits (SSL-538).
        const surfaceFromBottom = worldH > worldW ? Math.max(330, worldH * 0.33) : Math.max(worldH < 520 ? 240 : 150, worldH * 0.33)
        const surfaceY = Math.round(worldH - surfaceFromBottom)
        const shipFromBottom = Math.min(worldH * 0.72, surfaceFromBottom + Math.min(210, worldH * 0.28))
        const shipY = Math.round(worldH - shipFromBottom)

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

        const field = await buildLaserField({ worldW, worldH, surfaceY, shipX: SHIP_X, shipY, palette, landscapeKey })
        if (destroyed) {
          field.backdrop.destroy({ children: true })
          field.beam.destroy({ children: true })
          field.dig.destroy({ children: true })
          field.spark.destroy()
          field.ship.destroy({ children: true })
          return
        }
        const oreLayer = new Container()
        app.stage.addChild(field.backdrop)
        app.stage.addChild(oreLayer)

        const { scene, entityData } = Scene.fromData(sceneData)
        wireShapeRenderers(app.stage, entityData, scene)

        const mineralLaserAccess = Object.fromEntries(
          Object.entries(mineralMeta).map(([id, m]) => [id, m.laserAccess ?? 1])
        )

        const shakeState = { timer: 0 }
        const pulse = { timer: 0 }
        const shower = debrisPresetRef.current ?? activeDebrisPreset(debrisNow())
        const debrisArt = shower?.eventId === 'orionids-2026'
          ? await loadOrionidsArt(miningCanvasIsDark(palette.skyTop) ? 'dark' : 'blueprint')
          : null
        if (destroyed) return
        const controllerObj = scene.find('mining-controller')
        const controller = new MiningController(new RuntimeContext(), {
          container: oreLayer,
          worldWidth: worldW,
          worldHeight: worldH,
          surfaceY,
          shipY,
          minerals,
          leadMinerals,
          scrollScreens,
          pinScroll,
          requiredMinerals,
          mineralColors: Object.fromEntries(Object.entries(mineralMeta).map(([id, m]) => [id, m.color])),
          mineralLaserAccess,
          maxLaserTier: laserTier,
          mineralShapes: Object.fromEntries(Object.entries(mineralMeta).map(([id, m]) => [id, m.shape ?? 'circle'])),
          mineralSyms: Object.fromEntries(Object.entries(mineralMeta).map(([id, m]) => [id, m.sym])),
          mineralNames: Object.fromEntries(Object.entries(mineralMeta).map(([id, m]) => [id, m.name])),
          beamColor: palette.beamCss,
          depositFrames: field.depositFrames,
          depositArtFor: mineral => field.depositArt[depositKindFor(mineral)],
          pixelScale: field.pixelScale,
          pixelBeam: true,
          labelInk: palette.labelInk,
          onCollect: mineral => onCollectRef.current(mineral),
          onMiss: () => {
            shakeState.timer = 0.28
            onMissRef.current?.()
          },
          onHit: () => { pulse.timer = 0.16; onHitRef.current?.() },
          onScroll: scrollX => {
            field.ground.x = -(scrollX % field.soilW)
            field.near.x = -((scrollX * 0.45) % field.ridgeW)
            field.far.x = -((scrollX * 0.16) % field.ridgeW)
            field.mid.x = -((scrollX * 0.3) % field.midW)
            field.surface.x = -(scrollX % field.midW)
          },
          onOreNearby: (near) => { oreNearRef?.current?.(near) },
          onTargetCue: (mineral, inRange) => { onTargetCueRef?.current?.(mineral, inRange) },
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
        const CLIMB_SPEED = 180
        const SHIP_BELLY = 14
        const SHIP_HALF_W = 30
        const BUMP_KICK = 18
        let altitude = 0
        let climb = 0
        let bumpCooldown = 0
        let lastObstacleAhead: boolean | null = null
        const minAlt = Math.min(0, 64 - shipY)
        const maxAlt = Math.max(0, surfaceY - 56 - shipY)
        const beamTop = field.beam.y
        const beamSpan = Math.max(24, surfaceY - beamTop)
        if (altitudeRef) altitudeRef.current = (dir: number) => { climb = Math.max(-1, Math.min(1, dir)) }
        let lastFireAt = -1
        app.ticker.add(ticker => {
          sceneTime += ticker.deltaMS / 1000
          const firing = lastFireAt > 0 && performance.now() - lastFireAt < 180
          field.step(sceneTime, prefersReducedMotion(), firing)
          const kick = prefersReducedMotion() || lastFireAt < 0 ? 0 : recoilOffset((performance.now() - lastFireAt) / 1000)
          // The ship stays level; altitude moves it between the sky ceiling and just above the ground.
          const dt = ticker.deltaMS / 1000
          altitude = Math.max(minAlt, Math.min(maxAlt, altitude + climb * CLIMB_SPEED * dt))
          if (bumpCooldown > 0) bumpCooldown -= dt
          const clear = Math.max(
            obstacleHeightAt(field, SHIP_X - SHIP_HALF_W),
            obstacleHeightAt(field, SHIP_X),
            obstacleHeightAt(field, SHIP_X + SHIP_HALF_W),
          )
          const obstacleAhead = Math.max(
            obstacleHeightAt(field, SHIP_X + 80),
            obstacleHeightAt(field, SHIP_X + 120),
            obstacleHeightAt(field, SHIP_X + 160),
          )
          const shouldClimb = obstacleAhead > 18 && shipY + altitude + SHIP_BELLY > surfaceY - obstacleAhead - 12
          if (shouldClimb !== lastObstacleAhead) {
            lastObstacleAhead = shouldClimb
            onObstacleAheadRef?.current?.(shouldClimb)
          }
          if (clear > 0 && shipY + altitude + SHIP_BELLY > surfaceY - clear) {
            altitude = Math.max(minAlt, surfaceY - clear - SHIP_BELLY - shipY - BUMP_KICK)
            if (bumpCooldown <= 0) {
              bumpCooldown = 1.6
              shakeState.timer = 0.32
              onBumpRef.current?.()
            }
          }
          field.ship.y = shipY + altitude + kick + field.hover
          field.beam.y = beamTop + altitude
          field.beam.scale.y = Math.max(0.05, (beamSpan - altitude) / beamSpan)
          // Beam shows only while the trigger is held (fire pulse), never as an idle stream.
          field.beam.visible = firing
          field.spark.visible = firing
          // Subtle hit pulse: a 1% zoom that eases back (SSL-538).
          if (pulse.timer > 0 && !prefersReducedMotion()) {
            pulse.timer -= ticker.deltaMS / 1000
            const k = 1 + 0.01 * Math.max(0, pulse.timer / 0.16)
            app.stage.scale.set(k)
          } else if (app.stage.scale.x !== 1) app.stage.scale.set(1)
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
        let dragStartY = 0
        let dragging = false
        let steering = false
        const DRAG_THRESHOLD_PX = 10
        const DRAG_FULL_SPEED_PX = 120
        const endDrag = () => {
          if (dragging) scrollRef.current?.(0)
          if (steering) altitudeRef?.current?.(0)
          dragStartX = null
          dragging = false
          steering = false
        }
        input.onAny(event => {
          if (event.type === 'pointerdown') {
            dragStartX = event.screen.x
            dragStartY = event.screen.y
            dragging = false
            steering = false
          } else if (event.type === 'pointermove' && dragStartX !== null) {
            const delta = event.screen.x - dragStartX
            const dy = event.screen.y - dragStartY
            if (!dragging && !steering && Math.abs(dy) >= DRAG_THRESHOLD_PX && Math.abs(dy) > Math.abs(delta)) steering = true
            if (steering) { altitudeRef?.current?.(Math.max(-1, Math.min(1, dy / 60))); return }
            if (!dragging && Math.abs(delta) >= DRAG_THRESHOLD_PX) dragging = true
            if (dragging) scrollRef.current?.(Math.max(-1, Math.min(1, -delta / DRAG_FULL_SPEED_PX)))
          } else if (event.type === 'pointerup') {
            const wasDrag = dragging || steering
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

        app.stage.addChild(field.dig)
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
      if (altitudeRef) altitudeRef.current = null
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
  }, [palette.id, landscapeKey, rocketImageSrc, fitKey, leadMinerals?.join(','), scrollScreens, pinScroll])

  return (
    <div ref={containerRef} className="mining-canvas" data-testid="mining-canvas" data-palette={palette.id} data-training-mining={trainingMiningTry || undefined}>
      {trainingMiningTry && <div className="mining-seam-brackets" data-testid="mining-seam-brackets" aria-hidden="true" />}
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
