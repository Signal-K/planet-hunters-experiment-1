'use client'

import { use, useEffect } from 'react'
import { notFound } from 'next/navigation'
import { useGame } from '@/game-context'
import { M1_STEPS, M2_STEPS, M3_STEPS } from '@/lib/data'
import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'
import type { Screen } from '@/lib/game-types'
import { ScreenContent, VALID_SCREENS } from '@/components/game/GameScreenRouter'

export default function ScreenPage({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = use(params)
  const game = useGame()

  // When the URL changes (browser back/forward), sync it into game state
  // without pushing another history entry. Gated on `hydrated` so this
  // can't race the initial hydration effect in GameProvider (which does a
  // plain-value setState and would otherwise silently clobber this sync —
  // e.g. a fresh player redirected from /game to /game/hub would get stuck
  // with game.screen desynced at 'intro', permanently hiding the tutorial
  // coach since it keys off game.screen, not the URL).
  useEffect(() => {
    if (!game.hydrated) return
    // Until authentication is resolved, a deep URL is only the route that
    // opened underneath the entry gate. Letting it write into GameState here
    // races sign-in's canonical Earth Base redirect and can reopen Contracts.
    if (game.authGateOpen || !game.authUserId) return
    if (VALID_SCREENS.has(screen as Screen) && game.screen !== screen) {
      game.setScreenFromUrl(screen as Screen)
    }
  }, [screen, game.hydrated, game.authGateOpen, game.authUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Coach: lightweight derivation without importing the full hook
  const coachSteps = !game.tutorial || game.player.missionsDone >= FREE_OPS_START_MISSIONS_DONE ? [] :
    game.player.missionsDone === 0 ? M1_STEPS :
    game.player.missionsDone === 1 ? M2_STEPS :
    game.player.missionsDone === 2 ? M3_STEPS : []
  const hasCoach = coachSteps.some(
    step => step.screen === screen && !game.doneSteps[step.id]
  ) && !(screen === 'hub' && game.subsurfaceView)

  if (!VALID_SCREENS.has(screen as Screen)) return notFound()

  // Auth gate (sign in / sign up / continue with email) must be resolved
  // before any gameplay screen mounts — otherwise it's a purely cosmetic
  // overlay and the screen underneath (e.g. a saved 'missions' route) is
  // already live and interactive. See STS-624.
  if (game.authGateOpen) return null

  return <ScreenContent screen={screen as Screen} game={game} hasCoach={hasCoach} />
}
