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
    anchor: 'bottom', spot: { x: 169, y: 786, w: 64, h: 64 }, cta: 'the menu' },
  { id: 2, screen: 'missions', title: 'Lock a Contract',
    body: 'Pick a mining company. They name the minerals they want and pay a bonus on delivery.',
    action: 'Tap a contract card',
    anchor: 'bottom', spot: { x: 14, y: 154, w: 374, h: 168 }, cta: 'a contract' },
  { id: 3, screen: 'targets',  title: 'Choose a Destination',
    body: 'Tap a highlighted body on the map — only compatible targets are selectable.',
    action: 'Tap a target, then Continue',
    anchor: 'bottom', spot: { x: 36, y: 204, w: 330, h: 482 }, cta: 'a target' },
  { id: 4, screen: 'fab',      title: 'Assemble the Rocket',
    body: 'Your Starter Rocket is pre-loaded with compatible parts. Swap any slot to experiment, or keep the suggested build.',
    manual: true,
    anchor: 'top', spot: { x: 14, y: 154, w: 374, h: 250 }, cta: 'Got it' },
  { id: 5, screen: 'fab',      title: 'Launch',
    body: 'Everything checks out.',
    action: 'Tap CONFIRM LAUNCH',
    anchor: 'top', spot: { x: 14, y: 786, w: 374, h: 64 }, cta: 'Confirm Launch' },
  { id: 6, screen: 'mining',   title: 'Mine the Asteroid',
    body: 'Tap the glowing ore deposits to collect minerals. Fill your contract order, then tap RETURN when you\'re ready to fly home.',
    action: 'Tap ore to mine · then Return',
    anchor: 'center', spot: null, cta: 'mine' },
  { id: 9, screen: 'debrief',  title: 'Debrief',
    body: 'Sell your cargo and collect the contractor bonus.',
    action: 'Tap to collect your reward',
    anchor: 'top', spot: { x: 14, y: 786, w: 374, h: 64 }, cta: 'Collect' },
]

export const M2_STEPS: TutorialStep[] = [
  { id: 20, screen: 'hub', title: 'Starter Rocket 2 Ready',
    body: 'Mission 2 needs 8 silicon — more than your MK1 hull can carry. Hull MK2 is now unlocked in the Fabricator. Open Missions when ready.',
    manual: true,
    anchor: 'bottom', spot: null, cta: 'Got it' },
  { id: 21, screen: 'fab', title: 'Upgrade Your Hull',
    body: 'Swap your Chassis slot to Hull MK2. It holds 10 units — enough to fill the silicon order in one run.',
    manual: true,
    anchor: 'top', spot: { x: 14, y: 154, w: 374, h: 200 }, cta: 'Got it' },
]

export const PROGRESSION_STEPS: TutorialStep[] = [
  ...M1_STEPS,
  ...M2_STEPS,
]
