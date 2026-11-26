import type { Screen } from '@/lib/game-types'

/**
 * Where a finished mission can go next (SSL-818). Every mission type offers the
 * same few doors; the debrief shows the ones that apply. "Comment and share" is
 * left out until the message board exists in cycle 10; when it lands, each vote
 * and comment there will also add community research points.
 */
export type DebriefExitId = 'explore' | 'again' | 'reposition' | 'community' | 'plan' | 'base' | 'probe'

export interface DebriefExit {
  id: DebriefExitId
  label: string
  screen: Screen
}

interface ExitInput {
  probeDeployment?: boolean
  /** The run was a Leonids/Orionids shower run: another run lives on the Mission Board. */
  showerRun: boolean
  /** The run was one of the player's own program operations: another lives on the launchpad. */
  programOperation: boolean
  /** The player has at least one telescope or satellite online. */
  hasInstrument: boolean
  /** Own-flight planning appears when Free Ops is available, independently of the optional coach. */
  guided: boolean
}

export function debriefExits({ programOperation, hasInstrument, guided, probeDeployment }: ExitInput): DebriefExit[] {
  const exits: DebriefExit[] = []
  if (probeDeployment) exits.push({ id: 'probe', label: 'Open probe scanner', screen: 'probe-scan' })
  exits.push({ id: 'again', label: 'Choose next flight', screen: 'missions' })
  if (hasInstrument) exits.push({ id: 'explore', label: 'Review telescope data', screen: 'instrument-hub' })
  if (hasInstrument && programOperation) exits.push({ id: 'reposition', label: 'Reposition telescope', screen: 'sky-pointing' })
  return exits
}

export function debriefExitScreen(id: DebriefExitId | undefined, input: Omit<ExitInput, 'guided'>): Screen | null {
  if (id === 'base') return 'hub'
  if (id === 'plan') return 'mission-planner' // Preserve previously saved handoffs.
  if (id === 'community') return 'community-research'
  if (!id) return null
  return debriefExits({ ...input, guided: false }).find(exit => exit.id === id)?.screen ?? null
}
