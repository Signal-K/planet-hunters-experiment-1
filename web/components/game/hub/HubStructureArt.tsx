'use client'

import React from 'react'
import type { HubBuildingDef } from '@/lib/pixi/hubScene'

export const HUB_STRUCTURE_ART: Record<string, { src: string; width: number; lift: number }> = {
  launchpad: { src: '/game/assets/hub/pad_gantry_frame.png', width: 88, lift: 82 },
  refinery: { src: '/game/assets/hub/refinery_modular_v2.png', width: 92, lift: 68 },
  'scan-station': { src: '/game/assets/hub/scan_station_modular_v2.png', width: 62, lift: 78 },
  command: { src: '/game/assets/hub/cmd_building.png', width: 76, lift: 70 },
  'deep-space-telescope': { src: '/game/assets/hub/deep_space_telescope.png', width: 84, lift: 78 },
  'astronaut-academy': { src: '/game/assets/hub/astronaut_academy.png', width: 80, lift: 74 },
}

/**
 * Authored DOM art is the reliable common structure layer for the Hub and
 * Build screens. It stays visible when a WebGL renderer is unavailable while
 * the Pixi layer continues to provide interactive previews.
 */
export function HubStructureArt({ buildings }: { buildings: HubBuildingDef[] }) {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
      {buildings.map(building => {
        const art = HUB_STRUCTURE_ART[building.kind] ?? HUB_STRUCTURE_ART.command
        return (
          <React.Fragment key={`${building.kind}-${building.plotX}`}>
            {/* Ground-glow halo (KES-231): marks this structure as a real,
                clickable building — distinct from the flat, unlit decorative
                skyline behind it (HubWorldBackground's HubSkyline). */}
            {!building.dimmed && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: `${(building.plotX / 402) * 100}%`,
                  bottom: `calc(22% - 14px)`,
                  width: art.width * 1.6,
                  height: art.width * 0.7,
                  transform: 'translate(-50%, 30%)',
                  background: 'radial-gradient(ellipse at 50% 50%, rgba(112,217,234,0.32) 0%, transparent 72%)',
                }}
              />
            )}
            <img
              src={art.src}
              alt=""
              style={{
                position: 'absolute',
                left: `${(building.plotX / 402) * 100}%`,
                bottom: `calc(22% - ${art.lift}px)`,
                width: art.width,
                height: 'auto',
                transform: 'translateX(-50%)',
                opacity: building.dimmed ? 0.55 : 1,
                filter: 'drop-shadow(0 5px 5px rgba(0, 0, 0, 0.3))',
              }}
            />
          </React.Fragment>
        )
      })}
    </div>
  )
}
