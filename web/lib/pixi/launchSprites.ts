/**
 * Pixi side of the rocket sprites v2 integration (SSL-455 stack, SSL-456 fx).
 * Playback rules live in launchSpriteAnim.ts; this file owns textures and
 * display objects. Everything is driven from the scene's own dt so the
 * animations stay locked to LAUNCH_TIMELINE (no second ticker).
 */
import { Assets, Container, Sprite, type Spritesheet, type Texture } from 'pixi.js'
import {
  ChainPlayer,
  LAUNCH_ROWS,
  fxFrameAt,
  restingFrame,
  type ChainFrame,
  type LaunchRow,
  type LaunchSheetMeta,
  type ScheduledHook,
  type SheetAnimMeta,
} from './launchSpriteAnim'

const SHEET_DIR = '/game/assets/rockets/launch'
/** Longer than this and the scene falls back to the procedural stack rather than wait. */
export const LAUNCH_SPRITE_LOAD_TIMEOUT_MS = 2000

export type LaunchVariant = 'explorer' | 'prospector'

export interface LaunchSheets {
  launch: Spritesheet
  meta: LaunchSheetMeta
  fx: Spritesheet
  fxAnims: Record<string, SheetAnimMeta>
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`launch sprites timed out after ${ms}ms`)), ms)
    p.then(
      v => { clearTimeout(id); resolve(v) },
      e => { clearTimeout(id); reject(e) },
    )
  })
}

/** Resolves null (never throws) when any texture fails, so the caller keeps the procedural stack. */
export async function loadLaunchSheets(variant: LaunchVariant): Promise<LaunchSheets | null> {
  try {
    const [launch, fx] = await withTimeout(
      Promise.all([
        Assets.load<Spritesheet>(`${SHEET_DIR}/${variant}-launch-sheet.json`),
        Assets.load<Spritesheet>(`${SHEET_DIR}/fx-sheet.json`),
      ]),
      LAUNCH_SPRITE_LOAD_TIMEOUT_MS,
    )
    const meta = (launch.data as unknown as { landnam?: LaunchSheetMeta }).landnam
    const fxMeta = (fx.data as unknown as { landnam?: { animations: Record<string, SheetAnimMeta> } }).landnam
    if (!meta || !fxMeta) return null
    for (const row of LAUNCH_ROWS) {
      if (!launch.animations[`${row}/idle`]?.length) return null
    }
    return { launch, meta, fx, fxAnims: fxMeta.animations }
  } catch (err) {
    console.warn('[launchSprites] falling back to the procedural stack', err)
    return null
  }
}

function applyFrame(sprite: Sprite, tex: Texture) {
  sprite.texture = tex
  // Anchors are baked per frame (nozzle exit for boosters, engine exit for the core), but
  // Sprite only reads defaultAnchor on construction, so copy it on every swap.
  if (tex.defaultAnchor) sprite.anchor.set(tex.defaultAnchor.x, tex.defaultAnchor.y)
}

export interface SpriteStack {
  /** Same shape as the procedural stack so detachPart and the plume code keep working. */
  root: Container
  boosterL: Container
  boosterR: Container
  lowerStage: Container
  /** Run a scheduled sheet hook: starts each row's animation chain (or jumps to its resting pose). */
  fire(hook: ScheduledHook, reducedMotion: boolean): void
  tick(dt: number): void
  /** Author-unit half width of the core, for placing runtime fx. */
  authorWide: number
}

export function createSpriteStack(sheets: LaunchSheets): SpriteStack {
  const { launch, meta } = sheets
  const root = new Container()
  const rows = new Map<LaunchRow, { box: Container; sprite: Sprite; player: ChainPlayer }>()

  // LAUNCH_ROWS is already back-to-front (upper z0 < lower z1 < boosters z2).
  for (const row of LAUNCH_ROWS) {
    const box = new Container()
    const at = meta.rows[row].attachAuthor
    box.position.set(at.x, at.y)
    const sprite = new Sprite(launch.animations[`${row}/idle`][0])
    applyFrame(sprite, launch.animations[`${row}/idle`][0])
    sprite.scale.set(meta.spriteScaleForAuthorUnits)
    box.addChild(sprite)
    root.addChild(box)
    rows.set(row, { box, sprite, player: new ChainPlayer(row, meta.animations) })
  }

  const show = (row: LaunchRow, f: ChainFrame | null) => {
    if (!f) return
    const tex = launch.animations[f.anim]?.[f.frame]
    if (tex) applyFrame(rows.get(row)!.sprite, tex)
  }

  return {
    root,
    boosterL: rows.get('booster-l')!.box,
    boosterR: rows.get('booster-r')!.box,
    lowerStage: rows.get('lower-stage')!.box,
    authorWide: meta.authorWide,
    fire(hook, reducedMotion) {
      for (const row of LAUNCH_ROWS) {
        const names = hook.play[row]
        if (!names?.length) continue
        const r = rows.get(row)!
        if (reducedMotion) {
          r.player.start([])
          show(row, restingFrame(row, names))
        } else {
          r.player.start(names)
          show(row, r.player.tick(0))
        }
      }
    },
    tick(dt) {
      for (const row of LAUNCH_ROWS) {
        const r = rows.get(row)!
        if (r.player.active) show(row, r.player.tick(dt))
      }
    },
  }
}

export interface FxSpawn {
  anim: 'fx/pad-smoke' | 'fx/sep-puff' | 'fx/stage-sep-flash' | 'fx/debris' | 'fx/clamp-tumble'
  x: number
  y: number
  scale: number
  vx?: number
  vy?: number
  /** Seconds before it is removed. Defaults to one pass of the animation; clamp-tumble loops until this. */
  life?: number
  flipX?: boolean
  alpha?: number
}

interface LiveFx {
  sprite: Sprite
  frames: Texture[]
  meta: SheetAnimMeta
  age: number
  life: number
  vx: number
  vy: number
  alpha: number
}

/** One-shot sprites from fx-sheet.json, ticked by the scene's dt and removed when finished. */
export class FxLayer {
  readonly container = new Container()
  private live: LiveFx[] = []

  constructor(private readonly sheets: LaunchSheets) {}

  spawn(o: FxSpawn) {
    const frames = this.sheets.fx.animations[o.anim]
    const meta = this.sheets.fxAnims[o.anim]
    if (!frames?.length || !meta) return
    const sprite = new Sprite(frames[0])
    applyFrame(sprite, frames[0])
    sprite.position.set(o.x, o.y)
    sprite.scale.set(o.flipX ? -o.scale : o.scale, o.scale)
    this.container.addChild(sprite)
    this.live.push({
      sprite,
      frames,
      meta,
      age: 0,
      life: o.life ?? meta.durationSec,
      vx: o.vx ?? 0,
      vy: o.vy ?? 0,
      alpha: o.alpha ?? 1,
    })
  }

  tick(dt: number) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const f = this.live[i]
      f.age += dt
      const idx = f.age >= f.life ? null : fxFrameAt(f.meta, f.age)
      if (idx === null) {
        f.sprite.destroy()
        this.live.splice(i, 1)
        continue
      }
      applyFrame(f.sprite, f.frames[idx])
      f.sprite.x += f.vx * dt
      f.sprite.y += f.vy * dt
      f.sprite.alpha = f.alpha * Math.min(1, (f.life - f.age) * 4 + (f.meta.loop ? 0 : 1))
    }
  }

  clear() {
    for (const f of this.live) f.sprite.destroy()
    this.live = []
  }
}
