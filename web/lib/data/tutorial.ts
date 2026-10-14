// Landnam game data — tutorial steps
//
// SSL-332 agency training: EXTRACTION_STEPS (place the launchpad, then the
// first mine-and-return contract) and TRANSPORT_STEPS (the two-stop
// mine-and-haul contract) and STORAGE_STEPS (SSL-576: build the Surface Silo
// in the base scene, store ore instead of selling it, sell it later at the
// Exchange). Storage runs after the first missions and never gates Free Ops.
// The old M2 Prospector steps are retired. Stage selection lives in
// trainingCoachSteps and storageLessonSteps below.

import type { TutorialStep } from './types'
import type { AgencyTrainingStage } from '@/lib/systems/AgencyOnboardingSystem'
import { FREE_OPS_START_MISSIONS_DONE } from './mission-generator'
import type { TrainingTryId } from '@/lib/systems/FlightPlanSystem'

export interface TrainingTryStep {
  id: string
  try: TrainingTryId
  screen: string
  objective: string
  radio: string
  hint?: string
  beacon?: string
  doneOn: 'mining-debriefed' | 'tess-classified' | 'part-tweaked'
}

/** The durable three-try plan. Steps are screen-local instructions; only the
 * named real game event completes a try. */
export const TRAINING_TRIES: readonly TrainingTryStep[] = [
  { id: 'mine-launchpad', try: 'mining', screen: 'launchpad', objective: 'Open client contracts', radio: 'The first try is a complete mine-and-return run.', beacon: 'launchpad-view-contracts|building-launchpad', doneOn: 'mining-debriefed' },
  { id: 'mine-intro', try: 'mining', screen: 'intro', objective: 'Begin operations', radio: 'Choose a landscape, then place the launchpad.', beacon: 'intro-begin', doneOn: 'mining-debriefed' },
  { id: 'mine-build', try: 'mining', screen: 'build', objective: 'Tap a build pad, then confirm', radio: 'The launchpad is the first structure. Missions leave from here.', beacon: 'build-plot-0|build-confirm', doneOn: 'mining-debriefed' },
  { id: 'mine-hub', try: 'mining', screen: 'hub', objective: 'Tap the tower', radio: 'Client contracts open from the tower.', beacon: 'building-launchpad', doneOn: 'mining-debriefed' },
  { id: 'mine-contract', try: 'mining', screen: 'missions', objective: 'Accept a mining contract', radio: 'A client order funds this first field run.', doneOn: 'mining-debriefed' },
  { id: 'mine-launch', try: 'mining', screen: 'fab', objective: 'Prepare the vehicle and launch', radio: 'Check the target, cargo and vehicle, then launch.', doneOn: 'mining-debriefed' },
  { id: 'mine-target', try: 'mining', screen: 'targets', objective: 'Choose the highlighted target', radio: 'The target carries the mineral named by the order.', doneOn: 'mining-debriefed' },
  { id: 'mine-survey', try: 'mining', screen: 'rover-survey', objective: 'Scout one outcrop, then continue to the ship laser', radio: 'The rover logs the surface. The ship laser extracts the order.', doneOn: 'mining-debriefed' },
  { id: 'mine-fire', try: 'mining', screen: 'mining', objective: 'Fire the laser on a seam', radio: 'Wait for a coloured seam to pass beneath the fixed laser line.', hint: 'The seam will cross the laser line; fire when it does.', beacon: 'mining-fire-laser', doneOn: 'mining-debriefed' },
  { id: 'mine-debrief', try: 'mining', screen: 'debrief', objective: 'Close the mission debrief', radio: 'The first try is recorded when the order is settled.', doneOn: 'mining-debriefed' },
  { id: 'mine-return', try: 'mining', screen: 'transit', objective: 'Fly the cargo home', radio: 'The order is only paid once the cargo reaches the debrief.', doneOn: 'mining-debriefed' },
  { id: 'mine-return-landing', try: 'mining', screen: 'landing', objective: 'Fly the cargo home', radio: 'The order is only paid once the cargo reaches the debrief.', doneOn: 'mining-debriefed' },
  { id: 'mine-return-delivery', try: 'mining', screen: 'delivery', objective: 'Deliver the cargo', radio: 'The order is only paid once the cargo reaches the debrief.', doneOn: 'mining-debriefed' },
  { id: 'scan-open', try: 'scan', screen: '*', objective: 'Open the Galaxy map', radio: 'Transit candidates are classified from the Galaxy map.', doneOn: 'tess-classified' },
  { id: 'scan-classify', try: 'scan', screen: 'galaxy', objective: 'Classify the transit candidate', radio: 'Review the light curve and submit a science verdict.', hint: 'The expected transit sits in the shaded dip band.', doneOn: 'tess-classified' },
  { id: 'part-open', try: 'part', screen: '*', objective: 'Open the Hangar from Base', radio: 'The Hangar is where ship modules are fitted.', doneOn: 'part-tweaked' },
  { id: 'part-fit', try: 'part', screen: 'hangar', objective: 'Fit a module in each ship stage', radio: 'Open the ship customiser, choose a module for engine, booster, cockpit and payload, then confirm.', doneOn: 'part-tweaked' },
]

/** Screens that belong to a live cargo run. A scan or part try must not paste
 * its "open the Hangar / fit a module" line onto these; the player is flying
 * the mining loop, so the objective is that screen's mining step (SSL-478). */
const LOOP_SCREENS = new Set([
  'fab', 'rover-survey', 'targets', 'mining', 'debrief', 'transit', 'landing', 'delivery',
])

export function trainingTryStep(
  tryId: TrainingTryId,
  screen: string,
  options?: { returning?: boolean },
): TrainingTryStep | undefined {
  const exact = TRAINING_TRIES.find(step => step.try === tryId && step.screen === screen)
  const step = exact
    ?? (LOOP_SCREENS.has(screen)
      ? TRAINING_TRIES.find(item => item.try === 'mining' && item.screen === screen)
      : undefined)
    // Hub, Launchpad, Hangar and Galaxy keep the try's own "open it" line.
    // The mining try has no wildcard, so an unlisted screen falls back to its first step.
    ?? TRAINING_TRIES.find(item => item.try === tryId && item.screen === '*')
    ?? TRAINING_TRIES.find(item => item.try === tryId)
  // Outbound and return share the transit screen. "Fly the cargo home" on the
  // way out tells a new player the run is already finished.
  if (step?.screen === 'transit' && options?.returning === false) {
    return {
      ...step,
      objective: 'Boost toward the target',
      radio: 'The ship is outbound. The laser run starts after arrival.',
    }
  }
  return step
}

/** Six real milestones within the mining try. The first milestone covers
 * establishing the pad and taking a client order; the last covers bringing
 * the recovered cargo home and settling the order. This puts the laser at
 * 5/6, matching the playable sequence rather than the stale 2/6 concept. */
const MINING_OPS_STEP_BY_SCREEN: Readonly<Record<string, number>> = {
  intro: 1, build: 1, hub: 1, launchpad: 1, missions: 1,
  'rocket-buy': 2, fab: 2,
  targets: 3,
  'rover-survey': 4,
  mining: 5,
  debrief: 6, transit: 6, landing: 6, delivery: 6,
}

export function trainingTryPosition(step: TrainingTryStep): { index: number; total: number } {
  if (step.try === 'mining') return { index: MINING_OPS_STEP_BY_SCREEN[step.screen] ?? 1, total: 6 }
  return { index: step.try === 'scan' ? 2 : 3, total: 3 }
}

/** Mission patch segments follow the playable milestones, not the number of
 * screen-specific coaching lines. The current milestone stays open until the
 * player advances; completed tries stitch the final segment. */
export function trainingPatchProgress(
  tryId: TrainingTryStep['try'],
  screen: string,
  completed: boolean,
  active: boolean,
): { stitched: number; total: number } {
  const total = tryId === 'mining' ? 6 : 2
  if (completed) return { stitched: total, total }
  if (!active) return { stitched: 0, total }
  if (tryId === 'mining') {
    const step = trainingTryStep(tryId, screen)
    return { stitched: Math.max(0, (step ? trainingTryPosition(step).index : 1) - 1), total }
  }
  const step = trainingTryStep(tryId, screen)
  return { stitched: step && step.screen !== '*' ? 1 : 0, total }
}

export const EXTRACTION_STEPS: TutorialStep[] = [
  { id: 0, screen: 'build',   title: 'Build the tower',
    body: 'Your first structure — all missions launch from here.',
    action: 'Tap a build pad, then confirm',
    anchor: 'bottom', spot: null, coachId: 'build-confirm|build-plot-0', dir: 'down', cta: 'Build the tower',
    desktopBody: 'Your first structure — all missions launch from here.',
    desktopAction: 'Click a build pad, then confirm placement',
    desktopCoachId: 'build-confirm|build-plot-0', desktopDir: 'down' },
  { id: 1, screen: 'hub',     title: 'Extraction',
    body: 'Your agency\'s first job: mine ore for a client and bring it home. Contracts are on the mission board.',
    action: 'Tap the tower',
    anchor: 'bottom', spot: null, coachId: 'building-launchpad', dir: 'up', cta: 'Tower',
    desktopBody: 'Your agency\'s first job: mine ore for a client and bring it home. Contracts are on the mission board.',
    desktopAction: 'Click the tower',
    desktopCoachId: 'building-launchpad', desktopDir: 'up' },
  // Sibling of step 1, same id — tapping the launchpad now opens its own
  // program screen first (STS-625) instead of going straight to Missions, so
  // a player who reaches it while still chasing this "find a client mission"
  // step needs a further nudge toward the contracts button there. Same id as
  // step 1 so `doneSteps`/skip share one entry; screen match picks whichever
  // of the two applies to where the player currently is.
  { id: 1, screen: 'launchpad', title: 'Open a Mission',
    body: 'Your own program is here — client contracts are one press further in.',
    action: 'Tap View All Contracts',
    anchor: 'bottom', spot: null, coachId: 'launchpad-view-contracts', dir: 'down', cta: 'View All Contracts',
    desktopAction: 'Click View All Contracts',
    desktopCoachId: 'launchpad-view-contracts', desktopDir: 'down' },
  { id: 2, screen: 'missions', title: 'Select a Mission',
    body: 'Clients post contracts that fund your program. Each one names the ore to mine, the destination, the payment, and the client experience recorded when it is complete.',
    action: 'Compare the live contracts, then accept one',
    anchor: 'bottom', spot: null, cta: 'a contract' },
  { id: 3, screen: 'targets',  title: 'Choose a Destination',
    body: 'Highlighted bodies have the ore your contract requires.',
    action: 'Tap a target, then Continue',
    anchor: 'bottom', spot: null, cta: 'a target' },
  { id: 8, screen: 'rocket-buy', title: 'Choose a Vehicle',
    body: 'Explorer is included for the first contract. Its range, cargo bay, and drill all match this route.',
    action: 'Review the staged vehicle, then continue',
    anchor: 'top', spot: null, cta: 'the vehicle' },
  { id: 4, screen: 'fab',      title: 'Assemble the Rocket',
    body: 'Explorer is pre-loaded for this contract — review the build, then launch.',
    manual: true,
    anchor: 'top', spot: null, cta: 'Got it' },
  { id: 5, screen: 'fab',      title: 'Launch',
    body: 'Everything checks out. The selected vehicle is entering the launch sequence.',
    action: 'Review the flight manifest while the sequence starts',
    anchor: 'top', spot: null, cta: 'the flight manifest' },
  // SSL-307: this used to read "Tap an exposed deposit to fire", describing a
  // point-and-aim mechanic the game doesn't have. The laser always fires
  // straight down from the ship's fixed screen position while the ore field
  // drifts underneath — it's a timing game, not aim-and-click. This is the
  // Flight Plan instruction a first-time player sees (the separate Mining HUD
  // guide is suppressed for the active training try),
  // so the correction has to live here, not just in that component.
  { id: 6, screen: 'mining',   title: 'Mine the Asteroid',
    body: 'You can\'t aim the laser — it always fires straight down from your ship. Ore deposits (the coloured seams) drift past underneath. Wait for one to line up, then fire.',
    action: 'Tap FIRE LASER when a deposit lines up',
    anchor: 'top', spot: null, cta: 'Fire the laser', coachId: 'mining-fire-laser',
    desktopAction: 'Click FIRE LASER when a deposit lines up' },
]

export const TRANSPORT_STEPS: TutorialStep[] = [
  { id: 30, screen: 'hub', title: 'Transport',
    body: 'Next, moving cargo. You will mine at one site, carry the order to the client\'s build site, then fly home. The contract pays for both jobs.',
    action: 'Tap the tower',
    anchor: 'bottom', spot: null, cta: 'Tower', coachId: 'building-launchpad', dir: 'up',
    desktopBody: 'Next, moving cargo. You will mine at one site, carry the order to the client\'s build site, then fly home. Click the tower to begin.',
    desktopAction: 'Click the tower',
    desktopCoachId: 'building-launchpad', desktopDir: 'up' },
  // Sibling of step 30 — see the id:1 launchpad sibling above for why this exists.
  { id: 30, screen: 'launchpad', title: 'Transport',
    body: 'Your own program is here — client contracts are one press further in.',
    action: 'Tap View All Contracts',
    anchor: 'bottom', spot: null, cta: 'View All Contracts', coachId: 'launchpad-view-contracts', dir: 'down',
    desktopAction: 'Click View All Contracts',
    desktopCoachId: 'launchpad-view-contracts', desktopDir: 'down' },
  { id: 31, screen: 'rocket-buy', title: 'Two-Stop Route',
    body: 'This contract has two legs — pickup, then delivery. Buy a rocket with enough range to reach both before launching. Your payout at debrief will break out as a mining fee and a transport fee.',
    manual: true,
    anchor: 'top', spot: null, cta: 'Got it' },
  { id: 32, screen: 'fab', title: 'Confirm The Run',
    body: 'Confirm your loadout and launch. You will get a new heading once the pickup cargo is secured.',
    manual: true,
    anchor: 'top', spot: null, cta: 'Got it' },
  { id: 33, screen: 'delivery', title: 'Unload At The Depot',
    body: 'The client owns this building site. Drive the loaded rover to its marked cache, dump the minerals, return the empty rover to the ship, then launch for Earth.',
    manual: true,
    anchor: 'top', spot: null, cta: 'Got it' },
]

/** SSL-576 storage lesson. Build happens inside the base scene: the dock
 *  Build control opens placement, the silo goes underground, then two short
 *  notes cover storing ore and selling it later at the Exchange. */
export const STORAGE_STEPS: TutorialStep[] = [
  { id: 40, screen: 'hub', title: 'Storage',
    body: 'Your agency can mine and haul. Now give it somewhere to keep ore at home: a Surface Silo.',
    action: 'Tap Build',
    anchor: 'bottom', spot: null, cta: 'Build', coachId: 'hub-build-btn', dir: 'up',
    desktopAction: 'Click Build',
    desktopCoachId: 'hub-build-btn', desktopDir: 'up' },
  { id: 41, screen: 'build', title: 'Storage',
    body: 'Pick the Surface Silo. It is dug in under the base, so it needs no open plot.',
    action: 'Pick Surface Silo, then tap Place silo',
    anchor: 'bottom', spot: null, cta: 'Place silo', coachId: 'build-option-surface-silo|build-place-underground', dir: 'down',
    desktopAction: 'Pick Surface Silo, then click Place silo',
    desktopCoachId: 'build-option-surface-silo|build-place-underground', desktopDir: 'down' },
  { id: 42, screen: 'hub', title: 'Storage',
    body: 'Ore you bring home can now go into the silo instead of being sold straight away.',
    action: 'Store ore in the silo instead of selling it',
    manual: true,
    anchor: 'top', spot: null, cta: 'Got it' },
  { id: 43, screen: 'hub', title: 'Storage',
    body: 'When the price suits you, sell stored ore at the Exchange, the trading building on your base.',
    action: 'Sell stored ore later at the Exchange',
    manual: true,
    anchor: 'top', spot: null, cta: 'Got it' },
]

/** Step ids the silo placement itself completes. */
export const STORAGE_BUILD_STEP_IDS: readonly number[] = [40, 41]
export const STORAGE_LAST_STEP_ID = 43

export interface StorageLessonPlayer {
  placed?: string[]
  missionsDone: number
}

/** SSL-576: the storage lesson runs once the first missions are flown and
 *  stays until its last note is read or skipped. It sits beside Free Ops and
 *  never gates it. */
export function storageLessonSteps(player: StorageLessonPlayer, doneSteps: Record<number, boolean>): TutorialStep[] {
  const missions = Number.isFinite(player.missionsDone) ? player.missionsDone : 0
  if (missions < FREE_OPS_START_MISSIONS_DONE || doneSteps[STORAGE_LAST_STEP_ID]) return []
  return STORAGE_STEPS
}

/** Done map for the storage coach: placing the silo (from any surface)
 *  finishes the build steps. */
export function storageLessonDoneSteps(player: StorageLessonPlayer, doneSteps: Record<number, boolean>): Record<number, boolean> {
  if (!(player.placed ?? []).includes('surface-silo')) return doneSteps
  const next = { ...doneSteps }
  for (const id of STORAGE_BUILD_STEP_IDS) next[id] = true
  return next
}

export const PROGRESSION_STEPS: TutorialStep[] = [
  ...EXTRACTION_STEPS,
  ...TRANSPORT_STEPS,
  ...STORAGE_STEPS,
]

/** Coach steps for an agency training stage. Launchpad placement is the
 *  first beat of the Extraction step list. Storage is selected separately
 *  (storageLessonSteps) so it never gates Free Ops. */
export function trainingCoachSteps(stage: AgencyTrainingStage): TutorialStep[] {
  if (stage === 'launchpad' || stage === 'extraction') return EXTRACTION_STEPS
  if (stage === 'transport') return TRANSPORT_STEPS
  if (stage === 'storage') return STORAGE_STEPS
  return []
}

// Compatibility exports for the retired GameApp route shell. The live shell
// selects the same agency stages through trainingCoachSteps.
export const M1_STEPS = EXTRACTION_STEPS
export const M2_STEPS = TRANSPORT_STEPS
export const M3_STEPS = STORAGE_STEPS
