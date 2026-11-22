// The story: a numbered route with one chapter per Landnam mission type, so a
// player needs no context and every kind of run Landnam has can be flown here.
// Every mission is built by Landnam's own code (its static missions, runtime
// catalog, daily client pool and shower runs), never copied: change a mission
// in Landnam and Minimal follows.
import { MISSIONS, RESOURCE_FOCUS_MISSION_ID, SELF_DIRECTED_MINING_MISSION_ID, showerRunMission } from '@landnam/lib/data/missions'
import { TARGETS, compatibleTargetsFor } from '@landnam/lib/data/targets'
import { MINERAL_META } from '@landnam/lib/data/minerals'
import { CLIENT_SLOTS } from '@landnam/lib/data/clients'
import { SHOWERS } from '@landnam/lib/data/showers'
import { generateDailyClientPool, todayDateKey } from '@landnam/lib/data/daily-client-missions'
import { STATIC_CATALOG } from '@landnam/lib/catalog'
import { buildRuntimeCatalog, showerTarget, TRANSIT_TELESCOPE_MISSION_ID } from '@landnam/lib/runtimeCatalog'
import { probeMissionId } from '@landnam/lib/probes/survey-probe'
import { tessCandidateToExoplanetTarget } from '@landnam/lib/data/tess-candidates'
import { STAGE_TESS_FEED } from '@landnam/lib/stage-feed'
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
}

const nearest = (mission: Mission | undefined): Target | undefined =>
  mission && (TARGETS.find(t => t.id === mission.targetId) ?? [...compatibleTargetsFor(mission, TARGETS)].sort((a, b) => a.orbit - b.orbit)[0])

// The candidate the chapter 4 telescope turns up (Landnam's stage feed), as the
// exoplanet target Landnam makes from a classified discovery.
const discovered = STAGE_TESS_FEED[0] && tessCandidateToExoplanetTarget(STAGE_TESS_FEED[0])

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
  discoveredTargets: discovered ? { [discovered.id]: discovered } : {},
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
// 2. Self-directed mining: no client, sell the haul at market.
const selfDirected = MISSIONS.find(m => m.id === SELF_DIRECTED_MINING_MISSION_ID)
// 3. A two-leg delivery contract.
const delivery = MISSIONS.find(m => !!m.deliveryTargetId && !m.locked)
// 4. The space telescope launch from the control station.
const telescope = runtimeMission(m => m.id === TRANSIT_TELESCOPE_MISSION_ID)
// 5. A survey probe to the nearest body without one.
const probe = runtimeMission(m => m.id.startsWith(probeMissionId('')))
// 6. A meteor shower run. The Leonids peak in November.
const shower = SHOWERS.find(s => s.id.startsWith('leonids')) ?? SHOWERS[0]
const showerRun = shower && showerRunMission(shower.id)
// 7. A materials haul for the construction focus, into storage.
const haul = runtimeMission(m => m.id === RESOURCE_FOCUS_MISSION_ID)
// 8. The client build job above: carry the stored materials out and raise it.
// 9. A survey flight following up a satellite discovery.
const surveyFlight = runtimeMission(m => m.id.startsWith('exo-survey-'))

export const CHAPTERS: Chapter[] = [
  { number: 1, name: 'First light', goal: 'Fly out, mine with the laser, come home.', teaches: 'Fly and fire', type: 'client-contract', verb: 'mine', mission: contract, target: nearest(contract) },
  { number: 2, name: 'First sale', goal: 'Mine what you like and sell it at market.', teaches: 'Francs', type: 'self-directed', verb: 'mine', mission: selfDirected, target: nearest(selfDirected) },
  { number: 3, name: 'Courier', goal: 'Mine an order, then drop it at a second world.', teaches: 'Deliveries', type: 'delivery', verb: 'deliver', mission: delivery, target: nearest(delivery), deliveryTarget: TARGETS.find(t => t.id === delivery?.deliveryTargetId) },
  { number: 4, name: 'Eyes on the sky', goal: 'Launch a space telescope into orbit.', teaches: 'Satellites', type: 'satellite', verb: 'deploy', mission: telescope, target: runtimeTarget(telescope?.targetId) },
  { number: 5, name: 'Probe', goal: 'Leave a survey probe in orbit to map a world.', teaches: 'Probes', type: 'survey-probe', verb: 'deploy', mission: probe, target: runtimeTarget(probe?.targetId) },
  { number: 6, name: 'Shower', goal: 'Fly into the meteor shower and catch fragments.', teaches: 'Sky events', type: 'shower-run', verb: 'mine', mission: showerRun, target: shower && showerTarget(shower.id) },
  { number: 7, name: 'Stockpile', goal: 'Haul materials home and store them for building.', teaches: 'Storage', type: 'materials-haul', verb: 'mine', mission: haul, target: nearest(haul) },
  { number: 8, name: 'Build', goal: 'Carry your materials out and raise a structure.', teaches: 'Construction', type: 'construction', verb: 'build', mission: build, target: nearest(build) },
  { number: 9, name: 'Follow-up', goal: 'Send a probe to the world your satellite found.', teaches: 'Research', type: 'survey-flight', verb: 'survey', mission: surveyFlight, target: runtimeTarget(surveyFlight?.targetId) },
]

export function mineralName(id: string): string {
  return MINERAL_META[id]?.name ?? id
}

/** Short money for no-context copy: ₣22M, not ₣22.0M or 22000000. */
export function francs(value: number): string {
  if (value >= 1_000_000) return `₣${Math.round(value / 100_000) / 10}M`.replace('.0M', 'M')
  if (value >= 1_000) return `₣${Math.round(value / 1_000)}K`
  return `₣${value}`
}
