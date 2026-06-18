'use client'

import { useEffect, useRef } from 'react'
import { Application, Assets, Texture } from 'pixi.js'
import { buildLaunchScene, LAUNCH_W, LAUNCH_H, type LaunchTextures } from '@/lib/pixi/launchScene'

const ASSET_PATHS = {
  body:        '/game/assets/launch/launch_rocket_body.png',
  nose:        '/game/assets/launch/launch_rocket_nose.png',
  boosterL:    '/game/assets/launch/launch_booster_left.png',
  stageLower:  '/game/assets/launch/launch_stage_lower.png',
  engineBell:  '/game/assets/launch/launch_engine_bell.png',
  plumeCore:   '/game/assets/launch/launch_plume_core.png',
  plumeOuter:  '/game/assets/launch/launch_plume_outer.png',
  smoke:       '/game/assets/launch/launch_smoke_puff.png',
  bgPad:       '/game/assets/launch/launch_bg_launchpad.png',
  bgClouds:    '/game/assets/launch/launch_bg_clouds.png',
  bgHighAtmos: '/game/assets/launch/launch_bg_high_atmosphere.png',
} satisfies Record<keyof LaunchTextures, string>

interface Props {
  rocketName: string
  targetName: string
  onComplete: () => void
}

async function loadTextures(): Promise<LaunchTextures> {
  async function tryLoad(src: string): Promise<Texture | null> {
    try { return await Assets.load<Texture>(src) } catch { return null }
  }
  const [body, nose, boosterL, stageLower, engineBell, plumeCore, plumeOuter, smoke, bgPad, bgClouds, bgHighAtmos] =
    await Promise.all(Object.values(ASSET_PATHS).map(tryLoad))
  return { body, nose, boosterL, stageLower, engineBell, plumeCore, plumeOuter, smoke, bgPad, bgClouds, bgHighAtmos }
}

export function LaunchSequenceCanvas({ rocketName, targetName, onComplete }: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete

  useEffect(() => {
    const div = divRef.current
    if (!div) return

    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'display:block;width:100%;height:100%;'
    div.appendChild(canvas)

    const app = new Application()
    let destroyed = false
    let elapsed = 0

    ;(async () => {
      await app.init({
        canvas,
        width: LAUNCH_W,
        height: LAUNCH_H,
        background: 0x000000,
        antialias: true,
        autoDensity: true,
        resolution: typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1,
      })
      if (destroyed) { app.destroy(true); return }

      const textures = await loadTextures()
      if (destroyed) { app.destroy(true); return }

      const scene = buildLaunchScene(app, textures, {
        rocketName,
        targetName,
        onComplete: () => completeRef.current(),
      })

      app.ticker.add(t => {
        elapsed += t.deltaTime / 60
        scene.update(elapsed, t.deltaTime / 60)
      })
    })()

    return () => {
      destroyed = true
      canvas.remove()
      app.destroy(true)
    }
  }, [])

  return (
    <div
      ref={divRef}
      style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'hidden' }}
    />
  )
}
