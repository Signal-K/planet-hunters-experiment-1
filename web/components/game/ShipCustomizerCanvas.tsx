'use client'

import { useEffect, useRef } from 'react'
import { capDpr } from '@/lib/engine/pixiDisplay'
import { Application, Assets, Container, FederatedPointerEvent, FillGradient, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js'
import type { ShipInteriorLayout, ShipRoomKind, InstalledCustomizerPartsByKind } from '@/lib/data'
import { CUSTOMIZER_PARTS, getRoomIconArt, SHIP_ROOM_ASSETS, SHIP_ROOM_FOOTPRINT } from '@/lib/data'

const W = 720
const H = 300

// Out There: Omega icon-badge language, per the standing design-language doc
// (`landnam-ui-design-language-style-prompt`): rounded badge frames, cyan as
// the default/active accent, `--ln-ok` green for "done" segmented status —
// not crimson, which the doc reserves for danger/destructive only.
const BADGE_RADIUS      = 7
const C_ACTIVE_BORDER = 0xa3ecf5  // --ln-cyan-bright
const C_ACTIVE_BRIGHT = 0xa3ecf5
const C_DONE_BORDER   = 0x5ad07e  // --ln-ok
const C_EMPTY_BORDER  = 0x1a3a5e
const C_GRID_LINE     = 0x123049
const C_ACTIVE_FILL   = 0x0d2830
const C_DONE_FILL     = 0x0a2015
const C_EMPTY_FILL    = 0x00101c

interface Props {
  layout: ShipInteriorLayout
  activeKind: ShipRoomKind
  installedParts: InstalledCustomizerPartsByKind
  onSlotClick: (kind: ShipRoomKind) => void
  confirmed?: boolean
}

interface GridCell { gx: number; gy: number }

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
  dragging: boolean
}

/** Cell rect in canvas-pixel space (0..W, 0..H), from grid-cell units. */
function cellRectPx(layout: ShipInteriorLayout, cell: GridCell, footprint: { w: number; h: number }) {
  const { grid } = layout
  const cellW = grid.area.w / grid.cols
  const cellH = grid.area.h / grid.rows
  const xPct = grid.area.x + cell.gx * cellW
  const yPct = grid.area.y + cell.gy * cellH
  return {
    x: (xPct / 100) * W,
    y: (yPct / 100) * H,
    w: (footprint.w * cellW / 100) * W,
    h: (footprint.h * cellH / 100) * H,
  }
}

function clampCell(layout: ShipInteriorLayout, cell: GridCell, footprint: { w: number; h: number }): GridCell {
  const { grid } = layout
  return {
    gx: Math.min(Math.max(0, cell.gx), grid.cols - footprint.w),
    gy: Math.min(Math.max(0, cell.gy), grid.rows - footprint.h),
  }
}

function cellsOverlap(a: GridCell, aFp: { w: number; h: number }, b: GridCell, bFp: { w: number; h: number }): boolean {
  return a.gx < b.gx + bFp.w && a.gx + aFp.w > b.gx && a.gy < b.gy + bFp.h && a.gy + aFp.h > b.gy
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
    let initialized = false
    let destroyed = false
    let phase = 0

    // Current grid-cell position of each installed kind — seeded from the
    // slot's home cell, then updated as the player drags rooms around. Purely
    // an arrangement preference; which kind occupies which cell has no
    // bearing on the build sequence/economy in shipCustomizer.ts.
    const positions = new Map<ShipRoomKind, GridCell>(
      layout.slots.map(slot => [slot.kind, { gx: slot.gx, gy: slot.gy }])
    )

    ;(async () => {
      await app.init({
        canvas,
        width: W,
        height: H,
        background: 0x06090f,
        antialias: false,
        autoDensity: true,
        resolution: capDpr(),
      })
      initialized = true
      if (destroyed) { try { app.destroy() } catch (_) { /* pixi v8 cleanup */ } canvas.remove(); return }

      const world = new Container()
      app.stage.addChild(world)
      app.stage.eventMode = 'static'

      // Navy-to-black backdrop — the Out There: Omega mood anchor the
      // design-language doc cites for the dark palette (`--ln-void` down to
      // black), sitting behind the hull art rather than a flat fill.
      const backdrop = new Graphics()
      const backdropGradient = new FillGradient({
        type: 'linear',
        start: { x: 0, y: 0 },
        end: { x: 0, y: 1 },
        colorStops: [
          { offset: 0, color: 0x000d1f },
          { offset: 1, color: 0x000000 },
        ],
      })
      backdrop.rect(0, 0, W, H).fill(backdropGradient)
      world.addChild(backdrop)

      // Hull background — the interior cutaway, always present underneath.
      try {
        const tex = await Assets.load<Texture>(layout.containerSrc)
        if (!destroyed) {
          const hull = new Sprite(tex)
          hull.width = W
          hull.height = H
          world.addChild(hull)  // above the backdrop gradient, below the grid/slots
        }
      } catch { /* missing hull — canvas stays dark */ }

      if (destroyed) { try { app.destroy() } catch { /* pixi v8 cleanup */ }; canvas.remove(); return }

      // Grid lines across the full interior bay — the Pixel-Starships "empty
      // module slots" look, drawn once behind everything else (drop targets
      // are visually obvious even before a room is dragged over them).
      const gridLines = new Graphics()
      world.addChild(gridLines)
      {
        const { grid } = layout
        const ax = (grid.area.x / 100) * W
        const ay = (grid.area.y / 100) * H
        const aw = (grid.area.w / 100) * W
        const ah = (grid.area.h / 100) * H
        const cw = aw / grid.cols
        const ch = ah / grid.rows
        for (let c = 0; c <= grid.cols; c++) {
          gridLines.moveTo(ax + c * cw, ay).lineTo(ax + c * cw, ay + ah)
        }
        for (let r = 0; r <= grid.rows; r++) {
          gridLines.moveTo(ax, ay + r * ch).lineTo(ax + aw, ay + r * ch)
        }
        gridLines.stroke({ color: C_GRID_LINE, width: 1, alpha: 0.5 })
      }

      // Exterior reveal (Pixel Starships-style): the exterior sprite sits on
      // TOP of everything — cutaway, slot borders, room sprites — fully
      // opaque at first, so opening a rocket's customiser shows the ship as
      // a whole before its hull is "opened up". It then fades to translucent
      // and out entirely, exposing the interior underneath rather than
      // cutting to it. Runs once per `layout` (i.e. once per rocket
      // selection, not on every step change — see the effect's dependency
      // array), added last so `addChild` order alone puts it above the room
      // slot visuals created below. Clicking it re-plays the reveal in
      // reverse so the player can look at the whole ship again on demand.
      let exteriorSprite: Sprite | null = null
      try {
        const exTex = await Assets.load<Texture>(layout.exteriorSrc)
        if (!destroyed) {
          exteriorSprite = new Sprite(exTex)
          exteriorSprite.width = W
          exteriorSprite.height = H
          exteriorSprite.eventMode = 'static'
          exteriorSprite.cursor = 'pointer'
        }
      } catch { /* missing exterior art — skip straight to the interior view */ }

      // Slot visuals
      const slotVisuals = new Map<ShipRoomKind, SlotVisuals>()

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
          dragging: false,
        })
      }

      // Preload room sprites — one per kind default (SHIP_ROOM_ASSETS) plus
      // every distinct tiered-part icon (CustomizerPart.img), keyed by src
      // path rather than kind so a slot can show the art for whichever
      // part is actually installed in it, not just the kind's default.
      const roomTextures = new Map<string, Texture>()
      const roomSrcs = new Set<string>([
        ...Object.values(SHIP_ROOM_ASSETS),
        ...CUSTOMIZER_PARTS.map(p => p.img).filter((s): s is string => !!s),
      ])
      await Promise.all(
        [...roomSrcs].map(async src => {
          try {
            const tex = await Assets.load<Texture>(src)
            if (!destroyed) roomTextures.set(src, tex)
          } catch { /* missing room sprite — label fallback */ }
        })
      )
      if (destroyed) { try { app.destroy() } catch { /* pixi v8 cleanup */ }; canvas.remove(); return }

      // ── Drag-and-drop: pick up an installed room's sprite and drop it on
      // any open cell it fits in. A short move threshold distinguishes a
      // drag from a plain click (which still routes to onSlotClick, same as
      // before drag support existed).
      let dragKind: ShipRoomKind | null = null
      let dragStartGlobal = { x: 0, y: 0 }
      let dragMoved = false

      function worldToGridCell(globalX: number, globalY: number): GridCell {
        const local = world.toLocal({ x: globalX, y: globalY } as never)
        const { grid } = layout
        const cellW = (grid.area.w / grid.cols / 100) * W
        const cellH = (grid.area.h / grid.rows / 100) * H
        const ax = (grid.area.x / 100) * W
        const ay = (grid.area.y / 100) * H
        return {
          gx: Math.round((local.x - ax) / cellW),
          gy: Math.round((local.y - ay) / cellH),
        }
      }

      function onDragMove(e: FederatedPointerEvent) {
        if (!dragKind) return
        const dx = e.global.x - dragStartGlobal.x
        const dy = e.global.y - dragStartGlobal.y
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved = true
        const vis = slotVisuals.get(dragKind)
        if (!vis) return
        const local = world.toLocal(e.global)
        vis.partSprite.x = local.x
        vis.partSprite.y = local.y
      }

      function onDragEnd(e: FederatedPointerEvent) {
        if (!dragKind) return
        const kind = dragKind
        const vis = slotVisuals.get(kind)
        dragKind = null
        app.stage.off('pointermove', onDragMove)
        app.stage.off('pointerup', onDragEnd)
        app.stage.off('pointerupoutside', onDragEnd)
        if (!vis) return
        vis.dragging = false

        if (!dragMoved) {
          // Plain click, not a drag — same behaviour as clicking the border.
          if (!stateRef.current.confirmed) stateRef.current.onSlotClick(kind)
          return
        }

        const footprint = SHIP_ROOM_FOOTPRINT[kind]
        const target = clampCell(layout, worldToGridCell(e.global.x, e.global.y), footprint)
        const collides = [...positions.entries()].some(
          ([otherKind, cell]) => otherKind !== kind && cellsOverlap(target, footprint, cell, SHIP_ROOM_FOOTPRINT[otherKind])
        )
        if (!collides) positions.set(kind, target)
        // else: snaps back to its last valid position on the next tick.
      }

      // Added last (on top of the hull, borders, labels and part sprites
      // above) so it fully covers the interior view until the reveal fades
      // it out — see the `revealElapsed` block in the ticker below.
      if (exteriorSprite) {
        world.addChild(exteriorSprite)
        exteriorSprite.on('pointerdown', () => {
          // Re-reveal on demand: jump back to fully opaque and let the
          // ticker's reveal timer play the fade out again.
          revealElapsed = 0
          if (exteriorSprite) { exteriorSprite.visible = true; exteriorSprite.alpha = 1 }
        })
      }

      let prevInstalledHash = ''

      // Exterior → interior reveal timing. Hold fully opaque briefly so the
      // whole ship reads before it "opens up", then ease out over REVEAL_MS.
      let revealElapsed = 0
      const REVEAL_HOLD = 0.5
      const REVEAL_DURATION = 1.1

      // Camera state for category-focus zoom
      const ZOOM_FOCUSED = 1.35
      const CAM_LERP = 5.5
      let camZoom = 1.0
      let camX = 0.0
      let camY = 0.0

      app.ticker.add(ticker => {
        phase += ticker.deltaTime * 0.025
        const dt = ticker.deltaTime / 60

        // ── Exterior → interior reveal ────────────────────────────────
        if (exteriorSprite && exteriorSprite.visible) {
          revealElapsed += dt
          const t = Math.max(0, Math.min(1, (revealElapsed - REVEAL_HOLD) / REVEAL_DURATION))
          const eased = t * t * (3 - 2 * t)  // smoothstep — eases both ends, no linear snap
          exteriorSprite.alpha = 1 - eased
          if (t >= 1) exteriorSprite.visible = false  // fully gone, not just alpha 0
        }

        const { activeKind: ak, installedParts: ip } = stateRef.current
        const installedHash = Object.entries(ip).sort().map(([k, v]) => `${k}:${v}`).join('|')
        const hashChanged = installedHash !== prevInstalledHash

        // ── Camera: zoom onto active slot's current (possibly dragged) cell
        const activeSlot = layout.slots.find(s => s.kind === ak)
        const activeCell = activeSlot ? (positions.get(ak) ?? { gx: activeSlot.gx, gy: activeSlot.gy }) : null
        if (activeSlot && activeCell) {
          const rect = cellRectPx(layout, activeCell, SHIP_ROOM_FOOTPRINT[ak])
          const cx = rect.x + rect.w / 2
          const cy = rect.y + rect.h / 2
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

          const footprint = SHIP_ROOM_FOOTPRINT[slot.kind]
          const cell = positions.get(slot.kind) ?? { gx: slot.gx, gy: slot.gy }
          const rect = cellRectPx(layout, cell, footprint)
          const px = rect.x, py = rect.y, pw = rect.w, ph = rect.h

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

          // ── Border (skipped while this slot's own sprite is being
          // dragged — the sprite itself is the visual, not its old cell) ──
          if (!vis.dragging) {
            vis.border.clear()
            // Rounded icon-badge frame, not a sharp HUD rectangle — the
            // Out There: Omega reference's "white/pale-blue line-art icon
            // badges" language for each room slot.
            vis.border
              .roundRect(px, py, pw, ph, BADGE_RADIUS)
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

            // Segmented status tick row for an installed room — the OTO
            // reference's "segmented green status bars" cue, echoed at
            // badge scale instead of a full progress bar.
            if (isDone && !vis.anim.animating) {
              const segCount = 4
              const segGap = 2
              const segW = (pw - 8 - segGap * (segCount - 1)) / segCount
              const segY = py + ph - 6
              for (let i = 0; i < segCount; i++) {
                const segX = px + 4 + i * (segW + segGap)
                vis.border
                  .roundRect(segX, segY, segW, 3, 1.5)
                  .fill({ color: C_DONE_BORDER, alpha: 0.85 })
              }
            }
          } else {
            vis.border.clear()
          }

          // ── Part sprite (fly-in animation + drag) ────────────────────
          if (isDone) {
            const roomSrc = getRoomIconArt(slot.kind, ip[slot.kind])
            const roomTex = roomTextures.get(roomSrc)
            if (roomTex) {
              // Fit-within (letterboxed), not stretch-to-fill: most grid
              // cells aren't square (a 2x1 footprint is roughly 137x71px),
              // and the room-interior dioramas are square, detailed scenes
              // (floor + walls + furniture) — non-uniform stretch squashed
              // them to half height and made every room unreadable, not
              // just the small ones. `width = pw; height = ph` (the old
              // behaviour) forced the aspect to match the cell exactly;
              // this instead scales uniformly to the largest size that
              // fits inside the cell, centered, so proportions stay correct
              // at the cost of some empty margin in non-square cells.
              if (hashChanged) vis.partSprite.texture = roomTex
              const fitScale = Math.min(pw / roomTex.width, ph / roomTex.height)
              vis.partSprite.eventMode = confirmed ? 'none' : 'static'
              vis.partSprite.cursor = confirmed ? 'default' : 'grab'
              if (!vis.dragging) {
                // Ease-out cubic for fly-in: sprite enters from bottom edge of canvas
                const t = vis.anim.flyProgress
                const ease = 1 - Math.pow(1 - t, 3)
                const finalY = py + ph / 2
                const startY = H + ph / 2
                vis.partSprite.x = px + pw / 2
                vis.partSprite.y = startY + (finalY - startY) * ease
                // Slight overshoot on landing, applied as a multiplier on
                // top of fitScale (not a bare .scale.set(), which would
                // discard fitScale and snap the sprite to native texture
                // pixel size — the bug in this fix's first draft).
                const overshoot = t < 1 ? 1 : 1 + Math.sin(vis.anim.flashAlpha * Math.PI) * 0.04
                vis.partSprite.width  = roomTex.width * fitScale * overshoot
                vis.partSprite.height = roomTex.height * fitScale * overshoot
                vis.partSprite.alpha = t < 0.1 ? t * 10 : 1
              }
              vis.partSprite.visible = true
            }
          } else {
            vis.partSprite.visible = false
          }

          // ── Label ─────────────────────────────────────────────────────
          vis.label.visible = !vis.dragging
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

      // Wire up drag start listeners once sprites exist (done in the
      // per-slot loop above at creation time, but pointerdown needs the
      // `positions`/`worldToGridCell` closures above, so it's attached here).
      for (const slot of layout.slots) {
        const vis = slotVisuals.get(slot.kind)
        if (!vis) continue
        vis.partSprite.on('pointerdown', (e: FederatedPointerEvent) => {
          if (stateRef.current.confirmed) return
          dragKind = slot.kind
          dragStartGlobal = { x: e.global.x, y: e.global.y }
          dragMoved = false
          vis.dragging = true
          app.stage.on('pointermove', onDragMove)
          app.stage.on('pointerup', onDragEnd)
          app.stage.on('pointerupoutside', onDragEnd)
        })
      }
    })()

    return () => {
      destroyed = true
      if (initialized) {
        try { app.destroy() } catch { /* pixi v8 cleanup */ }
        canvas.remove()
      }
      // else: async init will call try { app.destroy() } catch { /* pixi v8 cleanup */ } + canvas.remove() when it resolves
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
        background: 'radial-gradient(ellipse at 50% 50%, rgba(112,217,234,0.05) 0%, rgba(0,0,0,0) 70%)',
      }}
    />
  )
}
