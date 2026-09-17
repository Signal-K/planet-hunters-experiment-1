import { describe, expect, it } from 'vitest'
import {
  launchAltitude,
  launchAscentFrame,
  launchCameraY,
  launchPadLayout,
  launchRocketScreenY,
} from './launchCamera'
import { LAUNCH_TIMELINE, launchFrameDt } from './launchTimeline'

describe('launch pad layout', () => {
  it('gives landscape viewports a deep Earth pad instead of a hairline ground strip', () => {
    const layout = launchPadLayout(1280, 720)
    expect(layout.isLandscape).toBe(true)
    expect(layout.groundHeight / 720).toBeGreaterThanOrEqual(0.30)
    expect(layout.rocketHeight / 720).toBeLessThan(0.5)
    expect(layout.padDeckY).toBeGreaterThan(720 * 0.5)
  })

  it('keeps the portrait stack from filling the whole sky', () => {
    const layout = launchPadLayout(390, 780)
    expect(layout.isLandscape).toBe(false)
    expect(layout.rocketHeight / 780).toBeLessThan(0.35)
    expect(layout.groundHeight).toBeGreaterThanOrEqual(96)
  })
})

describe('launch ascent camera', () => {
  it('stays on the pad through countdown and early climb so the rocket flies up', () => {
    const landscape = { W: 1280, H: 720 }
    const onPad = launchAscentFrame(LAUNCH_TIMELINE.liftoff - 0.2, landscape.W, landscape.H)
    expect(onPad.altitude).toBe(0)
    expect(onPad.cameraY).toBe(0)
    expect(onPad.padVisible).toBe(true)

    const early = launchAscentFrame(LAUNCH_TIMELINE.liftoff + 0.6, landscape.W, landscape.H)
    expect(early.cameraY).toBe(0)
    expect(early.rocketScreenY).toBeLessThan(onPad.rocketScreenY)
    expect(early.padVisible).toBe(true)
  })

  it('does not pin the vehicle after follow starts — extra altitude still raises it', () => {
    const layout = launchPadLayout(1280, 720)
    const a1 = layout.followStart + 80
    const a2 = layout.followStart + 200
    const cam1 = launchCameraY(a1, layout.followStart)
    const cam2 = launchCameraY(a2, layout.followStart)
    const y1 = launchRocketScreenY(a1, cam1, layout.rocketPadY)
    const y2 = launchRocketScreenY(a2, cam2, layout.rocketPadY)
    expect(y2).toBeLessThan(y1)
    expect(cam2).toBeGreaterThan(cam1)
  })

  it('scrolls the Earth pad down the frame as the camera follows, not up', () => {
    const later = launchAscentFrame(LAUNCH_TIMELINE.stageSep, 1280, 720)
    const early = launchAscentFrame(LAUNCH_TIMELINE.liftoff + 0.4, 1280, 720)
    expect(later.padOffsetY).toBeGreaterThanOrEqual(early.padOffsetY)
    expect(later.rocketScreenY).toBeLessThan(early.rocketScreenY)
  })

  it('still shows the Earth pad at booster separation on a landscape screen', () => {
    const frame = launchAscentFrame(LAUNCH_TIMELINE.boosterSep, 1280, 720)
    expect(frame.padVisible).toBe(true)
    expect(frame.rocketScreenY).toBeLessThan(launchPadLayout(1280, 720).rocketPadY)
  })

  it('is at zero altitude before liftoff', () => {
    expect(launchAltitude(LAUNCH_TIMELINE.ignitionStart)).toBe(0)
    expect(launchAltitude(LAUNCH_TIMELINE.liftoff)).toBe(0)
    expect(launchAltitude(LAUNCH_TIMELINE.liftoff + 1)).toBeGreaterThan(0)
  })
})

describe('launch frame dt', () => {
  it('converts milliseconds to seconds at 60 Hz without skipping the cinematic', () => {
    expect(launchFrameDt(16.67)).toBeCloseTo(0.01667, 4)
    expect(launchFrameDt(5000)).toBe(0.05)
    expect(launchFrameDt(0)).toBe(0)
    expect(launchFrameDt(Number.NaN)).toBe(0)
  })
})
