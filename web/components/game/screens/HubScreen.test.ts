import { describe, expect, it } from 'vitest'
import { HUB_STRUCTURE_ART } from './HubScreen'

describe('Hub structure art', () => {
  it('uses the detailed KES-145 refinery and scanner renders', () => {
    expect(HUB_STRUCTURE_ART.refinery.src).toBe('/game/assets/hub/refinery_modular_v2.png')
    expect(HUB_STRUCTURE_ART['scan-station'].src).toBe('/game/assets/hub/scan_station_modular_v2.png')
  })
})
