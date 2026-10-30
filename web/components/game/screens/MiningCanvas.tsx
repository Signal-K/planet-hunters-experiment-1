'use client'

import { useEffect, useRef, useState } from 'react'
import { capDpr } from '@/lib/engine/pixiDisplay'
import { Application, Container, Sprite } from 'pixi.js'
import { Scene, GameLoop, InputManager, RuntimeContext, screenToWorld } from '@/lib/engine'
import { wireShapeRenderers } from '@/lib/engine/components/ShapeRenderer'
import { MiningController, SHIP_X, SCROLL_SPEED, SCROLL_SPEED_MIN, SCROLL_SPEED_MAX } from '@/lib/engine/scripts/MiningController'
import type { MineralMeta } from '@/lib/data'
import type { PlayerLocation } from '@/lib/game-types'
import { prefersReducedMotion } from '@/lib/pixi/launchSpriteAnim'
import { recoilOffset } from '@/lib/engine/miningJuice'
import { isInLocalEventBonusWindow } from '@/lib/data/sky-event-window'
import { activeDebrisPreset, debrisRatePerMinute, DEBRIS_RESOURCE_IDS, ORIONIDS_PEAK_MULTIPLIER, ORIONIDS_RUN_FRAGMENTS_PER_MINUTE, type DebrisEventPreset } from '@/lib/data/sky-events'
import { FIREBALL_FRAGMENT_ID, fireballDue } from '@/lib/orionids/fireball'
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
  /** Captures the rendered event-body scene once for the event proof ledger. */
  onEventProof?: (screenshot: string) => void
  /** Signals that the rendered scene is ready to receive operator input. */
  onReady?: () => void
  /** Signals an initialization failure so the enclosing screen can recover. */
  onFailure?: () => void
  fireRef: React.MutableRefObject<(() => void) | null>
  /** Direct canvas tap/click must route back through the screen's fireLaser() so the charge-budget and gate checks it owns aren't bypassed — see the pointerdown handler below. */
  onFireRequest?: () => void
  scrollRef: React.MutableRefObject<((dx: number) => void) | null>
  /** Steer left (-1), neutral (0), or right (1). */
  steerRef?: React.MutableRefObject<((dir: number) => void) | null>
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
  /** SSL-711: this run's falling debris is caught with the second action button, not mined. Only such a run rains it. */
  catchRain?: boolean
  /** SSL-711: set to the CATCH action; returns true when a fragment was caught. */
  catchRef?: React.MutableRefObject<(() => boolean) | null>
  /** SSL-711: pushed true while a fragment is inside the collector beam. */
  onCatchCueRef?: React.MutableRefObject<((ready: boolean) => void) | null>
  /** SSL-475: sky-event debris. Omit (or event inactive) for the unchanged scene. */
  debrisPreset?: DebrisEventPreset | null
  /** Caught-at stamp. One fragment falls after local 22 Oct 02:00 until this is set. */
  fireballCaughtAt?: number | null
  skyEventLocation?: PlayerLocation | null
}

export default function MiningCanvas({ palette, landscapeKey, rocketImageSrc, minerals, leadMinerals, scrollScreens = 0, pinScroll = false, requiredMinerals, mineralMeta, laserTier, onCollect, onEventProof, onReady, onFailure, fireRef, onFireRequest, scrollRef, steerRef, altitudeRef, onBump, oreNearRef, onTargetCueRef, onObstacleAheadRef, neededMineralsRef, chargingRef, trainingMiningTry = false, catchRain = false, catchRef, onCatchCueRef, debrisPreset = null, fireballCaughtAt = null, skyEventLocation = null }: MiningCanvasProps) {
  void rocketImageSrc
  const containerRef = useRef<HTMLDivElement>(null)
  const debrisPresetRef = useRef(debrisPreset)
  debrisPresetRef.current = debrisPreset
  const fireballCaughtRef = useRef(fireballCaughtAt)
  fireballCaughtRef.current = fireballCaughtAt
  const onCollectRef = useRef(onCollect)
  onCollectRef.current = onCollect
  const onEventProofRef = useRef(onEventProof)
  onEventProofRef.current = onEventProof
  const eventProofCapturedRef = useRef(false)
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
  const [hitFlash, setHitFlash] = useState(false)
  const hitFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onHitRef = useRef<(() => void) | null>(null)
  onHitRef.current = () => {
    if (hitFlashTimerRef.current) clearTimeout(hitFlashTimerRef.current)
    setHitFlash(true)
    hitFlashTimerRef.current = setTimeout(() => setHitFlash(false), 220)
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

        // SSL-708: the ship starts about a quarter of the way in, not hugging the left edge.
        const startX = Math.round(Math.max(110, Math.min(320, worldW * 0.24)))
        const field = await buildLaserField({ worldW, worldH, surfaceY, shipX: startX, shipY, palette, landscapeKey })
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
        if (debrisArt?.sky) {
          const eventSky = new Sprite(debrisArt.sky)
          eventSky.width = worldW
          eventSky.height = surfaceY
          eventSky.alpha = 0.82
          eventSky.blendMode = debrisArt.skyBlend
          field.backdrop.addChildAt(eventSky, 0)
        }
        if (shower?.eventId === 'orionids-2026') {
          const eventTerrainTint = (container: Container) => container.children.forEach(child => {
            if (child instanceof Sprite) child.tint = 0x2f7794
          })
          eventTerrainTint(field.far)
          eventTerrainTint(field.mid)
          eventTerrainTint(field.near)
          eventTerrainTint(field.ground)
          eventTerrainTint(field.surface)
        }
        const controllerObj = scene.find('mining-controller')
        const controller = new MiningController(new RuntimeContext(), {
          container: oreLayer,
          worldWidth: worldW,
          worldHeight: worldH,
          surfaceY,
          shipY,
          shipX: () => shipX,
          shipYNow: () => shipY + altitude,
          onCatchCue: ready => { onCatchCueRef?.current?.(ready) },
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
          onCollect: mineral => {
            onCollectRef.current(mineral)
            if (!eventProofCapturedRef.current && DEBRIS_RESOURCE_IDS.includes(mineral)) {
              eventProofCapturedRef.current = true
              try {
                onEventProofRef.current?.(canvas.toDataURL('image/jpeg', 0.72))
              } catch {
                // A renderer without a readable back buffer should not stop mining.
              }
            }
          },
          // SSL-708: a miss is not an impact, so it neither shakes nor flashes the screen.
          onHit: () => { pulse.timer = 0.16; parent.style.setProperty('--hit-x', `${Math.round(shipX)}px`); onHitRef.current?.() },
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
                // Shower fragments drift down a little slower than other debris so there is time to line up under them, but not so slow the sky stays full.
                speedFactor: preset.eventId === 'orionids-2026' ? 1.0 : preset.speedFactor,
                // SSL-711: shower rain belongs to the shower run; ordinary mining keeps only the streaks and the fireball.
                ratePerMinute: preset.eventId === 'orionids-2026' && !catchRain
                  ? 0
                  : preset.eventId === 'orionids-2026'
                  ? ORIONIDS_RUN_FRAGMENTS_PER_MINUTE * (isInLocalEventBonusWindow(debrisNow(), skyEventLocation) ? ORIONIDS_PEAK_MULTIPLIER : 1)
                  : debrisRatePerMinute(preset, debrisNow(), skyEventLocation),
                onceMineral: preset.eventId === 'orionids-2026' && fireballDue(debrisNow(), fireballCaughtRef.current) ? FIREBALL_FRAGMENT_ID : undefined,
                onceHero: preset.eventId === 'orionids-2026' && fireballDue(debrisNow(), fireballCaughtRef.current),
                // SSL-711: shower fragments are caught in the air with CATCH; the laser is for ore and the fireball.
                catchable: catchRain,
              }
            },
          },
        })

        let sceneTime = 0
        const CLIMB_SPEED = 120
        const STEER_SPEED = 100
        const SHIP_BELLY = 14
        const SHIP_HALF_W = 30
        const BUMP_KICK = 18
        let altitude = 0
        let climb = 0
        let shipX = startX
        let steering = 0
        let bumpCooldown = 0
        let lastObstacleAhead: boolean | null = null
        const minAlt = Math.min(0, 84 - shipY)
        const maxAlt = Math.max(0, surfaceY - 56 - shipY)
        const beamTop = field.beam.y
        const beamSpan = Math.max(24, surfaceY - beamTop)
        if (steerRef) steerRef.current = (dir: number) => { steering = Math.max(-1, Math.min(1, dir)) }
        if (altitudeRef) altitudeRef.current = (dir: number) => { climb = Math.max(-1, Math.min(1, dir)) }
        let lastFireAt = -1
        app.ticker.add(ticker => {
          sceneTime += ticker.deltaMS / 1000
          const firing = lastFireAt > 0 && performance.now() - lastFireAt < 180
          field.step(sceneTime, prefersReducedMotion(), firing)
          const kick = prefersReducedMotion() || lastFireAt < 0 ? 0 : recoilOffset((performance.now() - lastFireAt) / 1000)
          // The ship stays level; altitude moves it between the sky ceiling and just above the ground.
          const dt = ticker.deltaMS / 1000
          shipX = Math.max(40, Math.min(worldW - 40, shipX + steering * STEER_SPEED * dt))
          field.ship.x = shipX
          field.beam.x = shipX
          field.spark.x = shipX
          field.dig.x = shipX
          altitude = Math.max(minAlt, Math.min(maxAlt, altitude + climb * CLIMB_SPEED * dt))
          if (bumpCooldown > 0) bumpCooldown -= dt
          const clear = Math.max(
            obstacleHeightAt(field, shipX - SHIP_HALF_W),
            obstacleHeightAt(field, shipX),
            obstacleHeightAt(field, shipX + SHIP_HALF_W),
          )
          const obstacleAhead = Math.max(
            obstacleHeightAt(field, shipX + 80),
            obstacleHeightAt(field, shipX + 120),
            obstacleHeightAt(field, shipX + 160),
          )
          // SSL-708: measure the hull from the ship as drawn. The fixed SHIP_BELLY guess sat
          // ~30px below the sprite, so ridges the ship visibly cleared still "hit" it.
          const drawnBottom = field.ship.getBounds().maxY - app.stage.y
          const hullBottom = Number.isFinite(drawnBottom) && drawnBottom > 0 ? drawnBottom - 2 : shipY + altitude + SHIP_BELLY
          const shouldClimb = obstacleAhead > 18 && hullBottom > surfaceY - obstacleAhead - 8
          if (shouldClimb !== lastObstacleAhead) {
            lastObstacleAhead = shouldClimb
            onObstacleAheadRef?.current?.(shouldClimb)
          }
          if (clear > 0 && hullBottom > surfaceY - clear + 4) {
            altitude = Math.max(minAlt, surfaceY - clear - SHIP_BELLY - shipY - BUMP_KICK)
            // No damage while the run is starting: the ship is lifted clear instead.
            if (bumpCooldown <= 0 && sceneTime > 1.5) {
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
        if (catchRef) catchRef.current = () => controller.catchFragment()

        // Cooldown lives here, not in MiningScreen, because it must gate BOTH
        // entry points to controller.fireLaser(): the FIRE LASER button (via
        // fireRef) and a direct tap/click on the canvas itself (pointerdown
        // below). isCharging is pushed up through chargingRef the same way
        // oreNearRef pushes ore-proximity — the screen just mirrors it, it
        // never owns the timer.
        let isCharging = false
        const attemptFire = () => {
          if (isCharging) return
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
        let verticalSteering = false
        const DRAG_THRESHOLD_PX = 10
        const DRAG_FULL_SPEED_PX = 120
        const endDrag = () => {
          if (dragging) scrollRef.current?.(0)
          if (verticalSteering) altitudeRef?.current?.(0)
          dragStartX = null
          dragging = false
          verticalSteering = false
        }
        input.onAny(event => {
          if (event.type === 'pointerdown') {
            dragStartX = event.screen.x
            dragStartY = event.screen.y
            dragging = false
            verticalSteering = false
          } else if (event.type === 'pointermove' && dragStartX !== null) {
            const delta = event.screen.x - dragStartX
            const dy = event.screen.y - dragStartY
            if (!dragging && !verticalSteering && Math.abs(dy) >= DRAG_THRESHOLD_PX && Math.abs(dy) > Math.abs(delta)) verticalSteering = true
            if (verticalSteering) { altitudeRef?.current?.(Math.max(-1, Math.min(1, dy / 60))); return }
            if (!dragging && Math.abs(delta) >= DRAG_THRESHOLD_PX) dragging = true
            if (dragging) scrollRef.current?.(Math.max(-1, Math.min(1, -delta / DRAG_FULL_SPEED_PX)))
          } else if (event.type === 'pointerup') {
            const wasDrag = dragging || verticalSteering
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
      if (hitFlashTimerRef.current) clearTimeout(hitFlashTimerRef.current)
      chargingRef?.current?.(false)
      fireRef.current = null
      scrollRef.current = null
      if (steerRef) steerRef.current = null
      if (altitudeRef) altitudeRef.current = null
      if (catchRef) catchRef.current = null
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
      <div data-testid="mining-hit-flash" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
        // Only a real hit flashes, centred on the ship's current lane (SSL-708).
        background: 'radial-gradient(circle at var(--hit-x, 80px) 62%, rgba(156,236,255,0.42) 0%, rgba(156,236,255,0.14) 18%, transparent 42%)',
        opacity: hitFlash ? 1 : 0,
        transition: hitFlash ? 'none' : 'opacity 220ms ease-out',
      }} />
    </div>
  )
}

export { screenToWorld }
