'use client'

import { useEffect, useRef } from 'react'
import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js'
import { capDpr } from '@/lib/engine/pixiDisplay'

interface DebriefCanvasProps {
  rocketImageSrc?: string
}

const STARFIELD = '/game/assets/backgrounds/starmap.png'
const HANGAR = '/game/assets/base/hangar_flat.png'
const FALLBACK_SHIP = '/game/assets/ships/ship_sr1.png'

/**
 * Full-bleed arrival-bay scene for the debrief. The art is deliberately doing
 * the orientation work here: this is a place the ship has returned to, with a
 * visible berth and a readable ship silhouette, not a receipt page with a
 * decorative status icon.
 */
export default function DebriefCanvas({ rocketImageSrc }: DebriefCanvasProps) {
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
          background: 0x050b16,
          antialias: false,
          autoDensity: true,
          resolution: capDpr(),
        })
        if (destroyed) return

        const [starfield, hangar] = await Promise.all([
          Assets.load<Texture>(STARFIELD),
          Assets.load<Texture>(HANGAR),
        ])
        if (destroyed) return

        let shipTexture: Texture | null = null
        try {
          shipTexture = await Assets.load<Texture>(rocketImageSrc ?? FALLBACK_SHIP)
        } catch {
          try { shipTexture = await Assets.load<Texture>(FALLBACK_SHIP) } catch { shipTexture = null }
        }
        if (destroyed) return

        const scene = new Container()
        app.stage.addChild(scene)

        const background = new Sprite(starfield)
        background.name = 'arrival-starfield'
        scene.addChild(background)

        const atmosphere = new Graphics()
        atmosphere.name = 'arrival-atmosphere'
        scene.addChild(atmosphere)

        const hangarSprite = new Sprite(hangar)
        hangarSprite.name = 'arrival-hangar'
        hangarSprite.anchor.set(0.5, 1)
        scene.addChild(hangarSprite)

        const berth = new Graphics()
        berth.name = 'arrival-berth-lights'
        scene.addChild(berth)

        const ship = shipTexture ? new Sprite(shipTexture) : null
        if (ship) {
          ship.name = 'arrival-ship'
          ship.anchor.set(0.5)
          scene.addChild(ship)
        }

        const layout = () => {
          const nextWidth = Math.max(280, parent.clientWidth)
          const nextHeight = Math.max(220, parent.clientHeight)
          app.renderer.resize(nextWidth, nextHeight)

          const coverScale = Math.max(nextWidth / starfield.width, nextHeight / starfield.height)
          background.scale.set(coverScale)
          background.x = (nextWidth - starfield.width * coverScale) / 2
          background.y = (nextHeight - starfield.height * coverScale) / 2

          atmosphere.clear()
          atmosphere.rect(0, 0, nextWidth, nextHeight * 0.42).fill({ color: 0x020711, alpha: 0.32 })
          atmosphere.rect(0, nextHeight * 0.68, nextWidth, nextHeight * 0.32).fill({ color: 0x020711, alpha: 0.74 })
          atmosphere.rect(0, nextHeight * 0.76, nextWidth, 2).fill({ color: 0x70d9ea, alpha: 0.24 })

          const hangarWidth = Math.min(nextWidth * 0.78, 680)
          const hangarScale = hangarWidth / hangar.width
          hangarSprite.scale.set(hangarScale)
          hangarSprite.x = nextWidth * 0.5
          hangarSprite.y = nextHeight * 0.96

          const berthX = nextWidth * 0.5
          const berthY = nextHeight * 0.78
          berth.clear()
          berth.ellipse(berthX, berthY, Math.min(150, nextWidth * 0.2), 18).stroke({ color: 0x70d9ea, alpha: 0.46, width: 2 })
          berth.ellipse(berthX, berthY, Math.min(96, nextWidth * 0.13), 10).stroke({ color: 0x5ad07e, alpha: 0.55, width: 1 })
          for (let i = -3; i <= 3; i++) {
            berth.circle(berthX + i * Math.min(34, nextWidth * 0.045), berthY, 2.5).fill({ color: i === 0 ? 0xf5a623 : 0x70d9ea, alpha: 0.85 })
          }

          if (ship) {
            const shipWidth = Math.min(nextWidth * 0.44, 330)
            ship.scale.set(shipWidth / Math.max(shipTexture?.width ?? 1, 1))
            ship.x = nextWidth * 0.5
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
  }, [rocketImageSrc])

  return <div ref={containerRef} className="debrief-arrival-canvas" aria-hidden="true" />
}
