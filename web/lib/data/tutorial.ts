// Landnam game data — tutorial steps

import type { TutorialStep } from './types'

export const M1_STEPS: TutorialStep[] = [
  { id: 0, screen: 'build',   title: 'Build a Launchpad',
    body: 'Your first structure — all missions launch from here.',
    action: 'Pick a structure, then tap a pad',
    anchor: 'bottom', spot: null, coachId: 'build-structure-strip', dir: 'down', cta: 'Build Launchpad' },
  { id: 1, screen: 'hub',     title: 'Open a Mission',
    body: 'Mining contracts are on the mission board.',
    action: 'Tap menu, then MISSIONS',
    anchor: 'bottom', spot: null, coachId: 'radial-toggle', dir: 'down', cta: 'the menu',
    desktopBody: 'Mining contracts are on the mission board.',
    desktopAction: 'Click MISSIONS in the sidebar',
    desktopCoachId: 'sidebar-missions', desktopDir: 'left' },
  { id: 2, screen: 'missions', title: 'Lock a Contract',
    body: 'Pick a contractor — they specify what to mine and pay a bonus on delivery.',
    action: 'Tap a contract card',
    anchor: 'bottom', spot: null, cta: 'a contract' },
  { id: 3, screen: 'targets',  title: 'Choose a Destination',
    body: 'Highlighted bodies have the ore your contract requires.',
    action: 'Tap a target, then Continue',
    anchor: 'bottom', spot: null, cta: 'a target' },
  { id: 4, screen: 'fab',      title: 'Assemble the Rocket',
    body: 'SR1 is pre-loaded for this contract — review the build, then launch.',
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
  { id: 20, screen: 'hub', title: 'SR2 Unlocked',
    body: 'Bigger cargo bay, stronger drill — select it at the rocket step.',
    manual: true,
    anchor: 'bottom', spot: null, cta: 'Got it' },
  { id: 21, screen: 'rocket-buy', title: 'Purchase Your Rocket',
    body: 'SR2 carries more cargo than SR1.',
    manual: true,
    anchor: 'top', spot: null, cta: 'Got it' },
]

export const M3_STEPS: TutorialStep[] = [
  { id: 30, screen: 'hub', title: 'Delivery Mission',
    body: 'This mission delivers equipment — your rocket carries cargo instead of drilling.',
    manual: true,
    anchor: 'bottom', spot: null, cta: 'Got it' },
  { id: 31, screen: 'rocket-buy', title: 'Cargo Module Installed',
    body: 'Your rocket is fitted for this delivery — no drill needed.',
    manual: true,
    anchor: 'top', spot: null, cta: 'Got it' },
  { id: 32, screen: 'fab', title: 'Ready to Launch',
    body: 'Cargo Module loaded — this rocket delivers, not drills.',
    manual: true,
    anchor: 'top', spot: null, cta: 'Got it' },
]

export const PROGRESSION_STEPS: TutorialStep[] = [
  ...M1_STEPS,
  ...M2_STEPS,
  ...M3_STEPS,
]
