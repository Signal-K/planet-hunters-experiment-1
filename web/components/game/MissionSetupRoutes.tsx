'use client'

import { buildingLevel } from '@/lib/data/building-levels'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { useGame } from '@/game-context'
import type { Catalog } from '@/lib/catalog'
import type { Screen } from '@/lib/game-types'
import { ACADEMY_INTRO_MISSION_ID, ROCKET_MODELS, hasShipCustomizer, feasibleTargetsFor, isFreeHaulEligibleMission, rocketConfigForModel, rocketDisplayForConfig, rocketModelForConfig, validateBuild } from '@/lib/data'
import { crewRequirementStatus } from '@/lib/systems/AcademySystem'
import { useMissionRelayModels } from '@/lib/hooks/useMissionRelayModels'
import { formatCurrency } from '@/lib/format'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import PixiGalaxyMap from '@/components/TargetPicker/PixiGalaxyMap'
import ShipInteriorPreview from '@/components/game/ShipInteriorPreview'
import { LaunchSequenceCanvas } from '@/components/game/LaunchSequenceCanvas'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { HangarModules, LaunchpadModules } from '@/components/game/hub/EarthBaseModules'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { useHelp } from '@/components/ui/useHelp'
import MissionBoard from '@/components/game/MissionBoard'
import styles from './MissionSetupRoutes.module.css'

type Game = ReturnType<typeof useGame>
type RocketDisplay = ReturnType<typeof rocketDisplayForConfig>
const ROLLOUT_MS = 1600
export type MissionSetupRoute = Extract<Screen, 'missions' | 'targets' | 'rocket-buy' | 'fab'>

interface MissionSetupRoutesProps {
  screen: MissionSetupRoute
  game: Game
  rocketDisplay: RocketDisplay
  launchPending: boolean
  onTransferToLaunchpad: () => void
  onLaunch: () => void
  onLaunchComplete: () => void
}

function targetTypeLabel(type: 'planet' | 'asteroid' | 'exoplanet'): string {
  return type === 'asteroid' ? 'ASTEROID' : type === 'exoplanet' ? 'EXOPLANET' : 'PLANET'
}

function RequiredCargo({ minerals, catalog }: { minerals: Record<string, number>; catalog: Catalog['minerals'] }) {
  return <div className={styles.cargoReadout} data-testid="required-cargo-readout">
    {Object.entries(minerals).map(([id, amount]) => {
      const meta = catalog[id]
      return meta ? <div key={id} className={styles.cargoChip} style={{ '--mineral-accent': meta.color } as CSSProperties}>
        <i>{meta.sym}</i><strong>×{amount}</strong><span>{meta.name}</span>
      </div> : null
    })}
  </div>
}

function ArrowGlyph({ direction }: { direction: 'previous' | 'next' }) {
  return direction === 'previous'
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
}

function LaunchGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c4 3 6 7 6 12l-6 7-6-7c0-5 2-9 6-12Z" /><circle cx="12" cy="10" r="2" /></svg>
}

function SetupFrame({ title, screen, onBack, children, aside, parts }: { title: string; screen: Screen; onBack: () => void; children: ReactNode; aside?: ReactNode; parts?: Game['player']['shipCustomizerParts'] }) {
  // SSL-432: shared "?" slot. Renders nothing until this screen has a help topic.
  const help = useHelp(screen)
  return <div className={`game-screen theme-blueprint ${styles.root}`} data-setup={screen} data-testid="mission-setup-scaffold">
    <div className={styles.landscape} data-testid="mission-setup-landscape" aria-hidden="true">
      <HubWorldBackground phase="day" composition="earth-base-wide" />
      <div className={styles.launchpad}><LaunchpadModules parts={parts} /></div>
      <div className={styles.hangar}><HangarModules /></div>
    </div>
    <header className={styles.header} data-dev-launcher={isDevLauncherEnabled()}>
      <button type="button" className={styles.back} onClick={onBack} aria-label="Back"><ArrowGlyph direction="previous" /></button>
      <div className={styles.title} aria-label={title} />
      {aside}
      {help.button && <div className={styles.help}>{help.button}</div>}
    </header>
    {help.layer}
    <main className={styles.stage} data-testid="mission-setup-stage">{children}</main>
  </div>
}

export default function MissionSetupRoutes({ screen, game, rocketDisplay, launchPending, onTransferToLaunchpad, onLaunch, onLaunchComplete }: MissionSetupRoutesProps) {
  const relay = useMissionRelayModels({ catalog: game.catalog, missionsDone: game.player.missionsDone, freeOperations: game.player.freeOperations, francs: game.player.francs, crew: game.player.crew, player: game.player, sceneScope: game.sceneScope })
  const compatibleTargets = useMemo(() => game.mission ? feasibleTargetsFor(game.mission, game.catalog.targets, game.catalog.parts, game.player.missionsDone, game.player.launchpadUpgraded, game.player.unlockedSkillNodes ?? [], buildingLevel(game.player, 'launchpad')) : [], [game.catalog.parts, game.catalog.targets, game.mission, game.player.launchpadUpgraded, game.player.missionsDone, game.player.unlockedSkillNodes])
  const selectedVehicle = game.player.stagedRockets?.find(vehicle => vehicle.id === game.player.selectedStagedRocketId)
  // SSL-375: the rocket stands in the Workshop while it is prepared, then rolls to the pad in-scene on confirm.
  const [rolling, setRolling] = useState<string | null>(null)
  const [customizing, setCustomizing] = useState(false)
  const purchaseRef = useRef(game.onPurchaseRocket)
  purchaseRef.current = game.onPurchaseRocket
  useEffect(() => {
    if (!rolling) return
    const timer = window.setTimeout(() => { purchaseRef.current(rolling); setRolling(null) }, ROLLOUT_MS)
    return () => window.clearTimeout(timer)
  }, [rolling])

  // Older saves may still hold a prepared vehicle in the hangar. The R1 route
  // never asks for a second confirmation: roll it onto the pad on mount.
  useEffect(() => {
    if (screen === 'fab' && game.mission && game.target && selectedVehicle?.location === 'hangar') onTransferToLaunchpad()
  }, [game.mission, game.target, onTransferToLaunchpad, screen, selectedVehicle?.location])

  if (screen === 'fab' && (!game.mission || !game.target)) return null

  if (screen === 'missions') {
    return <MissionBoard
      catalog={game.catalog}
      player={game.player}
      cards={relay.cardModels}
      selectedIndex={relay.selectedIndex}
      onSelectRelative={relay.selectRelativeSignal}
      onAccept={(id, disposition) => id === ACADEMY_INTRO_MISSION_ID ? game.go('academy') : game.onPickMission(id, disposition)}
      onClose={() => game.goBack()}
      onOpenLog={() => game.go('mission-history')}
      onOpenBuild={() => game.go('build')}
      rocketImg={rocketDisplayForConfig(game.rocket).img}
      tutorialBlocked={relay.tutorialMissionInProgress}
      onboardingComplete={relay.onboardingComplete}
    />
  }

  if (!game.mission || !game.target) return null
  const target = game.target
  const isFreeOpsHaul = isFreeHaulEligibleMission(game.mission)
  const selectedRocket = rocketModelForConfig(game.rocket)
  const selectableRockets = ROCKET_MODELS.filter(model => !model.locked && model.missionsRequired <= game.player.missionsDone).filter(model => validateBuild({ mission: game.mission!, target, rocket: rocketConfigForModel(model), parts: game.catalog.parts, unlockedSkillNodes: game.player.unlockedSkillNodes ?? [] }).ok)
  const targetIndex = compatibleTargets.findIndex(candidate => candidate.id === target.id)
  const rocketIndex = selectableRockets.findIndex(candidate => candidate.id === selectedRocket.id)
  const crewStatus = crewRequirementStatus(game.mission.requires.crew, game.player.crew ?? [])
  const launchReady = validateBuild({ mission: game.mission, target, rocket: game.rocket, parts: game.catalog.parts, unlockedSkillNodes: game.player.unlockedSkillNodes ?? [] }).ok && (!game.mission.requires.crew || crewStatus.met)

  const compatibleIds = new Set(compatibleTargets.map(candidate => candidate.id))
  const switchTarget = (offset: number) => compatibleTargets.length > 1 && game.onPickTarget(compatibleTargets[(targetIndex + offset + compatibleTargets.length) % compatibleTargets.length].id)
  const switchRocket = (offset: number) => selectableRockets.length > 1 && game.onPurchaseRocket(selectableRockets[(rocketIndex + offset + selectableRockets.length) % selectableRockets.length].id)
  const preparing = !selectedVehicle || selectedVehicle.location !== 'launchpad'
  const artStage = rolling || !preparing ? 'pad' : 'workshop'
  const caption = rolling ? 'ROLLING OUT' : preparing ? 'WORKSHOP · READY TO ROLL OUT' : 'PAD · READY FOR DEPARTURE'
  const preparationLabel = selectedRocket.costFrancs === 0 ? `PREPARE ${selectedRocket.name.toUpperCase()}` : `BUILD ${selectedRocket.name.toUpperCase()} · ${formatCurrency(selectedRocket.costFrancs, { compact: true })}`

  return <>
    <SetupFrame title="Launch review" screen={screen} onBack={() => game.go('missions')} parts={game.player.shipCustomizerParts}>
      <section className={styles.review} data-testid="mission-launch-review">
        <div className={styles.launchScene}><div className={styles.launchArt} data-testid="launch-art" data-stage={artStage}><HubWorldBackground phase="day" composition="earth-base-wide" /><div className={styles.launchpad} aria-hidden="true"><LaunchpadModules parts={game.player.shipCustomizerParts} /></div><div className={styles.hangar} aria-hidden="true"><HangarModules /></div><div className={styles.workshop} aria-hidden="true"><b>WORKSHOP</b></div><img data-testid="launch-rocket" src={rocketDisplay.img} alt={`${selectedRocket.name} ${artStage === 'pad' ? 'on the launchpad' : 'in the workshop'}`} /></div><div className={styles.launchCaption}><span>{caption}</span><strong>{selectedRocket.name.toUpperCase()}</strong></div></div>
        <aside className={styles.reviewBrief}>
          <div className={styles.reviewHeading}><span>{game.mission.payload?.type === 'satellite' ? 'INSTRUMENT LAUNCH' : isFreeOpsHaul ? 'FREE OPS · OWN HAUL' : 'CLIENT CONTRACT'}</span><h2>{game.mission.title}</h2></div>
          <div className={styles.reviewMap} data-testid="launch-review-map" aria-label={`Route to ${target.name}`}>
            <PixiGalaxyMap mission={game.mission} targets={game.catalog.targets} compatibleIds={compatibleIds} pickedId={target.id} onPick={game.onPickTarget} />
          </div>
          <dl className={styles.reviewFacts}><div><dt>DESTINATION</dt><dd>{target.name} · {targetTypeLabel(target.type)}</dd></div><div><dt>VEHICLE</dt><dd>{selectedRocket.name}</dd></div>{!isFreeOpsHaul && <div><dt>REQUIRED CARGO</dt><dd><RequiredCargo minerals={game.mission.requires.minerals} catalog={game.catalog.minerals} /></dd></div>}</dl>
          <div className={styles.inlineChoices} aria-label="Change mission setup">
            <div><span>DESTINATION</span><strong>{target.name}</strong><nav><button type="button" onClick={() => switchTarget(-1)} disabled={compatibleTargets.length < 2} aria-label="Previous destination"><ArrowGlyph direction="previous" /></button><button type="button" onClick={() => switchTarget(1)} disabled={compatibleTargets.length < 2} aria-label="Next destination"><ArrowGlyph direction="next" /></button></nav></div>
            <div><span>VEHICLE</span><strong>{selectedRocket.name}</strong><nav><button type="button" onClick={() => switchRocket(-1)} disabled={selectableRockets.length < 2} aria-label="Previous vehicle"><ArrowGlyph direction="previous" /></button><button type="button" onClick={() => switchRocket(1)} disabled={selectableRockets.length < 2} aria-label="Next vehicle"><ArrowGlyph direction="next" /></button></nav></div>
          </div>
          <div className={styles.clearance} data-ready={launchReady && !preparing}><span>LAUNCH CLEARANCE</span><strong>{preparing ? 'PREPARING VEHICLE' : launchReady ? 'ALL PARAMETERS PASS' : 'BUILD HOLD'}</strong>{!launchReady && <small>{crewStatus.reason ?? 'MISSION REQUIREMENTS NOT MET'}</small>}</div>
          {preparing && (hasShipCustomizer(game.player.unlockedSkillNodes ?? []) || !!game.player.crewModuleResearched || !!game.player.landingResearched) && <button type="button" className={styles.primary} data-testid="launch-review-customize-btn" disabled={!!rolling} onClick={() => setCustomizing(true)}>CUSTOMISE VEHICLE</button>}
          <button type="button" className={styles.primary} data-testid={preparing ? 'prepare-launch-btn' : 'launch-btn'} disabled={!!rolling || selectedVehicle?.location === 'hangar' || (!preparing && !launchReady)} onClick={() => preparing ? setRolling(selectedRocket.id) : onLaunch()}><LaunchGlyph /> {preparing ? preparationLabel : 'LAUNCH'}</button>
        </aside>
      </section>
    </SetupFrame>
    {customizing && <div data-testid="launch-review-customizer-overlay" style={{ position: 'fixed', inset: 0, zIndex: 40 }}><ShipInteriorPreview rocketId="explorer" startingFrancs={game.player.francs} missionsDone={game.player.missionsDone} installedParts={game.player.shipCustomizerParts ?? {}} crewModuleResearched={game.player.crewModuleResearched} landingResearched={game.player.landingResearched} onConfirm={game.confirmShipCustomizerBuild} onClose={() => setCustomizing(false)} /></div>}
    {launchPending && <ErrorBoundary fallback={null} onError={onLaunchComplete}><LaunchSequenceCanvas rocketName={rocketDisplay.name} rocketImageSrc={rocketDisplay.img} targetName={target.name} onComplete={onLaunchComplete} /></ErrorBoundary>}
  </>
}
