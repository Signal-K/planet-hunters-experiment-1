'use client'

import { type ReactNode, useMemo, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { GameProvider, useGame } from '@/game-context'
import { M1_STEPS, M2_STEPS, M3_STEPS } from '@/lib/data'
import TutorialCoach from '@/components/game/TutorialCoach'
import SaveProgressPrompt from '@/components/game/SaveProgressPrompt'
import UnlockPopup from '@/components/game/UnlockPopup'
import RadialNav from '@/components/layout/RadialNav'
import Sidebar from '@/components/Sidebar/Sidebar'
import BackendStatus from '@/components/game/BackendStatus'
import { PushOptIn } from '@/components/game/PushOptIn'
import FeedbackButton from '@/components/ui/FeedbackButton'
import SurveySheet from '@/components/ui/SurveySheet'
import ToastLayer from '@/components/ui/ToastLayer'
import { initPostHog } from '@/lib/posthog'
import DevShortcuts from '@/components/dev/DevShortcuts'
import AuthGateSheet from '@/components/game/AuthGateSheet'
import SettingsSheet from '@/components/game/SettingsSheet'
import TerritoryClaimPopup from '@/components/game/TerritoryClaimPopup'
import { UI_ZONES } from '@/lib/ui-zones'

if (typeof window !== 'undefined') initPostHog()

function GameChrome({ children }: { children: ReactNode }) {
  const game = useGame()
  const pathname = usePathname()
  const arrivalScheduledFor = useRef<number | null>(null)
  const returnScheduledKey = useRef<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Schedule push notification when transit starts
  useEffect(() => {
    const arrivalAt = game.player.arrivalAt
    if (game.screen !== 'transit' || !arrivalAt) return
    if (arrivalScheduledFor.current === arrivalAt) return
    arrivalScheduledFor.current = arrivalAt

    async function schedule() {
      if (!('serviceWorker' in navigator)) return
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return
      const mission = game.mission
      const target = game.target
      await fetch('/api/push/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.toJSON().keys,
          scheduledFor: Date.now() + 1000,
          title: mission ? `${mission.title} — RETURNED` : 'ROCKET RETURNED',
          body: target ? `Your rocket has returned from ${target.name}. Cargo is ready for debrief.` : 'Your rocket has returned to Earth.',
        }),
      })
    }
    void schedule()
  }, [game.screen, game.player.arrivalAt, game.mission, game.target])

  // Schedule return notification when debrief is reached
  useEffect(() => {
    if (game.screen !== 'debrief' || !game.lastCargo) return
    const mission = game.mission
    const target = game.target
    const key = `${mission?.id ?? 'mission'}:${target?.id ?? 'target'}:${JSON.stringify(game.lastCargo)}`
    if (returnScheduledKey.current === key) return
    returnScheduledKey.current = key

    async function schedule() {
      if (!('serviceWorker' in navigator)) return
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return
      await fetch('/api/push/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.toJSON().keys,
          scheduledFor: Date.now() + 1000,
          title: mission ? `${mission.title} — RETURNED` : 'ROCKET RETURNED',
          body: target ? `Your rocket has returned from ${target.name}. Cargo is ready for debrief.` : 'Your rocket has returned to Earth.',
        }),
      })
    }
    void schedule()
  }, [game.screen, game.lastCargo, game.mission, game.target])

  const coachSteps = useMemo(() => {
    if (!game.tutorial) return []
    if (game.player.missionsDone === 0) return M1_STEPS
    if (game.player.missionsDone === 1) return M2_STEPS
    if (game.player.missionsDone === 2) return M3_STEPS
    return []
  }, [game.player.missionsDone, game.tutorial])

  const coach = useMemo(() => {
    const s = coachSteps.find(step => step.screen === game.screen && !game.doneSteps[step.id]) ?? null
    if (s && s.id === 1 && game.menuOpen) {
      return {
        ...s,
        action: 'Tap MISSIONS',
        anchor: 'bottom' as const,
        coachId: 'radial-missions',
        dir: 'down' as const,
      }
    }
    return s
  }, [coachSteps, game.doneSteps, game.screen, game.menuOpen])

  const coachIndex = coach ? coachSteps.findIndex(step => step.id === coach.id) : -1
  const hasCoach = !!coach

  // Derive current screen from URL (reliable even before state syncs)
  const currentScreen = pathname.replace(/^\/game\//, '')
  const showNav = ['hub', 'missions', 'skills'].includes(currentScreen)
  const showFeedback = ['hub', 'missions', 'market', 'hangar', 'skills'].includes(currentScreen)
    && !showNav
    && !game.popup
    && !game.upgradePromptOpen
    && !game.authGateOpen

  function goFromNav(id: string) {
    if (id === 'missions') { game.completeStep(1); game.go('missions'); return }
    if (id === 'fab') { game.go(game.mission && game.target ? 'fab' : 'missions'); return }
    if (id === 'market') { game.go('market'); return }
    if (id === 'skills') { game.go('skills'); return }
    game.go(id as Parameters<typeof game.go>[0])
  }

  const currentNav = ['missions', 'targets'].includes(currentScreen)
    ? 'missions'
    : currentScreen === 'galaxy' ? 'galaxy' : currentScreen === 'fab' ? 'fab' : currentScreen === 'skills' ? 'skills' : 'hub'

  return (
    <main className="game-stage" aria-label="Landnam game">
      <div className="portrait-canvas">
        <BackendStatus />
        {game.player.freeOperations && currentScreen === 'hub' && (
          <div data-ui-zone={UI_ZONES.ambientPrompt} style={{ position: 'absolute', top: 12, right: 12, zIndex: 12 }}>
            <PushOptIn userId={game.authUserId ?? undefined} />
          </div>
        )}
        {process.env.NODE_ENV === 'development' && <DevShortcuts />}

        {/* Current screen (injected by [screen]/page.tsx) */}
        {children}

        <ToastLayer toasts={game.toasts} onDismiss={game.dismissToast} />
        {showFeedback && <FeedbackButton />}
        <SurveySheet blockWhile={!!game.popup || !!coach || !!game.pendingTerritoryClaimFor} />
        {showNav && <div className="mobile-radial-nav"><RadialNav current={currentNav} onNav={goFromNav} /></div>}

        {coach && !game.popup && (
          <TutorialCoach
            key={coach.id}
            stepIndex={coachIndex}
            steps={coachSteps}
            step={coach}
            total={coachSteps.length}
            onManualNext={game.coachManualNext}
            onSkip={() => game.skipTutorial(coachSteps.map(s => s.id))}
          />
        )}

        {game.popup && currentScreen !== 'market' && (
          <UnlockPopup
            kind={game.popup}
            onClose={() => {
              const popup = game.popup
              if (popup === 'loan') { game.acceptLoan(); return }
              game.setPopup(null)
              if (popup === 'sr2') game.go('hub')
              if (popup === 'ship-customizer') game.go('hangar')
            }}
            onDismiss={game.popup === 'loan' ? () => game.setPopup(null) : undefined}
          />
        )}
        {game.upgradePromptOpen && !game.popup && (
          <SaveProgressPrompt onUpgrade={game.upgradeAccount} onDismiss={game.dismissUpgradePrompt} />
        )}
        {game.authGateOpen && (
          <AuthGateSheet
            error={game.authGateError}
            onSignIn={game.signInFromGate}
            onCreateAccount={game.createAccountFromGate}
            onSkip={game.skipAuthGate}
          />
        )}
        {game.pendingTerritoryClaimFor && (
          <TerritoryClaimPopup
            targetId={game.pendingTerritoryClaimFor.targetId}
            contractorId={game.pendingTerritoryClaimFor.contractorId}
            onDismiss={game.clearTerritoryClaimPopup}
          />
        )}
      </div>

      {/* Sidebar (position:fixed, desktop only) lives outside .portrait-canvas
          on purpose: that box has `isolation: isolate` + `overflow: hidden`
          for the mobile-canvas illusion, which scopes/clips a nested fixed
          descendant's effective stacking in ways that made the sidebar
          unreliable to click on desktop (Liam, 2026-07-04: "buttons in the
          sidebar on desktop do not work"). Keeping it a sibling of
          .portrait-canvas inside .game-stage removes that ambiguity. */}
      <Sidebar current={currentNav} onNav={goFromNav} onSettings={() => setSettingsOpen(true)} />
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </main>
  )
}

export default function GameLayout({ children }: { children: ReactNode }) {
  return (
    <GameProvider>
      <GameChrome>{children}</GameChrome>
    </GameProvider>
  )
}
