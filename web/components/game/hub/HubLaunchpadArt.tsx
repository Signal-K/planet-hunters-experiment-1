'use client'

import React from 'react'

/**
 * Grounded launchpad render (KES-233).
 *
 * The previous DOM version assembled nine transparent PNGs with independent
 * horizontal and vertical scales. Even when the coordinates were technically
 * correct, the masts, tanks, clamps and swing arm read as detached cut-outs.
 * `pad_complex_v3.png` is authored as a front elevation at the exact same
 * camera scale and baseline as the hangar. Every part shares one deck and no
 * perspective slab can fight the flat Earth Base landscape. The rocket remains
 * a separate overlay because that is real game state, not part of the building.
 */

const ART_ASPECT = 390 / 260
const TARGET_TOP_PX = 178

export function LaunchpadStructure({ w, targetTopPx = TARGET_TOP_PX, dimmed, hot }: { w: number; targetTopPx?: number; dimmed?: boolean; hot?: boolean }) {
  const renderedWidth = Math.min(w, targetTopPx * ART_ASPECT)
  return (
    <img
      className="hub-launchpad-structure"
      src="/game/assets/hub/pad_complex_v3.png"
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
