'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import type { DailyClientPool } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'
import { TUTORIAL_COMPACT_CONTENT_TOP, TUTORIAL_MANUAL_CONTENT_TOP } from '@/lib/tutorial-layout'
import { UI_ZONES } from '@/lib/ui-zones'
import MissionBoardCompleteState from '@/components/game/MissionBoardCompleteState'
import type { CrewMember } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import type { SceneScope } from '@/lib/scene-scope'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { HangarModules, LaunchpadModules } from '@/components/game/hub/EarthBaseModules'
import { useTimeOfDay } from '@/lib/hooks/useTimeOfDay'
import { useMissionRelayModels } from '@/lib/hooks/useMissionRelayModels'
import MissionRelayCard from '@/components/game/MissionRelayCard'

const SHORT_LANDSCAPE_CONTENT_TOP = 142

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
  const [shortLandscape, setShortLandscape] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(orientation: landscape) and (max-width: 1023px) and (max-height: 600px)')
    const update = () => setShortLandscape(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

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

  const contentTop = hasCoach
    ? (coachManual ? TUTORIAL_MANUAL_CONTENT_TOP : TUTORIAL_COMPACT_CONTENT_TOP)
    : 82

  return (
    <div className="game-screen theme-deep ln-scene-launchpad mission-setup-screen mission-setup-screen--launchpad" style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Reuse the real Launchpad screen's own scene markup (same background,
          same LaunchpadModules/HangarModules structures, same positions) so
          Mission Dispatch is the identical place, not a separately hand-
          rolled flat-sprite scene that happened to drift out of sync with it
          (2026-09-08 design feedback: the two screens must look the same). */}
      <div className="launchpad-visual-scene" aria-hidden="true">
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
      <TopBar
        eyebrow={`LAUNCHPAD · ${freeOperations ? `${sceneScope.label.toUpperCase()} · FREE OPS` : `${sceneScope.label.toUpperCase()} · L${missionsDone + 1}`}`}
        title="Mission Dispatch"
        onBack={onBack}
        levelBadge={`LV. ${missionsDone + 1}`}
        francs={francs}
      />
      <div className={`mission-dispatch-content${hasCoach ? ' mission-dispatch-content--coach' : ''}${shortLandscape ? ' mission-dispatch-content--short' : ''}`} data-ui-zone={UI_ZONES.screenContent} style={{ paddingTop: shortLandscape ? SHORT_LANDSCAPE_CONTENT_TOP : contentTop }}>
        <div className="mission-relay-yard mission-creator-container" data-testid="mission-board-section-client" data-mission-creator-container="true">
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
      </div>
    </div>
  )
}
