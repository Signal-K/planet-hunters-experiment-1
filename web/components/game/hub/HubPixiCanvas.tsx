'use client'

import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import {
  buildHubScene,
  nullTextures,
  HUB_W,
  HUB_H,
  type HubBuildingDef,
  type HubTextures,
} from '@/lib/pixi/hubScene'
import { AssetManager } from '@/lib/engine/AssetManager'

/**
 * Only the launchpad's six modular sprites are loaded and passed through
 * (STS-611) — `buildLaunchpad` is the one builder whose textured branch draws
 * a complete structure matching its Graphics fallback. The other builders
 * (`buildScanStation`, `buildRefinery`, `buildSatelliteStation`,
 * `buildCommandCenter`) still only consume a partial slot set — e.g.
 * `buildScanStation`'s textured path draws only `scan_dish` at y=-52 with no
 * tripod/mast/feet beneath it — so their texture fields are deliberately left
 * null here until each of those is brought up to the same completeness.
 */
const LAUNCHPAD_SPRITES = [
  'hub_pad_deck', 'hub_pad_gantry_frame', 'hub_pad_swing_arm',
  'hub_pad_clamp', 'hub_pad_mast', 'hub_pad_tank',
] as const

async function loadLaunchpadTextures(): Promise<HubTextures> {
  const tex = nullTextures()
  const assets = new AssetManager()
  await assets.loadManifest('/game/assets/manifest.json')
  const loaded = await Promise.all(LAUNCHPAD_SPRITES.map(name => assets.loadTexture(name)))
  tex.pad_deck = loaded[0].isPlaceholder ? null : loaded[0].texture
  tex.pad_gantry_frame = loaded[1].isPlaceholder ? null : loaded[1].texture
  tex.pad_swing_arm = loaded[2].isPlaceholder ? null : loaded[2].texture
  tex.pad_clamp = loaded[3].isPlaceholder ? null : loaded[3].texture
  tex.pad_mast = loaded[4].isPlaceholder ? null : loaded[4].texture
  tex.pad_tank = loaded[5].isPlaceholder ? null : loaded[5].texture
  return tex
}

interface HubPixiCanvasProps {
  buildings: HubBuildingDef[]
}

/**
 * Signature of everything the scene actually draws. Used to rebuild when the
 * building list changes — the PixiJS app itself still initialises only once.
 */
function signature(buildings: HubBuildingDef[]): string {
  return buildings.map(b => `${b.kind}:${b.plotX}:${b.w}:${b.hot ? 1 : 0}:${b.status ?? ''}`).join('|')
}

export default function HubPixiCanvas({ buildings }: HubPixiCanvasProps) {
  const divRef = useRef<HTMLDivElement>(null)
  // Keep a stable ref to buildings so the effect can see latest values
  const buildingsRef = useRef(buildings)
  buildingsRef.current = buildings
  // Exposed by the init effect so prop changes can trigger a redraw without
  // tearing down and re-initialising the PixiJS Application.
  const rebuildRef = useRef<(() => void) | null>(null)

  // Game state hydrates from localStorage/PocketBase *after* this component
  // mounts, so `buildings` is routinely empty on the first render and only
  // fills in a tick later. Without this the scene stayed permanently empty
  // (buildingsRef updated, but nothing ever asked the canvas to redraw) and
  // structures were invisible until an unrelated resize happened to fire.
  const sig = signature(buildings)
  useEffect(() => {
    rebuildRef.current?.()
  }, [sig])

  useEffect(() => {
    const div = divRef.current
    if (!div) return

    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'display:block;width:100%;height:100%;'
    div.appendChild(canvas)

    const app = new Application()
    let scene: ReturnType<typeof buildHubScene> | null = null
    let destroyed = false
    let ro: ResizeObserver | null = null
    let tex: HubTextures = nullTextures()

    // Rebuilds the scene at the div's current size. Needed on desktop, where
    // the container can be far wider than HUB_W=402 (the coordinate space
    // building x-positions are authored in) — without rescaling, PixiJS's
    // autoDensity pins canvas.style.width to the literal render width (402px)
    // instead of stretching to fill the container, so every building renders
    // squeezed into a 402px-wide band on the left regardless of plot chosen.
    function rebuild() {
      if (!div) return
      const containerW = div.clientWidth || HUB_W
      const containerH = div.clientHeight || HUB_H
      const scaleX = containerW / HUB_W

      if (app.renderer) {
        app.renderer.resize(containerW, containerH)
      }

      scene?.destroy()
      const groundY = containerH * (1 - 0.22)
      scene = buildHubScene(app, buildingsRef.current, tex, { groundY, scaleX })
    }

    ;(async () => {
      const containerW = div.clientWidth || HUB_W
      const containerH = div.clientHeight || HUB_H

      const [, loadedTex] = await Promise.all([
        app.init({
          canvas,
          width: containerW,
          height: containerH,
          backgroundAlpha: 0,
          antialias: false,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
        }),
        loadLaunchpadTextures(),
      ])
      tex = loadedTex

      // Check destroyed AFTER init — if unmount raced the async init, clean up
      // now and bail. Guard with try/catch: PixiJS v8 _cancelResize can throw
      // if the renderer never fully initialised.
      if (destroyed) {
        try { app.destroy(true) } catch (_) {}
        return
      }

      rebuild()
      rebuildRef.current = rebuild

      ro = new ResizeObserver(() => rebuild())
      ro.observe(div)

      let elapsed = 0
      app.ticker.add((ticker) => {
        elapsed += ticker.deltaMS / 1000
        scene?.update(elapsed, ticker.deltaMS / 1000)
      })
    })()

    return () => {
      destroyed = true
      rebuildRef.current = null
      ro?.disconnect()
      scene?.destroy()
      // Only destroy if the renderer was fully initialised — avoids PixiJS v8
      // _cancelResize errors when cleanup races the async app.init().
      if (app.renderer) {
        try { app.destroy(true, { children: true }) } catch (_) {}
      }
      canvas.remove()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // mount once — buildings update via buildingsRef; resize handled by ResizeObserver

  return (
    <div
      ref={divRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 3,
      }}
    />
  )
}
