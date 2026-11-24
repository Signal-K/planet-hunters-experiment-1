import type { FlightCraftLook, FlightSceneHandle } from '@takeon/engine'
import { authoredScene, resolvePrefab } from '@/lib/engine/SceneGraph'
import { DEFAULT_LIVERY, type RocketLivery } from './looks'

// Use the launchpad's authored asset, including its panel lines and ink outline.
// Coordinates isolate the surviving upper stage and exclude the drawing's callouts.
const UPPER_STAGE = { x: 44, y: 0, width: 58, height: 166 }
const OUTLINE = [[67, 1], [79, 1], [82, 36], [96, 77], [101, 82], [101, 123], [95, 132], [94, 166], [47, 166], [48, 132], [44, 123], [44, 82], [49, 77], [62, 36], [63, 4]]

const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))

/** Compose the actual launch art into Takeon's flight, at the simulated ship position. */
export function installRocketSprite(scene: FlightSceneHandle, canvas: HTMLCanvasElement) {
  const asset = resolvePrefab(authoredScene('launchpad')!, 'launchpad-complex', 100, 100)
    .find(object => object.id === 'staged-rocket')?.asset
  if (!asset) return { setCraft: (craft: FlightCraftLook) => scene.setCraft(craft), destroy: () => {} }

  const image = new Image()
  const sprite = document.createElement('canvas')
  sprite.width = UPPER_STAGE.width
  sprite.height = UPPER_STAGE.height
  let paint = DEFAULT_LIVERY
  let craft: FlightCraftLook
  let ready = false
  let disposed = false
  let orbit = 0
  const draw = scene.view.draw.bind(scene.view)

  const repaint = () => {
    const g = sprite.getContext('2d')!
    g.clearRect(0, 0, sprite.width, sprite.height)
    g.save()
    g.beginPath()
    OUTLINE.forEach(([x, y], i) => i ? g.lineTo(x - UPPER_STAGE.x, y) : g.moveTo(x - UPPER_STAGE.x, y))
    g.closePath()
    g.clip()
    g.drawImage(image, UPPER_STAGE.x, UPPER_STAGE.y, sprite.width, sprite.height, 0, 0, sprite.width, sprite.height)
    g.restore()
    const pixels = g.getImageData(0, 0, sprite.width, sprite.height)
    const hull = rgb(paint.hull), trim = rgb(paint.trim)
    const originalHull = rgb(DEFAULT_LIVERY.hull), originalTrim = rgb(DEFAULT_LIVERY.trim)
    for (let i = 0; i < pixels.data.length; i += 4) {
      const [r, green, b] = pixels.data.subarray(i, i + 3)
      if (!pixels.data[i + 3] || Math.max(r, green, b) < 75) continue // preserve ink
      const blue = b > r * 1.15 && b > green * 1.05
      const neutral = Math.max(r, green, b) - Math.min(r, green, b) < 48
      if (!blue && !neutral) continue
      const target = blue ? trim : hull, original = blue ? originalTrim : originalHull
      for (let c = 0; c < 3; c++) pixels.data[i + c] = Math.min(255, pixels.data[i + c] * target[c] / original[c])
    }
    g.putImageData(pixels, 0, 0)
  }

  const setCraft = (next: FlightCraftLook, livery = DEFAULT_LIVERY) => {
    craft = next
    paint = livery
    if (ready) repaint()
    // Keep the procedural ship as a fallback until the authored art has loaded.
    scene.setCraft(ready ? { sections: [], scale: 0 } : next)
  }
  image.onload = () => {
    if (disposed) return
    ready = true
    repaint()
    scene.setCraft({ sections: [], scale: 0 })
    canvas.dataset.rocketArt = 'launchpad-upper-stage'
  }
  image.src = asset.replace(/^web\/public/, '')

  scene.view.draw = (state, dt = 1 / 60) => {
    draw(state, dt)
    if (!ready) return
    orbit = Math.max(0, Math.min(1, orbit + (state.phase === 'orbit' ? dt : -dt) / 1.1))
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (w <= 0 || h <= 0) return
    // Match the chase projection in the pinned TakeOn 0.2.5 FlightView.
    const f = Math.max(w * 0.62, Math.min(h * 0.95, w * 1.1))
    const cameraHeight = Math.max(1.2, Math.min(2.6, 0.36 * h * 5.2 / f))
    const x = w / 2 + state.x * 3.1 * 0.55 * f / 5.2
    const y = h * 0.3 - (state.y * 1.75 * 0.55 - cameraHeight) * f / 5.2
    const orbitY = h * (0.4 - (state.altitude - 1) * 0.28)
    const length = Math.min(180, Math.min(w, h) * 0.3)
    const width = length * sprite.width / sprite.height
    const g = canvas.getContext('2d')!
    g.save()
    g.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0)
    g.translate(x * (1 - orbit) + w * 0.42 * orbit, y * (1 - orbit) + orbitY * orbit)
    g.rotate((0.18 + state.vx * 0.12) * (1 - orbit) + Math.PI / 2 * orbit)
    const thrust = state.phase === 'approach' ? 0.45 : state.slowed ? 0.3 : state.boosting ? 2 : 1
    const flame = length * (0.18 + 0.12 * thrust) * (0.92 + 0.08 * Math.sin(state.time * 31))
    const glow = g.createLinearGradient(0, 0, 0, flame)
    glow.addColorStop(0, '#fff8e8')
    glow.addColorStop(0.35, craft?.plume ?? '#ffb23e')
    glow.addColorStop(1, 'transparent')
    g.fillStyle = glow
    g.beginPath()
    g.moveTo(-width * 0.23, -2)
    g.quadraticCurveTo(-width * 0.2, flame * 0.55, 0, flame)
    g.quadraticCurveTo(width * 0.2, flame * 0.55, width * 0.23, -2)
    g.fill()
    g.drawImage(sprite, -width / 2, -length, width, length)
    g.restore()
  }
  return {
    setCraft,
    destroy: () => { disposed = true; image.onload = null; scene.view.draw = draw; delete canvas.dataset.rocketArt },
  }
}
