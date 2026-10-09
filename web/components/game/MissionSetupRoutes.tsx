'use client'

import { buildingLevel } from '@/lib/data/building-levels'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { useGame } from '@/game-context'
import type { Catalog } from '@/lib/catalog'
import type { Screen } from '@/lib/game-types'
import { ACADEMY_INTRO_MISSION_ID, ROCKET_MODELS, feasibleTargetsFor, isFreeHaulEligibleMission, rocketConfigForModel, rocketDisplayForConfig, rocketModelForConfig, validateBuild } from '@/lib/data'
import { clientAffinityLevel, crewRequirementStatus } from '@/lib/systems/AcademySystem'
import { useMissionRelayModels } from '@/lib/hooks/useMissionRelayModels'
import { formatCurrency } from '@/lib/format'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import ClientMark from '@/components/ui/ClientMark'
import PixiGalaxyMap from '@/components/TargetPicker/PixiGalaxyMap'
import { LaunchSequenceCanvas } from '@/components/game/LaunchSequenceCanvas'
import FreeOpsBuildScreen from '@/components/game/screens/FreeOpsBuildScreen'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { HangarModules, LaunchpadModules } from '@/components/game/hub/EarthBaseModules'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { useHelp } from '@/components/ui/useHelp'
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

function SetupFrame({ title, screen, onBack, children, eyebrow = 'CONTRACT → LAUNCH' }: { title: string; screen: Screen; onBack: () => void; children: ReactNode; eyebrow?: string }) {
  // SSL-432: shared "?" slot. Renders nothing until this screen has a help topic.
  const help = useHelp(screen)
  return <div className={`game-screen theme-blueprint ${styles.root}`} data-testid="mission-setup-scaffold">
    <div className={styles.landscape} data-testid="mission-setup-landscape" aria-hidden="true">
      <HubWorldBackground phase="day" composition="earth-base-wide" />
      <div className={styles.launchpad}><LaunchpadModules /></div>
      <div className={styles.hangar}><HangarModules /></div>
    </div>
    <header className={styles.header} data-dev-launcher={isDevLauncherEnabled()}>
      <button type="button" className={styles.back} onClick={onBack} aria-label="Back"><ArrowGlyph direction="previous" /></button>
      <div className={styles.title}><span>{eyebrow}</span><h1>{title}</h1></div>
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
    const model = relay.previewModel
    const client = model?.client
    const clientJobs = client ? game.player.clientMissions[client.id] ?? 0 : 0
    const clientLevel = client ? clientAffinityLevel(clientJobs) : 0
    return <SetupFrame title="Choose a contract" screen="missions" onBack={() => game.goBack()}>
      <section className={styles.contractGallery} data-testid="mission-board-section-client" style={{ '--client-accent': client?.color ?? 'var(--ln-ok)' } as CSSProperties}>
        {model ? <>
          <button type="button" className={`${styles.carouselArrow} ${styles.previous}`} onClick={() => relay.selectRelativeSignal(-1)} disabled={relay.cardModels.length < 2} aria-label="Previous contract"><ArrowGlyph direction="previous" /></button>
          <article className={styles.contractSlide} aria-live="polite">
            <div className={styles.contractIdentity}><ClientMark initial={client?.initial ?? 'OP'} color={client?.color ?? 'var(--ln-cyan)'} uiRole={client?.uiRole ?? 'starter'} clientId={client?.id} size={88} /><div><span>{model.mission.payload?.type === 'satellite' ? 'INSTRUMENT LAUNCH' : `CLIENT CONTRACT ${relay.selectedIndex + 1} / ${relay.cardModels.length}`}</span><strong>{model.mission.payload?.type === 'satellite' ? model.mission.payload.name : client?.name ?? 'YOUR PROGRAM'}</strong></div></div>
            <div className={styles.contractCopy}><h2>{model.mission.title}</h2><span className={styles.contractRoute} data-testid="contract-route">{model.routeLabel ?? `${model.targetCount} ELIGIBLE TARGET${model.targetCount === 1 ? '' : 'S'}`}</span><p>{model.mission.brief}</p></div>
            <dl className={styles.contractFacts}><div><dt>VALUE</dt><dd>{formatCurrency(model.displayPayout, { compact: true })}</dd></div><div><dt>CLIENT LEVEL</dt><dd>{client ? `L${clientLevel}` : 'PROGRAM'}</dd></div><div><dt>MISSION TIER</dt><dd>{model.mission.difficulty}</dd></div></dl>
            <div className={styles.contractCargo}><span>REQUIRED CARGO</span><RequiredCargo minerals={model.mission.requires.minerals} catalog={game.catalog.minerals} /></div>
            <img className={styles.contractRocket} src={rocketDisplayForConfig(game.rocket).img} alt="" />
            <button type="button" className={styles.primary} data-testid={`mission-accept-${model.mission.id}`} disabled={!model.unlocked || relay.tutorialMissionInProgress} onClick={() => model.mission.id === ACADEMY_INTRO_MISSION_ID ? game.go('academy') : game.onPickMission(model.mission.id)}><LaunchGlyph /> ACCEPT &amp; PREPARE</button>
          </article>
          <button type="button" className={`${styles.carouselArrow} ${styles.next}`} onClick={() => relay.selectRelativeSignal(1)} disabled={relay.cardModels.length < 2} aria-label="Next contract"><ArrowGlyph direction="next" /></button>
        </> : relay.onboardingComplete ? <div className={styles.empty}><strong>NO CONTRACTS ARE OFFERED YET</strong><span>Free Ops opens once the Earth storage silo is built.</span><button type="button" className={styles.primary} onClick={() => game.go('build')}>BUILD STORAGE SILO</button></div> : <div className={styles.empty}>NO COMPATIBLE CLIENT SIGNALS</div>}
      </section>
    </SetupFrame>
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
  const caption = rolling ? 'ROLLING OUT TO THE LAUNCHPAD' : preparing ? 'WORKSHOP · READY TO ROLL OUT' : 'LAUNCHPAD · READY FOR DEPARTURE'
  const preparationLabel = selectedRocket.costFrancs === 0 ? `PREPARE ${selectedRocket.name.toUpperCase()}` : `BUILD ${selectedRocket.name.toUpperCase()} · ${formatCurrency(selectedRocket.costFrancs, { compact: true })}`

  return <>
    <SetupFrame title="Launch review" screen={screen} onBack={() => game.go('missions')} eyebrow={isFreeOpsHaul ? 'FREE OPS · OWN HAUL' : 'CONTRACT → LAUNCH'}>
      <section className={styles.review} data-testid="mission-launch-review">
        <div className={styles.launchScene}><div className={styles.launchArt} data-testid="launch-art" data-stage={artStage}><div className={styles.workshop} aria-hidden="true"><b>WORKSHOP</b></div><div className={styles.launchTower} aria-hidden="true"><i /><i /><i /></div><img data-testid="launch-rocket" src={rocketDisplay.img} alt={`${selectedRocket.name} ${artStage === 'pad' ? 'on the launchpad' : 'in the workshop'}`} /></div><div className={styles.launchCaption}><span>{caption}</span><strong>{selectedRocket.name.toUpperCase()}</strong></div></div>
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
          <button type="button" className={styles.primary} data-testid={preparing ? 'prepare-launch-btn' : 'launch-btn'} disabled={!!rolling || selectedVehicle?.location === 'hangar' || (!preparing && !launchReady)} onClick={() => preparing ? setRolling(selectedRocket.id) : onLaunch()}><LaunchGlyph /> {preparing ? preparationLabel : 'LAUNCH'}</button>
        </aside>
      </section>
    </SetupFrame>
    {launchPending && <ErrorBoundary fallback={null} onError={onLaunchComplete}><LaunchSequenceCanvas rocketName={rocketDisplay.name} rocketImageSrc={rocketDisplay.img} targetName={target.name} onComplete={onLaunchComplete} /></ErrorBoundary>}
  </>
}
