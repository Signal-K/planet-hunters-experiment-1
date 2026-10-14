'use client'

import { EARTH_BIOMES, EARTH_BIOME_LABEL, type EarthBiome } from '@/lib/base-biome'

export function AgencyBiomePicker({ value, onChange, compact = false }: { value: EarthBiome; onChange: (biome: EarthBiome) => void; compact?: boolean }) {
  return (
    <div className={compact ? 'agency-biome-picker agency-biome-picker--compact' : 'agency-biome-picker'} role="radiogroup" aria-label="Agency Earth biome">
      {EARTH_BIOMES.map(biome => (
        <button key={biome} type="button" role="radio" aria-checked={value === biome} className="agency-biome-picker__option" data-biome={biome} data-active={value === biome || undefined} onClick={() => onChange(biome)}>
          <span aria-hidden className="agency-biome-picker__swatch" />
          {EARTH_BIOME_LABEL[biome]}
        </button>
      ))}
    </div>
  )
}
