'use client'

import type { EarthBiome } from '@/lib/base-biome'

/** Independently tiled side-on sky, terrain, verge, road and grass layers.
 * Structures sit above this component, so foreground rocks cannot overlap them. */
export function AgencyBiomeBackdrop({ biome }: { biome: EarthBiome }) {
  return (
    <div className="agency-biome-backdrop" data-biome={biome} data-testid="agency-biome-backdrop" aria-hidden>
      <span className="agency-biome-backdrop__sky" />
      <span className="agency-biome-backdrop__far" />
      <span className="agency-biome-backdrop__mid" />
      <span className="agency-biome-backdrop__verge" />
      <span className="agency-biome-backdrop__road" />
      <span className="agency-biome-backdrop__grass" />
      <span className="agency-biome-backdrop__rocks" />
    </div>
  )
}
