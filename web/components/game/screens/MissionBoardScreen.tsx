'use client'

import type { DailyClientPool } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'
import MissionBoardCompleteState from '@/components/game/MissionBoardCompleteState'
import type { CrewMember } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import type { SceneScope } from '@/lib/scene-scope'
import { useMissionRelayModels } from '@/lib/hooks/useMissionRelayModels'
import MissionRelayCard, { MissionRelayCommit } from '@/components/game/MissionRelayCard'
import { MissionSetupStep } from '@/components/game/screens/MissionSetupShell'

interface MissionBoardScreenProps {
  onBack: () => void
  onPick: (id: string) => void
  missionsDone: number
  freeOperations: boolean
  hasCoach?: boolean
  catalog: Catalog
  clientMissions?: Record<string, number>
  clientCooldowns?: Record<string, number>
  dailyClientPool?: DailyClientPool
  francs?: number
  crew?: CrewMember[]
  player?: Player
  sceneScope?: SceneScope
}

export default function MissionBoardScreen({ onBack, onPick, missionsDone, freeOperations, hasCoach, catalog, francs, crew = [], player, sceneScope = { kind: 'earth-base', id: 'earth-base', label: 'Base' } }: MissionBoardScreenProps) {
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
    return (
      <MissionSetupStep actions={<span />}>
        <MissionBoardCompleteState onBack={onBack} />
      </MissionSetupStep>
    )
  }

  return (
    <MissionSetupStep actions={(
      <MissionRelayCommit
        previewModel={previewModel}
        onPick={onPick}
        tutorialMissionInProgress={tutorialMissionInProgress}
        missionStartBlockedLabel={missionStartBlockedLabel}
      />
    )}>
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
          showCommit={false}
        />
      </div>
    </MissionSetupStep>
  )
}
