'use client'

import { useEffect, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import { Scene } from './Scene'
import { GameLoop } from './GameLoop'
import { InputManager } from './InputManager'
import { RuntimeContext, type AuthContext } from './RuntimeContext'
import { wireSpriteRenderers } from './components/SpriteRenderer'
import { AssetManager } from './AssetManager'
import type { SceneData } from './types'

interface GameCanvasProps {
  sceneData: SceneData
  width?: number
  height?: number
  background?: string
  className?: string
  /** PocketBase user/session, forwarded to ScriptBehaviour components via RuntimeContext. */
  auth?: AuthContext
}

export function GameCanvas({ sceneData, width = 800, height = 450, background = '#0a0a12', className, auth }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const app = new Application()
    const context = new RuntimeContext(auth)
    const assets = new AssetManager()
    let loop: GameLoop | null = null
    let input: InputManager | null = null
    let destroyed = false
    setLoading(true)

    ;(async () => {
      await assets.loadManifest('/game/assets/manifest.json')
      await app.init({ canvas, width, height, background, antialias: true, autoDensity: true })
      if (destroyed) { app.destroy(); return }

      const { scene, entityData } = Scene.fromData(sceneData)
      wireSpriteRenderers(app, entityData, scene, assets)

      input = new InputManager(canvas, width, height)
      void context // available to future wiring functions (e.g. wireScriptBehaviours(scene, entityData, context, input))

      loop = new GameLoop(scene, app)
      loop.start()
      setLoading(false)
    })()

    return () => {
      destroyed = true
      loop?.stop()
      input?.destroy()
      app.destroy()
    }
  }, [sceneData, width, height, background, auth])

  return (
    <div className={className} style={{ position: 'relative', width, height }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      {loading && (
        <div className="game-canvas-loading" data-testid="game-canvas-loading">
          LOADING…
        </div>
      )}
    </div>
  )
}
