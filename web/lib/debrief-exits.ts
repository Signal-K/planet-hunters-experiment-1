import type { Screen } from '@/lib/game-types'

/**
 * Where a finished mission can go next (SSL-818). Every mission type offers the
 * same few doors; the debrief shows the ones that apply. "Comment and share" is
 * left out until the message board exists in cycle 10; when it lands, each vote
 * and comment there will also add community research points.
 */
export type DebriefExitId = 'explore' | 'again' | 'reposition'

export interface DebriefExit {
  id: DebriefExitId
  label: string
  screen: Screen
}

interface ExitInput {
  /** The run was a Leonids/Orionids shower run: another run lives on the Mission Board. */
  showerRun: boolean
  /** The run was one of the player's own program operations: another lives on the launchpad. */
  programOperation: boolean
  /** The player has at least one telescope or satellite online. */
  hasInstrument: boolean
  /** Still in the guided first missions: the debrief keeps one door, back to Base. */
  guided: boolean
}

export function debriefExits({ showerRun, programOperation, hasInstrument, guided }: ExitInput): DebriefExit[] {
  if (guided) return []
  const exits: DebriefExit[] = []
  if (hasInstrument) exits.push({ id: 'explore', label: 'Explore further', screen: 'instrument-hub' })
  exits.push({ id: 'again', label: 'Do another', screen: programOperation && !showerRun ? 'launchpad' : 'missions' })
  if (hasInstrument && programOperation) exits.push({ id: 'reposition', label: 'Reposition telescope', screen: 'sky-pointing' })
  return exits
}

export function debriefExitScreen(id: DebriefExitId | undefined, input: Omit<ExitInput, 'guided'>): Screen | null {
  if (!id) return null
  return debriefExits({ ...input, guided: false }).find(exit => exit.id === id)?.screen ?? null
}
