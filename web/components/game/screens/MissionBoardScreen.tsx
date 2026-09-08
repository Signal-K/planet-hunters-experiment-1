'use client'

import type { DailyClientPool } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'
import MissionBoardCompleteState from '@/components/game/MissionBoardCompleteState'
import type { CrewMember } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import type { SceneScope } from '@/lib/scene-scope'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { HangarModules, LaunchpadModules } from '@/components/game/hub/EarthBaseModules'
import { useTimeOfDay } from '@/lib/hooks/useTimeOfDay'
import { useMissionRelayModels } from '@/lib/hooks/useMissionRelayModels'
import MissionRelayCard from '@/components/game/MissionRelayCard'
import MissionSetupShell from '@/components/game/screens/MissionSetupShell'

interface MissionBoardScreenProps {
  onBack: () => void
  onPick: (id: string) => void
  missionsDone: number
  freeOperations: boolean
  hasCoach?: boolean
  coachManual?: boolean
  catalog: Catalog
  clientMissions?: Record<string, number>
  clientCooldowns?: Record<string, number>
  dailyClientPool?: DailyClientPool
  francs?: number
  crew?: CrewMember[]
  player?: Player
  sceneScope?: SceneScope
}

export default function MissionBoardScreen({ onBack, onPick, missionsDone, freeOperations, hasCoach, coachManual = false, catalog, francs, crew = [], player, sceneScope = { kind: 'earth-base', id: 'earth-base', label: 'Base' } }: MissionBoardScreenProps) {
  const { phase: skyPhase } = useTimeOfDay()

  const {
    cardModels,
    previewModel,
    selectedIndex,
    selectRelativeSignal,
    onboardingComplete,
    tutorialMissionInProgress,
    missionStartBlockedLabel,
  } = useMissionRelayModels({ catalog, missionsDone, freeOperations, hasCoach, francs, crew, player, sceneScope })

  if (onboardingComplete) {
    return <MissionBoardCompleteState onBack={onBack} />
  }

  return (
    <MissionSetupShell
      className="mission-setup-screen--mission"
      eyebrow={`LAUNCHPAD · ${freeOperations ? `${sceneScope.label.toUpperCase()} · FREE OPS` : `${sceneScope.label.toUpperCase()} · L${missionsDone + 1}`}`}
      title="Mission Dispatch"
      onBack={onBack}
      hasCoach={hasCoach}
      coachManual={coachManual}
      levelBadge={`LV. ${missionsDone + 1}`}
      francs={francs}
      sceneBackground={(
        <div className="launchpad-visual-scene">
          <div className="launchpad-scene-zoom">
            <HubWorldBackground phase={skyPhase} composition="earth-base-pad" />
          </div>
          <div className="launchpad-scene-object launchpad-tower">
            <span className="launchpad-tower-art"><LaunchpadModules /></span>
          </div>
          <div className="launchpad-scene-object launchpad-rocket">
            <HangarModules className="launchpad-hangar-art" />
          </div>
        </div>
      )}
    >
      <div className="mission-relay-yard" data-testid="mission-board-section-client">
        <MissionRelayCard
          previewModel={previewModel}
          selectedIndex={selectedIndex}
          totalCount={cardModels.length}
          onPrev={() => selectRelativeSignal(-1)}
          onNext={() => selectRelativeSignal(1)}
          onPick={onPick}
          tutorialMissionInProgress={tutorialMissionInProgress}
          missionStartBlockedLabel={missionStartBlockedLabel}
        />
      </div>
    </MissionSetupShell>
  )
}
