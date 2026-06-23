import type { GameState } from '@/lib/game-types'

export function applyTutorialSkip(state: GameState, stepIds: number[]): GameState {
  const skippedSteps = stepIds.reduce<Record<number, boolean>>(
    (acc, id) => ({ ...acc, [id]: true }),
    state.doneSteps
  )
  const needsStarterLaunchpad =
    state.player.missionsDone === 0 && !state.player.placed.includes('launchpad')

  if (!needsStarterLaunchpad) {
    return {
      ...state,
      tutorial: false,
      doneSteps: skippedSteps,
      menuOpen: false,
    }
  }

  return {
    ...state,
    screen: state.screen === 'build' ? 'hub' : state.screen,
    tutorial: false,
    doneSteps: skippedSteps,
    menuOpen: false,
    player: {
      ...state.player,
      placed: [...state.player.placed, 'launchpad'],
      placementPlots: {
        ...state.player.placementPlots,
        launchpad: state.player.placementPlots.launchpad ?? 1,
      },
    },
  }
}
