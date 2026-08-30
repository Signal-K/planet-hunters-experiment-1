/**
 * Authored Earth Base scenes, composed from the modular terrain kit.
 *
 * Two compositions, deliberately different (KES-260). The reported bug was:
 * *"When you click on the launchpad from the base scene, this right now zooms in
 * to the launchpad. This is good. But the background remains the same. So
 * obviously this is bad."* — the Launchpad screen rendered the identical
 * `HubWorldBackground` with `transform: none`, so the camera "moved" but the
 * horizon never did.
 *
 * `EARTH_BASE_WIDE` is the establishing shot: a full mountain range, the
 * distant industrial band, a long tree line. `EARTH_BASE_PAD` is the same place
 * from much closer — the far range drops below the frame, the distant
 * facilities are gone entirely, and near-field detail (road, fence, boulders,
 * scree) appears because at this distance you would actually see it. Same kit,
 * different placements: exactly what a modular background is for.
 *
 * Every entry here is one line and independently editable, which was the
 * requirement: *"All of them can be individually modified and controlled."*
 */

import type { SceneComposition } from './terrain-kit'

export const EARTH_BASE_WIDE: SceneComposition = {
  id: 'earth-base-wide',
  // The road is deliberately below the facility baseline. These normalized
  // points are the source of truth for the continuous road bed and future
  // road-aware actors.
  roadPaths: [{
    id: 'site-service-road',
    points: [
      { x: 0, groundOffset: -4.5 },
      { x: 18, groundOffset: -4.5 },
      { x: 38, groundOffset: -4.5 },
      { x: 62, groundOffset: -4.5 },
      { x: 82, groundOffset: -4.5 },
      { x: 100, groundOffset: -4.5 },
    ],
  }],
  bands: [
    {
      id: 'clouds',
      depth: 0.05,
      baseline: '62%',
      scale: 1,
      bricks: [
        { brick: 'cloud_bank_a', x: 8, scale: 1.1 },
        { brick: 'cloud_bank_b', x: 30, scale: 0.85, flip: true },
        { brick: 'cloud_bank_a', x: 52, scale: 0.8, lift: 26 },
        { brick: 'cloud_bank_b', x: 74, scale: 1.05 },
        { brick: 'cloud_bank_a', x: 92, scale: 0.7, lift: 34, flip: true },
      ],
    },
    {
      id: 'range-far',
      depth: 0.18,
      baseline: 'calc(var(--hub-ground) + 7%)',
      scale: 1.05,
      bricks: [
        { brick: 'mtn_peak_broad', x: -2 },
        { brick: 'mtn_saw_ridge', x: 13, scale: 0.82, flip: true },
        { brick: 'mtn_peak_tall', x: 27, scale: 0.9 },
        { brick: 'mtn_horn', x: 38, scale: 0.72, flip: true },
        { brick: 'mtn_peak_broad', x: 50, scale: 0.98, flip: true },
        { brick: 'mtn_shoulder', x: 63, scale: 1.0 },
        { brick: 'mtn_peak_tall', x: 74, scale: 1.06, flip: true },
        { brick: 'mtn_saw_ridge', x: 88, scale: 0.88 },
        { brick: 'mtn_horn', x: 99, scale: 0.8 },
      ],
    },
    {
      id: 'range-mid',
      depth: 0.34,
      baseline: 'calc(var(--hub-ground) + 3.5%)',
      scale: 1,
      bricks: [
        { brick: 'mtn_shoulder', x: 4, scale: 0.8 },
        { brick: 'mesa', x: 19, scale: 0.78, flip: true },
        { brick: 'mtn_saw_ridge', x: 34, scale: 0.6, flip: true },
        { brick: 'mtn_peak_tall', x: 50, scale: 0.6 },
        { brick: 'mesa', x: 65, scale: 0.68 },
        { brick: 'mtn_shoulder', x: 80, scale: 0.78 },
        { brick: 'mtn_saw_ridge', x: 95, scale: 0.55 },
      ],
    },
    {
      // The distant sister-facility band. These are Blender bricks in the same
      // style as the real buildings, hazed back by depth — not the SVG glyphs
      // this replaces, which could never match the facet split no matter how
      // they were tuned, and were the literal source of "why do we have
      // different styles between the buildings in the background and in the
      // foreground?".
      id: 'facilities-far',
      depth: 0.46,
      baseline: 'calc(var(--hub-ground) + 1.2%)',
      scale: 0.82,
      bricks: [
        { brick: 'far_block', x: 6 },
        { brick: 'far_silo', x: 12, scale: 0.9 },
        { brick: 'far_mast', x: 17, scale: 0.8 },
        { brick: 'far_dome', x: 24 },
        { brick: 'far_block', x: 31, scale: 0.85, flip: true },
        { brick: 'far_dish', x: 38, scale: 0.9 },
        { brick: 'far_silo', x: 45 },
        { brick: 'far_block', x: 57, scale: 1.05 },
        { brick: 'far_mast', x: 63 },
        { brick: 'far_dome', x: 70, scale: 0.9, flip: true },
        { brick: 'far_silo', x: 77, scale: 1.05 },
        { brick: 'far_block', x: 84, scale: 0.9 },
        { brick: 'far_dish', x: 91, flip: true },
        { brick: 'far_block', x: 97, scale: 0.8 },
      ],
    },
    {
      id: 'treeline',
      depth: 0.74,
      baseline: 'calc(var(--hub-ground) - 0.5%)',
      scale: 1,
      bricks: [
        { brick: 'tree_pine_cluster', x: 3, scale: 0.8 },
        { brick: 'tree_pine_tall', x: 11, scale: 0.7 },
        { brick: 'tree_pine_cluster', x: 17, scale: 0.62, flip: true },
        { brick: 'pylon', x: 27, scale: 0.72 },
        { brick: 'tree_pine_short', x: 34, scale: 0.8 },
        { brick: 'tree_pine_cluster', x: 40, scale: 0.7 },
        { brick: 'pylon', x: 52, scale: 0.72 },
        { brick: 'tree_pine_cluster', x: 62, scale: 0.66, flip: true },
        { brick: 'tree_pine_tall', x: 70, scale: 0.72 },
        { brick: 'pylon', x: 78, scale: 0.72 },
        { brick: 'tree_pine_cluster', x: 86, scale: 0.78 },
        { brick: 'tree_pine_short', x: 95, scale: 0.85 },
        { brick: 'tree_pine_cluster', x: 99, scale: 0.7, flip: true },
      ],
    },
    {
      // The continuous road bed is rendered from roadPaths below. Keep this
      // band for non-road foreground detail only; individual road sprites
      // here used to create a second, broken road over the path.
      id: 'ground-detail',
      depth: 0.88,
      baseline: 'calc(var(--hub-ground) - 4.5%)',
      scale: 1,
      bricks: [
        { brick: 'scree', x: 44, scale: 0.9 },
        { brick: 'rock_cluster', x: 72, scale: 0.75 },
        { brick: 'shrub', x: 90, scale: 1.1 },
      ],
    },
    {
      // Open ground in front of the facility. Without this the bottom fifth of
      // the frame is one flat fill — the structures stand at the ground line
      // and nothing exists nearer than they are, which flattens the whole
      // scene back into a backdrop-plus-sprites read.
      id: 'foreground',
      depth: 1,
      baseline: 'calc(var(--hub-ground) - 9%)',
      scale: 1.25,
      bricks: [
        { brick: 'rock_cluster', x: 6, scale: 0.9 },
        { brick: 'shrub', x: 17, scale: 1.2 },
        { brick: 'scree', x: 27, scale: 1.1, flip: true },
        { brick: 'rock_boulder', x: 40, scale: 0.85 },
        { brick: 'shrub', x: 52, scale: 1.0, flip: true },
        { brick: 'rock_cluster', x: 63, scale: 1.05, flip: true },
        { brick: 'scree', x: 76, scale: 1.0 },
        { brick: 'shrub', x: 87, scale: 1.15 },
        { brick: 'rock_boulder', x: 96, scale: 1.0, flip: true },
      ],
    },
  ],
}

export const EARTH_BASE_PAD: SceneComposition = {
  id: 'earth-base-pad',
  roadPaths: [{
    id: 'site-service-road',
    points: [
      { x: 0, groundOffset: -7 },
      { x: 18, groundOffset: -7 },
      { x: 38, groundOffset: -7 },
      { x: 62, groundOffset: -7 },
      { x: 82, groundOffset: -7 },
      { x: 100, groundOffset: -7 },
    ],
  }],
  bands: [
    {
      id: 'clouds',
      depth: 0.05,
      baseline: '70%',
      bricks: [
        { brick: 'cloud_bank_a', x: 14, scale: 1.5 },
        { brick: 'cloud_bank_b', x: 46, scale: 1.2, flip: true },
        { brick: 'cloud_bank_a', x: 82, scale: 1.3, lift: 30 },
      ],
    },
    {
      // Only the tallest summits clear the frame at this distance. The wide
      // shot's full range would put the same horizon back and undo the zoom.
      id: 'range-far',
      depth: 0.2,
      baseline: 'calc(var(--hub-ground) + 4%)',
      scale: 1.55,
      bricks: [
        { brick: 'mtn_peak_broad', x: -8, scale: 0.95 },
        { brick: 'mtn_horn', x: 14, scale: 0.78 },
        { brick: 'mtn_saw_ridge', x: 32, scale: 0.8, flip: true },
        { brick: 'mtn_peak_tall', x: 52, scale: 0.85, flip: true },
        { brick: 'mtn_shoulder', x: 72, scale: 0.85 },
        { brick: 'mtn_peak_broad', x: 92, scale: 0.9, flip: true },
        { brick: 'mtn_horn', x: 108, scale: 0.7, flip: true },
      ],
    },
    {
      id: 'hills-near',
      depth: 0.5,
      baseline: 'calc(var(--hub-ground) + 0.5%)',
      scale: 1.45,
      bricks: [
        { brick: 'hill_long', x: 2, scale: 1.0 },
        { brick: 'hill_round', x: 26, scale: 0.9 },
        { brick: 'bluff', x: 46, scale: 0.85, flip: true },
        { brick: 'hill_long', x: 68, scale: 1.05, flip: true },
        { brick: 'hill_round', x: 94, scale: 0.95, flip: true },
      ],
    },
    {
      id: 'treeline',
      depth: 0.68,
      baseline: 'calc(var(--hub-ground) - 0.5%)',
      scale: 1.35,
      bricks: [
        { brick: 'tree_pine_cluster', x: 2, scale: 0.9 },
        { brick: 'tree_pine_tall', x: 16, scale: 0.9 },
        { brick: 'tree_pine_cluster', x: 30, scale: 0.75, flip: true },
        { brick: 'pylon', x: 46, scale: 0.85 },
        { brick: 'tree_pine_short', x: 58, scale: 1.0 },
        { brick: 'tree_pine_cluster', x: 72, scale: 0.85, flip: true },
        { brick: 'tree_pine_tall', x: 86, scale: 0.85 },
        { brick: 'tree_pine_cluster', x: 98, scale: 0.8 },
      ],
    },
    {
      // Near-field detail that only exists on this screen. The road itself is
      // one continuous bed from roadPaths; fences and debris sit beside it.
      id: 'ground-detail',
      depth: 0.88,
      baseline: 'calc(var(--hub-ground) - 7%)',
      scale: 1.45,
      bricks: [
        { brick: 'fence_run', x: 30, scale: 1.0 },
        { brick: 'rock_cluster', x: 43, scale: 0.9 },
        { brick: 'fence_run', x: 70, scale: 1.0 },
        { brick: 'scree', x: 84, scale: 1.0 },
        { brick: 'rock_boulder', x: 93, scale: 1.0 },
      ],
    },
    {
      id: 'foreground',
      depth: 1,
      baseline: 'calc(var(--hub-ground) - 11%)',
      scale: 1.8,
      bricks: [
        { brick: 'rock_boulder', x: 8, scale: 1.0 },
        { brick: 'shrub', x: 22, scale: 1.2, flip: true },
        { brick: 'scree', x: 38, scale: 1.15 },
        { brick: 'rock_cluster', x: 58, scale: 1.0, flip: true },
        { brick: 'shrub', x: 74, scale: 1.1 },
        { brick: 'rock_boulder', x: 91, scale: 1.15, flip: true },
      ],
    },
  ],
}

export const COMPOSITIONS = {
  'earth-base-wide': EARTH_BASE_WIDE,
  'earth-base-pad': EARTH_BASE_PAD,
} as const

export type CompositionId = keyof typeof COMPOSITIONS
