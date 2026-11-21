import type { Player } from '@/lib/game-types'

export type OrbitalCraft = 'space-telescope' | 'saturn-satellite'
export interface AgencyLaunch { craft: OrbitalCraft; at: number }
export type FleetPlayer = Partial<Pick<Player, 'agencyLaunches' | 'transitSatelliteLaunchedAt' | 'saturnImagerLaunchedAt' | 'agencyDonations'>>

/** Launch receipts are keyed by sortie, so settling or merging a run never builds a second craft. */
export function mergeAgencyLaunches(a: Player['agencyLaunches'], b: Player['agencyLaunches']): Record<string, AgencyLaunch> {
  const out: Record<string, AgencyLaunch> = {}
  for (const source of [a, b]) for (const [id, row] of Object.entries(source ?? {})) {
    if (row && (row.craft === 'space-telescope' || row.craft === 'saturn-satellite') && Number.isFinite(row.at) && row.at > 0) {
      if (!out[id] || row.at < out[id].at) out[id] = row
    }
  }
  return out
}
export function fleetCount(player: FleetPlayer, craft: OrbitalCraft): number {
  const launched = craft === 'space-telescope' ? player.transitSatelliteLaunchedAt : player.saturnImagerLaunchedAt
  return Math.max(launched ? 1 : 0, Object.values(player.agencyLaunches ?? {}).filter(row => row.craft === craft).length)
}
export function personalFleetCount(player: FleetPlayer, craft: OrbitalCraft): number {
  const count = fleetCount(player, craft)
  return player.agencyDonations?.[craft] ? Math.min(1, count) : count
}
export function recordAgencyLaunch<T extends FleetPlayer>(player: T, craft: OrbitalCraft, run: string, at: number): T {
  if (player.agencyLaunches?.[run]) return player
  const launches = mergeAgencyLaunches(player.agencyLaunches, undefined)
  // Preserve a pre-programme craft separately from the first new receipt.
  const previousAt = craft === 'space-telescope' ? player.transitSatelliteLaunchedAt : player.saturnImagerLaunchedAt
  if (previousAt && !Object.values(launches).some(row => row.craft === craft)) launches[`legacy-${craft}`] = { craft, at: previousAt }
  launches[run] = { craft, at }
  return { ...player, agencyLaunches: launches }
}

export function fleetLaunchTimes(player: FleetPlayer, craft: OrbitalCraft): number[] {
  const times = Object.values(mergeAgencyLaunches(player.agencyLaunches, undefined)).filter(row => row.craft === craft).map(row => row.at).sort((a, b) => a - b)
  const legacy = craft === 'space-telescope' ? player.transitSatelliteLaunchedAt : player.saturnImagerLaunchedAt
  return times.length ? times : legacy ? [legacy] : []
}
