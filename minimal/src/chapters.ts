// The story: a numbered route with one chapter per Landnam mission type, so a
// player needs no context and every kind of run Landnam has can be flown here.
// Every mission is built by Landnam's own code (its static missions, runtime
// catalog, daily client pool and shower runs), never copied: change a mission
// in Landnam and Minimal follows.
import { MISSIONS, RESOURCE_FOCUS_MISSION_ID, SELF_DIRECTED_MINING_MISSION_ID, showerRunMission } from '@landnam/lib/data/missions'
import { TARGETS, compatibleTargetsFor } from '@landnam/lib/data/targets'
import { MINERAL_META } from '@landnam/lib/data/minerals'
import { CLIENT_SLOTS } from '@landnam/lib/data/clients'
import { DEBRIS_PRESETS, type SkyEvent } from '@landnam/lib/data/sky-events'
import { SHOWERS, type ShowerDeclaration } from '@landnam/lib/data/showers'
import { generateDailyClientPool, todayDateKey } from '@landnam/lib/data/daily-client-missions'
import { STATIC_CATALOG } from '@landnam/lib/catalog'
import { buildRuntimeCatalog, showerTarget, TRANSIT_TELESCOPE_MISSION_ID } from '@landnam/lib/runtimeCatalog'
import { probeMission, probeMissionId } from '@landnam/lib/probes/survey-probe'
import type { Mission, Target } from '@landnam/lib/data/types'

/**
 * How a run plays after LAUNCH. Each Landnam mission type is one of these:
 * - mine: fly to the body and mine with Landnam's real laser scene, then home.
 * - deliver: mine, then drop the cargo at a second body, then home.
 * - build: carry stored materials out and raise the structure on site.
 * - deploy: put a satellite or probe in orbit.
 * - survey: carry a probe out and release it; the probe reads the body. Ships never scan.
 */
export type Verb = 'mine' | 'deliver' | 'build' | 'deploy' | 'survey'

/** Landnam's mission types, as the storyboard and the briefing name them. */
export type MissionType =
  | 'client-contract'
  | 'self-directed'
  | 'delivery'
  | 'satellite'
  | 'survey-probe'
  | 'shower-run'
  | 'materials-haul'
  | 'construction'
  | 'survey-flight'

export interface Chapter {
  eventId?: string
  number: number
  name: string
  goal: string
  teaches: string
  type: MissionType
  verb: Verb
  mission?: Mission
  target?: Target
  /** Second stop for a delivery run. */
  deliveryTarget?: Target
  /** Worlds the player may pick for this run, nearest first (market mining: go wherever the rocket reaches). */
  destinations?: Target[]
}

const nearest = (mission: Mission | undefined): Target | undefined =>
  mission && (TARGETS.find(t => t.id === mission.targetId) ?? [...compatibleTargetsFor(mission, TARGETS)].sort((a, b) => a.orbit - b.orbit)[0])

// A client build job from today's pool. Its materials are what the Stockpile
// chapter hauls home, so the two chapters feed each other as in Landnam.
const build = generateDailyClientPool(todayDateKey(), 4, CLIENT_SLOTS, MINERAL_META).find(m => !!m.construction)
const buildMaterials = build?.construction?.requiredMaterials ?? { iron: 4 }

// Landnam's runtime catalog, as it builds it for a pilot in Free Operations with a
// control station, a construction focus and one discovery: this is where the
// satellite, probe, materials and survey-flight missions come from.
const runtime = buildRuntimeCatalog({
  catalog: STATIC_CATALOG,
  freeOperations: true,
  missionsDone: 3,
  discoveredTargets: {},
  player: {
    placed: ['control-station'],
    probes: {},
    resourceFocus: { label: build?.title.replace(/^Build an? /, 'a ').toLowerCase() ?? 'construction', minerals: buildMaterials },
  } as Parameters<typeof buildRuntimeCatalog>[0]['player'],
})
const runtimeMission = (pick: (m: Mission) => boolean) => runtime.missions.find(pick)
const runtimeTarget = (id: string | undefined) => runtime.targets.find(t => t.id === id)

// 1. The first onboarding client contract (Landnam's first sequence-1 client job).
const contract = MISSIONS.find(m => m.sequence === 1 && !!m.client && !m.locked)
// 2. Self-directed mining: no client, sell the haul at market. Landnam's run carries a token
// order (1 nickel); Minimal flies it as an open run that fills the rocket's hold, so a
// bigger rocket from the Launchpad means a bigger sale.
const selfDirectedBase = MISSIONS.find(m => m.id === SELF_DIRECTED_MINING_MISSION_ID)
const selfDirected = selfDirectedBase && { ...selfDirectedBase, requires: { ...selfDirectedBase.requires, minerals: {} } }
// 3. A two-leg delivery contract.
const delivery = MISSIONS.find(m => !!m.deliveryTargetId && !m.locked)
// 4. The space telescope launch from the control station.
const telescope = runtimeMission(m => m.id === TRANSIT_TELESCOPE_MISSION_ID)
// 5. A survey probe to the nearest body without one.
const probe = runtimeMission(m => m.id.startsWith(probeMissionId('')))
// 7. A materials haul for the construction focus, into storage.
const haul = runtimeMission(m => m.id === RESOURCE_FOCUS_MISSION_ID)
// 8. The client build job above: carry the stored materials out and raise it.
// 9. A survey flight following up a satellite discovery.


/** Every world with ore, nearest first: the rocket's reach, not the mission, decides where a market run may go. */
function destinationsFor(mission: Mission | undefined): Target[] {
  if (!mission) return []
  return TARGETS.filter(t => t.minerals?.length && t.type !== 'exoplanet' && t.type !== 'event-field').sort((a, b) => a.orbit - b.orbit)
}

export const CHAPTERS: Chapter[] = [
  { number: 1, name: 'First light', goal: 'Fly out, mine with the laser, come home.', teaches: 'Fly and fire', type: 'client-contract', verb: 'mine', mission: contract, target: nearest(contract) },
  { number: 2, name: 'First sale', goal: 'Mine what you like and sell it at market.', teaches: 'Francs', type: 'self-directed', verb: 'mine', mission: selfDirected, target: nearest(selfDirectedBase), destinations: destinationsFor(selfDirected) },
  { number: 3, name: 'Courier', goal: 'Mine an order, then drop it at a second world.', teaches: 'Deliveries', type: 'delivery', verb: 'deliver', mission: delivery, target: nearest(delivery), deliveryTarget: TARGETS.find(t => t.id === delivery?.deliveryTargetId) },
  { number: 4, name: 'Eyes on the sky', goal: 'Launch a space telescope into orbit.', teaches: 'Satellites', type: 'satellite', verb: 'deploy', mission: telescope, target: runtimeTarget(telescope?.targetId) },
  { number: 5, name: 'Probe', goal: 'Leave a survey probe in orbit to map a world.', teaches: 'Probes', type: 'survey-probe', verb: 'deploy', mission: probe, target: runtimeTarget(probe?.targetId) },
  { number: 7, name: 'Stockpile', goal: 'Haul materials home and store them for building.', teaches: 'Storage', type: 'materials-haul', verb: 'mine', mission: haul, target: nearest(haul) },
  { number: 8, name: 'Build', goal: 'Carry your materials out and raise a structure.', teaches: 'Construction', type: 'construction', verb: 'build', mission: build, target: nearest(build) },
]

// New flight numbers leave the original nine save slots intact.
const moon: Target = { id: 'moon', name: 'Moon', type: 'planet', orbit: 1, difficulty: 'L1', brief: 'Airless basalt plains and exposed highlands.', minerals: ['iron', 'silicon'] }
const body = (id: string) => TARGETS.find(target => target.id === id)!
function expedition(number: number, name: string, goal: string, target: Target, mining = false): Chapter {
  const template = mining ? selfDirected : probeMission(target,number)
  if (!template) throw new Error('Missing Landnam expedition template')
  return { number, name, goal, target, teaches: mining ? 'Mineral recovery' : 'Orbital survey',
    type: mining ? 'self-directed' : 'survey-probe', verb: mining ? 'mine' : 'survey',
    mission: { ...template, id: `minimal-${target.id}-${number}`, title: name, targetId: target.id } }
}
export const PROGRAM = [
  expedition(101, 'Lunar reconnaissance', 'Deploy a survey probe to chart the Moon’s surface and locate your first mineral deposits.', moon),
  expedition(102, 'First lunar harvest', 'Recover lunar ore from the mapped deposits. Sell the first haul to fund your agency.', moon, true),
  expedition(103, 'Survey the red planet', 'Map the iron-rich plains of Mars from orbit.', body('mars')),
  expedition(104, 'Prospect the belt', 'Fill the hold with metals from the exposed surface of 433 Eros.', body('eros'), true),
  expedition(105, 'Map the dwarf planet', 'Survey the ice-rich crust of Ceres for the next exploration programme.', body('ceres')),
  expedition(106, 'Beyond the belt', 'Send a probe past Jupiter to survey Europa’s ice shell.', body('europa')),
  CHAPTERS.find(c => c.type === 'satellite')!,
]
export function discoveryFlight(target: Target): Chapter {
  const catalog = buildRuntimeCatalog({ catalog: STATIC_CATALOG, freeOperations: true, missionsDone: 3,
    discoveredTargets: { [target.id]: target }, player: { placed: ['control-station'], probes: {} } as Parameters<typeof buildRuntimeCatalog>[0]['player'] })
  return { number: 9, name: `Survey ${target.name}`, goal: target.brief, type: 'survey-flight', verb: 'survey',
    teaches: 'Exoplanet follow-up', target, mission: catalog.missions.find(m => m.id.startsWith('exo-survey-') && m.targetId === target.id) }
}
export function eventFlight(shower: ShowerDeclaration): Chapter {
  const mission = showerRunMission(shower.id)
  return { number: shower.id === 'leonids-2026' ? 6 : 300 + SHOWERS.indexOf(shower), name: mission.title,
    goal: mission.brief, teaches: 'Sky event', type: 'shower-run', verb: 'mine', mission, target: showerTarget(shower.id) }
}

export function debrisFlight(event:SkyEvent): Chapter | undefined {
  const preset=DEBRIS_PRESETS.find(p=>p.eventId===event.id)
  if(!preset || !selfDirected)return
  const target={...body('eros'), minerals:[preset.resourceId]}
  return {number:350+DEBRIS_PRESETS.indexOf(preset),eventId:event.id,name:event.name,goal:`Collect ${preset.label.toLowerCase()} from the field around ${target.name}.`,
    teaches:'Debris recovery',type:'shower-run',verb:'mine',target,
    mission:{...selfDirected,id:'minimal-'+event.id,title:event.name,targetId:target.id,requires:{...selfDirected.requires,minerals:{[preset.resourceId]:5}}}}
}
export function mineralName(id: string): string {
  return MINERAL_META[id]?.name ?? id
}

/** Short money for no-context copy: ₣22M, not ₣22.0M or 22000000. */
export function francs(value: number): string {
  if (value >= 1_000_000) return `₣${Math.round(value / 100_000) / 10}M`.replace('.0M', 'M')
  if (value >= 1_000) return `₣${Math.round(value / 1_000)}K`
  return `₣${value}`
}
