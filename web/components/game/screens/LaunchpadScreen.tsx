'use client'

import React, { useEffect, useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import { ACADEMY_INTRO_MISSION_ID, FREE_OPS_START_MISSIONS_DONE, partitionByOwner } from '@/lib/data'
import { ROCKET_MODELS } from '@/lib/data/rockets'
import { SATELLITE_MODELS } from '@/lib/data/satellites'
import type { Catalog } from '@/lib/catalog'
import type { Player } from '@/lib/game-types'
import { academyAffinityUnlocked } from '@/lib/systems/AcademySystem'
import { UI_ZONES } from '@/lib/ui-zones'

interface LaunchpadScreenProps {
  onBack: () => void
  onPick: (id: string) => void
  onViewContracts: () => void
  onOpenHangar: () => void
  onBuildMonitoring: () => void
  missionsDone: number
  freeOperations: boolean
  catalog: Catalog
  player: Player
  rocketImageSrc?: string
  selectedRocketName?: string
  francs?: number
}

const LAUNCHPAD_GUIDE_KEY = 'landnam-launchpad-guide-v1'

function SatelliteGlyph() {
  return (
    <svg viewBox="0 0 150 74" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="3">
        <rect x="57" y="20" width="36" height="34" rx="4" />
        <path d="M63 20l8-11h8l8 11M75 54v12M66 66h18" />
        <path d="M57 27H9v22h48M93 27h48v22H93M19 27v22M31 27v22M43 27v22M107 27v22M119 27v22M131 27v22" />
      </g>
    </svg>
  )
}

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
  onBack, onPick, onViewContracts, onOpenHangar, onBuildMonitoring, missionsDone, freeOperations, catalog, player, rocketImageSrc = '/game/assets/ships/ship_sr1.png', selectedRocketName, francs,
}: LaunchpadScreenProps) {
  const [guideStep, setGuideStep] = useState<number | null>(null)
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
  // KES-177: a stale remote save can carry freeOperations=true while the
  // onboarding mission count is still pre-Free Ops. The mission boundary is
  // authoritative: M1-M3 stay focused on client mining contracts.
  const monitoringAvailable = freeOperations && missionsDone >= FREE_OPS_START_MISSIONS_DONE
  const guideSteps = [
    ...(monitoringAvailable ? [{
      label: '01 · GROUND SYSTEM',
      title: player.satelliteMonitoringBuilt ? 'Monitoring online' : 'Build the monitoring station',
      body: player.satelliteMonitoringBuilt
        ? 'This station receives telescope downlinks and turns them into science work.'
        : 'You need this before your first transit telescope can operate.',
      target: 'station' as const,
    }] : []),
    {
      label: monitoringAvailable ? '02 · LAUNCHPAD' : '01 · LAUNCHPAD',
      title: 'Launch from here',
      body: 'Assigned vehicles move from the hangar to this pad before flight.',
      target: 'tower' as const,
    },
    {
      label: monitoringAvailable ? '03 · ROCKET FLEET' : '02 · ROCKET FLEET',
      title: 'Prepare your vehicles',
      body: 'Open the hangar to inspect unlocked rockets and fit upgrades.',
      target: 'rocket' as const,
    },
    {
      label: monitoringAvailable ? '04 · YOUR PROGRAM' : '03 · YOUR PROGRAM',
      title: 'Choose what flies next',
      body: 'Operations use your own assets. Contracts fund their expansion.',
      target: 'satellite' as const,
    },
  ] as const
  const guide = guideStep === null ? null : guideSteps[guideStep]

  useEffect(() => {
    if (monitoringAvailable && !window.localStorage.getItem(LAUNCHPAD_GUIDE_KEY)) setGuideStep(0)
  }, [monitoringAvailable])

  const closeGuide = () => {
    window.localStorage.setItem(LAUNCHPAD_GUIDE_KEY, 'complete')
    setGuideStep(null)
  }

  const isGuided = (target: (typeof guideSteps)[number]['target']) => guide?.target === target

  const monitoringStructure = (
    <>
      <span className="launchpad-object-art">
        <img src="/game/assets/hub/sat_station.png" alt="" />
        {!player.satelliteMonitoringBuilt && <i className="launchpad-build-plus">+</i>}
      </span>
      <span className="launchpad-object-label">
        <small>GROUND SYSTEM</small>
        <strong>{player.satelliteMonitoringBuilt ? 'S.M.S. · ONLINE' : 'BUILD MONITORING STATION'}</strong>
      </span>
    </>
  )

  return (
    <div className="game-screen theme-deep ln-scene-launchpad">
      <TopBar eyebrow="EARTH BASE · LAUNCHPAD" title="Your Program" onBack={onBack} solid francs={francs} />

      <main data-ui-zone={UI_ZONES.screenContent} className="launchpad-visual-scene">
        <div className="launchpad-stars" />
        <div className="launchpad-orbit-line" />

        <div className={`launchpad-satellite ${isGuided('satellite') ? 'is-guided' : ''}`} data-testid="launchpad-satellite-orbit">
          <SatelliteGlyph />
          <div><strong>{launchedSatellites}/{SATELLITE_MODELS.length}</strong><span>ORBIT</span></div>
        </div>

        {monitoringAvailable && (player.satelliteMonitoringBuilt ? (
          <div
            className={`launchpad-scene-object launchpad-station is-built ${isGuided('station') ? 'is-guided' : ''}`}
            data-testid="launchpad-monitoring-structure"
          >
            {monitoringStructure}
          </div>
        ) : (
          <button
            type="button"
            className={`launchpad-scene-object launchpad-station is-blueprint ${isGuided('station') ? 'is-guided' : ''}`}
            data-testid="launchpad-monitoring-structure"
            onClick={onBuildMonitoring}
          >
            {monitoringStructure}
          </button>
        ))}

        <div className={`launchpad-scene-object launchpad-tower ${isGuided('tower') ? 'is-guided' : ''}`} data-testid="launchpad-status-card">
          <span className="launchpad-tower-art">
            <img className="launchpad-tower-gantry" src="/game/assets/hub/pad_gantry_frame.png" alt="" />
            <img className="launchpad-tower-rocket" src={rocketImageSrc} alt="" />
            <img className="launchpad-tower-deck" src="/game/assets/hub/pad_deck.png" alt="" />
          </span>
          <span className="launchpad-object-label launchpad-object-label--center">
            <small>LAUNCHPAD</small>
            <strong>{player.activeMission ? 'IN FLIGHT' : player.pendingLaunch ? 'ON PAD' : 'READY'}</strong>
          </span>
        </div>

        <button type="button" className={`launchpad-scene-object launchpad-rocket ${isGuided('rocket') ? 'is-guided' : ''}`} data-testid="launchpad-rocket-fleet" onClick={onOpenHangar}>
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
          {monitoringAvailable && <button data-testid="launchpad-guide-open" onClick={() => setGuideStep(0)}><GuideGlyph /> GUIDE</button>}
          {monitoringAvailable && !player.satelliteMonitoringBuilt && (
            <button className="is-primary" data-testid="launchpad-build-monitoring-btn" onClick={onBuildMonitoring}>BUILD STATION</button>
          )}
          <button data-testid="launchpad-open-hangar-btn" onClick={onOpenHangar}><HangarGlyph /> HANGAR</button>
          {freeOperations && nextOperation && <button data-testid="launchpad-program-operation-btn" onClick={() => onPick(nextOperation.id)}><MissionGlyph /> OPS {operations.length}</button>}
          <button className={freeOperations ? undefined : 'is-primary'} data-testid="launchpad-view-contracts-btn" onClick={onViewContracts}><MissionGlyph /> CONTRACTS</button>
        </div>
      </footer>
    </div>
  )
}
