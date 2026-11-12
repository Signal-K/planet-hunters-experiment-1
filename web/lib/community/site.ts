// SSL-758: the Community Site ledger on the web. Ordinary play fills one shared construction bar for the
// Community Spaceport or Observatory; the player keeps everything (a contribution only records credit).
// Rules mirror shared/community/site.json (site.test.ts checks they match); the server clamps every row
// the same way (pocketbase/site.go), so this side only says what it expects to land.

import { queueCreate } from '@/lib/offline/pbOutbox'
import { pocketBaseId } from '@/lib/orionids/finds'
import { pbLandnam } from '@/lib/pb-landnam'
import type { Mission } from '@/lib/data/types'

export type SiteComponent = 'structure' | 'systems' | 'instrument' | 'data'

export const SITE_RULES = {
  components: [
    { id: 'structure', label: 'Structure', feed: 'Mining hauls' },
    { id: 'systems', label: 'Systems', feed: 'Contract runs' },
    { id: 'instrument', label: 'Instrument', feed: 'Payload launches' },
    { id: 'data', label: 'Data', feed: 'Classifications and surveys' },
  ] as { id: SiteComponent; label: string; feed: string }[],
  templates: {
    'spaceport-launch-site': { name: 'Community Spaceport', targets: { structure: 2400, systems: 600, instrument: 300, data: 600 } },
    'observatory-instrument': { name: 'Community Observatory', targets: { structure: 1200, systems: 400, instrument: 600, data: 1200 } },
  } as Record<string, { name: string; targets: Record<SiteComponent, number> }>,
  defaultTemplate: 'spaceport-launch-site',
  stages: [
    { at: 0, label: 'Planning' },
    { at: 0.25, label: 'Foundations' },
    { at: 0.5, label: 'Frame' },
    { at: 0.75, label: 'Fit-out' },
    { at: 1, label: 'Complete' },
  ],
  perRun: { structure: 40, systems: 10, instrument: 25, data: 5 } as Record<SiteComponent, number>,
  perUserCap: { structure: 400, systems: 100, instrument: 100, data: 150 } as Record<SiteComponent, number>,
  structureMinerals: ['iron', 'nickel', 'cobalt', 'copper', 'aluminium', 'silicon', 'carbon'],
}

export function siteProjectKey(now: number): string {
  const d = new Date(now)
  return `community-site-${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export interface SiteCredit { component: SiteComponent; units: number; minerals: Record<string, number> }

/**
 * What a finished mission adds to the site: a payload launch feeds the instrument, a client contract the systems,
 * and a free mining haul the structure (only structural minerals, up to the per-run ceiling). Mining 2 aluminium
 * keeps 2 aluminium in the silo and also records 2 aluminium of credit.
 */
export function missionSiteCredit(mission: Pick<Mission, 'payload' | 'client'> | null | undefined, cargo: Record<string, number> | null | undefined): SiteCredit | null {
  if (!mission) return null
  if (mission.payload) return { component: 'instrument', units: SITE_RULES.perRun.instrument, minerals: {} }
  if (mission.client) return { component: 'systems', units: SITE_RULES.perRun.systems, minerals: {} }
  const minerals: Record<string, number> = {}
  for (const [id, n] of Object.entries(cargo ?? {})) {
    if (SITE_RULES.structureMinerals.includes(id) && n > 0) minerals[id] = Math.floor(n)
  }
  const units = Math.min(SITE_RULES.perRun.structure, Object.values(minerals).reduce((a, b) => a + b, 0))
  return units > 0 ? { component: 'structure', units, minerals } : null
}

/** A classification or survey day adds data once per kind per day. */
export function dataSiteCredit(): SiteCredit {
  return { component: 'data', units: SITE_RULES.perRun.data, minerals: {} }
}

/**
 * Queue a contribution. The id comes from (user, project, run), so a run replayed or synced twice lands once;
 * a duplicate is reported by the server as already applied. Signed-out players record nothing.
 */
export function queueSiteContribution(runId: string, credit: SiteCredit, now = Date.now()): string | null {
  const user = pbLandnam.authStore.record?.id
  if (!user || credit.units <= 0) return null
  const project = siteProjectKey(now)
  return queueCreate('community_contributions', {
    user,
    project,
    run_id: runId.slice(0, 80),
    component: credit.component,
    units: credit.units,
    minerals: credit.minerals,
  }, pocketBaseId(`site:${user}:${project}:${runId}`))
}

export interface SiteComponentView { id: SiteComponent; target: number; total: number; mine: number }
export interface SiteView {
  project: string
  template: string
  name: string
  components: SiteComponentView[]
  fill: number
  stage: string
  mineTotal: number
  closed: boolean
}

/** The capped fraction of all targets: over-filling one component does not move the bar. */
export function siteFill(components: Pick<SiteComponentView, 'target' | 'total'>[]): number {
  const need = components.reduce((sum, c) => sum + c.target, 0)
  const have = components.reduce((sum, c) => sum + Math.min(c.total, c.target), 0)
  return need ? have / need : 0
}

export function siteStage(fill: number): string {
  return SITE_RULES.stages.reduce((label, stage) => (fill >= stage.at ? stage.label : label), SITE_RULES.stages[0].label)
}

/** A site view from totals, the same shape the server returns. */
export function buildSiteView(project: string, template: string, totals: Partial<Record<SiteComponent, number>>, mine: Partial<Record<SiteComponent, number>>, closed = false): SiteView {
  const tpl = SITE_RULES.templates[template] ?? SITE_RULES.templates[SITE_RULES.defaultTemplate]
  const components = SITE_RULES.components.map(c => ({ id: c.id, target: tpl.targets[c.id], total: totals[c.id] ?? 0, mine: mine[c.id] ?? 0 }))
  const fill = siteFill(components)
  return {
    project, template: SITE_RULES.templates[template] ? template : SITE_RULES.defaultTemplate, name: tpl.name, components, fill,
    stage: siteStage(fill), mineTotal: components.reduce((sum, c) => sum + c.mine, 0), closed,
  }
}
