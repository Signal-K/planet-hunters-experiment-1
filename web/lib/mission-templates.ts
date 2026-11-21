// Mission templates (SSL-870): every mission plays one template from shared/authoring/templates.
// Authored missions name theirs; runtime missions (generated contracts, story launches, probe runs, shower events)
// resolve by the template's match rules: an exact id beats the longest id prefix, which beats the board tag.
import data from './data/mission-templates.json'

export type TemplateFamily = 'contract' | 'program' | 'feed' | 'event'
export type TemplateView = 'board' | 'base' | 'hangar' | 'pad' | 'map' | 'orbit' | 'field' | 'dock' | 'feed' | 'debrief'

export interface TemplateBeat {
  id: string
  label: string
  view: TemplateView
  goal: string
  controls: string[]
  repeat: boolean
}

export interface MissionTemplate {
  id: string
  title: string
  family: TemplateFamily
  fork_of?: string
  window?: string
  summary: string
  vehicle: 'lander' | 'rover' | 'satellite' | 'probe' | 'none'
  sources?: string[]
  match: { ids: string[]; id_prefixes: string[]; tags: string[] }
  beats: TemplateBeat[]
  /** Every control any beat uses, in first-use order. */
  controls: string[]
  outcome: { success: string; fail?: string; unlocks?: string }
}

export const MISSION_TEMPLATES = (data as { templates: MissionTemplate[] }).templates
const BY_ID = new Map(MISSION_TEMPLATES.map(t => [t.id, t]))

export function getMissionTemplate(id: string): MissionTemplate | undefined {
  return BY_ID.get(id)
}

/** The families a player sees, in the order Liam set them: client work, your own program, probe data, time-limited forks. */
export const TEMPLATE_FAMILIES: readonly TemplateFamily[] = ['contract', 'program', 'feed', 'event']

export function templatesIn(family: TemplateFamily): MissionTemplate[] {
  return MISSION_TEMPLATES.filter(t => t.family === family)
}

/** The template a mission plays. Feeds are never resolved for missions: classification comes from probes, not the board. */
export function templateForMission(mission: { id: string; tag?: string; template?: string }): MissionTemplate | undefined {
  if (mission.template) return BY_ID.get(mission.template)
  const playable = MISSION_TEMPLATES.filter(t => t.family !== 'feed')
  const exact = playable.find(t => t.match.ids.includes(mission.id))
  if (exact) return exact
  let best: MissionTemplate | undefined
  let bestLen = 0
  for (const t of playable)
    for (const prefix of t.match.id_prefixes)
      if (mission.id.startsWith(prefix) && prefix.length > bestLen) {
        best = t
        bestLen = prefix.length
      }
  if (best) return best
  const tag = mission.tag?.toUpperCase()
  return tag ? playable.find(t => t.match.tags.includes(tag)) : undefined
}
