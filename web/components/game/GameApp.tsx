'use client'

import { useMemo } from 'react'
import { GameProvider, type Screen, useGame } from '@/game-context'
import { M1_STEPS, M2_STEPS, PROGRESSION_STEPS } from '@/lib/data'
import IntroScreen from '@/components/game/screens/IntroScreen'
import AssemblyScreen from '@/components/game/screens/AssemblyScreen'
import BuildPlaceScreen from '@/components/game/screens/BuildPlaceScreen'
import DebriefScreen from '@/components/game/screens/DebriefScreen'
import HubScreen from '@/components/game/screens/HubScreen'
import MiningScreen from '@/components/game/screens/MiningScreen'
import MissionBoardScreen from '@/components/game/screens/MissionBoardScreen'
import TargetPickerScreen from '@/components/game/screens/TargetPickerScreen'
import TransitScreen from '@/components/game/screens/TransitScreen'
import RefineryScreen from '@/components/game/screens/RefineryScreen'
import MarketScreen from '@/components/game/screens/MarketScreen'
import HangarScreen from '@/components/game/screens/HangarScreen'
import RocketPurchaseScreen from '@/components/game/screens/RocketPurchaseScreen'
import TutorialCoach from '@/components/game/TutorialCoach'
import SaveProgressPrompt from '@/components/game/SaveProgressPrompt'
import UnlockPopup from '@/components/game/UnlockPopup'
import RadialNav from '@/components/layout/RadialNav'
import BackendStatus from '@/components/game/BackendStatus'
import FeedbackButton from '@/components/ui/FeedbackButton'
import SurveySheet from '@/components/ui/SurveySheet'
import ToastLayer from '@/components/ui/ToastLayer'
import { initPostHog } from '@/lib/posthog'
import DevShortcuts from '@/components/dev/DevShortcuts'
import AuthGateSheet from '@/components/game/AuthGateSheet'

if (typeof window !== 'undefined') initPostHog()

function GameCanvas() {
  const game = useGame()
  const coachSteps = useMemo(() => {
    if (!game.tutorial) return []
    if (game.player.missionsDone === 0) return M1_STEPS
    if (game.player.missionsDone === 1) return M2_STEPS
    return []
  }, [game.player.missionsDone, game.tutorial])

  const coach = useMemo(() => {
    const s = coachSteps.find(step => step.screen === game.screen && !game.doneSteps[step.id]) ?? null
    if (s && s.id === 1 && game.menuOpen) {
      return {
        ...s,
        action: 'Tap MISSIONS',
        anchor: 'bottom' as const,
        // MISSIONS button is always 104px from canvas bottom (bottom:28 + dy:-76.2 ≈ 104px)
        // x is stable across canvas widths (portrait-canvas ≈ 390-402px, button centered ~142px)
        spot: { x: 100, y: 104, w: 76, h: 58, fromBottom: true },
      }
    }
    return s
  }, [coachSteps, game.doneSteps, game.screen, game.menuOpen])

  const coachIndex = coach ? coachSteps.findIndex(step => step.id === coach.id) : -1
  const hasCoach = !!coach

  function goFromNav(id: string) {
    if (id === 'missions') {
      game.completeStep(1)
      game.go('missions')
      return
    }
    if (id === 'fab') {
      game.go(game.mission && game.target ? 'fab' : 'missions')
      return
    }
    if (id === 'market') {
      game.go('market')
      return
    }
    game.go(id === 'galaxy' ? 'missions' : id as Screen)
  }

  const currentNav = game.screen === 'missions' || game.screen === 'targets'
    ? 'missions'
    : game.screen === 'fab' ? 'fab' : 'hub'
  const showNav = ['hub', 'missions', 'targets'].includes(game.screen) && !(game.screen === 'targets' && hasCoach)

  return (
    <main className="game-stage" aria-label="Landnam game">
      <div className="portrait-canvas">
        <BackendStatus />
        {process.env.NODE_ENV === 'development' && <DevShortcuts />}
        {game.screen === 'intro' && (
          <IntroScreen
            onBegin={() => game.go('build')}
            returning={game.player.missionsDone > 0 || game.player.placed.length > 0}
            missionsDone={game.player.missionsDone}
            totalEarned={game.player.francs}
            awaitingRemoteState={game.awaitingRemoteState}
          />
        )}
        {game.screen === 'build' && (
          <BuildPlaceScreen
            onBack={() => game.go('hub')}
            hasCoach={hasCoach}
            onPlaced={(kind, plot) => {
              game.setPlayer(player => ({
                ...player,
                placed: Array.from(new Set([...player.placed, kind])),
                placementPlots: { ...player.placementPlots, [kind]: plot },
              }))
              game.completeStep(0)
              game.go('hub')
            }}
          />
        )}
        {game.screen === 'hub' && (
          <HubScreen
            player={game.player}
            hasCoach={hasCoach}
            onNav={screen => goFromNav(screen)}
            onGoBuilding={building => {
              if (building === 'refinery') return game.go('refinery')
              if (building === 'hangar') return game.go('hangar')
              if (building === 'launchpad' || building === 'missions') return goFromNav('missions')
            }}
            onUpgradeLaunchpad={() => game.upgradeLaunchpad()}
          />
        )}
        {game.screen === 'missions' && (
          <MissionBoardScreen
            onBack={() => game.go('hub')}
            onPick={game.onPickMission}
            missionsDone={game.player.missionsDone}
            freeOperations={game.player.freeOperations}
            hasCoach={hasCoach}
            catalog={game.catalog}
            contractorMissions={game.player.contractorMissions}
            contractorCooldowns={game.player.contractorCooldowns}
          />
        )}
        {game.screen === 'targets' && game.mission && (
          <TargetPickerScreen mission={game.mission} onBack={() => game.go('missions')} onPick={game.onPickTarget} hasCoach={hasCoach} catalog={game.catalog} />
        )}
        {game.screen === 'market' && (
          <MarketScreen
            stash={game.player.stash ?? {}}
            francs={game.player.francs}
            onSell={game.sellMinerals}
            onBack={() => game.go('hub')}
            contractorId={game.player.lastContractor}
          />
        )}
        {game.screen === 'hangar' && (
          <HangarScreen
            francs={game.player.francs}
            missionsDone={game.player.missionsDone}
            onBack={() => game.go('hub')}
          />
        )}
        {game.screen === 'refinery' && (
          <RefineryScreen
            player={{
              francs: game.player.francs,
              stash: game.player.stash,
              refineryQueue: game.player.refineryQueue,
              refinedGoods: game.player.refinedGoods,
            }}
            onBack={() => game.go('hub')}
            onStartRefine={game.onStartRefine}
            onCollect={game.onCollectRefined}
          />
        )}
        {game.screen === 'rocket-buy' && game.mission && game.target && (
          <RocketPurchaseScreen
            missionsDone={game.player.missionsDone}
            francs={game.player.francs}
            onPurchase={game.onPurchaseRocket}
            onBack={() => game.go('targets')}
          />
        )}
        {game.screen === 'fab' && game.mission && game.target && (
          <AssemblyScreen
            mission={game.mission}
            target={game.target}
            rocket={game.rocket}
            parts={game.catalog.parts}
            missionsDone={game.player.missionsDone}
            onLaunch={game.onLaunch}
            onBack={() => game.go('rocket-buy')}
            hasCoach={hasCoach}
          />
        )}
        {game.screen === 'transit' && game.target && (
          <TransitScreen target={game.target} onBack={() => game.go('hub')} onArrive={() => game.go('mining')} onAbandon={game.abandonMission} />
        )}
        {game.screen === 'mining' && game.mission && game.target && (
          <MiningScreen mission={game.mission} target={game.target} onBack={() => game.go('hub')} onComplete={game.onMiningDone} minerals={game.catalog.minerals} />
        )}
        {game.screen === 'debrief' && game.mission && game.target && (
          <DebriefScreen mission={game.mission} target={game.target} cargo={game.lastCargo ?? {}} onDone={game.onDebriefDone} minerals={game.catalog.minerals} contractors={game.catalog.contractors} contractorMissions={game.player.contractorMissions} freeOperations={game.player.freeOperations} annotations={game.player.researchAnnotations} missionsDone={game.player.missionsDone} />
        )}

        <ToastLayer toasts={game.toasts} onDismiss={game.dismissToast} />
        <FeedbackButton />
        <SurveySheet />
        {showNav && <RadialNav current={currentNav} onNav={goFromNav} />}

        {coach && (
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
        {game.popup && game.screen !== 'market' && (
          <UnlockPopup
            kind={game.popup}
            onClose={() => {
              const popup = game.popup
              if (popup === 'loan') {
                game.acceptLoan()
                return
              }
              game.setPopup(null)
              if (popup === 'sr2') {
                game.go('hub')
              }
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
      </div>
    </main>
  )
}

export default function GameApp() {
  return <GameProvider><GameCanvas /></GameProvider>
}
