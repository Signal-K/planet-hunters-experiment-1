'use client'

import { useGame } from '@/game-context'
import { SurfaceLayout } from '@/components/layout/frame/ScreenLayouts'
import LandingFlow from './LandingFlow'

/** The Landing flow while the account gate is open (signed out). Shared by
 * both game shells; replaces the old AuthGateSheet overlay. */
export default function GateLanding() {
  const game = useGame()
  const initialStep = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('gate') === 'signup'
    ? 'signup'
    : 'choice'
  return (
    <SurfaceLayout surface="landing">
      <LandingFlow
        signedIn={false}
        authError={game.authGateError}
        onSignIn={game.signInFromGate}
        onCreateAccount={game.createAccountFromGate}
        onContinue={() => game.go('hub')}
        onStartNew={() => game.go('build')}
        initialStep={initialStep}
      />
    </SurfaceLayout>
  )
}
