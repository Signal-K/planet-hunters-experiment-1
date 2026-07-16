/**
 * Pure scene logic for the Debrief scrap/dismantle sequence — plays when a
 * single-use starter rocket (SR1-SR5, see rocket-and-room-system decision)
 * is recovered for parts instead of returning intact. Mirrors launchScene.ts's
 * shape: no React, no PixiJS Application lifecycle, just scene graph
 * construction and a per-frame update function returned to the caller.
 *
 * Once reusable rockets ship post-onboarding, the caller should skip this
 * scene entirely for a reusable hull rather than adapting it — see the
 * shipDestroyed-gated trigger in DebriefScreen.tsx.
 */
import { Application, Assets, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js'

const C = {
  void:    0x06090f,
  surface: 0x122236,
  surface2:0x18304b,
  cyan:    0x3fa9ff,
  amber:   0xf5a623,
  text:    0xe6efff,
} as const

export const SCRAP_TIMELINE = {
  hold:      0.3,
  breakUp:   0.9,
  drift:     2.6,
  labelIn:   1.1,
  fadeOut:   2.9,
  done:      3.6,
}

export const SCRAP_W = 390
export const SCRAP_H = 420

interface Shard {
  sprite: Container
  vx: number
  vy: number
  rot: number
  homeX: number
  homeY: number
}

function makeShardTexture(app: Application, w: number, h: number, color: number): Texture {
  const g = new Graphics()
  g.rect(0, 0, w, h).fill({ color })
  g.rect(0, 0, w, 2).fill({ color: 0xffffff, alpha: 0.25 })
  return app.renderer.generateTexture(g)
}

export function buildScrapScene(
  app: Application,
  opts: { rocketImageSrc?: string; onComplete: () => void },
) {
  const W = app.screen.width
  const H = app.screen.height
  const T = SCRAP_TIMELINE

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

  // ── Salvage bin — pieces fly toward this and shrink into it ────────────────
  const binGfx = new Graphics()
  const binY = H * 0.86
  binGfx.rect(-38, 0, 76, 34).fill({ color: C.surface2 })
  binGfx.rect(-38, 0, 76, 4).fill({ color: C.cyan, alpha: 0.6 })
  binGfx.x = W / 2
  binGfx.y = binY
  binGfx.alpha = 0
  app.stage.addChild(binGfx)

  const binLabel = new Text({
    text: 'SALVAGE',
    style: new TextStyle({
      fontFamily: '"Oxanium", "Turret Road", monospace',
      fontSize: 8, fontWeight: '800', fill: C.cyan, letterSpacing: 2,
    }),
  })
  binLabel.anchor.set(0.5, 0)
  binLabel.x = W / 2
  binLabel.y = binY + 38
  binLabel.alpha = 0
  app.stage.addChild(binLabel)

  // ── Shards — built lazily once the rocket sprite's real size is known ─────
  let shards: Shard[] = []
  let shardsBuilt = false
  function buildShards() {
    const cols = 2
    const rows = 3
    const cellW = rocketW / cols
    const cellH = rocketH / rows
    const colors = [C.surface, C.surface2, C.void]
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
        shards.push({
          sprite: wrap,
          vx: (Math.random() - 0.5) * 40,
          vy: -20 - Math.random() * 30,
          rot: (Math.random() - 0.5) * 0.12,
          homeX: wrap.x,
          homeY: wrap.y,
        })
      }
    }
    shardsBuilt = true
  }

  const caption = new Text({
    text: 'SINGLE-USE HULL — RECOVERED FOR PARTS',
    style: new TextStyle({
      fontFamily: '"Oxanium", "Turret Road", monospace',
      fontSize: 10, fontWeight: '800', fill: C.text, letterSpacing: 1.5,
    }),
  })
  caption.anchor.set(0.5, 0)
  caption.x = W / 2
  caption.y = H * 0.06
  caption.alpha = 0
  app.stage.addChild(caption)

  const fadeGfx = new Graphics()
  fadeGfx.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0 })
  app.stage.addChild(fadeGfx)

  let done = false
  let brokenUp = false

  function update(elapsed: number, dt: number) {
    if (done) return

    if (elapsed >= T.hold && !brokenUp) {
      brokenUp = true
      if (!shardsBuilt) buildShards()
      rocketSprite.visible = false
      for (const s of shards) s.sprite.children[0].visible = true
    }

    if (brokenUp) {
      const driftT = Math.max(0, Math.min(1, (elapsed - T.hold) / (T.drift - T.hold)))
      const easeIn = driftT * driftT
      for (const s of shards) {
        const toBinX = W / 2 - s.homeX
        const toBinY = binY - s.homeY
        s.sprite.x = s.homeX + s.vx * elapsed + toBinX * easeIn
        s.sprite.y = s.homeY + s.vy * elapsed * (1 - easeIn) + toBinY * easeIn
        s.sprite.rotation += s.rot
        s.sprite.alpha = Math.max(0, 1 - Math.max(0, driftT - 0.7) / 0.3)
        const scale = Math.max(0.05, 1 - easeIn * 0.9)
        s.sprite.scale.set(scale)
      }
      binGfx.alpha = Math.min(1, driftT * 1.5)
      binLabel.alpha = binGfx.alpha
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
