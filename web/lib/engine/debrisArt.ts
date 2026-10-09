import type { Texture } from 'pixi.js'

export interface AnchoredTexture {
  texture: Texture
  ax: number
  ay: number
}

/** Raster set for one sky-event shower. Absent means the vector fallback. */
export interface DebrisArtSet {
  fallFrames: Texture[]
  fallFps: number
  /** Ground contact inside a fall frame, 0..1. */
  fallAnchor: { x: number; y: number }
  intact: AnchoredTexture[]
  mined: AnchoredTexture[]
  impactFrames: Texture[]
  impactFps: number
  impactAnchor: { x: number; y: number }
  dust: Texture | null
  streaks: AnchoredTexture[]
  streakBlend: 'normal' | 'screen'
}
