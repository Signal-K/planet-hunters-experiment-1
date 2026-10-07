'use client'

import { useEffect, useRef } from 'react'
import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js'
import { capDpr } from '@/lib/engine/pixiDisplay'
import { ROCKET_ASSETS } from '@/lib/rocket-assets'

interface DebriefCanvasProps {
  rocketImageSrc?: string
}

const HANGAR = '/game/assets/base/hangar_flat.png'
const FALLBACK_SHIP = ROCKET_ASSETS.explorer.exterior

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
          background: 0xeef3f8,
          antialias: false,
          autoDensity: true,
          resolution: capDpr(),
        })
        if (destroyed) return

        const hangar = await Assets.load<Texture>(HANGAR)
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

        // Light blueprint sky and apron (SSL-423): ice gradient, no starfield.
        const background = new Graphics()
        background.name = 'arrival-sky'
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

          background.clear()
          const bands = 14
          for (let i = 0; i < bands; i++) {
            const t = i / (bands - 1)
            const mix = (a: number, b: number) => Math.round(a + (b - a) * t)
            const color = (mix(0xea, 0xc4) << 16) | (mix(0xf1, 0xdb) << 8) | mix(0xf8, 0xee)
            background.rect(0, (nextHeight * i) / bands, nextWidth, nextHeight / bands + 1).fill({ color })
          }
          atmosphere.clear()
          atmosphere.rect(0, nextHeight * 0.74, nextWidth, nextHeight * 0.26).fill({ color: 0xb4cde2, alpha: 1 })
          atmosphere.rect(0, nextHeight * 0.74, nextWidth, 3).fill({ color: 0x0f2436, alpha: 0.85 })

          const hangarWidth = Math.min(nextWidth * 0.78, 680)
          const hangarScale = hangarWidth / hangar.width
          hangarSprite.scale.set(hangarScale)
          hangarSprite.x = nextWidth * 0.5
          hangarSprite.y = nextHeight * 0.96

          const berthX = nextWidth * 0.5
          const berthY = nextHeight * 0.78
          berth.clear()
          berth.ellipse(berthX, berthY, Math.min(150, nextWidth * 0.2), 18).stroke({ color: 0x175f9b, alpha: 0.9, width: 3 })
          berth.ellipse(berthX, berthY, Math.min(96, nextWidth * 0.13), 10).stroke({ color: 0x17703f, alpha: 0.9, width: 2 })
          for (let i = -3; i <= 3; i++) {
            berth.circle(berthX + i * Math.min(34, nextWidth * 0.045), berthY, 2.5).fill({ color: i === 0 ? 0x17703f : 0x175f9b, alpha: 1 })
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
