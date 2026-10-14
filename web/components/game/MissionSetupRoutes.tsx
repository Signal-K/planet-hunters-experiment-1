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
import FreeOpsBuildScreen from '@/components/game/screens/FreeOpsBuildScreen'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { HangarModules, LaunchpadModules } from '@/components/game/hub/EarthBaseModules'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { useHelp } from '@/components/ui/useHelp'
import MissionBoard from '@/components/game/MissionBoard'
import MissionPlanScene, { type PlanStep } from '@/components/game/MissionPlanScene'
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
  // The setup runs target map -> rocket and cargo -> review. A vehicle already prepared (fab) opens on the review.
  const [step, setStep] = useState<PlanStep>(screen === 'fab' ? 'review' : 'target')
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

  if (screen === 'fab' && (!game.mission || !game.target)) return <FreeOpsBuildScreen onBack={() => game.goBack()} onMissions={() => game.go('missions')} onInfrastructure={() => game.go('build')} />

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
      <MissionPlanScene
        step={step}
        onStep={setStep}
        mission={game.mission}
        target={target}
        catalog={game.catalog}
        compatibleTargets={compatibleTargets}
        onPickTarget={game.onPickTarget}
        vehicle={{ id: selectedRocket.id, name: selectedRocket.name }}
        vehicles={selectableRockets.map(model => ({ id: model.id, name: model.name }))}
        onPickVehicle={game.onPurchaseRocket}
        rocketImg={rocketDisplay.img}
        rocketAlt={`${selectedRocket.name} ${artStage === 'pad' ? 'on the launchpad' : 'in the workshop'}`}
        artStage={artStage}
        padParts={game.player.shipCustomizerParts}
        freeHaul={isFreeOpsHaul}
        preparing={preparing}
        ready={launchReady}
        holdReason={crewStatus.reason ?? undefined}
        busy={!!rolling}
        canCustomize={preparing && (hasShipCustomizer(game.player.unlockedSkillNodes ?? []) || !!game.player.crewModuleResearched || !!game.player.landingResearched)}
        onCustomize={() => setCustomizing(true)}
        primaryLabel={preparing ? preparationLabel : 'LAUNCH'}
        primaryDisabled={!!rolling || selectedVehicle?.location === 'hangar' || (!preparing && !launchReady)}
        primaryTestId={preparing ? 'prepare-launch-btn' : 'launch-btn'}
        onPrimary={() => preparing ? setRolling(selectedRocket.id) : onLaunch()}
      />
    </SetupFrame>
    {customizing && <div data-testid="launch-review-customizer-overlay" style={{ position: 'fixed', inset: 0, zIndex: 40 }}><ShipInteriorPreview rocketId="explorer" startingFrancs={game.player.francs} missionsDone={game.player.missionsDone} installedParts={game.player.shipCustomizerParts ?? {}} crewModuleResearched={game.player.crewModuleResearched} landingResearched={game.player.landingResearched} onConfirm={game.confirmShipCustomizerBuild} onClose={() => setCustomizing(false)} /></div>}
    {launchPending && <ErrorBoundary fallback={null} onError={onLaunchComplete}><LaunchSequenceCanvas rocketName={rocketDisplay.name} rocketImageSrc={rocketDisplay.img} targetName={target.name} onComplete={onLaunchComplete} /></ErrorBoundary>}
  </>
}
