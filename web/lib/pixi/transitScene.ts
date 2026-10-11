import { Graphics } from 'pixi.js'

export type TargetKind = 'asteroid' | 'planet' | 'moon' | 'earth'

// Stylized landmasses in spherical (longitude, latitude) terms so Earth can
// slowly rotate like a real globe instead of sitting as a static painted
// disc — loosely Africa/Eurasia/Americas-shaped, not geographically exact.
const EARTH_CONTINENTS: { lon: number; lat: number; w: number; h: number }[] = [
  { lon: 0.15, lat: -0.05, w: 0.30, h: 0.46 },   // Africa-ish
  { lon: 0.95, lat: 0.42, w: 0.40, h: 0.24 },    // Eurasia-ish
  { lon: -1.35, lat: 0.10, w: 0.22, h: 0.50 },   // Americas-ish
  { lon: -2.5, lat: -0.35, w: 0.14, h: 0.14 },   // Antarctica-adjacent island
  { lon: 2.7, lat: -0.30, w: 0.16, h: 0.12 },    // Australia-ish
]

const EARTH_CLOUDS: { lon: number; lat: number; w: number; h: number }[] = [
  { lon: 0.6, lat: -0.5, w: 0.34, h: 0.09 },
  { lon: -0.4, lat: 0.15, w: 0.26, h: 0.08 },
  { lon: 1.8, lat: 0.55, w: 0.3, h: 0.09 },
  { lon: -2.0, lat: -0.1, w: 0.22, h: 0.07 },
  { lon: 3.3, lat: 0.05, w: 0.28, h: 0.08 },
]

function drawGlobeFeature(
  g: Graphics, cx: number, cy: number, r: number,
  feature: { lon: number; lat: number; w: number; h: number },
  rotation: number, color: number, baseAlpha: number,
) {
  const angle = feature.lon + rotation
  const cosA = Math.cos(angle)
  if (cosA < -0.2) return  // far side of the globe — not visible
  const visibility = Math.max(0, Math.min(1, cosA + 0.2))
  const xProj = Math.sin(angle) * 0.82
  const wScale = Math.max(0.1, visibility)
  g.ellipse(cx + r * xProj, cy + r * feature.lat * 0.8, Math.max(0.5, r * feature.w * wScale), r * feature.h)
    .fill({ color, alpha: baseAlpha * Math.min(1, visibility * 1.6) })
}

/** Launch-orbit globe. The flight scene no longer paints a body here. */
export function drawPlanet(g: Graphics, cx: number, cy: number, r: number, kind: TargetKind, rotation = 0) {
  g.clear()
  if (r < 1) return

  // Light blueprint body (SSL-423): flat ice/cyan fill, offset shade, 3px ink outline.
  const bodyColor = kind === 'asteroid' ? 0xa9bccd : kind === 'moon' ? 0xc6d3df : kind === 'earth' ? 0x42a6df : 0x6fb3d9
  const outline = Math.max(2, Math.min(4, r * 0.06))
  g.circle(cx + r * 0.08, cy + r * 0.08, r).fill({ color: 0x1f78c1, alpha: 0.35 })
  g.circle(cx, cy, r).fill(bodyColor)

  if (kind === 'earth' && r > 6) {
    for (const feature of EARTH_CONTINENTS) {
      drawGlobeFeature(g, cx, cy, r, feature, rotation, 0x168a80, 0.9)
    }
    if (r > 8) {
      // polar ice caps stay fixed at the poles regardless of rotation
      g.ellipse(cx, cy - r * 0.86, r * 0.5, r * 0.18).fill({ color: 0xffffff, alpha: 0.9 })
      g.ellipse(cx, cy + r * 0.86, r * 0.46, r * 0.16).fill({ color: 0xffffff, alpha: 0.85 })
    }
    if (r > 18) {
      for (const cloud of EARTH_CLOUDS) {
        drawGlobeFeature(g, cx, cy, r, cloud, rotation * 0.6, 0xffffff, 0.55)
      }
    }
  }

  if (kind === 'planet' && r > 16) {
    g.ellipse(cx, cy + r * 0.08, r * 0.78, r * 0.13).stroke({ color: 0xffffff, alpha: 0.6, width: r * 0.07 })
    g.ellipse(cx, cy - r * 0.18, r * 0.6, r * 0.09).stroke({ color: 0xffffff, alpha: 0.5, width: r * 0.05 })
  }

  if ((kind === 'moon' || kind === 'asteroid') && r > 10) {
    const craters: [number, number, number][] = [[0.28, 0.15, 0.14], [-0.22, 0.32, 0.1], [0.1, -0.28, 0.08]]
    for (const [fx, fy, fr] of craters) {
      g.circle(cx + r * fx, cy + r * fy, r * fr).fill({ color: 0x1f78c1, alpha: 0.28 })
    }
  }

  // crescent shade on the side away from the light, then the ink outline
  g.circle(cx + r * 0.22, cy + r * 0.05, r * 0.92).fill({ color: 0x1f78c1, alpha: 0.18 })
  g.circle(cx, cy, r).stroke({ color: 0x0f2436, width: outline })
}
