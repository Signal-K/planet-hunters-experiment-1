import { DEV_GROUPS, type DevGroup } from '@/lib/devPresets'

export const MISSION_ROUTE_DEFAULTS: Record<string, string> = {
  m1: 'm1-hub',
  mission1: 'm1-hub',
  m2: 'm2-hub',
  mission2: 'm2-hub',
  m3: 'm3-hub',
  mission3: 'm3-hub',
  telescope: 'telescope-hub',
  satellite: 'telescope-hub',
}

export const MISSION_ROUTE_SHOTS: Record<string, Record<string, string>> = {
  m1: {
    intro: 'm1-intro',
    hub: 'm1-hub',
    fab: 'm1-fab',
    mining: 'm1-mining',
    debrief: 'm1-debrief',
  },
  m2: {
    hub: 'm2-hub',
    rocket: 'm2-rocket-buy',
    'rocket-buy': 'm2-rocket-buy',
    fab: 'm2-fab',
    mining: 'm2-mining',
    done: 'm2-post-debrief',
    debrief: 'm2-post-debrief',
  },
  m3: {
    hub: 'm3-hub',
    fab: 'm3-fab',
    mining: 'm3-mining',
    debrief: 'm3-debrief',
  },
  telescope: {
    hub: 'telescope-hub',
    fab: 'telescope-fab',
    transit: 'telescope-transit',
    debrief: 'telescope-debrief',
  },
}

export const UI_ROUTE_PRESETS: Record<string, string> = {
  'mission-board': 'ui-mission-board',
  'target-picker': 'ui-target-picker',
  'skill-tree': 'ui-skill-tree',
  skills: 'ui-skill-tree',
  'tess-discovery': 'ui-tess-discovery',
  galaxy: 'ui-tess-discovery',
  'rover-mining': 'ui-rover-mining',
  'ship-customizer': 'ship-customizer',
  hangar: 'ui-hangar-assembly',
  'hangar-assembly': 'ui-hangar-assembly',
}

const MISSION_LABELS = new Set(['Mission 1', 'Mission 2', 'Mission 3', 'First Satellite Launch'])

export function missionGroups(): DevGroup[] {
  return DEV_GROUPS.filter(group => MISSION_LABELS.has(group.label))
}

export function uiGroups(): DevGroup[] {
  return DEV_GROUPS.filter(group => !MISSION_LABELS.has(group.label))
}

export function presetForMissionRoute(slug: string[] | undefined): string | null {
  if (!slug || slug.length === 0) return null
  const mission = slug[0].toLowerCase()
  const shot = slug[1]?.toLowerCase()
  const canonicalMission = mission.startsWith('mission') ? mission.replace('mission', 'm') : mission

  if (!shot) return MISSION_ROUTE_DEFAULTS[canonicalMission] ?? null
  return MISSION_ROUTE_SHOTS[canonicalMission]?.[shot] ?? null
}

export function presetForUiRoute(slug: string[] | undefined): string | null {
  if (!slug || slug.length === 0) return null
  return UI_ROUTE_PRESETS[slug.join('/').toLowerCase()] ?? null
}
