/**
 * Pure layout + camera math for the launch cinematic (SSL-295).
 *
 * The previous camera pinned the vehicle near the top of the frame and then
 * translated the whole pad downward, which is why the rocket appeared to
 * "hit the top" while the launchpad was shoved off-screen. This camera lets
 * the stack fly UP on a visible Earth pad first; only later does the world
 * recede, and even then the vehicle keeps climbing in screen space.
 */
import { LAUNCH_TIMELINE } from './launchTimeline'

export interface LaunchPadLayout {
  isLandscape: boolean
  groundTop: number
  groundHeight: number
  padDeckY: number
  rocketScale: number
  rocketHeight: number
  rocketPadY: number
  followStart: number
  towerLeftX: number
  towerRightX: number
  towerHeight: number
}

/** Authored stack height in local pixels (engine exit at y=0, nose at -H). */
const LAUNCH_ROCKET_AUTHOR_HEIGHT = 248

const ACCEL_DUR = 3.2
const VMAX = 220

export function launchPadLayout(W: number, H: number): LaunchPadLayout {
  const isLandscape = W > H
  // Landscape needs a deep ground band so the Earth pad is actually on screen
  // instead of a hairline under a stack that already fills the viewport.
  const groundHeight = isLandscape
    ? Math.max(Math.round(H * 0.32), 140)
    : Math.max(Math.round(H * 0.18), 96)
  const groundTop = H - groundHeight
  const padDeckY = groundTop + Math.round(groundHeight * 0.18)
  const rocketHeight = Math.min(
    isLandscape ? H * 0.40 : H * 0.30,
    210,
  )
  const rocketScale = rocketHeight / LAUNCH_ROCKET_AUTHOR_HEIGHT
  const rocketPadY = padDeckY
  const followStart = H * (isLandscape ? 0.30 : 0.44)
  const towerInset = isLandscape ? W * 0.22 : W * 0.16
  return {
    isLandscape,
    groundTop,
    groundHeight,
    padDeckY,
    rocketScale,
    rocketHeight,
    rocketPadY,
    followStart,
    towerLeftX: towerInset,
    towerRightX: W - towerInset,
    towerHeight: Math.min(rocketHeight * 1.15, padDeckY - 16),
  }
}

/** World-space altitude in pixels after liftoff. 0 while still on the pad. */
export function launchAltitude(elapsed: number): number {
  if (elapsed < LAUNCH_TIMELINE.liftoff) return 0
  const t = elapsed - LAUNCH_TIMELINE.liftoff
  if (t <= ACCEL_DUR) {
    return VMAX * Math.pow(t / ACCEL_DUR, 2) * t / 3
  }
  const altAtVmax = VMAX * ACCEL_DUR / 3
  return altAtVmax + VMAX * (t - ACCEL_DUR)
}

/**
 * Camera offset in world pixels. Stays 0 until the rocket has flown a
 * meaningful fraction of the viewport, then tracks at 55% of extra altitude
 * so the vehicle keeps climbing on screen instead of locking to a pin.
 */
export function launchCameraY(altitude: number, followStart: number): number {
  return Math.max(0, (altitude - followStart) * 0.55)
}

export function launchRocketScreenY(altitude: number, cameraY: number, rocketPadY: number): number {
  return rocketPadY - altitude + cameraY
}

export function launchPadOffsetY(cameraY: number): number {
  // Positive Y is down in Pixi. The pad must recede toward the BOTTOM as the
  // vehicle climbs, otherwise the Earth scene is shoved up and the rocket
  // appears to fall into a pit (SSL-295).
  return cameraY
}

export interface LaunchAscentFrame {
  altitude: number
  cameraY: number
  rocketScreenY: number
  padOffsetY: number
  padVisible: boolean
}

export function launchAscentFrame(elapsed: number, W: number, H: number): LaunchAscentFrame {
  const layout = launchPadLayout(W, H)
  const altitude = launchAltitude(elapsed)
  const cameraY = launchCameraY(altitude, layout.followStart)
  const rocketScreenY = launchRocketScreenY(altitude, cameraY, layout.rocketPadY)
  const padOffsetY = launchPadOffsetY(cameraY)
  const padDeckOnScreen = layout.padDeckY + padOffsetY
  return {
    altitude,
    cameraY,
    rocketScreenY,
    padOffsetY,
    padVisible: padDeckOnScreen < H && padDeckOnScreen > H * 0.08,
  }
}

export function lerpColor(a: number, b: number, t: number): number {
  const u = Math.max(0, Math.min(1, t))
  const ar = (a >> 16) & 0xff
  const ag = (a >> 8) & 0xff
  const ab = a & 0xff
  const br = (b >> 16) & 0xff
  const bg = (b >> 8) & 0xff
  const bb = b & 0xff
  const r = Math.round(ar + (br - ar) * u)
  const g = Math.round(ag + (bg - ag) * u)
  const bl = Math.round(ab + (bb - ab) * u)
  return (r << 16) | (g << 8) | bl
}
