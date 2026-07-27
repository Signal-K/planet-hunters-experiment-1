// Landnam game data — tutorial steps

import type { TutorialStep } from './types'

export const M1_STEPS: TutorialStep[] = [
  { id: 0, screen: 'build',   title: 'Build a Launchpad',
    body: 'Your first structure — all missions launch from here.',
    action: 'Tap a build pad, then confirm',
    anchor: 'bottom', spot: null, coachId: 'build-confirm|build-plot-0', dir: 'down', cta: 'Build Launchpad',
    desktopBody: 'Your first structure — all missions launch from here.',
    desktopAction: 'Click a build pad, then confirm placement',
    desktopCoachId: 'build-confirm|build-plot-0', desktopDir: 'down' },
  { id: 1, screen: 'hub',     title: 'Open a Mission',
    body: 'Mining contracts are on the mission board.',
    action: 'Tap MISSIONS',
    anchor: 'bottom', spot: null, coachId: 'bottom-tab-missions', dir: 'down', cta: 'MISSIONS',
    desktopBody: 'Mining contracts are on the mission board.',
    desktopAction: 'Click the Launchpad',
    desktopCoachId: 'building-launchpad', desktopDir: 'up' },
  { id: 2, screen: 'missions', title: 'Lock a Contract',
    body: 'Pick a client — they specify what to mine and pay a bonus on delivery.',
    action: 'Tap a contract card',
    anchor: 'bottom', spot: null, cta: 'a contract' },
  { id: 3, screen: 'targets',  title: 'Choose a Destination',
    body: 'Highlighted bodies have the ore your contract requires.',
    action: 'Tap a target, then Continue',
    anchor: 'bottom', spot: null, cta: 'a target' },
  { id: 4, screen: 'fab',      title: 'Assemble the Rocket',
    body: 'Explorer is pre-loaded for this contract — review the build, then launch.',
    manual: true,
    anchor: 'top', spot: null, cta: 'Got it' },
  { id: 5, screen: 'fab',      title: 'Launch',
    body: 'Everything checks out.',
    action: 'Tap CONFIRM LAUNCH',
    anchor: 'top', spot: null, cta: 'Confirm Launch' },
  { id: 6, screen: 'mining',   title: 'Mine the Asteroid',
    body: 'Fire your laser at the ore deposits below.',
    manual: true,
    anchor: 'top', spot: null, cta: 'Got it' },
  { id: 7, screen: 'mining',   title: 'Mine the Asteroid',
    body: 'Fill your cargo order, then tap RETURN.',
    action: 'Tap ore to mine · then Return',
    anchor: 'top', spot: null, cta: 'mine' },
  { id: 9, screen: 'debrief',  title: 'Debrief',
    body: 'Collect your contract payment.',
    action: 'Tap to collect your reward',
    anchor: 'top', spot: null, cta: 'Collect' },
]

export const M2_STEPS: TutorialStep[] = [
  // Step 20: hub — action step (auto-dismisses when user navigates to missions).
  // Mirrors M1 step 1: highlights the radial menu so the user knows exactly what to tap.
  { id: 20, screen: 'hub', title: 'Guided Ops · Mission 2',
    body: 'Prospector is now available — bigger cargo bay and stronger drill. You\'re still in guided operations. Accept a new mining contract to continue.',
    action: 'Tap MISSIONS',
    anchor: 'bottom', spot: null, cta: 'Missions', coachId: 'bottom-tab-missions', dir: 'down',
    desktopBody: 'Prospector is now available — bigger cargo bay and stronger drill. You\'re still in guided operations. Click MISSIONS to continue.',
    desktopAction: 'Click the Launchpad',
    desktopCoachId: 'building-launchpad', desktopDir: 'up' },
  { id: 21, screen: 'rocket-buy', title: 'Prospector — Select Your Rocket',
    body: 'Prospector has been assigned to this mission. It carries more ore than Explorer and reaches deeper mineral tiers.',
    manual: true,
    anchor: 'top', spot: null, cta: 'Got it' },
]

export const M3_STEPS: TutorialStep[] = [
  { id: 30, screen: 'hub', title: 'Guided Ops · Mission 3',
    body: 'New job type: mine at the pickup site, then haul the cargo to a second target before heading home. You\'re paid for both legs — mining the ore and running the delivery. Pick a client to continue.',
    action: 'Tap MISSIONS',
    anchor: 'bottom', spot: null, cta: 'Missions', coachId: 'bottom-tab-missions', dir: 'down',
    desktopBody: 'New job type: mine at the pickup site, then haul the cargo to a second target before heading home. You\'re paid for both legs — mining the ore and running the delivery. Click MISSIONS to continue.',
    desktopAction: 'Click the Launchpad',
    desktopCoachId: 'building-launchpad', desktopDir: 'up' },
  { id: 31, screen: 'rocket-buy', title: 'Two-Stop Route',
    body: 'This contract has two legs — pickup, then delivery. Buy a rocket with enough range to reach both before launching. Your payout at debrief will break out as a mining fee and a transport fee.',
    manual: true,
    anchor: 'top', spot: null, cta: 'Got it' },
  { id: 32, screen: 'fab', title: 'Confirm The Run',
    body: 'Confirm your loadout and launch. You will get a new heading once the pickup cargo is secured.',
    manual: true,
    anchor: 'top', spot: null, cta: 'Got it' },
]

export const PROGRESSION_STEPS: TutorialStep[] = [
  ...M1_STEPS,
  ...M2_STEPS,
  ...M3_STEPS,
]
