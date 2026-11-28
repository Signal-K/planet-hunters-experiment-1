'use client'

import { useEffect, useRef, useState } from 'react'

/** Takeon's seeded surface generator and lit, rotating body renderer. The host
 * supplies the server challenge clock and confirmed captures, never rewards. */
export default function TakeOnPocket({ kind, seed, start, hits, active, onReady, onError }: {
  kind: 'asteroid' | 'comet'; seed: number; start: number; hits: number; active: boolean
  onReady: () => void; onError: (message: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const latest = useRef({ start, hits, active, onReady, onError })
  latest.current = { start, hits, active, onReady, onError }
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) { latest.current.onError('This browser could not open the mining renderer.'); return }
    let cancelled = false, raf = 0
    let observer: ResizeObserver | undefined
    setReady(false)
    void import('@takeon/flight-engine').then(({ BodyRaster, bodyTexture, FLIGHT_LOOKS }) => {
      if (cancelled) return
      const gas = kind === 'comet'
      const look = { ...FLIGHT_LOOKS.asteroid, seed,
        ...(gas ? { colors: ['#293c4a', '#647d8c', '#b1cbd5', '#edf6fa'], atmosphere: '#8ecae6', craters: .5, lumpiness: .23 } : {}) }
      const texture = bodyTexture(look, 384, 192)
      const raster = new BodyRaster(texture, look, { radius: 200, light: [-.6, .5, .7] })
      const surface = document.createElement('canvas')
      surface.width = raster.width; surface.height = raster.height
      const surfaceCtx = surface.getContext('2d')!
      const frame = surfaceCtx.createImageData(raster.width, raster.height)
      const css = getComputedStyle(canvas)
      const accent = css.getPropertyValue('--ln-payout').trim() || '#d8ff55'
      const ink = css.getPropertyValue('--ln-board-ink').trim() || '#111c2c'
      const paper = css.getPropertyValue('--ln-board-paper').trim() || '#f4efe4'
      let width = 1, height = 1, dpr = 1, lastBody = 0, previousHits = latest.current.hits, flash = 0
      const resize = () => {
        width = Math.max(1, canvas.clientWidth); height = Math.max(1, canvas.clientHeight)
        dpr = Math.min(2, window.devicePixelRatio || 1)
        canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
      }
      observer = new ResizeObserver(resize); observer.observe(canvas); resize()
      // Stable sky and dust positions, independent of render frame rate.
      let randomState = seed | 0
      const random = () => { randomState = Math.imul(randomState, 1664525) + 1013904223 | 0; return (randomState >>> 0) / 4294967296 }
      const stars = Array.from({ length: 100 }, () => ({ x: random(), y: random(), size: random() * 1.4 + .3, alpha: random() * .6 + .15 }))
      const dust = Array.from({ length: 38 }, () => ({ x: random(), y: random(), size: random() * 3 + 1 }))
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const draw = (time: number) => {
        if (cancelled) return
        const state = latest.current
        if (state.hits > previousHits) flash = time
        previousHits = state.hits
        const phase = ((Date.now() - state.start) % 2000) / 2000
        const inPocket = state.active && phase >= .3 && phase <= .7
        const cx = width * .5, cy = height * .48
        const radius = Math.max(20, Math.min(width * .34, height * .37, 310))
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.fillStyle = ink; ctx.fillRect(0, 0, width, height)
        const sky = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * .7)
        sky.addColorStop(0, '#142b3b'); sky.addColorStop(1, '#030911')
        ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height)
        for (const star of stars) { ctx.globalAlpha = star.alpha; ctx.fillStyle = paper; ctx.beginPath(); ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2); ctx.fill() }
        ctx.globalAlpha = 1
        if (gas) {
          // A diffuse coma and streamed tail around Takeon's icy nucleus.
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.35)
          for (let i = 5; i >= 0; i--) {
            const plume = ctx.createRadialGradient(radius * .6, 0, 0, radius * .6, 0, radius * (2.8 + i * .08))
            plume.addColorStop(0, 'rgba(142,202,230,.10)'); plume.addColorStop(.5, 'rgba(142,202,230,.035)'); plume.addColorStop(1, 'rgba(142,202,230,0)')
            ctx.fillStyle = plume; ctx.beginPath(); ctx.ellipse(radius * 1.1, 0, radius * 3, radius * (.38 + i * .08), 0, 0, Math.PI * 2); ctx.fill()
          }
          ctx.restore()
        }
        if (time - lastBody > (reduced ? 1000 : 80)) {
          frame.data.set(raster.draw(reduced ? .6 : time / 70000)); surfaceCtx.putImageData(frame, 0, 0); lastBody = time
        }
        ctx.drawImage(surface, cx + raster.originX * radius / 200, cy + raster.originY * radius / 200, raster.width * radius / 200, raster.height * radius / 200)
        // Pockets sit on the generated surface, not in a separate UI track.
        for (let pocket = 0; pocket < 3; pocket++) {
          const px = cx + (pocket - 1) * radius * .3
          const py = cy + Math.sin(pocket * 2 + seed) * radius * .25
          const secured = state.hits > pocket
          const glow = ctx.createRadialGradient(px, py, 0, px, py, radius * .25)
          glow.addColorStop(0, secured ? 'rgba(216,255,85,.07)' : 'rgba(216,255,85,.6)'); glow.addColorStop(1, 'rgba(216,255,85,0)')
          ctx.fillStyle = glow; ctx.fillRect(px - radius * .25, py - radius * .25, radius * .5, radius * .5)
          ctx.strokeStyle = secured ? paper : accent; ctx.lineWidth = secured ? 2 : 3
          ctx.beginPath(); ctx.arc(px, py, radius * .08, 0, Math.PI * 2); ctx.stroke()
          if (secured) { ctx.beginPath(); ctx.moveTo(px - 5, py); ctx.lineTo(px, py + 5); ctx.lineTo(px + 8, py - 6); ctx.stroke() }
        }
        if (state.active) {
          const beamX = cx - radius + phase * radius * 2
          ctx.save(); ctx.strokeStyle = inPocket ? accent : paper; ctx.lineWidth = 2; ctx.globalAlpha = .85
          ctx.setLineDash([5, 7]); ctx.beginPath(); ctx.moveTo(beamX, cy - radius * 1.1); ctx.lineTo(beamX, cy + radius * 1.1); ctx.stroke(); ctx.setLineDash([])
          ctx.beginPath(); ctx.arc(beamX, cy, radius * .12, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
        }
        if (!reduced) for (const mote of dust) {
          const drift = (mote.x + time / (gas ? 45000 : 160000)) % 1
          ctx.globalAlpha = gas ? .2 : .12; ctx.fillStyle = gas ? paper : accent
          ctx.beginPath(); ctx.arc(drift * width, mote.y * height, mote.size, 0, Math.PI * 2); ctx.fill()
        }
        ctx.globalAlpha = 1
        const burst = time - flash
        if (flash && burst < 650) {
          ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.globalAlpha = 1 - burst / 650
          ctx.beginPath(); ctx.arc(cx, cy, radius * (.5 + burst / 500), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1
        }
        raf = requestAnimationFrame(draw)
      }
      draw(performance.now()); setReady(true); latest.current.onReady()
    }).catch(() => { if (!cancelled) latest.current.onError('The Takeon renderer could not load. Reopen the target to retry.') })
    return () => { cancelled = true; cancelAnimationFrame(raf); observer?.disconnect() }
  }, [kind, seed])
  return <canvas ref={canvasRef} data-testid="takeon-pocket" data-ready={ready} aria-hidden="true" style={{ width: '100%', height: '100%', display: 'block' }} />
}
