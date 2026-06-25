'use client'

import { useEffect, useRef } from 'react'
import { Application, Assets, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js'
import type { ShipInteriorLayout, ShipRoomKind, InstalledCustomizerPartsByKind } from '@/lib/data'
import { SHIP_ROOM_ASSETS } from '@/lib/data'

const W = 720
const H = 300

const C_ACTIVE_BORDER = 0xc8293e
const C_ACTIVE_BRIGHT = 0xe83a52
const C_DONE_BORDER   = 0x3fa9ff
const C_EMPTY_BORDER  = 0x1a3a5e
const C_ACTIVE_FILL   = 0x1a0408
const C_DONE_FILL     = 0x010a14
const C_EMPTY_FILL    = 0x020608

interface Props {
  layout: ShipInteriorLayout
  activeKind: ShipRoomKind
  installedParts: InstalledCustomizerPartsByKind
  onSlotClick: (kind: ShipRoomKind) => void
  confirmed?: boolean
}

interface SlotAnim {
  // fly-in: 0 = off-screen (below), 1 = locked into place
  flyProgress: number
  animating: boolean
  // brief border flash when part locks in
  flashAlpha: number
}

interface SlotVisuals {
  border: Graphics
  label: Text
  partSprite: Sprite
  anim: SlotAnim
}

export function ShipCustomizerCanvas({ layout, activeKind, installedParts, onSlotClick, confirmed }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef({ activeKind, installedParts, onSlotClick, confirmed })
  stateRef.current = { activeKind, installedParts, onSlotClick, confirmed }

  useEffect(() => {
    const div = containerRef.current
    if (!div) return

    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'display:block;width:100%;height:100%;'
    div.appendChild(canvas)

    const app = new Application()
    let destroyed = false
    let phase = 0

    ;(async () => {
      await app.init({
        canvas,
        width: W,
        height: H,
        background: 0x06090f,
        antialias: true,
        autoDensity: true,
        resolution: typeof window !== 'undefined' ? window.devicePixelRatio ?? 1 : 1,
      })
      if (destroyed) { app.destroy(true); return }

      const world = new Container()
      app.stage.addChild(world)

      // Hull background
      try {
        const tex = await Assets.load<Texture>(layout.containerSrc)
        if (!destroyed) {
          const hull = new Sprite(tex)
          hull.width = W
          hull.height = H
          world.addChildAt(hull, 0)
        }
      } catch { /* missing hull — canvas stays dark */ }

      if (destroyed) { app.destroy(true); return }

      // Slot visuals
      const slotVisuals = new Map<string, SlotVisuals>()

      for (const slot of layout.slots) {
        const border = new Graphics()
        border.eventMode = 'static'
        border.cursor = 'pointer'
        border.on('pointerdown', () => {
          if (!stateRef.current.confirmed) stateRef.current.onSlotClick(slot.kind)
        })
        world.addChild(border)

        const labelStyle = new TextStyle({
          fontFamily: '"Oxanium", "Turret Road", monospace',
          fontSize: 10,
          fontWeight: '800',
          fill: 0xffffff,
          letterSpacing: 2,
        })
        const label = new Text({ text: slot.label.toUpperCase(), style: labelStyle })
        label.anchor.set(0.5, 0.5)
        world.addChild(label)

        const partSprite = new Sprite(Texture.EMPTY)
        partSprite.anchor.set(0.5, 0.5)
        partSprite.visible = false
        world.addChild(partSprite)

        slotVisuals.set(slot.kind, {
          border, label, partSprite,
          anim: { flyProgress: 1, animating: false, flashAlpha: 0 },
        })
      }

      // Preload room sprites
      const roomTextures = new Map<ShipRoomKind, Texture>()
      await Promise.all(
        Object.entries(SHIP_ROOM_ASSETS).map(async ([kind, src]) => {
          try {
            const tex = await Assets.load<Texture>(src)
            if (!destroyed) roomTextures.set(kind as ShipRoomKind, tex)
          } catch { /* missing room sprite — label fallback */ }
        })
      )
      if (destroyed) { app.destroy(true); return }

      let prevInstalledHash = ''

      // Camera state for category-focus zoom
      const ZOOM_FOCUSED = 1.35
      const CAM_LERP = 5.5
      let camZoom = 1.0
      let camX = 0.0
      let camY = 0.0

      app.ticker.add(ticker => {
        phase += ticker.deltaTime * 0.025
        const dt = ticker.deltaTime / 60

        const { activeKind: ak, installedParts: ip } = stateRef.current
        const installedHash = Object.entries(ip).sort().map(([k, v]) => `${k}:${v}`).join('|')
        const hashChanged = installedHash !== prevInstalledHash

        // ── Camera: zoom onto active slot ───────────────────────────────
        const activeSlot = layout.slots.find(s => s.kind === ak)
        if (activeSlot) {
          const cx = (activeSlot.x / 100 + activeSlot.w / 200) * W
          const cy = (activeSlot.y / 100 + activeSlot.h / 200) * H
          const targetZoom = ZOOM_FOCUSED
          // Camera offset to center the slot, clamped so world fills canvas
          const rawCamX = W / 2 - cx * targetZoom
          const rawCamY = H / 2 - cy * targetZoom
          const minCamX = W * (1 - targetZoom)   // world right edge ≥ screen right
          const minCamY = H * (1 - targetZoom)
          const targetCamX = Math.min(0, Math.max(minCamX, rawCamX))
          const targetCamY = Math.min(0, Math.max(minCamY, rawCamY))

          camZoom += (targetZoom - camZoom) * Math.min(1, CAM_LERP * dt)
          camX    += (targetCamX - camX)    * Math.min(1, CAM_LERP * dt)
          camY    += (targetCamY - camY)    * Math.min(1, CAM_LERP * dt)
        }

        for (const slot of layout.slots) {
          const vis = slotVisuals.get(slot.kind)
          if (!vis) continue

          const px = (slot.x / 100) * W
          const py = (slot.y / 100) * H
          const pw = (slot.w / 100) * W
          const ph = (slot.h / 100) * H

          const isActive = slot.kind === ak
          const isDone   = !!ip[slot.kind]
          const pulse    = isActive ? 0.72 + Math.sin(phase * 3.2) * 0.28 : 1.0
          const lineW    = isActive ? 1.8 : 1.0

          // Detect newly installed part → trigger fly-in
          if (hashChanged && isDone && vis.anim.flyProgress >= 1 && !vis.anim.animating) {
            const wasInstalled = prevInstalledHash.includes(`${slot.kind}:`)
            if (!wasInstalled) {
              vis.anim.flyProgress = 0
              vis.anim.animating = true
              vis.anim.flashAlpha = 0
            }
          }

          // Advance fly-in animation
          if (vis.anim.animating) {
            vis.anim.flyProgress = Math.min(1, vis.anim.flyProgress + dt * 3.5)
            if (vis.anim.flyProgress >= 1) {
              vis.anim.animating = false
              vis.anim.flashAlpha = 1  // trigger lock flash
            }
          }
          // Decay lock flash
          if (vis.anim.flashAlpha > 0) {
            vis.anim.flashAlpha = Math.max(0, vis.anim.flashAlpha - dt * 4)
          }

          // ── Border ──────────────────────────────────────────────────
          vis.border.clear()
          vis.border
            .rect(px, py, pw, ph)
            .fill({
              color: isActive ? C_ACTIVE_FILL : isDone ? C_DONE_FILL : C_EMPTY_FILL,
              alpha: isActive ? 0.40 : isDone ? 0.18 : 0.55,
            })
            .stroke({
              color: vis.anim.flashAlpha > 0
                ? 0xffffff
                : isActive ? C_ACTIVE_BORDER : isDone ? C_DONE_BORDER : C_EMPTY_BORDER,
              alpha: vis.anim.flashAlpha > 0 ? vis.anim.flashAlpha : pulse,
              width: lineW + vis.anim.flashAlpha * 2,
            })

          // Animated corner dots for active slot
          if (isActive) {
            const dotAlpha = 0.5 + Math.sin(phase * 3.2) * 0.5
            vis.border
              .circle(px,      py,      2).fill({ color: C_ACTIVE_BRIGHT, alpha: dotAlpha })
              .circle(px + pw, py,      2).fill({ color: C_ACTIVE_BRIGHT, alpha: dotAlpha })
              .circle(px,      py + ph, 2).fill({ color: C_ACTIVE_BRIGHT, alpha: dotAlpha })
              .circle(px + pw, py + ph, 2).fill({ color: C_ACTIVE_BRIGHT, alpha: dotAlpha })
          }

          // ── Part sprite (fly-in animation) ───────────────────────────
          if (isDone) {
            const roomTex = roomTextures.get(slot.kind)
            if (roomTex) {
              if (hashChanged || vis.anim.animating) {
                vis.partSprite.texture = roomTex
                vis.partSprite.width  = pw
                vis.partSprite.height = ph
              }
              // Ease-out cubic for fly-in: sprite enters from bottom edge of canvas
              const t = vis.anim.flyProgress
              const ease = 1 - Math.pow(1 - t, 3)
              const finalY = py + ph / 2
              const startY = H + ph / 2
              vis.partSprite.x = px + pw / 2
              vis.partSprite.y = startY + (finalY - startY) * ease
              // Slight overshoot scale on landing
              const landScale = t < 1 ? 1 : 1 + Math.sin(vis.anim.flashAlpha * Math.PI) * 0.04
              vis.partSprite.scale.set(landScale)
              vis.partSprite.alpha = t < 0.1 ? t * 10 : 1
              vis.partSprite.visible = true
            }
          } else {
            vis.partSprite.visible = false
          }

          // ── Label ─────────────────────────────────────────────────────
          vis.label.x = px + pw / 2
          vis.label.y = py + ph / 2
          vis.label.alpha = isDone ? 0 : isActive ? pulse * 0.9 : 0.38
          vis.label.style.fill = isActive ? C_ACTIVE_BRIGHT : 0x6cc2ff
        }

        if (hashChanged) prevInstalledHash = installedHash

        world.scale.set(camZoom)
        world.x = camX
        world.y = camY + Math.sin(phase * 0.38) * 2.2
      })
    })()

    return () => {
      destroyed = true
      canvas.remove()
      app.destroy(true)
    }
  }, [layout])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        aspectRatio: '12 / 5',
        overflow: 'hidden',
        borderBottom: '1px solid var(--ln-hairline)',
        background: 'radial-gradient(ellipse at 50% 50%, rgba(63,169,255,0.05) 0%, rgba(0,0,0,0) 70%)',
      }}
    />
  )
}
