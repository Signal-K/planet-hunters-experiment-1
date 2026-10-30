/**
 * Base camera math (SSL-503). The base is authored to fit the viewport at zoom 1 (the whole-base view);
 * zooming in magnifies it and the camera pans over the larger world. Offsets are screen pixels applied
 * as `translate(x, y) scale(zoom)` with origin top-left, so the world is never smaller than the view.
 */
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 2.6
/** How far past the hard edge a drag may stretch before it springs back, as a fraction of the viewport. */
export const SOFT_EDGE = 0.08

export interface BaseCameraState {
  x: number
  y: number
  zoom: number
}

export interface Viewport {
  w: number
  h: number
  /** Unzoomed world width in px when the base strip is wider than the view (SSL-423 site map). */
  worldW?: number
}

export const BASE_CAMERA_HOME: BaseCameraState = { x: 0, y: 0, zoom: 1 }

/** Smallest useful scale for the authored strip on this viewport. */
export function fitZoom(view: Viewport): number {
  const worldW = Math.max(view.worldW ?? view.w, view.w)
  return clampZoom(Math.min(1, view.w / worldW))
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

/** Hard pan limits for a zoom: the offset range that keeps the world covering the viewport. */
export function panLimits(zoom: number, view: Viewport): { minX: number; maxX: number; minY: number; maxY: number } {
  const worldW = Math.max(view.worldW ?? view.w, view.w)
  return { minX: Math.min(0, view.w - worldW * zoom), maxX: 0, minY: Math.min(0, view.h * (1 - zoom)), maxY: 0 }
}

function clampAxis(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/** Hard clamp: the resting position the camera settles to. */
export function clampCamera(cam: BaseCameraState, view: Viewport): BaseCameraState {
  const zoom = clampZoom(cam.zoom)
  const l = panLimits(zoom, view)
  return { zoom, x: clampAxis(cam.x, l.minX, l.maxX), y: clampAxis(cam.y, l.minY, l.maxY) }
}

/** Soft clamp while dragging: past the edge the overshoot is damped, so the edge feels elastic. */
export function softClampCamera(cam: BaseCameraState, view: Viewport): BaseCameraState {
  const zoom = clampZoom(cam.zoom)
  const l = panLimits(zoom, view)
  const soft = (v: number, min: number, max: number, span: number) => {
    const room = span * SOFT_EDGE
    if (v > max) return max + room * (1 - Math.exp(-(v - max) / room))
    if (v < min) return min - room * (1 - Math.exp(-(min - v) / room))
    return v
  }
  return { zoom, x: soft(cam.x, l.minX, l.maxX, view.w), y: soft(cam.y, l.minY, l.maxY, view.h) }
}

/** Zoom about a screen point so the world point under it stays put. */
export function zoomAt(cam: BaseCameraState, nextZoom: number, point: { x: number; y: number }, view: Viewport): BaseCameraState {
  const zoom = clampZoom(nextZoom)
  const k = zoom / cam.zoom
  return clampCamera({ zoom, x: point.x - (point.x - cam.x) * k, y: point.y - (point.y - cam.y) * k }, view)
}

/** Position after releasing a drag with a velocity (px per ms), and whether it is still moving. */
export function inertiaStep(
  cam: BaseCameraState,
  vel: { x: number; y: number },
  dtMs: number,
  view: Viewport,
): { cam: BaseCameraState; vel: { x: number; y: number }; moving: boolean } {
  const decay = Math.exp(-dtMs / 325)
  const next = { x: vel.x * decay, y: vel.y * decay }
  const moved = clampCamera({ ...cam, x: cam.x + vel.x * dtMs, y: cam.y + vel.y * dtMs }, view)
  const hitX = moved.x !== cam.x + vel.x * dtMs
  const hitY = moved.y !== cam.y + vel.y * dtMs
  const v = { x: hitX ? 0 : next.x, y: hitY ? 0 : next.y }
  return { cam: moved, vel: v, moving: Math.hypot(v.x, v.y) > 0.02 }
}

/** Camera that centres a world point (in unzoomed viewport pixels) at a given zoom, for tap-to-focus. */
export function focusOn(point: { x: number; y: number }, zoom: number, view: Viewport): BaseCameraState {
  const z = clampZoom(zoom)
  return clampCamera({ zoom: z, x: view.w / 2 - point.x * z, y: view.h / 2 - point.y * z }, view)
}
