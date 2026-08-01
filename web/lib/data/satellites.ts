// Landnam game data — the satellite(s) a player can launch.
//
// Unlike ROCKET_MODELS, satellites are not purchased per-flight and don't
// unlock on `missionsRequired` — the only one that exists today, the Transit
// Telescope, is gated on the Satellite Monitoring Station structure
// (`player.satelliteMonitoringBuilt`) and launched exactly once
// (`player.transitSatelliteLaunchedAt`). See
// `lib/runtimeCatalog.ts` (TRANSIT_TELESCOPE_MISSION_ID) for the mission that
// actually flies it.
//
// Do not add cost/stats fields here beyond what the mission payload already
// defines (`cargoCost: 0` in runtimeCatalog.ts) — the Transit Telescope has no
// Francs cost and no cargo/orbit/drill stats; it is not a rocket.

export interface SatelliteModel {
  id: string
  name: string
  /** Player-facing copy for why this isn't launchable yet. */
  unlockHint: string
}

export const SATELLITE_MODELS: SatelliteModel[] = [
  {
    id: 'transit-telescope',
    name: 'Transit Telescope',
    unlockHint: 'Build Satellite Monitoring Station',
  },
]
