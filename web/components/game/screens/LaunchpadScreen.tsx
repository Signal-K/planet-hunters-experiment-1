'use client'

import React, { useEffect, useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import { ACADEMY_INTRO_MISSION_ID, partitionByOwner } from '@/lib/data'
import { ROCKET_MODELS } from '@/lib/data/rockets'
import { SATELLITE_MODELS } from '@/lib/data/satellites'
import type { Catalog } from '@/lib/catalog'
import type { Player } from '@/lib/game-types'
import { academyAffinityUnlocked } from '@/lib/systems/AcademySystem'
import { UI_ZONES } from '@/lib/ui-zones'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { LaunchpadStructure } from '@/components/game/hub/HubLaunchpadArt'
import { useTimeOfDay } from '@/lib/hooks/useTimeOfDay'

interface LaunchpadScreenProps {
  onBack: () => void
  onPick: (id: string) => void
  onViewContracts: () => void
  onOpenHangar: () => void
  missionsDone: number
  freeOperations: boolean
  catalog: Catalog
  player: Player
  rocketImageSrc?: string
  selectedRocketName?: string
  francs?: number
}

const LAUNCHPAD_GUIDE_KEY = 'landnam-launchpad-guide-v1'

function HangarGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V8l3-4h10l3 4v13M4 9h16M8 21v-7h8v7" /></svg>
}

function MissionGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
}

function GuideGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.3 2.3 0 1 1 3.1 2.2c-.9.4-.9 1.1-.9 1.8M12 17h.01" /></svg>
}

export default function LaunchpadScreen({
  onBack, onPick, onViewContracts, onOpenHangar, missionsDone, freeOperations, catalog, player, rocketImageSrc = '/game/assets/ships/ship_sr1.png', selectedRocketName, francs,
}: LaunchpadScreenProps) {
  const [guideStep, setGuideStep] = useState<number | null>(null)
  const { phase: skyPhase } = useTimeOfDay()
  const fleet = ROCKET_MODELS.map(model => ({ model, unlocked: missionsDone >= model.missionsRequired && !model.locked }))
  const unlockedFleet = fleet.filter(item => item.unlocked)
  const launchedSatellites = player.transitSatelliteLaunchedAt ? SATELLITE_MODELS.length : 0
  const { own } = partitionByOwner(catalog.missions, mission => mission)
  const sequence = missionsDone + 1
  const operations = own.filter(mission => freeOperations || mission.sequence === sequence)
  const nextOperation = operations.find(mission => {
    if (mission.id !== ACADEMY_INTRO_MISSION_ID) return true
    const academyUnlocked = academyAffinityUnlocked(player) || !!player.academyResearched || player.placed.includes('astronaut-academy')
    const academyCompleted = player.placed.includes('astronaut-academy') && (player.crew ?? []).some(member =>
      member.crewClass === 'astronaut' && member.selfTrained && member.specialisations.length > 0,
    )
    return academyUnlocked && !academyCompleted
  })
  const guideSteps = [
    {
      label: '01 · LAUNCHPAD',
      title: 'Launch from here',
      body: 'Assigned vehicles move from the hangar to this pad before flight.',
      target: 'tower' as const,
    },
    {
      label: '02 · ROCKET FLEET',
      title: 'Prepare your vehicles',
      body: 'Open the hangar to inspect unlocked rockets and fit upgrades.',
      target: 'rocket' as const,
    },
  ] as const
  const guide = guideStep === null ? null : guideSteps[guideStep]

  useEffect(() => {
    if (freeOperations && !window.localStorage.getItem(LAUNCHPAD_GUIDE_KEY)) setGuideStep(0)
  }, [freeOperations])

  const closeGuide = () => {
    window.localStorage.setItem(LAUNCHPAD_GUIDE_KEY, 'complete')
    setGuideStep(null)
  }

  const isGuided = (target: (typeof guideSteps)[number]['target']) => guide?.target === target

  return (
    <div className="game-screen theme-blueprint ln-scene-launchpad">
      <TopBar eyebrow="EARTH BASE · LAUNCHPAD" title="Your Program" onBack={onBack} solid francs={francs} />

      <main data-ui-zone={UI_ZONES.screenContent} className="launchpad-visual-scene">
        {/* Same Earth Base backdrop the Hub screen uses (KES-233) — this
            screen previously hand-rolled its own separate navy/stars/green-
            mountain gradient (`.launchpad-visual-scene`'s own background +
            ::before/::after in launchpad-screen.css), which read as a
            completely different place once KES-226/228 reworked the Hub's
            own background repeatedly this sprint and this screen was never
            updated to match. `.launchpad-scene-zoom` scales the shared
            background up from a bottom-center origin — ground line stays
            pinned to this screen's own `--hub-ground` (see
            launchpad-screen.css), everything above it (mountains, skyline)
            reads larger/closer, like the camera walked up to the pad instead
            of the Hub's wide establishing-shot framing. */}
        <div className="launchpad-scene-zoom">
          <HubWorldBackground phase={skyPhase} />
        </div>
        <div className={`launchpad-scene-object launchpad-tower ${isGuided('tower') ? 'is-guided' : ''}`} data-testid="launchpad-status-card">
          <span className="launchpad-tower-art">
            <LaunchpadStructure w={560} targetTopPx={290} dimmed={false} hot={!!player.pendingLaunch} />
            {player.pendingLaunch && <img className="launchpad-tower-rocket" src={rocketImageSrc} alt="Rocket on launchpad" />}
          </span>
          <span className="launchpad-object-label launchpad-object-label--center">
            <small>LAUNCHPAD</small>
            <strong>{player.activeMission ? 'IN FLIGHT' : player.pendingLaunch ? 'ON PAD' : 'READY'}</strong>
          </span>
        </div>

        <button type="button" className={`launchpad-scene-object launchpad-rocket ${isGuided('rocket') ? 'is-guided' : ''}`} data-testid="launchpad-rocket-fleet" onClick={onOpenHangar}>
          <img className="launchpad-hangar-art" src="/game/assets/hub/pad_hangar.png" alt="" />
          <span className="launchpad-rocket-art">
            <img src={rocketImageSrc} alt="" />
            <i className="launchpad-rocket-glow" />
          </span>
          <span className="launchpad-object-label">
            <small>ROCKET FLEET · {unlockedFleet.length}</small>
            <strong>{player.pendingLaunch ? `${selectedRocketName ?? unlockedFleet[0]?.model.name ?? 'BUILT VEHICLE'} · INSPECT` : `${selectedRocketName ?? unlockedFleet[0]?.model.name ?? 'NO VEHICLE'} · HANGAR`}</strong>
          </span>
        </button>

        {guide && guideStep !== null && (
          <aside className="launchpad-guide" data-testid="launchpad-guide" aria-live="polite" aria-labelledby="launchpad-guide-title">
            <button className="launchpad-guide-close" data-testid="launchpad-guide-close" onClick={closeGuide} aria-label="Close Launchpad guide">×</button>
            <span className="launchpad-guide-kicker">{guide.label}</span>
            <h2 id="launchpad-guide-title">{guide.title}</h2>
            <span className="launchpad-guide-copy">{guide.body}</span>
            <div className="launchpad-guide-footer">
              <div className="launchpad-guide-progress" aria-label={`Guide step ${guideStep + 1} of ${guideSteps.length}`}>
                {guideSteps.map((step, index) => <i key={step.target} className={index === guideStep ? 'is-current' : ''} />)}
              </div>
              <div className="launchpad-guide-actions">
                {guideStep > 0 && <button data-testid="launchpad-guide-back" onClick={() => setGuideStep(guideStep - 1)}>BACK</button>}
                <button className="is-primary" data-testid="launchpad-guide-next" onClick={() => guideStep === guideSteps.length - 1 ? closeGuide() : setGuideStep(guideStep + 1)}>
                  {guideStep === guideSteps.length - 1 ? 'DONE' : 'NEXT'}
                </button>
              </div>
            </div>
          </aside>
        )}

        <div className="launchpad-ground-line" />
      </main>

      <footer className="launchpad-scene-rail" data-ui-zone={UI_ZONES.bottomActions}>
        <div className="launchpad-rail-status">
          <span><i /> PAD {player.activeMission ? 'ACTIVE' : 'READY'}</span>
          <span>{unlockedFleet.length} ROCKETS</span>
          <span>{launchedSatellites}/{SATELLITE_MODELS.length} SAT</span>
        </div>
        <div className="launchpad-rail-actions">
          {freeOperations && <button data-testid="launchpad-guide-open" onClick={() => setGuideStep(0)}><GuideGlyph /> GUIDE</button>}
          <button data-testid="launchpad-open-hangar-btn" onClick={onOpenHangar}><HangarGlyph /> HANGAR</button>
          {freeOperations && nextOperation && <button data-testid="launchpad-program-operation-btn" onClick={() => onPick(nextOperation.id)}><MissionGlyph /> OPS {operations.length}</button>}
          <button className={freeOperations ? undefined : 'is-primary'} data-testid="launchpad-view-contracts-btn" onClick={onViewContracts}><MissionGlyph /> CONTRACTS</button>
        </div>
      </footer>
    </div>
  )
}
