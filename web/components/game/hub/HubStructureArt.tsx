'use client'

import React from 'react'
import type { HubBuildingDef } from '@/lib/pixi/hubScene'

/**
 * Earth Base structure sprites, rebuilt 2026-08-26 (KES-260).
 *
 * `width` is each structure's authored layout width from `structures.py`, which
 * derives every size from one `PX_PER_UNIT` constant. Keeping these in the same
 * ratio to each other as the Blender models is what makes the base read as a
 * single site — the previous per-model eyeballed sizes had a scan dish rendering
 * nearly as large as the entire launch complex.
 *
 * `lift` is gone. Every structure is now authored standing on its own concrete
 * apron (`_raft` in `structures.py`) whose base is the sprite's bottom edge, so
 * they all sit *on* the ground line rather than being nudged up or down by a
 * hand-tuned offset per building.
 */
export const HUB_STRUCTURE_ART: Record<string, { src: string; width: number; height: number }> = {
  launchpad:              { src: '/game/assets/hub/launchpad.png',             width: 244, height: 172 },
  hangar:                 { src: '/game/assets/hub/hangar.png',                width: 208, height: 140 },
  refinery:               { src: '/game/assets/hub/refinery.png',              width: 135, height: 104 },
  'scan-station':         { src: '/game/assets/hub/scan_station.png',          width: 99,  height: 109 },
  command:                { src: '/game/assets/hub/command.png',               width: 120, height: 114 },
  'deep-space-telescope': { src: '/game/assets/hub/deep_space_telescope.png',  width: 114, height: 104 },
  'astronaut-academy':    { src: '/game/assets/hub/astronaut_academy.png',     width: 130, height: 94 },
}

/**
 * Structures are sized as a share of the scene width, not in fixed pixels.
 *
 * The authored widths above are a *ratio set* — they all come from one
 * `PX_PER_UNIT` in `structures.py`, so dividing them by a single constant keeps
 * the models' real relative sizes while letting the whole base scale with the
 * frame. At fixed pixel widths the 244px launch complex ran off the left edge
 * of a portrait scene, because plot 0 sits at 15% of the scene width.
 */
const SCENE_WIDTH_DIVISOR = 7.2

/** Scene-space x of each plot, as authored in `hub.scene.json` (HUB_W = 402). */
const HUB_SCENE_W = 402

/**
 * Contact shadow. This replaces the `drop-shadow(0 5px 5px …)` every structure
 * used to carry, which was the other half of the "pasted on" problem: a uniform
 * blur offset down-right is a *sticker* shadow — it implies the sprite floats a
 * few pixels above the page. What grounds an object is a shadow that lies flat
 * on the ground plane, wider than it is tall, anchored at the base and darkest
 * directly under the footprint.
 */
function ContactShadow() {
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '-5%',
        width: '96%',
        height: '15%',
        transform: 'translateX(-50%)',
        background: 'radial-gradient(ellipse at 50% 50%, rgba(12,20,32,0.42) 0%, rgba(12,20,32,0.18) 46%, transparent 72%)',
        pointerEvents: 'none',
      }}
    />
  )
}

export function HubStructureArt({ buildings }: { buildings: HubBuildingDef[] }) {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 14 }}>
      {buildings.map(building => {
        const art = HUB_STRUCTURE_ART[building.kind] ?? HUB_STRUCTURE_ART.command
        const widthPct = art.width / SCENE_WIDTH_DIVISOR
        // Keep the footprint inside the frame. Plot 0 sits at 15% of scene
        // width, which is less than half the launch complex's own width — so
        // without this the base's primary structure hangs off the left edge.
        const rawLeft = (building.plotX / HUB_SCENE_W) * 100
        const left = Math.min(100 - widthPct / 2, Math.max(widthPct / 2, rawLeft))
        return (
          <span
            key={`${building.kind}-${building.plotX}`}
            style={{
              position: 'absolute',
              left: `${left}%`,
              bottom: 'var(--hub-ground)',
              width: `${widthPct}%`,
              aspectRatio: `${art.width} / ${art.height}`,
              transform: 'translateX(-50%)',
              opacity: building.dimmed ? 0.6 : 1,
            }}
          >
            <ContactShadow />
            <img
              src={art.src}
              alt=""
              draggable={false}
              data-structure={building.kind}
              data-state={building.hot ? 'hot' : 'idle'}
              style={{ position: 'relative', display: 'block', width: '100%', height: '100%' }}
            />
          </span>
        )
      })}
    </div>
  )
}
