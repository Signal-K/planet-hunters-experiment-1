'use client'

import React from 'react'

/**
 * Grounded launchpad render (KES-233).
 *
 * The previous DOM version assembled nine transparent PNGs with independent
 * horizontal and vertical scales. Even when the coordinates were technically
 * correct, the masts, tanks, clamps and swing arm read as detached cut-outs.
 * `pad_complex_v2.png` is authored and rendered as one shallow three-quarter
 * Blender scene, so every part shares one deck, one perspective and one
 * ground contact. The rocket remains a separate overlay because that is real
 * game state, not part of the building.
 */

const ART_ASPECT = 360 / 240
const TARGET_TOP_PX = 178

export function LaunchpadStructure({ w, targetTopPx = TARGET_TOP_PX, dimmed, hot }: { w: number; targetTopPx?: number; dimmed?: boolean; hot?: boolean }) {
  const renderedWidth = Math.min(w, targetTopPx * ART_ASPECT)
  return (
    <img
      src="/game/assets/hub/pad_complex_v2.png"
      alt=""
      data-launch-state={hot ? 'hot' : 'idle'}
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 0,
        width: renderedWidth,
        height: targetTopPx,
        maxWidth: 'none',
        objectFit: 'contain',
        objectPosition: 'center bottom',
        transform: 'translateX(-50%)',
        opacity: dimmed ? 0.55 : 1,
        filter: 'drop-shadow(0 14px 14px rgba(0, 0, 0, 0.42))',
      }}
    />
  )
}
