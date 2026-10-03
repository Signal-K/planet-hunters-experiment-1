import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ChainPlayer,
  HOOK_MARKS,
  LAUNCH_ROWS,
  buildHookSchedule,
  fxFrameAt,
  padSmokeSpawnTimes,
  prefersReducedMotion,
  restingFrame,
  type LaunchSheetMeta,
} from './launchSpriteAnim'
import { LAUNCH_TIMELINE } from './launchTimeline'

const dir = path.join(__dirname, '../../public/game/assets/rockets/launch')
const sheet = (name: string) => JSON.parse(readFileSync(path.join(dir, name), 'utf8'))

describe.each(['explorer', 'prospector'] as const)('%s launch sheet (SSL-455)', variant => {
  const json = sheet(`${variant}-launch-sheet.json`)
  const meta: LaunchSheetMeta = json.landnam

  it('sheet hook times match LAUNCH_TIMELINE', () => {
    for (const hook of meta.hooks) {
      expect(LAUNCH_TIMELINE[HOOK_MARKS[hook.name]], hook.name).toBe(hook.t)
    }
  })

  it('every animation named by a hook exists and has frames in the pixi animations map', () => {
    for (const hook of buildHookSchedule(meta, LAUNCH_TIMELINE)) {
      for (const [row, names] of Object.entries(hook.play)) {
        for (const n of names!) {
          const key = `${row}/${n}`
          expect(meta.animations[key], key).toBeDefined()
          expect(json.animations[key]?.length, key).toBe(meta.animations[key].frames)
          for (const frame of json.animations[key]) expect(json.frames[frame].anchor, frame).toBeDefined()
        }
      }
    }
  })

  it('draws upper < lower < boosters and attaches the upper stage at author y -148', () => {
    expect(meta.rows['upper-stage'].zIndex).toBeLessThan(meta.rows['lower-stage'].zIndex)
    expect(meta.rows['lower-stage'].zIndex).toBeLessThan(meta.rows['booster-l'].zIndex)
    expect(meta.rows['upper-stage'].attachAuthor).toEqual({ x: 0, y: -148 })
    expect(LAUNCH_ROWS[0]).toBe('upper-stage')
  })

  it('schedules ignition, liftoff, booster and stage separation in order', () => {
    expect(buildHookSchedule(meta, LAUNCH_TIMELINE).map(h => h.t)).toEqual([2.6, 3.5, 6.4, 8.2])
  })
})

describe('ChainPlayer', () => {
  const anims = {
    'booster-l/ignition': { frames: 8, fps: 24, loop: false, durationSec: 8 / 24 },
    'booster-l/burn': { frames: 8, fps: 24, loop: true, durationSec: 8 / 24 },
    'booster-l/separate': { frames: 12, fps: 24, loop: false, durationSec: 0.5 },
    'booster-l/idle': { frames: 1, fps: 24, loop: false, durationSec: 1 / 24 },
  }

  it('plays ignition then loops burn', () => {
    const p = new ChainPlayer('booster-l', anims)
    p.start(['ignition', 'burn'])
    expect(p.tick(0)).toEqual({ anim: 'booster-l/ignition', frame: 0 })
    expect(p.tick(0.25)).toEqual({ anim: 'booster-l/ignition', frame: 6 })
    expect(p.tick(0.1)).toMatchObject({ anim: 'booster-l/burn' })
    const seen = new Set<number>()
    for (let i = 0; i < 60; i++) seen.add(p.tick(1 / 60)!.frame)
    expect(p.current()!.anim).toBe('booster-l/burn')
    expect(seen.size).toBe(8)
  })

  it('separate then idle holds the idle pose forever', () => {
    const p = new ChainPlayer('booster-l', anims)
    p.start(['separate', 'idle'])
    p.tick(0.49)
    expect(p.current()).toEqual({ anim: 'booster-l/separate', frame: 11 })
    expect(p.tick(5)).toEqual({ anim: 'booster-l/idle', frame: 0 })
  })

  it('ignores unknown animation names', () => {
    const p = new ChainPlayer('booster-l', anims)
    p.start(['nope'])
    expect(p.active).toBe(false)
    expect(p.tick(1)).toBeNull()
  })
})

describe('reduced motion (SSL-455)', () => {
  it('jumps to the last animation of each chain', () => {
    expect(restingFrame('booster-l', ['separate', 'idle'])).toEqual({ anim: 'booster-l/idle', frame: 0 })
    expect(restingFrame('upper-stage', ['separate', 'relight', 'burn'])).toEqual({ anim: 'upper-stage/burn', frame: 0 })
    expect(restingFrame('lower-stage', ['separate', 'coast'])).toEqual({ anim: 'lower-stage/coast', frame: 0 })
  })

  it('reads the media query and tolerates a missing matchMedia', () => {
    const win = (matches: boolean) => ({ matchMedia: () => ({ matches }) }) as unknown as Window
    expect(prefersReducedMotion(win(true))).toBe(true)
    expect(prefersReducedMotion(win(false))).toBe(false)
    expect(prefersReducedMotion({} as Window)).toBe(false)
  })
})

describe('fx (SSL-456)', () => {
  const fx = sheet('fx-sheet.json').landnam
  it('declares the five fx animations the hooks name', () => {
    for (const a of ['fx/pad-smoke', 'fx/sep-puff', 'fx/stage-sep-flash', 'fx/debris', 'fx/clamp-tumble']) {
      expect(fx.animations[a], a).toBeDefined()
    }
  })

  it('one-shots end and loops wrap', () => {
    const puff = fx.animations['fx/sep-puff']
    expect(fxFrameAt(puff, 0)).toBe(0)
    expect(fxFrameAt(puff, 0.49)).toBe(11)
    expect(fxFrameAt(puff, 0.51)).toBeNull()
    expect(fxFrameAt(fx.animations['fx/clamp-tumble'], 3)).toBe(Math.floor(3 * 24) % 12)
  })

  it('pad smoke runs from ignition through the liftoff clear and stops', () => {
    const t = padSmokeSpawnTimes(LAUNCH_TIMELINE.ignitionStart, LAUNCH_TIMELINE.liftoff)
    expect(t[0]).toBe(LAUNCH_TIMELINE.ignitionStart)
    expect(t.length).toBeGreaterThanOrEqual(4)
    expect(Math.max(...t)).toBeLessThan(LAUNCH_TIMELINE.liftoff + 1.2)
  })
})
