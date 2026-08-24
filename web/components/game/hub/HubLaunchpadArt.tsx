'use client'

import React from 'react'

/**
 * Modular launchpad composite (KES-233) — deck, twin gantry frames, swing
 * arm, clamps, masts and tank as independent sprites, positioned to match
 * the authored Pixi layout (`buildLaunchpad` in `lib/pixi/hubScene.ts`,
 * itself authored against `tools/blender/models/launchpad.py`'s `layout`
 * tuples). That Pixi renderer was intentionally dropped from the Hub at
 * KES-57 (Docker/CI visual-QA runs headless, no WebGL) in favour of this DOM
 * layer — but `HubStructureArt` kept only rendering `pad_gantry_frame.png`
 * alone, one sixth of the authored pad, which reads as a bare lattice tower
 * rather than a launchpad. This assembles all six pieces here instead, so
 * the DOM layer (the only one that actually renders in the shipped game)
 * carries the same composite the Pixi layer was always meant to show.
 *
 * Coordinates below are the *raw* Pixi units from `buildLaunchpad` — deck
 * center at (0,0), everything else offset/anchored exactly as that function
 * sets `x`/`y` (bottom-center anchor by default, matching CSS `bottom` +
 * center `left`). `PPU` (px per raw unit) reproduces
 * `LAUNCHPAD_SPRITE_SCALE * (building.w / ART_W.launchpad)` from that file
 * in one factor: `building.w / RAW_SPAN` where `RAW_SPAN` (206) is the
 * mast-to-mast footprint `LAUNCHPAD_SPRITE_SCALE` was derived from.
 *
 * The rocket-on-pad + flame (buildLaunchpad's `hot` branch) isn't
 * reproduced here yet — left for a follow-up rather than risking the
 * rotation math without a way to check it against the Pixi original render.
 *
 * `RAW_SPAN`-true scale (mast-to-mast at `w` px wide) rendered the whole pad
 * only ~52px tall — correct relative to the model's own wide/flat authored
 * proportions, but reported back as "too small, and the space it takes up
 * is too thin" against the tall empty hit-box above it. Two follow-up passes
 * (a 1.6x, then a 3x, height-only multiplier on top of `ppuX`) were each
 * reported as still not enough, or as the *container* being too narrow
 * rather than the structure — bumping `w` and the multiplier together kept
 * compounding, overshooting the hit-box on one axis while undershooting on
 * the other. Height is now a fixed pixel target (`TARGET_TOP_PX`) completely
 * decoupled from `ppuX`/`w`, so widening the footprint never drags the
 * height along with it again. `LaunchpadScreen`'s own tower art
 * (`.launchpad-tower-gantry` in `app/launchpad-screen.css`) is the
 * calibration reference: it renders the same `pad_gantry_frame.png` at a
 * fixed 78x226, because a launchpad needs to read as a tower at a glance,
 * not a scale-accurate diorama. `TARGET_TOP_PX` targets similar visual
 * weight while staying under `HubScreen.tsx`'s `HIT_H.launchpad` (230)
 * budget. Horizontal footprint (`w`) is set by the caller
 * (`HUB_STRUCTURE_ART.launchpad.width`) and separately bounded by the
 * container width (`structureProps('launchpad').w` in `HubScreen.tsx`) —
 * not by anything in this file.
 */

const RAW_SPAN = 240
// Raw units from ground to the gantry frame top (DECK_TOP + frame height) —
// the tallest point of the composite, and what TARGET_TOP_PX calibrates against.
const FRAME_TOP_RAW = 93
const TARGET_TOP_PX = 178
const DECK_TOP = 15 // raw units the frames/clamps stand above the ground

interface Piece {
  src: string
  cx: number // center-x, raw units, 0 = pad center
  bottom: number // raw units above ground
  w: number
  h: number
}

const PIECES: Piece[] = [
  { src: '/game/assets/hub/pad_mast.png', cx: -112, bottom: 0, w: 8, h: 60 },
  { src: '/game/assets/hub/pad_mast.png', cx: 112, bottom: 0, w: 8, h: 60 },
  { src: '/game/assets/hub/pad_tank.png', cx: -76, bottom: 0, w: 24, h: 28 },
  { src: '/game/assets/hub/pad_tank.png', cx: 76, bottom: 0, w: 24, h: 28 },
  { src: '/game/assets/hub/pad_gantry_frame.png', cx: -38, bottom: DECK_TOP, w: 38, h: 78 },
  { src: '/game/assets/hub/pad_gantry_frame.png', cx: 38, bottom: DECK_TOP, w: 38, h: 78 },
  { src: '/game/assets/hub/pad_deck.png', cx: 0, bottom: 0, w: 120, h: 22 },
  { src: '/game/assets/hub/pad_clamp.png', cx: -14, bottom: DECK_TOP, w: 16, h: 18 },
  { src: '/game/assets/hub/pad_clamp.png', cx: 14, bottom: DECK_TOP, w: 16, h: 18 },
]

// Swing arm: hinge at the LEFT edge, vertically centred (buildLaunchpad's
// `anchor(0, 0.5)`) — positioned/rotated separately from PIECES because its
// anchor point isn't bottom-center like everything else.
const ARM_LEFT = -25
const ARM_MID_Y = 62 // raw units above ground
const ARM_W = 42
const ARM_H = 12
const ARM_HOT_ROTATION_DEG = (-1.1 * 180) / Math.PI

export function LaunchpadStructure({ w, targetTopPx = TARGET_TOP_PX, dimmed, hot }: { w: number; targetTopPx?: number; dimmed?: boolean; hot?: boolean }) {
  const ppuX = w / RAW_SPAN
  const ppuY = targetTopPx / FRAME_TOP_RAW
  return (
    <>
      {PIECES.map((p, i) => (
        <img
          key={i}
          src={p.src}
          alt=""
          style={{
            position: 'absolute',
            left: `calc(50% + ${p.cx * ppuX}px)`,
            bottom: p.bottom * ppuY,
            width: p.w * ppuX,
            height: p.h * ppuY,
            maxWidth: 'none',
            transform: 'translateX(-50%)',
            opacity: dimmed ? 0.55 : 1,
          }}
        />
      ))}
      <img
        src="/game/assets/hub/pad_swing_arm.png"
        alt=""
        style={{
          position: 'absolute',
          left: `calc(50% + ${ARM_LEFT * ppuX}px)`,
          bottom: ARM_MID_Y * ppuY - (ARM_H * ppuY) / 2,
          width: ARM_W * ppuX,
          height: ARM_H * ppuY,
          maxWidth: 'none',
          transformOrigin: 'left center',
          transform: `rotate(${hot ? ARM_HOT_ROTATION_DEG : 0}deg)`,
          opacity: dimmed ? 0.55 : 1,
          transition: 'transform 0.6s ease',
        }}
      />
    </>
  )
}
