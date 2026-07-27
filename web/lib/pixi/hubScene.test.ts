import { describe, it, expect } from 'vitest'
import { Application, Container } from 'pixi.js'
import { buildHubScene, nullTextures, type HubBuildingDef } from './hubScene'

// buildHubScene only touches app.stage, so a bare Container stands in for a
// real (WebGL-backed) Application here — this exercises the scene graph and
// its geometry without needing a GPU context in jsdom.
function stubApp(): Application {
  // buildHubScene reads renderer.width/height to size the terrain layer in
  // real pixels, so the stub carries those alongside the stage.
  return {
    stage: new Container(),
    renderer: { width: 402, height: 874 },
  } as unknown as Application
}

// root's first child is the terrain layer; the rest are per-building holders.
function buildingHolders(app: Application): Container[] {
  const root = app.stage.children[0] as Container
  return (root.children as Container[]).filter(c => c.label === 'building')
}

const GROUND_Y = 600

function defs(): HubBuildingDef[] {
  return [
    { kind: 'launchpad', plotX: 60, w: 98, hot: false, status: 'ok' },
    { kind: 'refinery', plotX: 154, w: 84, status: 'ok' },
    { kind: 'scan-station', plotX: 248, w: 80, status: 'ok' },
    { kind: 'satellite-monitoring-station', plotX: 342, w: 86, status: 'info' },
  ]
}

describe('buildHubScene', () => {
  it('adds one container per building', () => {
    const app = stubApp()
    const scene = buildHubScene(app, defs(), nullTextures(), { groundY: GROUND_Y, scaleX: 1 })
    expect(app.stage.children).toHaveLength(1)
    // root holds the terrain layer plus one holder per building
    expect(buildingHolders(app)).toHaveLength(4)
    scene.destroy()
    expect(app.stage.children).toHaveLength(0)
  })

  it('draws each structure standing on the ground line, extending upward', () => {
    const app = stubApp()
    buildHubScene(app, defs(), nullTextures(), { groundY: GROUND_Y, scaleX: 1 })
    for (const holder of buildingHolders(app)) {
      const b = holder.getBounds()
      // Feet land on (or just below, for the mound collar) the ground line.
      expect(b.maxY).toBeGreaterThan(GROUND_Y - 4)
      expect(b.maxY).toBeLessThan(GROUND_Y + 12)
      // Structures have real height and rise above the ground, never below it.
      expect(GROUND_Y - b.minY).toBeGreaterThan(60)
      expect(b.width).toBeGreaterThan(20)
    }
  })

  it('scales art to the requested width and honours scaleX for plot position', () => {
    const app = stubApp()
    buildHubScene(app, [{ kind: 'launchpad', plotX: 100, w: 98 }], nullTextures(), { groundY: GROUND_Y, scaleX: 2 })
    const holder = buildingHolders(app)[0]
    expect(holder.x).toBe(200)
    // Silhouette width tracks the requested `w` (mound collar runs slightly wider).
    const b = holder.getBounds()
    expect(b.width).toBeGreaterThan(70)
    expect(b.width).toBeLessThan(140)
  })

  it('animates without throwing and keeps alpha in range', () => {
    const app = stubApp()
    const scene = buildHubScene(app, defs(), nullTextures(), { groundY: GROUND_Y, scaleX: 1 })
    for (let i = 0; i < 60; i++) scene.update(i / 60, 1 / 60)
    for (const holder of buildingHolders(app)) {
      for (const child of holder.children) {
        expect(child.alpha).toBeGreaterThanOrEqual(0)
        expect(child.alpha).toBeLessThanOrEqual(1)
      }
    }
  })
})
