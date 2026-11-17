'use client'

import { useEffect, useRef } from 'react'
import { cameraOffset, PROBE_HALF_VIEW } from '@/lib/probes/field-probe'

export interface CameraFlash { id: string; bearing: number; distance: number; bornAt: number }

interface Props {
  /** Where the camera points, in degrees. The view eases to it. */
  aim: number
  flashes: readonly CameraFlash[]
  /** The sighting waiting to be confirmed: ringed until it is logged or the buffer closes. */
  held?: { bearing: number; distance: number } | null
  className?: string
}

const FLASH_MS = 1800
/** Earth and the Sun hang at fixed bearings, so turning the camera is something the player can see. */
const EARTH_BEARING = 40
const SUN_BEARING = 250

function seeded(seed0: number) {
  let seed = seed0
  return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
}

const STARS = (() => { const r = seeded(77); return Array.from({ length: 260 }, () => ({ az: r() * 360, el: r(), s: 0.5 + r() * 1.3, o: 0.35 + r() * 0.65 })) })()
const CRATERS = (() => { const r = seeded(4099); return Array.from({ length: 90 }, () => ({ az: r() * 360, d: 4.5 + r() ** 1.7 * 60, r: 0.2 + r() ** 2 * 1.0 })) })()
const ROCKS = (() => { const r = seeded(911); return Array.from({ length: 44 }, () => ({ az: r() * 360, d: 3.2 + r() ** 2 * 24, s: 0.04 + r() * 0.1, k: r() })) })()

/** Height of the far ridge above the horizon at a bearing, 0..1. Wraps cleanly at 360. */
function ridge(az: number): number {
  const a = az * Math.PI / 180
  return 0.5 + 0.22 * Math.sin(a * 3 + 1.3) + 0.16 * Math.sin(a * 7 + 0.4) + 0.08 * Math.sin(a * 17 + 2.1)
}

/**
 * SSL-853: the Moon as the field camera sees it. One perspective: black sky, Earth and the Sun at fixed bearings,
 * the ground running to the horizon. An impact is a flash and a fan of dust on the ground at its bearing and range.
 * Pure drawing: the screen owns the watch, this draws what the camera is pointed at.
 */
export default function MoonCameraView({ aim, flashes, held = null, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const state = useRef({ aim, shown: aim, flashes, held })
  state.current.aim = aim
  state.current.flashes = flashes
  state.current.held = held

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let frame = 0
    let last = performance.now()
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const s = state.current
      const gap = cameraOffset(s.aim, s.shown)
      s.shown = (s.shown + (still ? gap : gap * Math.min(1, dt * 7)) + 360) % 360

      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = canvas.clientWidth, h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr) }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const horizon = h * 0.46
      const perDeg = w / (PROBE_HALF_VIEW * 2)
      const x = (bearing: number) => w / 2 + cameraOffset(bearing, s.shown) * perDeg
      // Ground perspective: a point `d` km away sits this far below the horizon; `k` scales things at that range.
      const k = (d: number) => 1.6 / d
      const y = (d: number) => horizon + (h - horizon) * Math.min(1.4, k(d))
      const unit = (h - horizon) * 0.42

      ctx.fillStyle = '#04050a'
      ctx.fillRect(0, 0, w, horizon + 1)
      for (const star of STARS) {
        const sx = x(star.az)
        if (sx < -4 || sx > w + 4) continue
        ctx.globalAlpha = star.o
        ctx.fillStyle = '#f2f4ff'
        ctx.fillRect(sx, star.el * horizon * 0.94, star.s, star.s)
      }
      ctx.globalAlpha = 1

      const sunX = x(SUN_BEARING)
      if (sunX > -w * 0.4 && sunX < w * 1.4) {
        const glow = ctx.createRadialGradient(sunX, horizon * 0.5, 0, sunX, horizon * 0.5, h * 0.42)
        glow.addColorStop(0, 'rgba(255,250,235,1)')
        glow.addColorStop(0.06, 'rgba(255,244,214,0.9)')
        glow.addColorStop(0.3, 'rgba(255,236,190,0.12)')
        glow.addColorStop(1, 'rgba(255,236,190,0)')
        ctx.fillStyle = glow
        ctx.fillRect(0, 0, w, horizon)
      }

      const earthX = x(EARTH_BEARING)
      const er = Math.max(18, h * 0.07)
      if (earthX > -er * 2 && earthX < w + er * 2) {
        const ey = horizon * 0.42
        ctx.save()
        ctx.beginPath(); ctx.arc(earthX, ey, er, 0, Math.PI * 2); ctx.clip()
        ctx.fillStyle = '#2a63b8'; ctx.fillRect(earthX - er, ey - er, er * 2, er * 2)
        ctx.fillStyle = '#4f9a62'
        ctx.beginPath(); ctx.ellipse(earthX - er * 0.25, ey - er * 0.1, er * 0.42, er * 0.3, 0.5, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.ellipse(earthX + er * 0.4, ey + er * 0.42, er * 0.3, er * 0.2, -0.4, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.75)'
        ctx.beginPath(); ctx.ellipse(earthX + er * 0.1, ey - er * 0.55, er * 0.6, er * 0.12, 0.2, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.ellipse(earthX - er * 0.2, ey + er * 0.3, er * 0.5, er * 0.1, -0.2, 0, Math.PI * 2); ctx.fill()
        // The night side: Earth is lit from the Sun's side of the sky.
        const side = cameraOffset(SUN_BEARING, EARTH_BEARING) > 0 ? -1 : 1
        ctx.fillStyle = 'rgba(4,5,10,0.86)'
        ctx.beginPath(); ctx.arc(earthX + side * er * 0.75, ey, er * 1.15, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      }

      // Far ridge, then the plain.
      ctx.fillStyle = '#5d5f63'
      ctx.beginPath(); ctx.moveTo(0, horizon + 2)
      for (let px = 0; px <= w; px += 6) ctx.lineTo(px, horizon - ridge(s.shown + (px - w / 2) / perDeg) * h * 0.035)
      ctx.lineTo(w, horizon + 2); ctx.closePath(); ctx.fill()
      const ground = ctx.createLinearGradient(0, horizon, 0, h)
      ground.addColorStop(0, '#8d8f92'); ground.addColorStop(0.35, '#77797c'); ground.addColorStop(1, '#4e5053')
      ctx.fillStyle = ground
      ctx.fillRect(0, horizon, w, h - horizon)

      for (const c of CRATERS) {
        const cx = x(c.az), cy = y(c.d), rx = c.r * k(c.d) * unit * 2.2
        if (cx < -rx || cx > w + rx || cy > h + rx) continue
        const ry = Math.max(0.6, rx * 0.26)
        ctx.fillStyle = 'rgba(40,41,45,0.55)'
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = 'rgba(214,216,220,0.5)'; ctx.lineWidth = Math.max(0.6, ry * 0.18)
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke()
      }
      for (const rock of ROCKS) {
        const rx = x(rock.az), ry = y(rock.d), size = rock.s * k(rock.d) * unit * 3
        if (rx < -size || rx > w + size || ry > h + size) continue
        ctx.fillStyle = 'rgba(20,21,24,0.5)'
        ctx.beginPath(); ctx.ellipse(rx + size * 0.5, ry, size * 1.2, size * 0.22, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = rock.k > 0.5 ? '#a4a6aa' : '#8b8d91'
        ctx.beginPath(); ctx.moveTo(rx - size, ry); ctx.lineTo(rx - size * 0.5, ry - size * (0.7 + rock.k * 0.5)); ctx.lineTo(rx + size * 0.6, ry - size * 0.8); ctx.lineTo(rx + size, ry); ctx.closePath(); ctx.fill()
      }

      for (const flash of s.flashes) {
        const age = (Date.now() - flash.bornAt) / FLASH_MS
        const fx = x(flash.bearing), fy = y(flash.distance), size = Math.min(h * 0.028, Math.max(4, k(flash.distance) * unit * 0.7))
        if (fx < -size * 8 || fx > w + size * 8) continue
        if (age < 1) {
          const burst = Math.max(0, 1 - age * 3.2)
          if (burst > 0) {
            const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, size * 7)
            glow.addColorStop(0, `rgba(255,255,255,${burst})`); glow.addColorStop(0.2, `rgba(255,236,190,${burst * 0.8})`); glow.addColorStop(1, 'rgba(255,236,190,0)')
            ctx.fillStyle = glow; ctx.fillRect(fx - size * 7, fy - size * 7, size * 14, size * 14)
          }
          // Dust leaves on straight ballistic arcs: no air to slow it or carry it sideways.
          const r = seeded(Math.round(flash.bearing * 131 + flash.distance * 977) + 5)
          ctx.fillStyle = `rgba(226,228,232,${0.85 * (1 - age)})`
          for (let i = 0; i < 26; i++) {
            const dir = (r() - 0.5) * 2.2, speed = 0.6 + r() * 1.2, grain = Math.max(1, size * 0.16 * (0.5 + r()))
            const px = fx + Math.sin(dir) * speed * age * size * 5
            const py = fy - (Math.cos(dir) * speed * age - 1.25 * age * age) * size * 5
            if (py < fy + 1) ctx.fillRect(px, py, grain, grain)
          }
        }
        // The fresh crater stays for the rest of the watch.
        ctx.fillStyle = 'rgba(236,238,242,0.9)'
        ctx.beginPath(); ctx.ellipse(fx, fy, size * 0.9, Math.max(1, size * 0.26), 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(40,41,45,0.8)'
        ctx.beginPath(); ctx.ellipse(fx, fy, size * 0.45, Math.max(0.6, size * 0.13), 0, 0, Math.PI * 2); ctx.fill()
      }

      if (s.held) {
        const hx = x(s.held.bearing), hy = y(s.held.distance), size = Math.min(h * 0.06, Math.max(16, k(s.held.distance) * unit * 1.6))
        const pulse = still ? 0 : (now % 900) / 900
        ctx.strokeStyle = '#70d9ea'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.ellipse(hx, hy, size * (1 + pulse * 0.25), size * 0.5 * (1 + pulse * 0.25), 0, 0, Math.PI * 2); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(hx, hy - size * 0.9); ctx.lineTo(hx, hy - size * 1.6); ctx.stroke()
      }

      // Bearing tape along the top of the frame: what the pan buttons move.
      ctx.strokeStyle = 'rgba(112,217,234,0.8)'; ctx.fillStyle = '#70d9ea'; ctx.lineWidth = 1
      ctx.font = '700 14px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      const tapeY = horizon - h * 0.035 - 34
      const first = Math.ceil((s.shown - PROBE_HALF_VIEW) / 10) * 10
      for (let deg = first; deg <= s.shown + PROBE_HALF_VIEW; deg += 10) {
        const tx = w / 2 + (deg - s.shown) * perDeg, major = ((deg % 30) + 30) % 30 === 0
        ctx.beginPath(); ctx.moveTo(tx, tapeY + (major ? 0 : 6)); ctx.lineTo(tx, tapeY + 12); ctx.stroke()
        if (major) ctx.fillText(`${((deg % 360) + 360) % 360}°`, tx, tapeY - 18)
      }

      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [])

  return <canvas ref={ref} className={className} aria-hidden="true" data-testid="moon-camera-view" />
}
