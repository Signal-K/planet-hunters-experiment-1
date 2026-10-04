/**
 * Pure (no pixi import) playback logic for the rocket sprites v2 launch sheets
 * (SSL-455 / SSL-456). The sheets ship a `landnam` block (fps, loop, hooks,
 * attachAuthor); this file turns that block plus LAUNCH_TIMELINE into frame
 * indices so the timing can be unit-tested without WebGL.
 */
import type { LAUNCH_TIMELINE } from './launchTimeline'

export type LaunchRow = 'booster-l' | 'booster-r' | 'lower-stage' | 'upper-stage'
export const LAUNCH_ROWS: readonly LaunchRow[] = ['upper-stage', 'lower-stage', 'booster-l', 'booster-r']

export interface SheetAnimMeta {
  frames: number
  fps: number
  loop: boolean
  durationSec: number
}

export interface SheetHook {
  name: string
  t: number
  play?: Partial<Record<LaunchRow, string[]>>
}

export interface LaunchSheetMeta {
  model: string
  fps: number
  spriteScaleForAuthorUnits: number
  authorWide: number
  rows: Record<LaunchRow, { attachAuthor: { x: number; y: number }; zIndex: number }>
  animations: Record<string, SheetAnimMeta>
  hooks: SheetHook[]
}

type TimelineKey = keyof typeof LAUNCH_TIMELINE

/** Sheet hook name -> LAUNCH_TIMELINE mark. The mark, not the sheet's own `t`, drives playback. */
export const HOOK_MARKS: Record<string, TimelineKey> = {
  'launch:ignition': 'ignitionStart',
  'launch:liftoff': 'liftoff',
  'launch:booster-separation': 'boosterSep',
  'launch:stage-separation': 'stageSep',
  'launch:fade': 'fadeOut',
  'launch:complete': 'done',
}

export interface ScheduledHook {
  name: string
  t: number
  play: Partial<Record<LaunchRow, string[]>>
}

/** Hooks that play row animations, timed from the timeline and sorted by time. */
export function buildHookSchedule(
  meta: Pick<LaunchSheetMeta, 'hooks'>,
  timeline: Record<TimelineKey, number>,
): ScheduledHook[] {
  const out: ScheduledHook[] = []
  for (const hook of meta.hooks) {
    const mark = HOOK_MARKS[hook.name]
    if (!mark || !hook.play) continue
    out.push({ name: hook.name, t: timeline[mark], play: hook.play })
  }
  return out.sort((a, b) => a.t - b.t)
}

export interface ChainFrame {
  /** Full animation key as it appears in the sheet, e.g. `booster-l/burn`. */
  anim: string
  frame: number
}

/**
 * Plays a list of animations back to back ('ignition' then 'burn'). Only the
 * final animation may loop; earlier ones always play once, and a non-looping
 * final animation holds its last frame.
 */
export class ChainPlayer {
  private segs: { anim: string; meta: SheetAnimMeta }[] = []
  private idx = 0
  private t = 0

  constructor(private readonly row: LaunchRow, private readonly animations: Record<string, SheetAnimMeta>) {}

  start(names: readonly string[]) {
    this.segs = []
    for (const n of names) {
      const anim = `${this.row}/${n}`
      const meta = this.animations[anim]
      if (meta) this.segs.push({ anim, meta })
    }
    this.idx = 0
    this.t = 0
  }

  get active() {
    return this.segs.length > 0
  }

  tick(dt: number): ChainFrame | null {
    if (!this.segs.length) return null
    this.t += Math.max(0, dt)
    for (;;) {
      const seg = this.segs[this.idx]
      const dur = seg.meta.frames / seg.meta.fps
      const last = this.idx === this.segs.length - 1
      if (last) {
        if (seg.meta.loop && dur > 0) this.t %= dur
        break
      }
      if (this.t < dur) break
      this.t -= dur
      this.idx++
    }
    return this.current()
  }

  current(): ChainFrame | null {
    const seg = this.segs[this.idx]
    if (!seg) return null
    const frame = Math.min(seg.meta.frames - 1, Math.floor(this.t * seg.meta.fps))
    return { anim: seg.anim, frame }
  }
}

/** Where a chain ends up: used for prefers-reduced-motion, which jumps straight to the resting pose. */
export function restingFrame(row: LaunchRow, names: readonly string[]): ChainFrame | null {
  const last = names[names.length - 1]
  return last ? { anim: `${row}/${last}`, frame: 0 } : null
}

/** Index of `t` within a one-shot or looping fx animation; null once a one-shot has finished. */
export function fxFrameAt(meta: SheetAnimMeta, age: number, loop = meta.loop): number | null {
  if (age < 0) return 0
  const raw = Math.floor(age * meta.fps)
  if (loop) return raw % meta.frames
  return raw >= meta.frames ? null : raw
}

export function prefersReducedMotion(win: Pick<Window, 'matchMedia'> | undefined = typeof window === 'undefined' ? undefined : window): boolean {
  try {
    return !!win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * Pad smoke spawn times (seconds): staggered from ignition to a little after
 * liftoff while the stack clears the pad. Deterministic so it can be tested.
 */
export function padSmokeSpawnTimes(ignition: number, liftoff: number, clearTail = 1.2): number[] {
  const out: number[] = []
  for (let t = ignition; t < liftoff + clearTail; t += t < liftoff ? 0.22 : 0.4) out.push(Number(t.toFixed(3)))
  return out
}
