// Minimal's laser mining (SSL-865): a top-down pass made for an upright phone.
// The ground flows down the screen under the ship, so the tall side of the
// phone is look-ahead. You must scan before you can mine: SCAN sends a pulse
// that reveals what the deposits ahead are, and FIRE only cuts a deposit that
// has been scanned. The laser hits a reticle just ahead of the ship at once, so
// there is nothing to lead. Drag anywhere to steer (arrow keys on a keyboard,
// Space fires, S scans).
//
// Ore, colours and laser levels are Landnam's (MINERAL_META, laserAccess), the
// order is the mission's own `requires.minerals`, and the ground is the body's
// terrain look, so this plays the same mission Landnam would, laid out for
// Minimal.
import { useEffect, useRef, useState } from 'react'
import { MINERAL_META } from '@landnam/lib/data/minerals'
import { terrainLookForTarget } from '@landnam/lib/takeon/terrainColour'
import MineralChip from '@landnam/components/game/MineralChip'
import type { Mission, Target } from '@landnam/lib/data/types'

/** The starting laser cuts minerals up to this laserAccess (Landnam level 1). */
const LASER_LEVEL = 1
/** Ground speed as a share of the screen height per second: ~4 s of look-ahead. */
const SPEED_SHARE = 0.17
/** Ship height and reticle reach, as shares of the screen height. */
const SHIP_AT = 0.7
const REACH_SHARE = 0.17
const FIRE_COOLDOWN = 0.4
const SCAN_COOLDOWN = 1.6
/** How far ahead a scan pulse reaches, as a share of the screen height. */
const SCAN_RANGE = 0.55
/** A free-mining run with no order fills a hold of this many deposits. */
const OPEN_HOLD = 6
/** Share of deposits that are a mineral the order still needs. */
const WANTED_SHARE = 0.5
/** Dev only (`&dev=1`): P pauses the field so a run can be checked by hand. */
const DEV = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('dev')

interface Ore {
  x: number
  y: number
  r: number
  mineral: string
  scanned: boolean
  cut: boolean
}

interface Pop { x: number; y: number; text: string; life: number }

export function MineScene({ mission, target, header, onComplete }: {
  mission: Mission
  target: Target
  /** Minimal's own top row (LEAVE, step dots, place). */
  header: React.ReactNode
  onComplete: (haul: Record<string, number>) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const order = mission.requires.minerals ?? {}
  const openRun = Object.keys(order).length === 0
  const [haul, setHaul] = useState<Record<string, number>>({})
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState({ fire: false, scan: true, unscannedAhead: false })
  const api = useRef<{ fire(): void; scan(): void; steer(x: number): void; nudge(dir: number): void; pause(): void } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const look = terrainLookForTarget(target as Parameters<typeof terrainLookForTarget>[0])
    const ground = look.ground[0]
    const pebble = look.ground[1]
    const crater = look.rock[2]

    // Minerals this body can show: order first, then the body's own.
    const bodyMinerals = (target.minerals ?? []).filter(id => MINERAL_META[id])
    const pool = bodyMinerals.length > 0 ? bodyMinerals : Object.keys(order)
    const got: Record<string, number> = {}
    const need = (id: string) => (order[id] ?? 0) - (got[id] ?? 0)
    const isDone = () => (openRun ? Object.values(got).reduce((a, b) => a + b, 0) >= OPEN_HOLD : Object.keys(order).every(id => need(id) <= 0))
    const pickMineral = () => {
      const wanted = Object.keys(order).filter(id => need(id) > 0)
      if (wanted.length > 0 && Math.random() < WANTED_SHARE) return wanted[Math.floor(Math.random() * wanted.length)]
      return pool[Math.floor(Math.random() * pool.length)] ?? 'iron'
    }

    let W = 0, H = 0
    // A phone-width lane even on a wide screen, so landscape plays the same run.
    const lane = () => { const w = Math.min(W, Math.max(360, H * 0.75)); return { left: (W - w) / 2, w } }
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const before = W > 0 ? { ...lane(), H } : null
      W = canvas.clientWidth; H = canvas.clientHeight
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // Turning the phone mid-run keeps every deposit where it was in the lane.
      if (before && typeof s !== 'undefined') {
        const after = lane()
        const mx = (x: number) => after.left + (x - before.left) * (after.w / before.w)
        const my = (y: number) => y * (H / before.H)
        for (const o of s.ores) { o.x = mx(o.x); o.y = my(o.y); o.r = radius() }
        s.x = mx(s.x); s.tx = mx(s.tx); s.nextY = my(s.nextY)
        for (const r of s.rocks) { r.x = Math.random() * W; r.y = Math.random() * H }
      }
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(canvas)
    const s = {
      x: W / 2, tx: W / 2, tilt: 0, time: 0,
      fireCd: 0, scanCd: 0, beam: 0, flash: 0,
      pulse: -1, // scan ring radius while it expands, -1 when idle
      ores: [] as Ore[], rocks: [] as { x: number; y: number; r: number }[], pops: [] as Pop[],
      nextY: 0, hint: '', paused: false,
    }
    const shipY = () => H * SHIP_AT
    const reticle = () => ({ x: s.x, y: shipY() - H * REACH_SHARE })
    for (let i = 0; i < 46; i++) s.rocks.push({ x: Math.random() * W, y: Math.random() * H, r: 2 + Math.random() * 6 })
    const radius = () => Math.max(22, Math.min(32, lane().w * 0.07))
    // The opening: three wanted deposits straight ahead, so the first scan finds work.
    const first = Object.keys(order)[0] ?? pool[0] ?? 'iron'
    for (let i = 0; i < 3; i++) {
      const { left, w } = lane()
      s.ores.push({ x: left + w * [0.32, 0.68, 0.45][i], y: reticle().y - H * 0.16 - i * H * 0.2, r: radius(), mineral: first, scanned: false, cut: false })
    }
    s.nextY = s.ores[s.ores.length - 1].y - H * 0.18
    const spawn = () => {
      while (s.nextY > -60) {
        const { left, w } = lane()
        const r = radius()
        s.ores.push({ x: left + r + 12 + Math.random() * (w - 2 * r - 24), y: s.nextY, r, mineral: pickMineral(), scanned: false, cut: false })
        s.nextY -= H * (0.15 + Math.random() * 0.09)
      }
    }
    const cuttable = (o: Ore) => (MINERAL_META[o.mineral]?.laserAccess ?? 1) <= LASER_LEVEL
    const underReticle = () => {
      const r = reticle()
      // A reticle (radius 14) touching the seam's rim counts as on it.
      return s.ores.find(o => !o.cut && Math.hypot(o.x - r.x, o.y - r.y) < o.r + 16)
    }
    const pop = (x: number, y: number, text: string) => s.pops.push({ x, y, text, life: 1 })

    api.current = {
      pause() { s.paused = !s.paused },
      steer(x) { const { left, w } = lane(); s.tx = Math.max(left + 28, Math.min(left + w - 28, x)) },
      nudge(dir) { const { left, w } = lane(); s.tx = Math.max(left + 28, Math.min(left + w - 28, s.x + dir * w * 0.12)) },
      scan() {
        if (s.scanCd > 0) return
        s.scanCd = SCAN_COOLDOWN
        s.pulse = 0
      },
      fire() {
        if (s.fireCd > 0) return
        s.fireCd = FIRE_COOLDOWN
        s.beam = 0.12
        const o = underReticle()
        if (!o) return
        if (!o.scanned) { s.hint = 'SCAN FIRST'; pop(o.x, o.y - o.r - 20, 'Scan it first'); return }
        if (!cuttable(o)) { pop(o.x, o.y - o.r - 20, 'Needs laser level 2'); return }
        o.cut = true
        s.flash = 0.14
        got[o.mineral] = (got[o.mineral] ?? 0) + 1
        pop(o.x, o.y - o.r - 20, `+1 ${MINERAL_META[o.mineral]?.sym ?? o.mineral}`)
        setHaul({ ...got })
        if (isDone()) setDone(true)
      },
    }

    let last = performance.now()
    let raf = 0
    let lastReady = ''
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      s.time += dt
      // Dev pause stops the ground only; the ship still steers so a shot can be lined up.
      const dy = s.paused ? 0 : H * SPEED_SHARE * dt
      s.ores.forEach(o => { o.y += dy })
      s.rocks.forEach(r => { r.y += dy; if (r.y > H + 10) { r.y -= H + 20; r.x = Math.random() * W } })
      s.nextY += dy
      s.ores = s.ores.filter(o => o.y < H + 80)
      spawn()
      const prev = s.x
      s.x += (s.tx - s.x) * Math.min(1, dt * 10)
      s.tilt = Math.max(-0.35, Math.min(0.35, (s.x - prev) * 0.05))
      s.fireCd = Math.max(0, s.fireCd - dt)
      s.scanCd = Math.max(0, s.scanCd - dt)
      s.beam = Math.max(0, s.beam - dt)
      s.flash = Math.max(0, s.flash - dt)
      if (s.pulse >= 0) {
        s.pulse += H * 1.1 * dt
        for (const o of s.ores) if (!o.scanned && o.y < shipY() && Math.hypot(o.x - s.x, o.y - shipY()) <= s.pulse) o.scanned = true
        if (s.pulse > H * SCAN_RANGE) s.pulse = -1
      }
      s.pops.forEach(p => { p.life -= dt })
      s.pops = s.pops.filter(p => p.life > 0)

      const t = underReticle()
      const fireReady = !!t && t.scanned && cuttable(t) && s.fireCd === 0
      // Ask for a scan only when nothing known is left to aim at.
      const ahead = s.ores.filter(o => !o.cut && o.y > 0 && o.y < shipY() - 20)
      const unscannedAhead = ahead.length > 0 && !ahead.some(o => o.scanned && cuttable(o))
      const key = `${fireReady}|${s.scanCd === 0}|${unscannedAhead}`
      if (key !== lastReady) { lastReady = key; setReady({ fire: fireReady, scan: s.scanCd === 0, unscannedAhead }) }

      // Ground.
      ctx.fillStyle = ground
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = pebble
      s.rocks.forEach(r => { ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.fill() })
      // Deposits.
      for (const o of s.ores) {
        if (o.cut) {
          ctx.fillStyle = crater
          ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.8, 0, Math.PI * 2); ctx.fill()
          continue
        }
        drawOre(ctx, o, cuttable(o))
      }
      // Scan pulse.
      if (s.pulse >= 0) {
        ctx.save()
        ctx.strokeStyle = `rgba(112,217,234,${1 - s.pulse / (H * SCAN_RANGE)})`
        ctx.lineWidth = 3
        ctx.beginPath(); ctx.arc(s.x, shipY(), s.pulse, Math.PI, Math.PI * 2); ctx.stroke()
        ctx.restore()
      }
      // Aim line and reticle: solid on a deposit FIRE would cut now.
      const r = reticle()
      ctx.save()
      ctx.strokeStyle = fireReady ? '#70d9ea' : 'rgba(243,234,216,.6)'
      ctx.lineWidth = 2
      ctx.setLineDash(fireReady ? [] : [6, 6])
      ctx.beginPath(); ctx.moveTo(s.x, shipY() - 28); ctx.lineTo(r.x, r.y + 16); ctx.stroke()
      ctx.setLineDash([])
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(r.x, r.y, 14, 0, Math.PI * 2); ctx.stroke()
      if (s.beam > 0) {
        ctx.strokeStyle = '#9becff'; ctx.lineWidth = 6
        ctx.beginPath(); ctx.moveTo(s.x, shipY() - 26); ctx.lineTo(r.x, r.y); ctx.stroke()
      }
      ctx.restore()
      drawShip(ctx, s.x, shipY(), s.tilt)
      for (const p of s.pops) label(ctx, p.x, p.y - (1 - p.life) * 28, p.text, Math.min(1, p.life * 2))
      if (s.flash > 0) { ctx.fillStyle = `rgba(155,236,255,${s.flash})`; ctx.fillRect(0, 0, W, H) }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); api.current = null }
    // The run is set up once per mission and target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.id, target.id])

  // Keyboard: arrows steer, Space fires, S scans.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') api.current?.nudge(-1)
      else if (e.key === 'ArrowRight') api.current?.nudge(1)
      else if (e.key === ' ') { e.preventDefault(); api.current?.fire() }
      else if (e.key === 's' || e.key === 'S') api.current?.scan()
      else if (DEV && (e.key === 'p' || e.key === 'P')) api.current?.pause()
      else return
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const steering = useRef<number | null>(null)
  const goal = openRun
    ? [{ id: 'hold', label: `HOLD ${Object.values(haul).reduce((a, b) => a + b, 0)}/${OPEN_HOLD}` }]
    : Object.entries(order).map(([id, n]) => ({ id, label: `${MINERAL_META[id]?.name ?? id} ${Math.min(haul[id] ?? 0, n)}/${n}` }))
  // FIRE lighting up is its own cue; words appear only to ask for a scan.
  const prompt = !done && !ready.fire && ready.unscannedAhead && ready.scan ? 'SCAN AHEAD' : null

  return (
    <main className="mn-scene mn-mine" data-scene="minimal-mine">
      <canvas
        ref={canvasRef}
        className="mn-mine-field"
        aria-label="Mining field: drag to steer"
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); steering.current = e.pointerId; api.current?.steer(e.clientX) }}
        onPointerMove={e => { if (steering.current === e.pointerId) api.current?.steer(e.clientX) }}
        onPointerUp={() => { steering.current = null }}
        onPointerCancel={() => { steering.current = null }}
      />
      {header}
      <footer className="mn-mine-bottom">
        {done ? (
          <>
            <section className="mn-card mn-mine-haul">
              <p className="mn-title">{openRun ? 'Hold full' : 'Order filled'}</p>
              <div className="mn-haul">{Object.entries(haul).map(([id, n]) => <MineralChip key={id} mineral={id} count={n} />)}</div>
            </section>
            <button className="mn-cta" onClick={() => onComplete(haul)}>HEAD HOME</button>
          </>
        ) : (
          <>
            <div className="mn-mine-goal" aria-label="Order">
              {goal.map(g => <span key={g.id} className="mn-chip">{g.label}</span>)}
            </div>
            <div className="mn-mine-buttons">
              <p className="mn-mine-prompt" aria-live="polite">{prompt ?? ''}</p>
              <button className={`mn-round mn-scan${ready.scan ? ' mn-ready' : ''}`} onClick={() => api.current?.scan()} aria-label="Scan ahead">SCAN</button>
              <button className={`mn-round mn-fire${ready.fire ? ' mn-ready' : ''}`} onClick={() => api.current?.fire()} aria-label="Fire the laser">FIRE</button>
            </div>
          </>
        )}
      </footer>
    </main>
  )
}

function drawOre(ctx: CanvasRenderingContext2D, o: Ore, cuttable: boolean) {
  const meta = MINERAL_META[o.mineral]
  ctx.save()
  // A pale halo, then a dark backing, so a deposit reads on light and dark ground alike (SSL-710).
  ctx.fillStyle = 'rgba(243,234,216,.22)'
  ctx.beginPath(); ctx.arc(o.x, o.y, o.r + 9, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#0a0d16'
  ctx.beginPath(); ctx.arc(o.x, o.y, o.r + 5, 0, Math.PI * 2); ctx.fill()
  if (!o.scanned) {
    ctx.strokeStyle = 'rgba(243,234,216,.8)'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([])
    ctx.fillStyle = 'rgba(243,234,216,.75)'
    ctx.font = `700 ${Math.round(o.r * 0.9)}px Oxanium, system-ui, sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('?', o.x, o.y + 1)
    ctx.restore()
    return
  }
  const colour = meta?.color ?? '#cccccc'
  ctx.globalAlpha = cuttable ? 1 : 0.45
  ctx.strokeStyle = colour; ctx.lineWidth = 3
  if (!cuttable) ctx.setLineDash([5, 5])
  ctx.stroke(); ctx.setLineDash([])
  ctx.fillStyle = colour
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + o.r, d = o.r * 0.45
    ctx.beginPath(); ctx.arc(o.x + Math.cos(a) * d, o.y + Math.sin(a) * d, o.r * 0.36, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
  label(ctx, o.x, o.y + o.r + 18, cuttable ? meta?.sym ?? o.mineral : `${meta?.sym ?? o.mineral} · LEVEL 2`, 1)
}

function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, tilt: number) {
  ctx.save()
  ctx.translate(x, y); ctx.rotate(tilt)
  ctx.fillStyle = 'rgba(0,0,0,.25)'
  ctx.beginPath(); ctx.ellipse(10, 18, 16, 8, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#f3ead8'
  ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(18, 16); ctx.lineTo(0, 9); ctx.lineTo(-18, 16); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#2f6fd6'; ctx.fillRect(-3, -12, 6, 13)
  ctx.fillStyle = '#70d9ea'
  ctx.beginPath(); ctx.ellipse(0, 21, 5, 7 + Math.random() * 3, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function label(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, alpha: number) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.font = '700 15px Oxanium, system-ui, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineWidth = 4; ctx.strokeStyle = '#0a0d16'; ctx.strokeText(text, x, y)
  ctx.fillStyle = '#f3ead8'; ctx.fillText(text, x, y)
  ctx.restore()
}
