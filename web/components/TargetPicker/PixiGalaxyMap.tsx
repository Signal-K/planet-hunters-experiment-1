'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Application, Container, Graphics, Text } from 'pixi.js'
import type { Mission, Target } from '@/lib/data'
import { Scene } from '@/lib/engine/Scene'
import type { EntityData } from '@/lib/engine/types'

const MAP_CENTER = { x: 187, y: 180 }

const ANGLES: Record<string, number> = {
  mercury: 200, venus: 320, earth: 70, mars: 140,
  eros: 45, bennu: 170, itokawa: 10, ryugu: 230, vesta: 310, psyche: 85,
  belt: 250, ceres: 190, lutetia: 285,
  jupiter: 30, saturn: 340, neptune: 120,
}

const RADII: Record<number, number> = { 1: 36, 2: 60, 3: 84, 4: 108, 5: 132, 6: 158, 7: 184, 8: 208 }

const BODY_COLORS: Record<string, { fill: number; low: number; stroke: number; mark: number }> = {
  mercury: { fill: 0x8a7060, low: 0x4d4038, stroke: 0xa08070, mark: 0xc1a292 },
  venus: { fill: 0xe8c870, low: 0x9f7434, stroke: 0xd4a840, mark: 0xfff0a8 },
  earth: { fill: 0x2a6ea4, low: 0x123152, stroke: 0x4a9ec4, mark: 0x54b36a },
  mars: { fill: 0xc1440e, low: 0x5e2414, stroke: 0xe05020, mark: 0xf08a45 },
  belt: { fill: 0x8a7a5a, low: 0x3e372c, stroke: 0xaaa080, mark: 0xd0c29a },
  jupiter: { fill: 0xc8a060, low: 0x6f4f2a, stroke: 0xe0b870, mark: 0xf2d39a },
  saturn: { fill: 0xe0c880, low: 0x8a7145, stroke: 0xc8a860, mark: 0xfff2b8 },
  neptune: { fill: 0x2040c0, low: 0x091d66, stroke: 0x4060e0, mark: 0x79a2ff },
  ceres: { fill: 0x8e8f86, low: 0x444740, stroke: 0xb7b8ac, mark: 0xd2d0bf },
}

const ASTEROID_IDS = new Set(['eros', 'vesta', 'itokawa', 'ryugu', 'psyche', 'bennu', 'ceres', 'lutetia', 'belt'])

interface PixiGalaxyMapProps {
  mission: Mission
  targets: Target[]
  compatibleIds: Set<string>
  pickedId: string
  onPick: (id: string) => void
}

function scenePosition(target: Target, bodies: EntityData[]) {
  const body = bodies.find(candidate => candidate.id === target.id)
  if (body) return { x: body.transform.position.x - MAP_CENTER.x, y: body.transform.position.y - MAP_CENTER.y }

  const angle = ((ANGLES[target.id] ?? 0) * Math.PI) / 180
  const radius = RADII[target.orbit] ?? 84
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
}

function drawBackground(layer: Container, width: number, height: number) {
  const bg = new Graphics()
  bg.rect(0, 0, width, height).fill(0x03060a)
  bg.circle(width * 0.5, height * 0.5, Math.max(width, height) * 0.45).fill({ color: 0x0a1422, alpha: 0.88 })
  layer.addChild(bg)

  const stars = new Graphics()
  const starSeeds: [number, number, number, number][] = [
    [0.08, 0.12, 1.0, 0.45], [0.18, 0.66, 0.9, 0.28], [0.27, 0.25, 1.3, 0.34],
    [0.38, 0.82, 1.0, 0.22], [0.46, 0.18, 0.8, 0.30], [0.58, 0.30, 1.4, 0.42],
    [0.69, 0.72, 1.0, 0.28], [0.76, 0.44, 0.8, 0.24], [0.84, 0.76, 1.1, 0.32],
    [0.91, 0.18, 1.0, 0.25], [0.22, 0.88, 0.7, 0.22], [0.79, 0.92, 0.9, 0.28],
  ]
  for (const [x, y, radius, alpha] of starSeeds) {
    stars.circle(x * width, y * height, radius).fill({ color: 0xffffff, alpha })
  }
  layer.addChild(stars)

  const grid = new Graphics()
  for (let x = 0; x <= width; x += 40) {
    grid.moveTo(x, 0).lineTo(x, height).stroke({ width: 1, color: 0x87cffa, alpha: 0.06 })
  }
  for (let y = 0; y <= height; y += 40) {
    grid.moveTo(0, y).lineTo(width, y).stroke({ width: 1, color: 0x87cffa, alpha: 0.06 })
  }
  layer.addChild(grid)
}

function drawBody(layer: Container, target: Target, x: number, y: number, isCompatible: boolean, isPicked: boolean, onPick: (id: string) => void) {
  const marker = new Container()
  marker.x = x
  marker.y = y
  marker.alpha = isCompatible ? 1 : 0.28
  marker.eventMode = isCompatible ? 'static' : 'none'
  marker.cursor = isCompatible ? 'pointer' : 'default'
  if (isCompatible) marker.on('pointertap', () => onPick(target.id))

  const radius = target.id === 'belt' ? 18 : ASTEROID_IDS.has(target.id) ? 14 : 13
  const colors = BODY_COLORS[target.id] ?? { fill: 0x607080, low: 0x283340, stroke: 0x809090, mark: 0xaab8bd }

  if (isPicked) {
    const glow = new Graphics()
    glow.circle(0, 0, radius + 9).fill({ color: 0xf5a623, alpha: 0.16 })
    glow.circle(0, 0, radius + 5).stroke({ width: 2, color: 0xf5a623, alpha: 0.95 })
    marker.addChild(glow)
  }

  const body = new Graphics()
  if (ASTEROID_IDS.has(target.id)) {
    body.poly([
      -radius * 0.62, -radius * 0.88,
      radius * 0.58, -radius * 0.74,
      radius * 0.96, -radius * 0.14,
      radius * 0.66, radius * 0.78,
      -radius * 0.14, radius * 0.94,
      -radius * 0.92, radius * 0.42,
    ]).fill(colors.fill).stroke({ width: 1.5, color: colors.stroke, alpha: 0.95 })
    body.circle(-radius * 0.18, -radius * 0.1, radius * 0.16).fill({ color: colors.low, alpha: 0.52 })
    body.circle(radius * 0.32, radius * 0.18, radius * 0.12).fill({ color: colors.mark, alpha: 0.36 })
  } else {
    body.circle(0, 0, radius).fill(colors.fill).stroke({ width: 1.5, color: colors.stroke, alpha: 0.95 })
    body.circle(-radius * 0.25, -radius * 0.28, radius * 0.42).fill({ color: colors.mark, alpha: 0.28 })
    body.circle(radius * 0.18, radius * 0.22, radius * 0.35).fill({ color: colors.low, alpha: 0.36 })
  }
  marker.addChild(body)

  const labelBg = new Graphics()
  const label = new Text({
    text: target.name,
    style: {
      fontFamily: 'var(--ln-font-mono), ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: 10,
      fill: isPicked ? 0xf5a623 : 0xcde4ff,
      letterSpacing: 0.6,
    },
  })
  label.anchor.set(0.5, 0)
  label.y = radius + 5
  labelBg.roundRect(-(label.width + 10) / 2, radius + 3, label.width + 10, 15, 3).fill({ color: 0x080c16, alpha: 0.74 })
  marker.addChild(labelBg, label)

  layer.addChild(marker)
}

function drawMap(layer: Container, props: PixiGalaxyMapProps, bodies: EntityData[], width: number, height: number) {
  for (const child of layer.removeChildren()) child.destroy({ children: true })

  drawBackground(layer, width, height)

  const centerX = width / 2
  const centerY = height / 2
  const sourceMaxRadius = RADII[8]
  const availableRadius = Math.max(72, Math.min(width * 0.46, height * 0.42))
  const scale = availableRadius / sourceMaxRadius

  const orbitLayer = new Graphics()
  for (let orbit = 1; orbit <= 8; orbit++) {
    const hasTarget = props.targets.some(target => target.orbit === orbit)
    const reachable = hasTarget && orbit <= props.mission.requires.max_orbit
    orbitLayer.circle(centerX, centerY, (RADII[orbit] ?? 84) * scale).stroke({
      width: 1,
      color: reachable ? 0xefe7d3 : 0xff5a6a,
      alpha: reachable ? 0.16 : 0.22,
    })
  }
  const maxOrbitRadius = (RADII[props.mission.requires.max_orbit] ?? 132) * scale + 12
  orbitLayer.circle(centerX, centerY, maxOrbitRadius).stroke({ width: 1, color: 0xf5a623, alpha: 0.4 })
  layer.addChild(orbitLayer)

  const sun = new Graphics()
  sun.circle(centerX, centerY, 22).fill(0xffe1a8)
  sun.circle(centerX, centerY, 28).stroke({ width: 1.5, color: 0xf5a623, alpha: 0.5 })
  layer.addChild(sun)

  for (const target of props.targets) {
    const position = scenePosition(target, bodies)
    drawBody(
      layer,
      target,
      centerX + position.x * scale,
      centerY + position.y * scale,
      props.compatibleIds.has(target.id),
      target.id === props.pickedId,
      props.onPick
    )
  }
}

export default function PixiGalaxyMap(props: PixiGalaxyMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const redrawRef = useRef<(() => void) | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props

  const compatibleKey = useMemo(() => [...props.compatibleIds].sort().join(','), [props.compatibleIds])

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return

    const app = new Application()
    const mapLayer = new Container()
    let bodies: EntityData[] = []
    let initialized = false
    let destroyed = false

    const redraw = () => {
      if (!initialized || destroyed) return
      const width = Math.max(280, parent.clientWidth)
      const height = Math.max(240, parent.clientHeight)
      app.renderer.resize(width, height)
      drawMap(mapLayer, propsRef.current, bodies, width, height)
    }
    redrawRef.current = redraw

    const observer = new ResizeObserver(redraw)

    ;(async () => {
      try {
        const dpr = window.devicePixelRatio || 1
        await app.init({
          canvas,
          width: Math.max(280, parent.clientWidth),
          height: Math.max(240, parent.clientHeight),
          background: 0x03060a,
          antialias: true,
          autoDensity: true,
          preserveDrawingBuffer: true,
          resolution: dpr,
        })
        if (destroyed) {
          app.destroy()
          return
        }

        app.stage.addChild(mapLayer)
        initialized = true
        observer.observe(parent)

        Scene.load('/game/scenes/target-picker.scene.json')
          .then(data => {
            if (destroyed) return
            bodies = data.entities ?? []
            redraw()
          })
          .catch(() => redraw())

        redraw()
      } catch (err) {
        console.error('[PixiGalaxyMap] init failed:', err)
      }
    })()

    return () => {
      destroyed = true
      redrawRef.current = null
      observer.disconnect()
      for (const child of mapLayer.removeChildren()) child.destroy({ children: true })
      if (app.renderer) app.destroy()
    }
  }, [])

  useEffect(() => {
    redrawRef.current?.()
  }, [props.mission.requires.max_orbit, props.pickedId, compatibleKey, props.targets])

  return (
    <canvas
      ref={canvasRef}
      data-testid="target-picker-pixi-map"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  )
}
