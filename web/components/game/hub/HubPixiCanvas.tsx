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
 * Load the authored hub sprites used by both the launchpad and the four
 * primary structures. The scene builders retain procedural fallbacks when an
 * asset is unavailable, but passing the real renders here is what makes the
 * hub match the authored mobile art rather than the sparse fallback geometry.
 */
const HUB_SPRITES = [
  'hub_pad_deck', 'hub_pad_gantry_frame', 'hub_pad_swing_arm',
  'hub_pad_clamp', 'hub_pad_mast', 'hub_pad_tank',
  'hub_depot_tank', 'hub_scan_dish', 'hub_refinery_modular_v2', 'hub_scan_station_modular_v2',
  'hub_cmd_building',
  // Loaded alongside the pad, not just when hot — a launch can be triggered
  // between renders, and the alternative (loading these lazily on the first
  // `hot` frame) would show a bare pad for one frame every time.
  'ship_sr1', 'ship_sr2',
] as const

async function loadHubTextures(): Promise<HubTextures> {
  const tex = nullTextures()
  const assets = new AssetManager()
  await assets.loadManifest('/game/assets/manifest.json')
  const loaded = await Promise.all(HUB_SPRITES.map(name => assets.loadTexture(name)))
  const texture = (name: typeof HUB_SPRITES[number]) => {
    const index = HUB_SPRITES.indexOf(name)
    return loaded[index].isPlaceholder ? null : loaded[index].texture
  }
  tex.pad_deck = texture('hub_pad_deck')
  tex.pad_gantry_frame = texture('hub_pad_gantry_frame')
  tex.pad_swing_arm = texture('hub_pad_swing_arm')
  tex.pad_clamp = texture('hub_pad_clamp')
  tex.pad_mast = texture('hub_pad_mast')
  tex.pad_tank = texture('hub_pad_tank')
  tex.depot_tank = texture('hub_depot_tank')
  tex.scan_dish = texture('hub_scan_dish')
  tex.refinery_modular = texture('hub_refinery_modular_v2')
  tex.scan_station_modular = texture('hub_scan_station_modular_v2')
  tex.cmd_building = texture('hub_cmd_building')
  tex.ship_sr1 = texture('ship_sr1')
  tex.ship_sr2 = texture('ship_sr2')
  return tex
}

interface HubPixiCanvasProps {
  buildings: HubBuildingDef[]
  rocketVariant?: 'explorer' | 'prospector'
}

/**
 * Signature of everything the scene actually draws. Used to rebuild when the
 * building list changes — the PixiJS app itself still initialises only once.
 */
function signature(buildings: HubBuildingDef[], rocketVariant?: 'explorer' | 'prospector'): string {
  return `${rocketVariant ?? 'explorer'}|${buildings.map(b => `${b.kind}:${b.plotX}:${b.w}:${b.hot ? 1 : 0}:${b.status ?? ''}`).join('|')}`
}

export default function HubPixiCanvas({ buildings, rocketVariant = 'explorer' }: HubPixiCanvasProps) {
  const divRef = useRef<HTMLDivElement>(null)
  // Keep a stable ref to buildings so the effect can see latest values
  const buildingsRef = useRef(buildings)
  buildingsRef.current = buildings
  const rocketVariantRef = useRef(rocketVariant)
  rocketVariantRef.current = rocketVariant
  // Exposed by the init effect so prop changes can trigger a redraw without
  // tearing down and re-initialising the PixiJS Application.
  const rebuildRef = useRef<(() => void) | null>(null)

  // Game state hydrates from localStorage/PocketBase *after* this component
  // mounts, so `buildings` is routinely empty on the first render and only
  // fills in a tick later. Without this the scene stayed permanently empty
  // (buildingsRef updated, but nothing ever asked the canvas to redraw) and
  // structures were invisible until an unrelated resize happened to fire.
  const sig = signature(buildings, rocketVariant)
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
      scene = buildHubScene(app, buildingsRef.current.map(building => (
        building.kind === 'launchpad'
          ? { ...building, rocketVariant: rocketVariantRef.current }
          : building
      )), tex, { groundY, scaleX })
    }

    ;(async () => {
      const containerW = div.clientWidth || HUB_W
      const containerH = div.clientHeight || HUB_H

      // WebGL/WebGPU init (or the sprite manifest fetch) can fail or hang —
      // e.g. no GPU context available, a blocked/slow asset request. Pixi is
      // an enhancement over the always-rendered DOM sky/terrain/structure
      // layers underneath (HubWorldBackground, HubStructureArt), never the
      // thing gating Earth Base's legibility, so a rejection here must only
      // leave this canvas blank — not throw unhandled and not block those
      // DOM layers, which already render independently of this effect
      // (KES-167).
      let loadedTex: HubTextures
      try {
        const result = await Promise.all([
          app.init({
            canvas,
            width: containerW,
            height: containerH,
            backgroundAlpha: 0,
            antialias: false,
            resolution: Math.min(window.devicePixelRatio || 1, 2),
            autoDensity: true,
          }),
          loadHubTextures(),
        ])
        loadedTex = result[1]
      } catch (err) {
        console.warn('[HubPixiCanvas] Pixi init failed; falling back to DOM scene layers', err)
        return
      }
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
