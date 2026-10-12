'use client'

import { useEffect, useRef, type MutableRefObject } from 'react'
import {
  WORLD_WIDTH,
  contactY,
  createRover,
  outcropNear,
  stepRover,
  SURVEY_OUTCROPS,
  type DriveInput,
  type RoverPose,
  type SurveyOutcrop,
} from '@/lib/rover/terrain'

const TILE = 2

const SRC = {
  sky: '/game/assets/base/layers/sky.png',
  far: '/game/assets/base/layers/mountains-far.png',
  mid: '/game/assets/base/layers/mountains-mid.png',
  near: '/game/assets/base/layers/mountains-near.png',
  grass: '/game/assets/base/layers/grass.png',
  dirt: '/game/assets/base/layers/dirt.png',
  rock: '/game/assets/base/kit/prop-rock.png',
  rover: '/game/assets/actors/rover.png',
} as const

const ROCKS = [420, 640, 1040, 1500, 1860, 2320, 2900, 3200]

interface Dust {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

function loadImages(): Promise<Record<keyof typeof SRC, HTMLImageElement>> {
  const entries = Object.entries(SRC) as [keyof typeof SRC, string][]
  return Promise.all(entries.map(([key, src]) => new Promise<[keyof typeof SRC, HTMLImageElement]>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve([key, image])
    image.onerror = () => reject(new Error(src))
    image.src = src
  }))).then(loaded => Object.fromEntries(loaded) as Record<keyof typeof SRC, HTMLImageElement>)
}

function drawLayer(ctx: CanvasRenderingContext2D, image: HTMLImageElement, cam: number, factor: number, viewW: number, ground: number, height: number) {
  const width = Math.max(height * (image.width / image.height), 80)
  const scroll = -cam * factor
  const start = Math.floor(scroll % width) - width
  for (let x = start; x < viewW + width; x += width) {
    ctx.drawImage(image, x, ground - height, width, height)
  }
}

export default function RoverDriveCanvas({
  driveRef,
  onPose,
}: {
  driveRef: MutableRefObject<DriveInput>
  onPose: (pose: RoverPose, near: SurveyOutcrop | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onPoseRef = useRef(onPose)
  onPoseRef.current = onPose

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let alive = true
    let raf = 0
    let ticks = 0
    let last = performance.now()
    let pose = createRover()
    const dust: Dust[] = []
    let images: Record<keyof typeof SRC, HTMLImageElement> | null = null
    void loadImages().then(loaded => { if (alive) images = loaded }).catch(() => { images = null })

    const tick = (now: number) => {
      if (!alive) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const viewW = canvas.clientWidth || 390
      const viewH = canvas.clientHeight || 844
      if (canvas.width !== viewW || canvas.height !== viewH) {
        canvas.width = viewW
        canvas.height = viewH
      }
      pose = stepRover(pose, driveRef.current, dt)
      const baseline = viewH * 0.58
      if (pose.grounded && Math.abs(pose.vx) > 28 && dust.length < 40) {
        dust.push({
          x: pose.x - Math.sign(pose.vx || 1) * 18,
          y: baseline + pose.y,
          vx: -pose.vx * 0.2 + (Math.random() - 0.5) * 20,
          vy: -18 - Math.random() * 24,
          life: 0.45,
        })
      }
      for (let i = dust.length - 1; i >= 0; i -= 1) {
        const speck = dust[i]
        speck.life -= dt
        speck.x += speck.vx * dt
        speck.y += speck.vy * dt
        speck.vy += 40 * dt
        if (speck.life <= 0) dust.splice(i, 1)
      }
      const cam = Math.max(0, Math.min(WORLD_WIDTH - viewW, pose.x - viewW * 0.42))
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, viewW, viewH)
      if (images) {
        const skyH = Math.max(viewH, baseline)
        drawLayer(ctx, images.sky, cam, 0.05, viewW, skyH, skyH)
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, viewW, baseline - 40)
        ctx.clip()
        drawLayer(ctx, images.far, cam, 0.18, viewW, baseline - 90, viewH * 0.28)
        drawLayer(ctx, images.mid, cam, 0.36, viewW, baseline - 48, viewH * 0.22)
        ctx.restore()
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(0, viewH + 8)
        const from = cam - 8
        const to = cam + viewW + 8
        for (let x = from; x <= to; x += 4) ctx.lineTo(x - cam, baseline + contactY(x))
        ctx.lineTo(viewW + 8, viewH + 8)
        ctx.closePath()
        ctx.clip()
        const dirtW = images.dirt.width * TILE
        const dirtH = images.dirt.height * TILE
        const ox = -((cam * 0.5) % dirtW)
        for (let x = ox - dirtW; x < viewW + dirtW; x += dirtW) {
          for (let y = baseline - 160; y < viewH + dirtH; y += dirtH) ctx.drawImage(images.dirt, x, y, dirtW, dirtH)
        }
        ctx.restore()
        ctx.save()
        ctx.beginPath()
        for (let x = from; x <= to; x += 4) ctx.lineTo(x - cam, baseline + contactY(x) - 16)
        for (let x = to; x >= from; x -= 4) ctx.lineTo(x - cam, baseline + contactY(x) + 6)
        ctx.closePath()
        ctx.clip()
        const grassW = images.grass.width * TILE
        const grassH = images.grass.height * TILE
        for (let x = -(cam % grassW) - grassW; x < viewW + grassW; x += grassW) {
          for (let y = baseline - 220; y < baseline + 180; y += grassH) ctx.drawImage(images.grass, x, y, grassW, grassH)
        }
        ctx.restore()
        const edge = ctx.getImageData(12, Math.max(0, viewH - 28), 1, 1).data
        ctx.beginPath()
        for (let x = from; x <= to; x += 4) ctx.lineTo(x - cam, baseline + contactY(x))
        ctx.lineWidth = 3
        ctx.strokeStyle = `rgb(${edge[0]}, ${edge[1]}, ${edge[2]})`
        ctx.lineJoin = 'round'
        ctx.stroke()
        const placeRock = (x: number, scale: number) => {
          const y = baseline + contactY(x)
          const w = images.rock.width * scale
          const h = images.rock.height * scale
          ctx.drawImage(images.rock, x - cam - w / 2, y - h + 2, w, h)
        }
        for (const x of ROCKS) placeRock(x, 3)
        for (const outcrop of SURVEY_OUTCROPS) {
          placeRock(outcrop.x - 14, 4)
          placeRock(outcrop.x + 10, 5)
          placeRock(outcrop.x + 2, 3)
        }
        for (const speck of dust) {
          const alpha = Math.max(0, speck.life / 0.45)
          ctx.globalAlpha = alpha
          ctx.drawImage(images.dirt, 8, 8, 6, 6, speck.x - cam, speck.y, 5, 5)
          ctx.globalAlpha = 1
        }
        const rw = 120
        const rh = 90
        const foot = (127 / 144) * rh
        ctx.save()
        ctx.translate(pose.x - cam, baseline + pose.y + 2)
        ctx.rotate(pose.angle)
        ctx.drawImage(images.rover, -rw * 0.46, -foot, rw, rh)
        ctx.restore()
      }
      if (ticks % 4 === 0) onPoseRef.current(pose, outcropNear(pose.x))
      ticks += 1
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { alive = false; cancelAnimationFrame(raf) }
  }, [driveRef])

  return <canvas ref={canvasRef} className="rover-drive-canvas" data-testid="rover-drive-canvas" aria-hidden="true" />
}
