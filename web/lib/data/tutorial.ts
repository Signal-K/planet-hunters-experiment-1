// Landnam game data — tutorial steps
//
// SSL-332 agency training: EXTRACTION_STEPS (place the launchpad, then the
// first mine-and-return contract), TRANSPORT_STEPS (the two-stop mine-and-haul
// contract) and STORAGE_STEPS (build the Earth silo that opens Free Ops). The
// old M2 Prospector steps are retired. Stage selection lives in
// trainingCoachSteps below.

import type { TutorialStep } from './types'
import type { AgencyTrainingStage } from '@/lib/systems/AgencyOnboardingSystem'
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
  { id: 'mine-launchpad', try: 'mining', screen: 'launchpad', objective: 'Open client contracts', radio: 'The first try is a complete mine-and-return run.', beacon: 'launchpad-view-contracts', doneOn: 'mining-debriefed' },
  { id: 'mine-contract', try: 'mining', screen: 'missions', objective: 'Accept a mining contract', radio: 'A client order funds this first field run.', doneOn: 'mining-debriefed' },
  { id: 'mine-target', try: 'mining', screen: 'targets', objective: 'Choose the highlighted target', radio: 'The target carries the mineral named by the order.', doneOn: 'mining-debriefed' },
  { id: 'mine-fire', try: 'mining', screen: 'mining', objective: 'Fire the laser on a seam', radio: 'Wait for a coloured seam to pass beneath the fixed laser line.', hint: 'The seam will cross the laser line; fire when it does.', beacon: 'mining-fire-laser', doneOn: 'mining-debriefed' },
  { id: 'mine-debrief', try: 'mining', screen: 'debrief', objective: 'Close the mission debrief', radio: 'The first try is recorded when the order is settled.', doneOn: 'mining-debriefed' },
  { id: 'scan-classify', try: 'scan', screen: 'galaxy', objective: 'Classify the transit candidate', radio: 'Review the light curve and submit a science verdict.', hint: 'The expected transit sits in the shaded dip band.', doneOn: 'tess-classified' },
  { id: 'part-fit', try: 'part', screen: 'hangar', objective: 'Swap one ship module', radio: 'Fit a different module in the ship customiser, then confirm.', doneOn: 'part-tweaked' },
]

export function trainingTryStep(tryId: TrainingTryId, screen: string): TrainingTryStep | undefined {
  return TRAINING_TRIES.find(step => step.try === tryId && step.screen === screen)
    ?? TRAINING_TRIES.find(step => step.try === tryId)
}

export const EXTRACTION_STEPS: TutorialStep[] = [
  { id: 0, screen: 'build',   title: 'Build a Launchpad',
    body: 'Your first structure — all missions launch from here.',
    action: 'Tap a build pad, then confirm',
    anchor: 'bottom', spot: null, coachId: 'build-confirm|build-plot-0', dir: 'down', cta: 'Build Launchpad',
    desktopBody: 'Your first structure — all missions launch from here.',
    desktopAction: 'Click a build pad, then confirm placement',
    desktopCoachId: 'build-confirm|build-plot-0', desktopDir: 'down' },
  { id: 1, screen: 'hub',     title: 'Extraction',
    body: 'Your agency\'s first job: mine ore for a client and bring it home. Contracts are on the mission board.',
    action: 'Tap the Launchpad',
    anchor: 'bottom', spot: null, coachId: 'building-launchpad', dir: 'up', cta: 'Launchpad',
    desktopBody: 'Your agency\'s first job: mine ore for a client and bring it home. Contracts are on the mission board.',
    desktopAction: 'Click the Launchpad',
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
  // coach a first-time player actually sees (the separate Mining HUD
  // hint is suppressed for the whole tutorial, since `hasCoach` is true),
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
    action: 'Tap the Launchpad',
    anchor: 'bottom', spot: null, cta: 'Launchpad', coachId: 'building-launchpad', dir: 'up',
    desktopBody: 'Next, moving cargo. You will mine at one site, carry the order to the client\'s build site, then fly home. Click the Launchpad to begin.',
    desktopAction: 'Click the Launchpad',
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

export const STORAGE_STEPS: TutorialStep[] = [
  { id: 40, screen: 'hub', title: 'Build a Storage Silo',
    body: 'Your agency can mine and haul. Now give it somewhere to keep ore on Earth. Building the silo opens Free Ops.',
    action: 'Tap Build Silo',
    anchor: 'bottom', spot: null, cta: 'Build Silo', coachId: 'hub-build-storage-silo', dir: 'up',
    desktopAction: 'Click Build Silo',
    desktopCoachId: 'hub-build-storage-silo', desktopDir: 'up' },
  { id: 41, screen: 'build', title: 'Place the Silo',
    body: 'Pick an open plot for the Surface Silo, then confirm.',
    action: 'Tap an open plot, then confirm',
    anchor: 'bottom', spot: null, coachId: 'build-confirm|build-plot-open', dir: 'down', cta: 'Build Surface Silo',
    desktopAction: 'Click an open plot, then confirm placement',
    desktopCoachId: 'build-confirm|build-plot-open', desktopDir: 'down' },
]

export const PROGRESSION_STEPS: TutorialStep[] = [
  ...EXTRACTION_STEPS,
  ...TRANSPORT_STEPS,
  ...STORAGE_STEPS,
]

/** Coach steps for an agency training stage. Launchpad placement is the
 *  first beat of the Extraction step list; Free Ops has no coach. */
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
