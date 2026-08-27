/**
 * Pure scene logic for the Debrief scrap/dismantle sequence — plays when a
 * single-use rocket model (see rocket-and-room-system decision)
 * is recovered for parts instead of returning intact. Mirrors launchScene.ts's
 * shape: no React, no PixiJS Application lifecycle, just scene graph
 * construction and a per-frame update function returned to the caller.
 *
 * Once reusable rockets ship post-onboarding, the caller should skip this
 * scene entirely for a reusable hull rather than adapting it — see the
 * shipDestroyed-gated trigger in DebriefScreen.tsx.
 *
 * Rebuilt 2026-08-27 (KES-267): was a flat near-black scene (a hardcoded
 * `0x06090f` void, disconnected from the rest of the UI's light "blueprint"
 * direction) with a plain 6-piece shatter. PixiJS can't read CSS custom
 * properties, so the palette below is a hand-kept hex mirror of the
 * `--ln-bp-*` tokens in globals.css — keep the two in sync if that palette
 * changes. The animation itself is a proper two-phase burst-then-collect
 * (radial explosion, then an eased pull into the salvage crate) with an
 * impact flash and spark particles instead of a static shard grid drifting
 * in a straight line.
 */
import { Application, Assets, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js'

// Mirrors app/globals.css's --ln-bp-* blueprint tokens (KES-267).
const C = {
  bg:      0xeef3f8, // --ln-bp-bg
  paper:   0xffffff, // --ln-bp-paper
  paper2:  0xdfe9f3, // --ln-bp-paper-2
  ink:     0x0f2436, // --ln-bp-ink
  inkDim:  0x48596a, // --ln-bp-ink-dim
  line:    0x0f2436, // --ln-bp-line, alpha applied separately
  blue:    0x1f78c1, // --ln-bp-blue
  pink:    0xc94a86, // --ln-bp-pink
} as const

export const SCRAP_TIMELINE = {
  hold:      0.3,
  burst:     1.1,
  collect:   2.7,
  labelIn:   1.2,
  fadeOut:   3.0,
  done:      3.7,
}

export const SCRAP_W = 390
export const SCRAP_H = 420

interface Shard {
  sprite: Container
  vx: number
  vy: number
  rot: number
  rotSpeed: number
  homeX: number
  homeY: number
}

interface Spark {
  g: Graphics
  vx: number
  vy: number
}

function makeShardTexture(app: Application, w: number, h: number, color: number): Texture {
  const g = new Graphics()
  g.rect(0, 0, w, h).fill({ color })
  g.rect(0, 0, w, Math.max(1, h * 0.14)).fill({ color: 0xffffff, alpha: 0.35 })
  return app.renderer.generateTexture(g)
}

/** Corner-bracket frame matching Panel.tsx's HTML corner-bracket motif — the
 * one recurring "this is a UI container" cue used all over the game. */
function drawBracketCorners(g: Graphics, w: number, h: number, len: number, color: number) {
  const x0 = -w / 2
  const y0 = -h / 2
  const x1 = w / 2
  const y1 = h / 2
  g.moveTo(x0, y0 + len).lineTo(x0, y0).lineTo(x0 + len, y0)
  g.moveTo(x1 - len, y0).lineTo(x1, y0).lineTo(x1, y0 + len)
  g.moveTo(x0, y1 - len).lineTo(x0, y1).lineTo(x0 + len, y1)
  g.moveTo(x1 - len, y1).lineTo(x1, y1).lineTo(x1, y1 - len)
  g.stroke({ color, width: 1.5, alpha: 0.9 })
}

export function buildScrapScene(
  app: Application,
  opts: { rocketImageSrc?: string; onComplete: () => void },
) {
  const W = app.screen.width
  const H = app.screen.height
  const T = SCRAP_TIMELINE

  // Backdrop — flat blueprint paper, matching the boxed-screen theme instead
  // of the old hardcoded void.
  const bg = new Graphics()
  bg.rect(0, 0, W, H).fill({ color: C.bg })
  app.stage.addChild(bg)

  const rocketRoot = new Container()
  rocketRoot.x = W / 2
  rocketRoot.y = H * 0.42
  app.stage.addChild(rocketRoot)

  const rocketSprite = new Sprite(Texture.EMPTY)
  rocketSprite.anchor.set(0.5)
  rocketSprite.visible = false
  rocketRoot.addChild(rocketSprite)

  let rocketW = 60
  let rocketH = 160
  if (opts.rocketImageSrc) {
    void Assets.load<Texture>(opts.rocketImageSrc).then(texture => {
      const longEdge = Math.min(H * 0.5, 220)
      const thickEdge = Math.min(W * 0.4, 130)
      const scale = Math.min(longEdge / Math.max(texture.height, 1), thickEdge / Math.max(texture.width, 1))
      rocketSprite.texture = texture
      rocketSprite.scale.set(scale)
      rocketSprite.visible = true
      rocketW = texture.width * scale
      rocketH = texture.height * scale
    }).catch(() => { rocketSprite.visible = false })
  }

  // ── Impact flash — a quick radial pulse at the break moment, the missing
  //    "punch" the old cut-straight-to-shatter version never had. ──────────
  const flash = new Graphics()
  flash.circle(0, 0, 1).fill({ color: 0xffffff })
  flash.x = rocketRoot.x
  flash.y = rocketRoot.y
  flash.alpha = 0
  app.stage.addChild(flash)

  // ── Salvage crate — a bracket-cornered container (Panel.tsx's motif),
  //    replacing the old flat filled rectangle. ───────────────────────────
  const binY = H * 0.86
  const binW = 92
  const binH = 40
  const binGfx = new Graphics()
  binGfx.rect(-binW / 2, 0, binW, binH).fill({ color: C.paper2, alpha: 0.9 })
  drawBracketCorners(binGfx, binW, binH, 10, C.blue)
  binGfx.pivot.set(0, -binH / 2)
  binGfx.x = W / 2
  binGfx.y = binY
  binGfx.alpha = 0
  app.stage.addChild(binGfx)

  const binLabel = new Text({
    text: 'SALVAGE',
    style: new TextStyle({
      fontFamily: '"Oxanium", "Turret Road", monospace',
      fontSize: 8, fontWeight: '800', fill: C.blue, letterSpacing: 2,
    }),
  })
  binLabel.anchor.set(0.5, 0)
  binLabel.x = W / 2
  binLabel.y = binY + binH / 2 + 8
  binLabel.alpha = 0
  app.stage.addChild(binLabel)

  // ── Shards — a finer 3x4 grid than the old 2x3, so the burst reads as a
  //    real shatter rather than four big chunks. Built lazily once the
  //    rocket sprite's real size is known. ────────────────────────────────
  let shards: Shard[] = []
  let shardsBuilt = false
  function buildShards() {
    const cols = 3
    const rows = 4
    const cellW = rocketW / cols
    const cellH = rocketH / rows
    const colors = [C.paper2, C.ink, C.inkDim]
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const texture = makeShardTexture(app, cellW, cellH, colors[(r + c) % colors.length])
        const sprite = new Sprite(texture)
        sprite.anchor.set(0.5)
        sprite.visible = false
        const homeX = (c - (cols - 1) / 2) * cellW
        const homeY = (r - (rows - 1) / 2) * cellH
        const wrap = new Container()
        wrap.addChild(sprite)
        wrap.x = rocketRoot.x + homeX
        wrap.y = rocketRoot.y + homeY
        app.stage.addChild(wrap)
        // Radial outward burst from the rocket's center (not just random
        // jitter) — every piece flies away from the impact point, which is
        // what makes it read as an explosion rather than a wobble.
        const angle = Math.atan2(homeY, homeX) + (Math.random() - 0.5) * 0.6
        const speed = 60 + Math.random() * 70
        shards.push({
          sprite: wrap,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 40, // extra upward kick
          rot: 0,
          rotSpeed: (Math.random() - 0.5) * 6,
          homeX: wrap.x,
          homeY: wrap.y,
        })
      }
    }
    shardsBuilt = true
  }

  // ── Sparks — small burst particles at the impact point for extra polish.
  const sparks: Spark[] = []
  function buildSparks() {
    for (let i = 0; i < 14; i++) {
      const g = new Graphics()
      g.circle(0, 0, 1.6).fill({ color: i % 2 === 0 ? C.blue : C.pink })
      g.x = rocketRoot.x
      g.y = rocketRoot.y
      app.stage.addChild(g)
      const angle = Math.random() * Math.PI * 2
      const speed = 90 + Math.random() * 90
      sparks.push({ g, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed })
    }
  }

  const caption = new Text({
    text: 'SINGLE-USE HULL — RECOVERED FOR PARTS',
    style: new TextStyle({
      fontFamily: '"Oxanium", "Turret Road", monospace',
      fontSize: 10, fontWeight: '800', fill: C.ink, letterSpacing: 1.5,
    }),
  })
  caption.anchor.set(0.5, 0)
  caption.x = W / 2
  caption.y = H * 0.06
  caption.alpha = 0
  app.stage.addChild(caption)

  const fadeGfx = new Graphics()
  fadeGfx.rect(0, 0, W, H).fill({ color: C.bg, alpha: 0 })
  app.stage.addChild(fadeGfx)

  let done = false
  let brokenUp = false
  let sparksBuilt = false
  let sparkAge = 0

  function update(elapsed: number, dt: number) {
    if (done) return

    if (elapsed >= T.hold && !brokenUp) {
      brokenUp = true
      if (!shardsBuilt) buildShards()
      if (!sparksBuilt) { buildSparks(); sparksBuilt = true }
      rocketSprite.visible = false
      for (const s of shards) s.sprite.children[0].visible = true
      flash.alpha = 1
      flash.scale.set(1)
    }

    // Impact flash — quick punch-out then fade, entirely within the burst window.
    if (brokenUp) {
      const flashT = Math.max(0, Math.min(1, (elapsed - T.hold) / 0.35))
      flash.scale.set(1 + flashT * Math.max(W, H) * 0.9)
      flash.alpha = Math.max(0, 1 - flashT) * 0.6
    }

    if (sparksBuilt) {
      sparkAge += dt
      const sparkT = Math.min(1, sparkAge / 0.6)
      for (const s of sparks) {
        s.g.x += s.vx * dt
        s.g.y += s.vy * dt
        s.g.alpha = Math.max(0, 1 - sparkT)
      }
    }

    if (brokenUp) {
      // Phase 1 (hold→burst): pieces fly outward on their own trajectory —
      // a real explosion beat before anything starts pulling back in.
      // Phase 2 (burst→collect): eased pull into the salvage crate,
      // shrinking and fading as they arrive.
      const burstT = Math.max(0, Math.min(1, (elapsed - T.hold) / (T.burst - T.hold)))
      const collectT = Math.max(0, Math.min(1, (elapsed - T.burst) / (T.collect - T.burst)))
      const easeIn = collectT * collectT * (3 - 2 * collectT) // smoothstep

      for (const s of shards) {
        const burstX = s.homeX + s.vx * burstT
        const burstY = s.homeY + s.vy * burstT + 60 * burstT * burstT // gravity arc
        const toBinX = W / 2 - burstX
        const toBinY = binY - burstY
        s.sprite.x = burstX + toBinX * easeIn
        s.sprite.y = burstY + toBinY * easeIn
        s.sprite.rotation += s.rotSpeed * dt
        s.sprite.alpha = collectT < 0.6 ? 1 : Math.max(0, 1 - (collectT - 0.6) / 0.4)
        const scale = Math.max(0.05, 1 - easeIn * 0.92)
        s.sprite.scale.set(scale)
      }
      const binIn = Math.min(1, collectT * 1.6)
      binGfx.alpha = binIn
      binLabel.alpha = binIn
    }

    caption.alpha = elapsed > T.labelIn ? Math.min(1, (elapsed - T.labelIn) / 0.4) : 0

    if (elapsed >= T.fadeOut) {
      fadeGfx.alpha = Math.min(1, (elapsed - T.fadeOut) / (T.done - T.fadeOut))
    }
    if (elapsed >= T.done && !done) {
      done = true
      opts.onComplete()
    }
  }

  return { update }
}
