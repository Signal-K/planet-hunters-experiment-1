// Landnam game data — tutorial steps

import type { TutorialStep } from './types'

export const M1_STEPS: TutorialStep[] = [
  { id: 0, screen: 'build',   title: 'Build a Launchpad',
    body: 'Every base starts here. Select the Launchpad, then tap a plot to place it on your land.',
    action: 'Tap SELECT A PLOT, then a pad',
    anchor: 'bottom', spot: null, cta: 'Build Launchpad' },
  { id: 1, screen: 'hub',     title: 'Open a Mission',
    body: 'Open the radial menu, then choose MISSIONS to see the contract board.',
    action: 'Tap menu, then MISSIONS',
    anchor: 'bottom', spot: { x: -32, y: 24, w: 64, h: 64, fromBottom: true, fromCenter: true }, cta: 'the menu' },
  { id: 2, screen: 'missions', title: 'Lock a Contract',
    body: 'Pick a mining company. They name the minerals they want and pay a bonus on delivery.',
    action: 'Tap a contract card',
    anchor: 'bottom', spot: { x: 14, y: 154, w: 374, right: 14, h: 168 }, cta: 'a contract' },
  { id: 3, screen: 'targets',  title: 'Choose a Destination',
    body: 'Tap a highlighted body on the map — only compatible targets are selectable.',
    action: 'Tap a target, then Continue',
    anchor: 'bottom', spot: { x: 36, y: 204, w: 330, right: 36, h: 482 }, cta: 'a target' },
  { id: 4, screen: 'fab',      title: 'Assemble the Rocket',
    body: 'Your Starter Rocket is pre-loaded with compatible parts for this contract. Confirm the build looks good, then launch.',
    manual: true,
    anchor: 'top', spot: { x: 14, y: 154, w: 374, right: 14, h: 250 }, cta: 'Got it' },
  { id: 5, screen: 'fab',      title: 'Launch',
    body: 'Everything checks out.',
    action: 'Tap CONFIRM LAUNCH',
    anchor: 'top', spot: { x: 14, y: 24, w: 374, right: 14, h: 64, fromBottom: true }, cta: 'Confirm Launch' },
  { id: 6, screen: 'mining',   title: 'Mine the Asteroid',
    body: 'Tap the glowing ore deposits to collect minerals. Fill your contract order, then tap RETURN when you\'re ready to fly home.',
    action: 'Tap ore to mine · then Return',
    anchor: 'center', spot: null, cta: 'mine' },
  { id: 9, screen: 'debrief',  title: 'Debrief',
    body: 'Sell your cargo and collect the contractor bonus.',
    action: 'Tap to collect your reward',
    anchor: 'top', spot: { x: 14, y: 24, w: 374, right: 14, h: 64, fromBottom: true }, cta: 'Collect' },
]

export const M2_STEPS: TutorialStep[] = [
  { id: 20, screen: 'hub', title: 'Starter Rocket 2 Available',
    body: 'Mission 2 needs 8 silicon — more than SR1 can carry. Purchase SR2 (1.3B ▲) in the vehicle step before launch. Open Missions when ready.',
    manual: true,
    anchor: 'bottom', spot: null, cta: 'Got it' },
  { id: 21, screen: 'rocket-buy', title: 'Purchase Your Rocket',
    body: 'SR2 has a larger cargo bay and stronger drill — enough for the silicon order. Purchase it here to continue.',
    manual: true,
    anchor: 'top', spot: { x: 14, y: 154, w: 374, right: 14, h: 320 }, cta: 'Got it' },
]

export const M3_STEPS: TutorialStep[] = [
  { id: 30, screen: 'hub', title: 'Delivery Mission',
    body: 'M3 is a cargo run, not a mining contract. You\'ll carry a survey rover to Lutetia — the Cargo Module replaces your drill for this job.',
    manual: true,
    anchor: 'bottom', spot: null, cta: 'Got it' },
  { id: 31, screen: 'rocket-buy', title: 'Cargo Module Installed',
    body: 'Your SR2 has been configured with the Cargo Module T1 for this mission. It carries the rover payload instead of a drill head.',
    manual: true,
    anchor: 'top', spot: { x: 14, y: 154, w: 374, right: 14, h: 320 }, cta: 'Got it' },
  { id: 32, screen: 'fab', title: 'Ready to Launch',
    body: 'Cargo Module is active — no drill needed for this delivery. Confirm and launch when ready.',
    manual: true,
    anchor: 'top', spot: { x: 14, y: 154, w: 374, right: 14, h: 250 }, cta: 'Got it' },
]

export const PROGRESSION_STEPS: TutorialStep[] = [
  ...M1_STEPS,
  ...M2_STEPS,
  ...M3_STEPS,
]
