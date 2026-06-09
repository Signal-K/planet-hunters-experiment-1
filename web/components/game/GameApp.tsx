'use client'

import { useMemo } from 'react'
import { GameProvider, type Screen, useGame } from '@/game-context'
import { M1_STEPS, PROGRESSION_STEPS, suggestBuild } from '@/lib/data'
import IntroScreen from '@/components/game/screens/IntroScreen'
import AssemblyScreen from '@/components/game/screens/AssemblyScreen'
import BuildPlaceScreen from '@/components/game/screens/BuildPlaceScreen'
import DebriefScreen from '@/components/game/screens/DebriefScreen'
import HubScreen from '@/components/game/screens/HubScreen'
import MiningScreen from '@/components/game/screens/MiningScreen'
import MissionBoardScreen from '@/components/game/screens/MissionBoardScreen'
import TargetPickerScreen from '@/components/game/screens/TargetPickerScreen'
import TransitScreen from '@/components/game/screens/TransitScreen'
import ClassifyLightcurveScreen from '@/components/game/screens/ClassifyLightcurveScreen'
import TutorialCoach from '@/components/game/TutorialCoach'
import BuildGatePrompt from '@/components/game/BuildGatePrompt'
import UnlockPopup from '@/components/game/UnlockPopup'
import RadialNav from '@/components/layout/RadialNav'
import BackendStatus from '@/components/game/BackendStatus'

function GameCanvas() {
  const game = useGame()
  const coachSteps = useMemo(() => {
    if (!game.tutorial) return []
    if (game.player.missionsDone === 0) return M1_STEPS
    if (game.player.missionsDone === 2) return PROGRESSION_STEPS.filter(step => step.id === 30)
    if (game.player.missionsDone === 3) return PROGRESSION_STEPS.filter(step => step.id === 40)
    return []
  }, [game.player.missionsDone, game.tutorial])

  const coach = useMemo(() => {
    const s = coachSteps.find(step => step.screen === game.screen && !game.doneSteps[step.id]) ?? null
    if (s && s.id === 1 && game.menuOpen) {
      return {
        ...s,
        action: 'Tap MISSIONS',
        anchor: 'bottom' as const,
        spot: { x: 104, y: 704, w: 72, h: 72 },
      }
    }
    return s
  }, [coachSteps, game.doneSteps, game.screen, game.menuOpen])

  const coachIndex = coach ? coachSteps.findIndex(step => step.id === coach.id) : -1
  const hasCoach = !!coach

  function goFromNav(id: string) {
    if (id === 'missions') {
      if (game.player.missionsDone > 0 && !game.player.controlBuilt) {
        game.setBuildGate(true)
        return
      }
      game.completeStep(1)
      game.go('missions')
      return
    }
    if (id === 'fab') {
      game.go(game.mission && game.target ? 'fab' : 'missions')
      return
    }
    if (id === 'market') {
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
        {game.screen === 'intro' && (
          <IntroScreen onBegin={() => game.go('build')} returning={game.player.missionsDone > 0 || game.player.placed.length > 0} />
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
              if (building === 'control' && !game.player.controlBuilt) return game.setBuildGate(true)
              if (building === 'launchpad' || building === 'missions') return goFromNav('missions')
            }}
          />
        )}
        {game.screen === 'missions' && (
          <MissionBoardScreen
            onBack={() => game.go('hub')}
            onPick={game.onPickMission}
            missionsDone={game.player.missionsDone}
            controlBuilt={game.player.controlBuilt}
            freeOperations={game.player.freeOperations}
            hasCoach={hasCoach}
            catalog={game.catalog}
            contractorCooldowns={game.player.contractorCooldowns}
          />
        )}
        {game.screen === 'classify' && game.mission && (
          <ClassifyLightcurveScreen onBack={() => game.go('missions')} onSubmit={game.classifyCandidate} hasCoach={hasCoach} />
        )}
        {game.screen === 'targets' && game.mission && (
          <TargetPickerScreen mission={game.mission} onBack={() => game.go('missions')} onPick={game.onPickTarget} hasCoach={hasCoach} catalog={game.catalog} />
        )}
        {game.screen === 'fab' && game.mission && game.target && (
          <AssemblyScreen
            mission={game.mission}
            target={game.target}
            rocket={game.rocket}
            parts={game.catalog.parts}
            onChange={(slot, id) => game.setRocket(rocket => ({ ...rocket, [slot]: id }))}
            onSuggest={() => game.setRocket(suggestBuild({ mission: game.mission, target: game.target, level: game.player.level, parts: game.catalog.parts }))}
            onExplained={() => game.completeStep(4)}
            onLaunch={game.onLaunch}
            onBack={() => game.go(game.mission?.requiresClassification ? 'classify' : 'targets')}
            hasCoach={hasCoach}
          />
        )}
        {game.screen === 'transit' && game.target && (
          <TransitScreen target={game.target} onBack={() => game.go('hub')} onArrive={() => game.go('mining')} />
        )}
        {game.screen === 'mining' && game.mission && game.target && (
          <MiningScreen mission={game.mission} target={game.target} onBack={() => game.go('hub')} onComplete={game.onMiningDone} minerals={game.catalog.minerals} />
        )}
        {game.screen === 'debrief' && game.mission && game.target && (
          <DebriefScreen mission={game.mission} target={game.target} cargo={game.lastCargo ?? {}} onDone={game.onDebriefDone} minerals={game.catalog.minerals} />
        )}

        {showNav && <RadialNav current={currentNav} onNav={goFromNav} />}

        {coach && (
          <TutorialCoach
            key={coach.id}
            stepIndex={coachIndex}
            steps={coachSteps}
            step={coach}
            total={coachSteps.length}
            onManualNext={game.coachManualNext}
            onSkip={() => game.setTutorial(false)}
          />
        )}
        {game.buildGate && (
          <BuildGatePrompt francs={game.player.francs} onBuild={game.buildControlStation} onClose={() => game.setBuildGate(false)} />
        )}
        {game.popup && (
          <UnlockPopup
            kind={game.popup}
            onClose={() => {
              const popup = game.popup
              game.setPopup(null)
              if (popup === 'sr2') {
                game.go('hub')
                game.setBuildGate(true)
              } else if (popup === 'freeops') {
                game.go('hub')
              }
            }}
          />
        )}
      </div>
    </main>
  )
}

export default function GameApp() {
  return <GameProvider><GameCanvas /></GameProvider>
}
