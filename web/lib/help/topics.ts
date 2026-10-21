import type { Screen } from '@/lib/game-types'

/** One card in the help sheet. Body text renders at 14px or larger. */
export interface HelpCard {
  title: string
  body: string
  /** Optional illustration, a path under /public. */
  image?: { src: string; alt: string }
}

/** One step of the optional "Show me" run. Targets are `data-coach-target` ids. */
export interface HelpCoachStep {
  id: string
  /** Controls lit up for this step. */
  targets: readonly string[]
  /** The control the hint bubble points at. */
  anchor: string
  hint: string
  /** The step also ends when the screen reports this action id. */
  completeOn?: string
}

export interface HelpTopic {
  id: string
  title: string
  /** 2 to 4 cards. */
  cards: readonly HelpCard[]
  /** Present when the screen offers a "Show me" run. */
  coach?: readonly HelpCoachStep[]
}

export const MIN_HELP_CARDS = 2
export const MAX_HELP_CARDS = 4

/**
 * Help content keyed by game screen. A screen with no entry shows no "?".
 * Other screens add their topic here (sibling stories). Nothing opens
 * unprompted: a topic only shows when the player taps the "?".
 */
const LAUNCH_HELP: HelpTopic = {
  id: 'launch',
  title: 'Launch review',
  cards: [
    { title: 'Map and destination', body: 'The map shows where each body sits. Lit bodies are in reach of this rocket. Tap one to pick it, or use the arrows. Check the minerals and the distance before you commit.' },
    { title: 'Rocket and cargo', body: 'Each rocket class has its own cargo space and range. Pick one that carries the cargo this run needs and reaches the body. A contract shows its payout, so compare it with what the rocket costs.' },
    { title: 'Fit checks', body: 'Clearance reads ALL PARAMETERS PASS when the rocket, fuel and cargo fit the trip. If it says BUILD HOLD, the line under it names what is missing. Change the rocket or the target to clear it.' },
    { title: 'What Launch commits', body: 'Prepare rolls the rocket from the Workshop to the pad and spends its build cost. LAUNCH then starts the flight. A Free Ops haul and a client contract both leave from here.' },
  ],
}

// Shared by the Control Station and the TESS review so both "?" sheets explain the data analysis.
const DATA_ANALYSIS_CARD = {
  title: 'What the data analysis is',
  body: 'Each item is a real observation from a real telescope or survey. You look at it and classify what you see, such as a dip in a star\'s light. Your answers feed real citizen science projects and earn badges and rewards here.',
}

export const HELP_TOPICS: Partial<Record<Screen, HelpTopic>> = {
  'instrument-hub': {
    id: 'control-station',
    title: 'Where things are',
    cards: [
      {
        title: 'Where things are',
        body: 'The map shows each telescope and satellite you operate. A number means that equipment has items ready to classify.',
      },
      {
        title: 'Open a project',
        body: 'Filter by place, then open a row that has a count. That opens the review for those items.',
      },
      DATA_ANALYSIS_CARD,
    ],
  },
  // The TESS transit review screen.
  galaxy: {
    id: 'tess',
    title: 'Reading the light curve',
    cards: [
      DATA_ANALYSIS_CARD,
      {
        title: 'Find the dip',
        body: 'A planet passing in front of its star makes the light dip for a short while, then recover. Drag across the dip on the chart to mark it.',
      },
      {
        title: 'Confirm Transit',
        body: 'Use Confirm Transit when the marked dip looks like a real, repeating drop with a clean shape.',
      },
      {
        title: 'Mark Noise or Skip',
        body: 'Use Mark Noise when the marked dip is just jitter or a glitch. Use Skip when you cannot tell. Skip needs no mark.',
      },
    ],
    coach: [
      {
        id: 'mark',
        targets: ['tess-chart'],
        anchor: 'tess-chart',
        hint: 'Drag across the dip in the light curve to mark it.',
        completeOn: 'mark',
      },
      {
        id: 'verdict',
        targets: ['tess-verdicts'],
        anchor: 'tess-verdicts',
        hint: 'Confirm Transit if it is a real dip, Mark Noise if it is not, Skip if unsure.',
      },
    ],
  },
  hub: {
    id: 'base',
    title: 'Between flights',
    cards: [
      { title: 'Home of the program', body: 'You stand here between flights. Buildings and the launch tower are on this ground. After training, you do not need a client contract to keep playing.' },
      { title: 'Free Ops or a contract', body: 'Open the launch tower. Launch your own instrument, scan a body, or mine for yourself. Available Contracts is the other branch from the same pad.' },
      { title: 'Ops list', body: 'Buildings on the ground open their own work. The dock switches operation, opens Build, or opens Hub.' },
    ],
  },
  launchpad: {
    id: 'launchpad',
    title: 'Start a run',
    cards: [
      { title: 'Start a run', body: 'The launch tower opens Free Ops: your own satellite, a mining haul, or a build. No client is required.' },
      { title: 'Contracts stay optional', body: 'AVAILABLE CONTRACTS lists client work. Taking one is a choice. The pad still flies your own missions if you skip it.' },
      { title: 'A run already out', body: 'RESUME jumps back in. SCRUB abandons that run after you confirm. Cargo and laser charges from it are cleared.' },
    ],
  },
  targets: LAUNCH_HELP,
  'rocket-buy': LAUNCH_HELP,
  fab: LAUNCH_HELP,
  missions: {
    id: 'contracts',
    title: 'Contracts',
    cards: [
      { title: 'Client or your own work', body: 'This board is client work. A contract pays a set amount and may be locked until you meet its requirement. Skip it and fly your own mission from the pad.' },
      { title: 'Payout and bonus', body: 'The payout is paid on delivery. A client bonus is extra, and only if the card lists one and you meet its terms. Misses cost the bonus, not the base payout.' },
      { title: 'Prepare, then launch', body: 'Accept and prepare opens the launch review. The rocket stands in the Workshop, then rolls to the pad when you confirm.' },
    ],
  },
  mining: {
    id: 'mining',
    title: 'Mining operations',
    cards: [
      { title: 'Hit the requested ore', body: 'The first rocks in the seam are the mineral this run asked for. Fire when one sits under the ship.' },
      { title: 'Charges and cargo stay', body: 'Shots spend laser charges. Leaving or reloading keeps the cargo and the charges you have left. Recharge spends francs.' },
      { title: 'Bring it home', body: 'Return when you are ready on a Free Ops haul. A client order waits until the requested ore is in the hold.' },
    ],
    coach: [
      { id: 'laser', targets: ['mining-fire-laser'], anchor: 'mining-fire-laser', hint: 'Wait for a coloured seam to pass the fixed laser line, then fire.', completeOn: 'fire' },
    ],
  },
  debrief: {
    id: 'debrief',
    title: 'After the haul',
    cards: [
      { title: 'The haul is home', body: 'Debrief pays the run and puts ore in your stash, or sells it if that was the plan.' },
      { title: 'Next is the ground', body: 'Collect, then you are back on the ground. Spend the francs and ore on a build, or launch again. A new contract is optional.' },
    ],
  },
  build: {
    id: 'build',
    title: 'Place a structure',
    cards: [
      { title: 'Spend what you hauled', body: 'Pick a structure and a plot. The card shows the francs and minerals it needs.' },
      { title: 'Where a mineral comes from', body: 'If you are short, the card names the Free Ops bodies that carry that mineral. Mine it, return, then build.' },
    ],
  },
  hangar: {
    id: 'hangar',
    title: 'Hangar',
    cards: [
      { title: 'Parts and builds', body: 'Pick a part to see what it changes. Stat changes show next to the part. Build cost is the francs it takes to fit it.' },
      { title: 'Staged vehicles', body: 'Assemble a staged vehicle here, then transfer it to the pad. Parts you have not unlocked stay greyed.' },
    ],
  },
  market: {
    id: 'market',
    title: 'Sell the haul',
    cards: [
      { title: 'Sell the haul', body: 'Ore you brought home sells here for francs. The price on the card is the price you are paid.' },
      { title: 'Build from a recipe', body: 'Road Segment and Surface Silo show BUILD when you can afford them. Short cards name where to mine the missing material in Free Ops.' },
    ],
  },
}

export function getHelpTopic(screen: Screen): HelpTopic | null {
  return HELP_TOPICS[screen] ?? null
}
