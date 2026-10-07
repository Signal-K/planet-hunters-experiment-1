import { Assets, Rectangle, Texture } from 'pixi.js'
import { ORIONIDS_VARIANTS, type OrionidsVariantId } from './theme'
import type { DebrisArtSet } from '@/lib/engine/debrisArt'

async function loadTexture(url: string): Promise<Texture> {
  return Assets.load<Texture>(url)
}

/** Equal cells, left to right, one row. Anchor is applied on the sprite, not the texture. */
function sliceRow(sheet: Texture, frameW: number, frameH: number, count: number): Texture[] {
  const frames: Texture[] = []
  for (let i = 0; i < count; i++) {
    frames.push(new Texture({
      source: sheet.source,
      frame: new Rectangle(i * frameW, 0, frameW, frameH),
    }))
  }
  return frames
}

/** Loads one variant set. Returns null if any texture fails so mining keeps the plain ore field. */
export async function loadOrionidsArt(variantId: OrionidsVariantId): Promise<DebrisArtSet | null> {
  const variant = ORIONIDS_VARIANTS[variantId]
  try {
    const [fallSheet, impactSheet, dust, ...rest] = await Promise.all([
      loadTexture(variant.fallSheet),
      loadTexture(variant.impactSheet),
      loadTexture(variant.dust),
      ...variant.debris.map(d => loadTexture(d.file)),
      ...variant.mined.map(d => loadTexture(d.file)),
      ...variant.streaks.map(d => loadTexture(d.file)),
    ])
    const debrisCount = variant.debris.length
    const minedCount = variant.mined.length
    const intactTex = rest.slice(0, debrisCount)
    const minedTex = rest.slice(debrisCount, debrisCount + minedCount)
    const streakTex = rest.slice(debrisCount + minedCount)
    return {
      fallFrames: sliceRow(fallSheet, variant.fallFrame.w, variant.fallFrame.h, variant.fallFrame.count),
      fallFps: variant.fallFrame.fps,
      fallAnchor: { x: variant.fallFrame.ax, y: variant.fallFrame.ay },
      intact: intactTex.map((texture, i) => ({ texture, ax: variant.debris[i].ax, ay: variant.debris[i].ay })),
      mined: minedTex.map((texture, i) => ({ texture, ax: variant.mined[i].ax, ay: variant.mined[i].ay })),
      impactFrames: sliceRow(impactSheet, variant.impactFrame.w, variant.impactFrame.h, variant.impactFrame.count),
      impactFps: variant.impactFrame.fps,
      impactAnchor: { x: variant.impactFrame.ax, y: variant.impactFrame.ay },
      dust,
      streaks: streakTex.map((texture, i) => ({ texture, ax: variant.streaks[i].ax, ay: variant.streaks[i].ay })),
      streakBlend: variant.streakBlend,
    }
  } catch (err) {
    console.warn('[orionids] art failed to load; mining stays on the plain field', err)
    return null
  }
}
