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
export const HELP_TOPICS: Partial<Record<Screen, HelpTopic>> = {
  'instrument-hub': {
    id: 'control-station',
    title: 'Control Station',
    cards: [
      {
        title: 'Where things are',
        body: 'The map shows each telescope and satellite you operate. A number means that equipment has items ready to classify.',
      },
      {
        title: 'Open a project',
        body: 'Filter by place, then open a row that has a count. That opens the review for those items.',
      },
    ],
  },
  // The TESS transit review screen.
  galaxy: {
    id: 'tess',
    title: 'Reading the light curve',
    cards: [
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
}

export function getHelpTopic(screen: Screen): HelpTopic | null {
  return HELP_TOPICS[screen] ?? null
}
