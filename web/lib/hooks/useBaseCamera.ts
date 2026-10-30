'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BASE_CAMERA_HOME,
  fitZoom,
  clampCamera,
  inertiaStep,
  panLimits,
  softClampCamera,
  zoomAt,
  type BaseCameraState,
  type Viewport,
} from '@/lib/scene/base-camera'

/** Pixels a pointer must travel before a press becomes a pan, so taps on structures still open them. */
const DRAG_THRESHOLD = 6

/**
 * Pan (drag/swipe with inertia and soft edges) and zoom (pinch, wheel) for the base scene (SSL-503).
 * Attach `ref` to the viewport element and apply `transform` to the world element inside it.
 */
export function useBaseCamera({ worldWidth, homeX }: { worldWidth?: number; homeX?: number } = {}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [cam, setCam] = useState<BaseCameraState>(BASE_CAMERA_HOME)
  const camRef = useRef(cam)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ moved: boolean; pinch: number; last: { x: number; y: number; t: number }; vel: { x: number; y: number } } | null>(null)
  const raf = useRef(0)
  const suppressClick = useRef(false)

  const commit = useCallback((next: BaseCameraState) => {
    camRef.current = next
    setCam(next)
  }, [])

  const worldRef = useRef(worldWidth)
  worldRef.current = worldWidth
  const view = useCallback((): Viewport => {
    const r = ref.current?.getBoundingClientRect()
    return { w: r?.width ?? 1, h: r?.height ?? 1, worldW: worldRef.current }
  }, [])

  // Home: centre the strip on `homeX` (unzoomed world px) when the world or the home point changes.
  useEffect(() => {
    if (homeX == null || !ref.current) return
    const v = view()
    commit(clampCamera({ zoom: 1, x: v.w / 2 - homeX, y: 0 }, v))
  }, [commit, homeX, view, worldWidth])

  const stop = useCallback(() => { cancelAnimationFrame(raf.current) }, [])

  const settle = useCallback((vel: { x: number; y: number }) => {
    stop()
    let v = vel
    let prev = performance.now()
    const tick = (now: number) => {
      const step = inertiaStep(camRef.current, v, Math.min(now - prev, 48), view())
      prev = now
      v = step.vel
      commit(step.cam)
      if (step.moving) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }, [commit, stop, view])

  const point = (e: { clientX: number; clientY: number }) => {
    const r = ref.current?.getBoundingClientRect()
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    stop()
    pointers.current.set(e.pointerId, point(e))
    const p = point(e)
    gesture.current = { moved: false, pinch: 0, last: { ...p, t: performance.now() }, vel: { x: 0, y: 0 } }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current
    if (!g || !pointers.current.has(e.pointerId)) return
    const p = point(e)
    const prevPoint = pointers.current.get(e.pointerId)!
    pointers.current.set(e.pointerId, p)
    const pts = [...pointers.current.values()]
    if (pts.length >= 2) {
      const [a, b] = pts
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      if (g.pinch > 0 && dist > 0) {
        commit(zoomAt(camRef.current, camRef.current.zoom * (dist / g.pinch), mid, view()))
      }
      g.pinch = dist
      g.moved = true
      return
    }
    if (!g.moved) {
      if (Math.hypot(p.x - g.last.x, p.y - g.last.y) < DRAG_THRESHOLD) return
      g.moved = true
      try { ref.current?.setPointerCapture(e.pointerId) } catch { /* pointer already gone */ }
    }
    const now = performance.now()
    const dt = Math.max(now - g.last.t, 1)
    const dx = p.x - prevPoint.x
    const dy = p.y - prevPoint.y
    g.vel = { x: g.vel.x * 0.6 + (dx / dt) * 0.4, y: g.vel.y * 0.6 + (dy / dt) * 0.4 }
    g.last = { ...g.last, t: now }
    const c = camRef.current
    commit(softClampCamera({ ...c, x: c.x + dx, y: c.y + dy }, view()))
  }

  const end = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    if (!g) return
    if (pointers.current.size > 0) { g.pinch = 0; return }
    gesture.current = null
    if (g.moved) {
      suppressClick.current = true
      setTimeout(() => { suppressClick.current = false }, 0)
      const c = camRef.current
      const clamped = clampCamera(c, view())
      const outside = clamped.x !== c.x || clamped.y !== c.y
      const speed = Math.hypot(g.vel.x, g.vel.y)
      if (outside) commit(clamped)
      else if (speed > 0.05) settle(g.vel)
    }
  }

  const onClickCapture = (e: React.MouseEvent) => {
    if (suppressClick.current) { e.stopPropagation(); e.preventDefault() }
  }

  const overview = useCallback(() => {
    const v = view()
    commit({ zoom: fitZoom(v), x: 0, y: 0 })
  }, [commit, view])

  const setPosition = useCallback((position: number) => {
    const v = view()
    const l = panLimits(camRef.current.zoom, v)
    commit({ ...camRef.current, x: l.maxX + (l.minX - l.maxX) * Math.max(0, Math.min(1, position)), y: 0 })
  }, [commit, view])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      stop()
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))
      commit(zoomAt(camRef.current, camRef.current.zoom * factor, point(e), view()))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => { el.removeEventListener('wheel', onWheel); stop() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit, stop, view])

  const transform = cam.zoom < 1
    ? `translate(${cam.x}px, ${cam.y}px) scaleX(${cam.zoom})`
    : `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`
  return {
    ref,
    cam,
    transform,
    overview,
    setPosition,
    handlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end, onClickCapture },
  }
}
