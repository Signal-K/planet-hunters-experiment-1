'use client'

import { useEffect, useRef } from 'react'
import { capDpr } from '@/lib/engine/pixiDisplay'
import { Application } from 'pixi.js'
import { AcademyController, GameLoop, RuntimeContext, Scene } from '@/lib/engine'
import type { AcademyCrewCounts, AcademyScenePalette } from '@/lib/engine/scripts/AcademyController'

const DEFAULT_CREW_COUNTS: AcademyCrewCounts = { astronaut: 0, rover: 0, drone: 0 }

// Resolves the scene's colors from the live --ln-* CSS custom properties
// (the .theme-light values Academy actually renders with) instead of
// hard-coding hex literals in the Pixi controller — the canvas is drawn with
// canonical design tokens, not a scene-local palette that can drift from the
// CSS module.
function parseColor(raw: string, fallback: number): number {
  const value = raw.trim()
  if (value.startsWith('#')) {
    let hex = value.slice(1)
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
    const parsed = parseInt(hex.slice(0, 6), 16)
    return Number.isNaN(parsed) ? fallback : parsed
  }
  const match = value.match(/rgba?\(([^)]+)\)/)
  if (match) {
    const [r, gVal, b] = match[1].split(',').map(part => parseFloat(part.trim()))
    if ([r, gVal, b].every(n => !Number.isNaN(n))) {
      return (Math.round(r) << 16) + (Math.round(gVal) << 8) + Math.round(b)
    }
  }
  return fallback
}

function readTokenColor(el: Element, name: string, fallback: number): number {
  const raw = getComputedStyle(el).getPropertyValue(name)
  return raw ? parseColor(raw, fallback) : fallback
}

function readPalette(el: Element): AcademyScenePalette {
  return {
    surface: readTokenColor(el, '--ln-surface-2', 0xf2eee4),
    surfaceBright: readTokenColor(el, '--ln-surface', 0xffffff),
    hairline: readTokenColor(el, '--ln-hairline-strong', 0xc9c4b6),
    cyan: readTokenColor(el, '--ln-cyan', 0x1c7fbf),
    cyanBright: readTokenColor(el, '--ln-cyan-bright', 0x2a94d8),
    text: readTokenColor(el, '--ln-text', 0x1c1a14),
    textMuted: readTokenColor(el, '--ln-text-muted', 0x7a7460),
  }
}

interface AcademyCanvasProps {
  activeTraining: number
  funded: boolean
  crewCounts?: AcademyCrewCounts
}

export default function AcademyCanvas({ activeTraining, funded, crewCounts = DEFAULT_CREW_COUNTS }: AcademyCanvasProps) {
  const ref = useRef<HTMLDivElement>(null)
  const stateRef = useRef({ activeTraining, funded, crewCounts })
  stateRef.current = { activeTraining, funded, crewCounts }

  useEffect(() => {
    const parent = ref.current
    if (!parent) return
    const canvas = document.createElement('canvas')
    canvas.dataset.testid = 'academy-canvas'
    canvas.style.cssText = 'display:block;width:100%;height:100%;'
    parent.appendChild(canvas)
    const app = new Application()
    let loop: GameLoop | null = null
    let destroyed = false

    ;(async () => {
      try {
        const width = Math.max(300, parent.clientWidth)
        const height = Math.max(190, parent.clientHeight)
        const palette = readPalette(parent)
        const [data] = await Promise.all([
          Scene.load('/game/scenes/academy.scene.json'),
          app.init({ canvas, width, height, background: palette.surface, antialias: false, autoDensity: true, resolution: capDpr() }),
        ])
        if (destroyed) return
        const { scene } = Scene.fromData(data)
        scene.find('academy-controller')?.addComponent(new AcademyController(new RuntimeContext(), {
          container: app.stage,
          worldWidth: width,
          worldHeight: height,
          getActiveTraining: () => stateRef.current.activeTraining,
          getFunded: () => stateRef.current.funded,
          getCrewCounts: () => stateRef.current.crewCounts,
          palette,
        }))
        loop = new GameLoop(scene, app)
        loop.start()
      } catch (error) {
        console.error('[AcademyCanvas] init failed:', error)
      }
    })()

    return () => {
      destroyed = true
      loop?.stop()
      if (app.renderer) {
        try { app.destroy() } catch (_) { /* pixi v8 cleanup */ }
      }
      canvas.remove()
    }
  }, [])

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />
}
