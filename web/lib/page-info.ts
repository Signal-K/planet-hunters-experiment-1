import type { ControlStationModel } from '@/lib/control-station'

/**
 * Read-only roll-ups shown in the stat strips of internal pages. Pure functions of data the page already holds, so
 * the page renders the same numbers it had before plus a summary of them.
 */

export interface StationSummary {
  /** Instruments listed on the station. */
  instruments: number
  /** Instruments whose feed is live. */
  live: number
  /** Frames and candidates waiting across every listed instrument. */
  ready: number
  /** Distinct citizen-science projects the listed instruments feed. */
  projects: number
}

export function stationSummary(model: ControlStationModel): StationSummary {
  const rows = model.groups.flatMap(group => group.rows)
  const projects = new Set(rows.flatMap(row => row.projects.map(project => project.id)))
  return {
    instruments: rows.length,
    live: rows.filter(row => row.live).length,
    ready: rows.reduce((sum, row) => sum + row.readyCount, 0),
    projects: projects.size,
  }
}
