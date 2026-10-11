'use client'

import { useEffect, useRef } from 'react'
import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js'
import { capDpr } from '@/lib/engine/pixiDisplay'
import { ROCKET_ASSETS } from '@/lib/rocket-assets'

interface DebriefCanvasProps {
  rocketImageSrc?: string
  /** Orbit deployments have no returning vehicle and no hangar plate. */
  scene?: 'berth' | 'orbit'
}

const HANGAR = '/game/assets/base/hangar_flat.png'
const FALLBACK_SHIP = ROCKET_ASSETS.explorer.exterior

function tokenColor(token: string, fallback: number): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  const match = /^#([\da-f]{6})$/i.exec(value)
  return match ? Number.parseInt(match[1], 16) : fallback
}

/**
 * Full-bleed arrival-bay scene for the debrief. The art is deliberately doing
 * the orientation work here: this is a place the ship has returned to, with a
 * visible berth and a readable ship silhouette, not a receipt page with a
 * decorative status icon.
 */
export default function DebriefCanvas({ rocketImageSrc, scene = 'berth' }: DebriefCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const parent = containerRef.current
    if (!parent) return

    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'display:block;width:100%;height:100%;'
    parent.appendChild(canvas)

    const app = new Application()
    let destroyed = false
    let resizeObserver: ResizeObserver | undefined

    ;(async () => {
      try {
        const width = Math.max(280, parent.clientWidth)
        const height = Math.max(220, parent.clientHeight)
        await app.init({
          canvas,
          width,
          height,
          background: 0x10182c,
          antialias: true,
          autoDensity: true,
          resolution: capDpr(),
        })
        if (destroyed) return

        const showVehicle = scene !== 'orbit'
        const hangar = showVehicle ? await Assets.load<Texture>(HANGAR) : null
        if (destroyed) return

        let shipTexture: Texture | null = null
        if (showVehicle) {
          try {
            shipTexture = await Assets.load<Texture>(rocketImageSrc ?? FALLBACK_SHIP)
          } catch {
            try { shipTexture = await Assets.load<Texture>(FALLBACK_SHIP) } catch { shipTexture = null }
          }
        }
        if (destroyed) return

        const world = new Container()
        app.stage.addChild(world)
        const colors = {
          skyTop: tokenColor('--ln-world-dusk-top', 0x161a38),
          skyHorizon: tokenColor('--ln-world-dusk-horizon', 0x4c315b),
          floor: tokenColor('--ln-world-asphalt', 0x343b46),
          floorEdge: tokenColor('--ln-world-outline', 0x16293b),
          trim: tokenColor('--ln-world-trim-teal', 0x2a9aa3),
          light: tokenColor('--ln-world-hull-lit', 0xfaf7f0),
          grass: tokenColor('--ln-world-grass', 0x3e6a46),
        }

        const background = new Graphics()
        background.name = 'arrival-sky'
        world.addChild(background)

        const atmosphere = new Graphics()
        atmosphere.name = 'arrival-atmosphere'
        world.addChild(atmosphere)

        const hangarSprite = hangar ? new Sprite(hangar) : null
        if (hangarSprite) {
          hangarSprite.name = 'arrival-hangar'
          hangarSprite.anchor.set(0.5, 1)
          world.addChild(hangarSprite)
        }

        const berth = showVehicle ? new Graphics() : null
        if (berth) {
          berth.name = 'arrival-berth-lights'
          world.addChild(berth)
        }

        const ship = shipTexture ? new Sprite(shipTexture) : null
        if (ship) {
          ship.name = 'arrival-ship'
          ship.anchor.set(0.5)
          world.addChild(ship)
        }

        const layout = () => {
          const nextWidth = Math.max(280, parent.clientWidth)
          const nextHeight = Math.max(220, parent.clientHeight)
          app.renderer.resize(nextWidth, nextHeight)

          background.clear()
          const bands = 14
          for (let i = 0; i < bands; i++) {
            const t = i / (bands - 1)
            const mix = (a: number, b: number) => Math.round(a + (b - a) * t)
            const color = (mix((colors.skyTop >> 16) & 255, (colors.skyHorizon >> 16) & 255) << 16)
              | (mix((colors.skyTop >> 8) & 255, (colors.skyHorizon >> 8) & 255) << 8)
              | mix(colors.skyTop & 255, colors.skyHorizon & 255)
            background.rect(0, (nextHeight * i) / bands, nextWidth, nextHeight / bands + 1).fill({ color })
          }
          atmosphere.clear()
          const floorColor = showVehicle ? colors.floor : colors.grass
          const floorTop = showVehicle ? 0.72 : 0.62
          atmosphere.rect(0, nextHeight * floorTop, nextWidth, nextHeight * (1 - floorTop)).fill({ color: floorColor, alpha: 1 })
          atmosphere.rect(0, nextHeight * floorTop, nextWidth, 4).fill({ color: colors.floorEdge, alpha: 0.9 })
          atmosphere.rect(0, nextHeight * (floorTop - 0.08), nextWidth, nextHeight * 0.08).fill({ color: colors.skyHorizon, alpha: 0.28 })

          // Wide landscape: the rocket parks in the left third and the result cards take the right.
          const wide = nextWidth >= 900 && nextWidth > nextHeight * 1.3
          const cx = nextWidth * (wide ? 0.26 : 0.5)
          if (hangarSprite && hangar) {
            const hangarWidth = wide ? Math.min(nextWidth * 0.44, 560) : Math.min(nextWidth * 0.78, 680)
            const hangarScale = hangarWidth / hangar.width
            hangarSprite.scale.set(hangarScale)
            hangarSprite.x = cx
            hangarSprite.y = nextHeight * 0.96
          }

          if (berth) {
            const berthX = cx
            const berthY = nextHeight * 0.78
            berth.clear()
            berth.ellipse(berthX, berthY, Math.min(150, nextWidth * 0.2), 18).stroke({ color: colors.trim, alpha: 0.82, width: 3 })
            berth.ellipse(berthX, berthY, Math.min(96, nextWidth * 0.13), 10).stroke({ color: colors.light, alpha: 0.72, width: 2 })
            for (let i = -3; i <= 3; i++) {
              berth.circle(berthX + i * Math.min(34, nextWidth * 0.045), berthY, 2.5).fill({ color: i === 0 ? colors.light : colors.trim, alpha: 1 })
            }
          }

          if (ship) {
            const shipWidth = Math.min(nextWidth * 0.44, 330)
            ship.scale.set(shipWidth / Math.max(shipTexture?.width ?? 1, 1))
            ship.x = cx
            ship.y = nextHeight * 0.68
          }
        }

        layout()
        resizeObserver = new ResizeObserver(layout)
        resizeObserver.observe(parent)
      } catch (error) {
        console.error('[DebriefCanvas] init failed:', error)
      }
    })()

    return () => {
      destroyed = true
      resizeObserver?.disconnect()
      if (app.renderer) {
        try { app.destroy() } catch { /* pixi v8 cleanup */ }
      }
      canvas.remove()
    }
  }, [rocketImageSrc, scene])

  return <div ref={containerRef} className="debrief-arrival-canvas" aria-hidden="true" />
}
