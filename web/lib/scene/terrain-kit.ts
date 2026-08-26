/**
 * The modular terrain kit — the registry side of `tools/blender/models/terrain.py`.
 *
 * Every brick is one Blender-rendered sprite with its base at the ground line
 * and transparency everywhere else, so a scene is composed by *placing* bricks
 * rather than by shipping a painted plate. This replaces
 * `hub/earth_base_exterior_v1.jpg` and the hand-written SVG skyline glyphs that
 * used to live in `HubWorldBackground.tsx` (KES-260).
 *
 * `w`/`h` are the sprite's authored layout size in CSS pixels — the `layout`
 * tuple its build function returns. They are the sprite's size at scale 1, and
 * they must stay in step with the Python: the render is 3x these numbers, so a
 * mismatch shows up as a squashed brick, not an error.
 */

export type TerrainBrickId =
  | 'mtn_peak_tall' | 'mtn_peak_broad' | 'mtn_shoulder' | 'mesa'
  | 'hill_round' | 'hill_long' | 'bluff'
  | 'rock_boulder' | 'rock_cluster' | 'scree'
  | 'tree_pine_tall' | 'tree_pine_short' | 'tree_pine_cluster' | 'shrub'
  | 'road_segment' | 'road_ramp' | 'pylon' | 'fence_run'
  | 'far_dome' | 'far_silo' | 'far_mast' | 'far_dish' | 'far_block'
  | 'cloud_bank_a' | 'cloud_bank_b'

export interface TerrainBrick {
  /** Authored width in CSS px at scale 1. */
  w: number
  /** Authored height in CSS px at scale 1. */
  h: number
}

export const TERRAIN_KIT: Record<TerrainBrickId, TerrainBrick> = {
  mtn_peak_tall:     { w: 188, h: 150 },
  mtn_peak_broad:    { w: 232, h: 132 },
  mtn_shoulder:      { w: 168, h: 92 },
  mesa:              { w: 140, h: 86 },
  hill_round:        { w: 150, h: 62 },
  hill_long:         { w: 206, h: 54 },
  bluff:             { w: 124, h: 70 },
  rock_boulder:      { w: 44, h: 34 },
  rock_cluster:      { w: 72, h: 40 },
  scree:             { w: 88, h: 20 },
  tree_pine_tall:    { w: 30, h: 64 },
  tree_pine_short:   { w: 26, h: 44 },
  tree_pine_cluster: { w: 84, h: 62 },
  shrub:             { w: 26, h: 16 },
  road_segment:      { w: 160, h: 22 },
  road_ramp:         { w: 72, h: 26 },
  pylon:             { w: 40, h: 76 },
  fence_run:         { w: 96, h: 14 },
  far_dome:          { w: 48, h: 40 },
  far_silo:          { w: 34, h: 46 },
  far_mast:          { w: 26, h: 74 },
  far_dish:          { w: 44, h: 40 },
  far_block:         { w: 40, h: 38 },
  cloud_bank_a:      { w: 120, h: 38 },
  cloud_bank_b:      { w: 82, h: 28 },
}

export function brickSrc(id: TerrainBrickId): string {
  return `/game/assets/terrain/${id}.png`
}

/** One placed brick. `x` is a percentage of scene width; `lift` nudges a brick
 *  off the layer's own baseline in px (positive = up), for a tree standing on a
 *  ridge rather than on the ground. */
export interface BrickPlacement {
  brick: TerrainBrickId
  x: number
  scale?: number
  lift?: number
  flip?: boolean
}

/**
 * A depth band. `depth` 0 is the horizon and 1 is the camera; it drives both the
 * atmospheric haze the layer is washed with and how far it parallaxes. Bands are
 * drawn back to front in array order.
 *
 * `baseline` is where this band's bricks stand, as a percentage of scene height
 * from the bottom — usually at or just above `--hub-ground`, so a far range sits
 * slightly higher up the frame than the near one and the ground reads as
 * receding.
 */
export interface SceneBand {
  id: string
  depth: number
  baseline: string
  bricks: BrickPlacement[]
  /** Multiplies the whole band's scale — the single knob for "push this range
   *  further away" without editing every brick in it. */
  scale?: number
}

export interface SceneComposition {
  id: string
  /** Design width the `x` percentages were authored against; the band is laid
   *  out in percentages so it stretches, but this documents the intent. */
  bands: SceneBand[]
}
