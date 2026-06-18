'use client'

import { useMemo, useEffect, useRef, useState, useCallback } from 'react'
import { LaunchSequenceCanvas } from '@/components/game/LaunchSequenceCanvas'
import { GameProvider, type Screen, useGame } from '@/game-context'
import { M1_STEPS, M2_STEPS, M3_STEPS, PROGRESSION_STEPS } from '@/lib/data'
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
import SkillTreeScreen from '@/components/game/screens/SkillTreeScreen'
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
import TerritoryClaimPopup from '@/components/game/TerritoryClaimPopup'
import { UI_ZONES } from '@/lib/ui-zones'

if (typeof window !== 'undefined') initPostHog()

function GameCanvas() {
  const game = useGame()
  const arrivalScheduledFor = useRef<number | null>(null)
  const returnScheduledKey = useRef<string | null>(null)
  const [launchPending, setLaunchPending] = useState(false)

  const handleLaunch = useCallback(() => {
    setLaunchPending(true)
  }, [])

  const handleLaunchComplete = useCallback(() => {
    setLaunchPending(false)
    game.onLaunch()
  }, [game.onLaunch])

  // When a timed transit starts, schedule a push notification.
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
          scheduledFor: arrivalAt,
          title: mission ? `${mission.title} — ARRIVED` : 'ROCKET ARRIVED',
          body: target ? `Your rocket has reached ${target.name}. Time to mine.` : 'Your rocket has arrived at its destination.',
        }),
      })
    }
    void schedule()
  }, [game.screen, game.player.arrivalAt, game.mission, game.target])

  // Current gameplay returns immediately when mining completes; schedule that return alert
  // from the debrief transition so closed browsers still receive the Earth-return copy.
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
        // MISSIONS button is always 104px from canvas bottom (bottom:28 + |dy|:-76.2 ≈ 104px)
        // x is center-relative: button center = 50% + dx (-57.8px), spot left = center - w/2 = 50% - 95.8px
        spot: { x: -96, y: 104, w: 76, h: 58, fromBottom: true, fromCenter: true },
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
    if (id === 'skills') {
      game.go('skills')
      return
    }
    game.go(id === 'galaxy' ? 'missions' : id as Screen)
  }

  const currentNav = game.screen === 'missions' || game.screen === 'targets'
    ? 'missions'
    : game.screen === 'fab' ? 'fab' : game.screen === 'skills' ? 'skills' : 'hub'
  const showNav = ['hub', 'missions', 'skills'].includes(game.screen)
  const showFeedback = ['hub', 'missions', 'market', 'hangar', 'skills'].includes(game.screen)
    && !showNav
    && !game.popup
    && !game.upgradePromptOpen
    && !game.authGateOpen

  return (
    <main className="game-stage" aria-label="Landnam game">
      <div className="portrait-canvas">
        <BackendStatus />
        {game.player.freeOperations && game.screen === 'hub' && (
          <div data-ui-zone={UI_ZONES.ambientPrompt} style={{ position: 'absolute', top: 12, right: 12, zIndex: 12 }}>
            <PushOptIn userId={game.authUserId ?? undefined} />
          </div>
        )}
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
            player={{
              francs: game.player.francs,
              stash: game.player.stash,
              placed: game.player.placed,
              freeOperations: game.player.freeOperations,
              refineryUnlocked: !!game.player.refineryUnlocked,
            }}
            onPlaced={(kind, plot) => {
              const structure = game.catalog.structures.find(s => s.id === kind)
              game.setPlayer(player => ({
                ...player,
                francs: player.francs - (structure?.cost ?? 0),
                stash: Object.entries(structure?.costMaterials ?? {}).reduce((stash, [mineral, amount]) => ({
                  ...stash,
                  [mineral]: Math.max(0, (stash[mineral] ?? 0) - amount),
                }), { ...(player.stash ?? {}) }),
                placed: Array.from(new Set([...player.placed, kind])),
                placementPlots: { ...player.placementPlots, [kind]: plot },
                refineryBuilt: kind === 'refinery' ? true : player.refineryBuilt,
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
              if (building === 'skills') return game.go('skills')
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
            dailyContractorPool={game.player.dailyContractorPool}
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
            unlockedSkillNodes={game.player.unlockedSkillNodes ?? []}
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
        {game.screen === 'skills' && (
          <SkillTreeScreen
            skillPoints={game.player.skillPoints ?? 0}
            unlockedSkillNodes={game.player.unlockedSkillNodes ?? []}
            onUnlock={game.unlockSkillNode}
            onBack={() => game.go('hub')}
          />
        )}
        {game.screen === 'rocket-buy' && game.mission && game.target && (
          <RocketPurchaseScreen
            missionsDone={game.player.missionsDone}
            francs={game.player.francs}
            onPurchase={game.onPurchaseRocket}
            onBack={() => game.go(game.mission?.targetId ? 'missions' : 'targets')}
            hasCoach={hasCoach}
          />
        )}
        {game.screen === 'fab' && game.mission && game.target && (
          <AssemblyScreen
            mission={game.mission}
            target={game.target}
            rocket={game.rocket}
            parts={game.catalog.parts}
            missionsDone={game.player.missionsDone}
            unlockedSkillNodes={game.player.unlockedSkillNodes ?? []}
            onLaunch={handleLaunch}
            onBack={() => game.go('rocket-buy')}
            hasCoach={hasCoach}
            coachManual={coach?.manual ?? false}
          />
        )}
        {game.screen === 'transit' && game.target && (
          <TransitScreen
            target={game.target}
            arrivalAt={game.player.arrivalAt}
            onBack={() => game.go('hub')}
            onArrive={() => {
              game.setPlayer(player => ({ ...player, missionPhase: 'mining' }))
              game.go('mining')
            }}
            onAbandon={game.abandonMission}
          />
        )}
        {game.screen === 'mining' && game.mission && game.target && (
          <MiningScreen
            mission={game.mission}
            target={game.target}
            onBack={() => {
              game.setPlayer(player => ({ ...player, missionPhase: 'mining' }))
              game.go('hub')
            }}
            onComplete={game.onMiningDone}
            minerals={game.catalog.minerals}
            laserChargeCap={game.laserChargeCap}
          />
        )}
        {game.screen === 'debrief' && game.mission && game.target && (
          <DebriefScreen mission={game.mission} target={game.target} cargo={game.lastCargo ?? {}} onDone={game.onDebriefDone} minerals={game.catalog.minerals} contractors={game.catalog.contractors} contractorMissions={game.player.contractorMissions} freeOperations={game.player.freeOperations} annotations={game.player.researchAnnotations} missionsDone={game.player.missionsDone} hasCoach={hasCoach} />
        )}

        {/* Launch sequence — plays between fab confirmation and transit */}
        {launchPending && (
          <LaunchSequenceCanvas
            rocketName="Starter Rocket 1"
            targetName={game.target?.name ?? 'TARGET'}
            onComplete={handleLaunchComplete}
          />
        )}

        <ToastLayer toasts={game.toasts} onDismiss={game.dismissToast} />
        {showFeedback && <FeedbackButton />}
        <SurveySheet />
        {showNav && <RadialNav current={currentNav} onNav={goFromNav} />}
        <Sidebar current={currentNav} onNav={goFromNav} />

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
        {game.pendingTerritoryClaimFor && (
          <TerritoryClaimPopup
            targetId={game.pendingTerritoryClaimFor.targetId}
            contractorId={game.pendingTerritoryClaimFor.contractorId}
            onDismiss={game.clearTerritoryClaimPopup}
          />
        )}
      </div>
    </main>
  )
}

export default function GameApp() {
  return <GameProvider><GameCanvas /></GameProvider>
}
