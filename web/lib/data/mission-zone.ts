/** Stable equatorial preview sites. Zero is the original landing point. */
export const MISSION_ZONES = ['prime', 'east', 'opposite', 'west'] as const
export type MissionZone = typeof MISSION_ZONES[number]

export function missionZone(value: unknown): MissionZone {
  return MISSION_ZONES.includes(value as MissionZone) ? value as MissionZone : 'prime'
}

export function zoneLongitude(value: unknown): number {
  return { prime: 0, east: 90, opposite: 180, west: -90 }[missionZone(value)]
}
