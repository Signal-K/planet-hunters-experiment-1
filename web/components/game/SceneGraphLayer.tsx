'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { authoredScene, resolveScene, type ResolvedSceneObject } from '@/lib/engine/SceneGraph'

interface SceneGraphLayerProps {
  sceneId: string
}

/**
 * The production bridge from the authored scene graph to a platform renderer.
 * It paints no art yet: it exposes the resolved draw-list rectangles in the real
 * scene so Studio/CI can compare web with native while objects migrate one by one.
 */
export default function SceneGraphLayer({ sceneId }: SceneGraphLayerProps) {
  const host = useRef<HTMLDivElement>(null)
  const [objects, setObjects] = useState<ResolvedSceneObject[]>([])
  const scene = useMemo(() => authoredScene(sceneId), [sceneId])

  useEffect(() => {
    const element = host.current
    if (!element || !scene) return
    const update = () => {
      const { width, height } = element.getBoundingClientRect()
      setObjects(resolveScene(scene, width, height))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [scene])

  if (!scene) return null
  return (
    <div
      ref={host}
      data-engine-scene={scene.id}
      data-engine-coordinate-space="normalized-safe-area"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      {objects.map(object => (
        <span
          key={object.id}
          data-engine-object={object.id}
          data-engine-kind={object.kind}
          data-engine-layer={object.layer}
          data-engine-depth={object.depth}
          data-engine-frame={`${object.frame.x},${object.frame.y},${object.frame.w},${object.frame.h}`}
          style={{
            position: 'absolute',
            left: object.frame.x,
            top: object.frame.y,
            width: object.frame.w,
            height: object.frame.h,
          }}
        />
      ))}
    </div>
  )
}
