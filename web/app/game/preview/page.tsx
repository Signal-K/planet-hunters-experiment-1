'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, redirect } from 'next/navigation'
import { GameCanvas } from '@/lib/engine/GameCanvas'
import { Scene } from '@/lib/engine/Scene'
import type { SceneData } from '@/lib/engine/types'

// Headless scene preview used by Forge — dev only
export default function ScenePreviewPage() {
  if (process.env.NODE_ENV !== 'development') redirect('/game')
  return (
    <Suspense fallback={null}>
      <ScenePreview />
    </Suspense>
  )
}

function ScenePreview() {
  const params = useSearchParams()
  const sceneName = params.get('scene') ?? 'mining-test'
  const [data, setData] = useState<SceneData | null>(null)

  useEffect(() => {
    setData(null)
    Scene.load(`/game/scenes/${sceneName}.scene.json`).then(setData)
  }, [sceneName])

  if (!data) return null

  const width = (data as SceneData & { width?: number }).width ?? 800
  const height = (data as SceneData & { height?: number }).height ?? 450

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: data.background ?? '#0a0a12',
        overflow: 'hidden',
      }}
    >
      <GameCanvas sceneData={data} width={width} height={height} background={data.background} />
    </div>
  )
}
