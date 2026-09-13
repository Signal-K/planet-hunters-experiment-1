'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import type { useGame } from '@/game-context'
import type { Catalog } from '@/lib/catalog'
import type { Screen } from '@/lib/game-types'
import {
  ROCKET_MODELS,
  feasibleTargetsFor,
  rocketConfigForModel,
  rocketDisplayForConfig,
  rocketModelForConfig,
  validateBuild,
} from '@/lib/data'
import { clientAffinityLevel, crewRequirementStatus } from '@/lib/systems/AcademySystem'
import { getRequiredRocketModel } from '@/lib/rockets'
import { rocketCompositionForId, type RocketRoomRole } from '@/lib/data/rocket-composition'
import { useMissionRelayModels } from '@/lib/hooks/useMissionRelayModels'
import { formatCurrency } from '@/lib/format'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import ClientMark from '@/components/ui/ClientMark'
import GalaxyMap from '@/components/TargetPicker/GalaxyMap'
import { LaunchSequenceCanvas } from '@/components/game/LaunchSequenceCanvas'
import FreeOpsBuildScreen from '@/components/game/screens/FreeOpsBuildScreen'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { HangarModules, LaunchpadModules } from '@/components/game/hub/EarthBaseModules'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import styles from './MissionSetupRoutes.module.css'

type Game = ReturnType<typeof useGame>
type RocketDisplay = ReturnType<typeof rocketDisplayForConfig>
export type MissionSetupRoute = Extract<Screen, 'missions' | 'targets' | 'rocket-buy' | 'fab'>

interface MissionSetupRoutesProps {
  screen: MissionSetupRoute
  game: Game
  hasCoach: boolean
  coachManual: boolean
  deliveryTargetName?: string
  rocketDisplay: RocketDisplay
  launchPending: boolean
  onTransferToLaunchpad: () => void
  onLaunch: () => void
  onLaunchComplete: () => void
}

const STEP_LABELS = ['CONTRACT', 'MAP', 'BLUEPRINT', 'REVIEW'] as const

const ASSEMBLY_STEPS = [
  { label: 'SHIPMENT', status: 'UNLOADED' },
  { label: 'STAGE', status: 'FITTED' },
  { label: 'PAYLOAD', status: 'SECURED' },
  { label: 'INSPECTION', status: 'CLEARED' },
] as const

const ROOM_DESCRIPTIONS: Record<RocketRoomRole, string> = {
  cockpit: 'Flight control, navigation, and mission command.',
  storage: 'Sealed capacity for the contracted mineral payload.',
  engine: 'Propulsion, power routing, and orbital manoeuvres.',
}

function targetTypeLabel(type: 'planet' | 'asteroid' | 'exoplanet'): string {
  if (type === 'asteroid') return 'ASTEROID'
  if (type === 'exoplanet') return 'EXOPLANET'
  return 'PLANET'
}

function RequiredCargo({ minerals, catalog }: {
  minerals: Record<string, number>
  catalog: Catalog['minerals']
}) {
  return <div className={styles.cargoReadout} data-testid="required-cargo-readout">
    {Object.entries(minerals).map(([id, amount]) => {
      const meta = catalog[id]
      if (!meta) return null
      return <div key={id} className={styles.cargoChip} style={{ '--mineral-accent': meta.color } as CSSProperties}>
        <i>{meta.sym}</i><strong>×{amount}</strong><span>{meta.name}</span>
      </div>
    })}
  </div>
}

function BackGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7M8 12h12" /></svg>
}

function ChevronGlyph({ direction }: { direction: 'previous' | 'next' }) {
  return direction === 'previous'
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
}

function StepGlyph({ step }: { step: number }) {
  if (step === 1) return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
  if (step === 2) return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M2 12h4M18 12h4M12 2v4M12 18v4" /></svg>
  if (step === 3) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c4 3 6 7 6 12l-6 7-6-7c0-5 2-9 6-12Z" /><circle cx="12" cy="10" r="2" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM7 9h10M7 13h7" /><path d="m15 16 2 2 4-5" /></svg>
}

function HangarAssembly({ rocket, rocketImage, source }: {
  rocket: ReturnType<typeof rocketModelForConfig>
  rocketImage: string
  source: 'company' | 'fabricated'
}) {
  const [cycle, setCycle] = useState(0)
  const [phase, setPhase] = useState(0)
  const composition = rocketCompositionForId(rocket.id)
  const stage = composition.stages[0]

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase(4)
      return
    }

    setPhase(0)
    const timers = [700, 1500, 2300, 3200].map((delay, index) => window.setTimeout(() => setPhase(index + 1), delay))
    return () => timers.forEach(window.clearTimeout)
  }, [cycle, rocket.id])

  return <div className={styles.hangarBuildScene} data-testid="hangar-assembly-animation" data-phase={phase}>
    <div className={styles.hangarDepth} aria-hidden="true"><i /><i /><i /><i /></div>
    <div className={styles.hangarBayHeading}>
      <span>HANGAR 01 · BUILD BAY</span>
      <strong>{phase < 4 ? 'ASSEMBLY IN PROGRESS' : 'VEHICLE CLEARED'}</strong>
    </div>
    <div className={styles.deliveryCrates} aria-hidden="true">
      <i /><i /><i />
      <span>{source === 'fabricated' ? 'SILO COMPONENTS' : 'COMPANY SHIPMENT'}</span>
    </div>
    <div className={styles.overheadCrane} aria-hidden="true"><i /><i /><i /></div>
    <div className={styles.assemblyVehicle} key={cycle} aria-label={`${rocket.name} being assembled in the hangar`}>
      <img className={`${styles.rocketPart} ${styles.rocketAft}`} src={rocketImage} alt="" />
      <img className={`${styles.rocketPart} ${styles.rocketStage}`} src={rocketImage} alt="" />
      <img className={`${styles.rocketPart} ${styles.rocketPayload}`} src={rocketImage} alt="" />
      <img className={styles.assembledRocket} src={rocketImage} alt="" />
      <div className={styles.inspectionSweep} aria-hidden="true" />
    </div>
    <div className={styles.vehicleReadout}>
      <span>{rocket.name.toUpperCase()}</span>
      <strong>{stage.label.toUpperCase()}</strong>
      <small>{composition.boosters.count} BOOSTERS · {composition.payload.label.toUpperCase()}</small>
    </div>
    <ol className={styles.assemblyTimeline} aria-label="Assembly progress">
      {ASSEMBLY_STEPS.map((step, index) => <li key={step.label} data-complete={phase > index} data-current={phase === index}>
        <i>{index + 1}</i><span>{step.label}</span><strong>{phase > index ? step.status : phase === index ? 'WORKING' : 'QUEUED'}</strong>
      </li>)}
    </ol>
    {phase === 4 && <button type="button" className={styles.replayAssembly} onClick={() => setCycle(value => value + 1)}>REPLAY ASSEMBLY</button>}
  </div>
}

function SetupFrame({ step, title, onBack, hasCoach, children }: {
  step: number
  title: string
  onBack: () => void
  hasCoach: boolean
  children: ReactNode
}) {
  return (
    <div className={`game-screen ${styles.root}`} data-testid="mission-setup-scaffold" data-step={step} data-coach={hasCoach}>
      <div className={styles.landscape} data-testid="mission-setup-landscape" aria-hidden="true">
        <HubWorldBackground phase="day" composition="earth-base-wide" />
        <div className={styles.launchpad}><LaunchpadModules /></div>
        <div className={styles.hangar}><HangarModules /></div>
      </div>
      {/* DevShortcuts' fixed DEV toggle (top:8/left:8, dev/staging-only) sits
          directly over this header's own top-left corner, and lives outside
          this screen's isolated stacking context so no z-index here can win
          against it — drop the header below its footprint instead, same
          approach HubScreen already uses (KES-173). */}
      <header className={styles.header} data-dev-launcher={isDevLauncherEnabled()}>
        <button type="button" className={styles.back} onClick={onBack} aria-label="Back"><BackGlyph /></button>
        <div className={styles.titleGlyph}><StepGlyph step={step} /></div>
        <div className={styles.title}><span>MISSION SETUP · {step}/4</span><h1>{title}</h1></div>
        <ol className={styles.progress} aria-label={`Mission setup step ${step} of 4`}>
          {STEP_LABELS.map((label, index) => (
            <li key={label} data-current={index + 1 === step} data-complete={index + 1 < step}>
              <i>{index + 1}</i><span>{label}</span>
            </li>
          ))}
        </ol>
      </header>
      <main className={styles.stage} data-testid="mission-setup-stage">{children}</main>
      <footer className={styles.footer}><span>LANDNAM MISSION CONTROL</span><span>EARTH BASE · LIVE OPERATIONS</span><span>COMMAND VER 4.0.2</span></footer>
    </div>
  )
}

export default function MissionSetupRoutes({ screen, game, hasCoach, rocketDisplay, launchPending, onTransferToLaunchpad, onLaunch, onLaunchComplete }: MissionSetupRoutesProps) {
  const relay = useMissionRelayModels({
    catalog: game.catalog,
    missionsDone: game.player.missionsDone,
    freeOperations: game.player.freeOperations,
    francs: game.player.francs,
    crew: game.player.crew,
    player: game.player,
    sceneScope: game.sceneScope,
  })
  const compatibleTargets = useMemo(() => game.mission ? feasibleTargetsFor(
    game.mission,
    game.catalog.targets,
    game.catalog.parts,
    game.player.missionsDone,
    game.player.launchpadUpgraded,
    game.player.unlockedSkillNodes ?? [],
  ) : [], [game.catalog.parts, game.catalog.targets, game.mission, game.player.launchpadUpgraded, game.player.missionsDone, game.player.unlockedSkillNodes])
  const [targetId, setTargetId] = useState('')
  const requiredRocket = getRequiredRocketModel(game.player.missionsDone)
  const availableRockets = useMemo(
    () => ROCKET_MODELS.filter(model => !model.locked && model.missionsRequired <= game.player.missionsDone),
    [game.player.missionsDone],
  )
  const selectableRockets = useMemo(() => {
    const mission = game.mission
    const target = game.target
    if (!mission || !target) return availableRockets
    const valid = availableRockets.filter(model => validateBuild({
      mission,
      target,
      rocket: rocketConfigForModel(model),
      parts: game.catalog.parts,
      unlockedSkillNodes: game.player.unlockedSkillNodes ?? [],
    }).ok)
    return valid.length > 0 ? valid : [requiredRocket]
  }, [availableRockets, game.catalog.parts, game.mission, game.player.unlockedSkillNodes, game.target, requiredRocket])
  const [rocketId, setRocketId] = useState(requiredRocket.id)
  const selectedRocket = selectableRockets.find(model => model.id === rocketId) ?? selectableRockets[0] ?? requiredRocket
  const selectedComposition = rocketCompositionForId(selectedRocket.id)
  const selectedRooms = selectedComposition.stages.flatMap(stage => stage.rooms)

  useEffect(() => setTargetId(compatibleTargets.find(target => target.recommended)?.id ?? compatibleTargets[0]?.id ?? ''), [compatibleTargets])
  useEffect(() => {
    setRocketId(current => selectableRockets.some(model => model.id === current)
      ? current
      : selectableRockets[0]?.id ?? requiredRocket.id)
  }, [requiredRocket.id, selectableRockets])

  const selectRelativeRocket = (offset: number) => {
    if (selectableRockets.length < 2) return
    const current = selectableRockets.findIndex(model => model.id === selectedRocket.id)
    const next = (current + offset + selectableRockets.length) % selectableRockets.length
    setRocketId(selectableRockets[next].id)
  }

  if (screen === 'fab' && (!game.mission || !game.target)) {
    return <FreeOpsBuildScreen onBack={() => game.goBack()} onMissions={() => game.go('missions')} onInfrastructure={() => game.go('build')} />
  }

  if (screen === 'missions') {
    const model = relay.previewModel
    const client = model?.client
    const clientJobs = client ? game.player.clientMissions[client.id] ?? 0 : 0
    const clientLevel = client ? clientAffinityLevel(clientJobs) : 0
    const previewTargets = model ? feasibleTargetsFor(
      model.mission,
      game.catalog.targets,
      game.catalog.parts,
      game.player.missionsDone,
      game.player.launchpadUpgraded,
      game.player.unlockedSkillNodes ?? [],
    ) : []
    const previewTargetTypes = [...new Set(previewTargets.map(target => targetTypeLabel(target.type)))]
    return (
      <SetupFrame step={1} title="Contract" onBack={() => game.goBack()} hasCoach={hasCoach}>
        <section
          className={styles.contractGallery}
          data-testid="mission-board-section-client"
          style={{ '--client-accent': client?.color ?? 'var(--ln-ok)' } as CSSProperties}
        >
          {model ? <>
            <button type="button" className={`${styles.carouselArrow} ${styles.previous}`} onClick={() => relay.selectRelativeSignal(-1)} disabled={relay.cardModels.length < 2} aria-label="Previous contract"><ChevronGlyph direction="previous" /></button>
            <article className={styles.contractSlide} aria-live="polite">
              <div className={styles.contractIdentity}>
                <ClientMark initial={client?.initial ?? 'OP'} color={client?.color ?? 'var(--ln-cyan)'} uiRole={client?.uiRole ?? 'starter'} clientId={client?.id} size={104} />
                <div><span>CONTRACT {relay.selectedIndex + 1} / {relay.cardModels.length}</span><strong>{client?.name ?? 'YOUR PROGRAM'}</strong></div>
              </div>
              <div className={styles.contractCopy}>
                <h2>{model.mission.title}</h2>
                <p className={styles.contractRoute}>{model.routeLabel ?? `${model.targetCount} ELIGIBLE TARGET${model.targetCount === 1 ? '' : 'S'}`}</p>
                {model.mission.brief && <p className={styles.contractDescription}>{model.mission.brief}</p>}
              </div>
              <div className={styles.contractFacts}>
                <div><span>CONTRACT VALUE</span><strong>{formatCurrency(model.displayPayout, { compact: true })}</strong></div>
                <div><span>CURRENT AFFINITY</span><strong>{client ? `L${clientLevel} · ${clientJobs} ${clientJobs === 1 ? 'JOB' : 'JOBS'}` : 'PROGRAM'}</strong></div>
                <div><span>AFFINITY REWARD</span><strong>+{model.mission.payout.affinity}</strong></div>
                <div><span>MISSION TIER</span><strong>{model.mission.difficulty}</strong></div>
              </div>
              <div className={styles.contractCargo}>
                <span>REQUIRED CARGO</span>
                <RequiredCargo minerals={model.mission.requires.minerals} catalog={game.catalog.minerals} />
                <p><b>DESTINATION CLASS</b>{previewTargetTypes.join(' / ') || 'FIXED ROUTE'}</p>
              </div>
              <img className={styles.contractRocket} src={requiredRocket.img} alt={`${requiredRocket.name} mission vehicle`} />
              <button type="button" className={styles.primary} disabled={!model.unlocked || relay.tutorialMissionInProgress} onClick={() => game.onPickMission(model.mission.id)}><StepGlyph step={1} /> ACCEPT CONTRACT</button>
            </article>
            <button type="button" className={`${styles.carouselArrow} ${styles.next}`} onClick={() => relay.selectRelativeSignal(1)} disabled={relay.cardModels.length < 2} aria-label="Next contract"><ChevronGlyph direction="next" /></button>
            <div className={styles.galleryDots} aria-hidden="true">{relay.cardModels.map((item, index) => <i key={item.mission.id} data-active={index === relay.selectedIndex} />)}</div>
          </> : <div className={styles.empty}>NO COMPATIBLE CLIENT SIGNALS</div>}
        </section>
      </SetupFrame>
    )
  }

  if (screen === 'targets' && game.mission) {
    const selectedTarget = compatibleTargets.find(target => target.id === targetId)
    return (
      <SetupFrame step={2} title="Map" onBack={() => game.go('missions')} hasCoach={hasCoach}>
        <section className={styles.targetMap} data-testid="mission-target-map">
          <div className={styles.mapCanvas}>
            <GalaxyMap mission={game.mission} targets={game.catalog.targets} compatibleIds={new Set(compatibleTargets.map(target => target.id))} pickedId={targetId} onPick={setTargetId} eligibleOnlyHighlight />
          </div>
          <div className={styles.filterRibbon}>
            <strong>MISSION FILTER ACTIVE</strong>
            <span>ONLY TARGETS WITH THE REQUIRED MINERALS, RANGE, CARGO, AND DRILL PARAMETERS ARE HIGHLIGHTED.</span>
            <RequiredCargo minerals={game.mission.requires.minerals} catalog={game.catalog.minerals} />
          </div>
          <div className={styles.mapAction}>
            <div><span>{selectedTarget ? `${targetTypeLabel(selectedTarget.type)} · ELIGIBLE TARGET` : 'ELIGIBLE TARGET'}</span><h2>{selectedTarget?.name ?? 'SELECT A HIGHLIGHTED BODY'}</h2>{selectedTarget && <p><b>{targetTypeLabel(selectedTarget.type)}</b> · ORBIT {selectedTarget.orbit} · MISSION PARAMETERS PASS</p>}</div>
            <button type="button" className={styles.primary} data-testid="continue-build-btn" disabled={!selectedTarget} onClick={() => selectedTarget && game.onPickTarget(selectedTarget.id)}><StepGlyph step={2} /> CONFIRM TARGET</button>
          </div>
        </section>
      </SetupFrame>
    )
  }

  if (screen === 'rocket-buy' && game.mission && game.target) {
    const canAfford = game.player.francs >= selectedRocket.costFrancs
    const movableVehicle = (game.player.stagedRockets ?? []).find(vehicle =>
      vehicle.missionId !== game.mission!.id
      && validateBuild({ mission: game.mission!, target: game.target!, rocket: vehicle.rocket, parts: game.catalog.parts, unlockedSkillNodes: game.player.unlockedSkillNodes ?? [] }).ok,
    )
    const movableMission = movableVehicle
      ? game.catalog.missions.find(mission => mission.id === movableVehicle.missionId)
        ?? game.player.dailyClientPool?.missions.find(mission => mission.id === movableVehicle.missionId)
      : null
    return (
      <SetupFrame step={3} title="Blueprint" onBack={() => game.goBack()} hasCoach={hasCoach}>
        <section className={styles.rocketBlueprint} data-testid="mission-rocket-blueprint">
          <div className={styles.blueprintHeading}><span>ROCKET {selectableRockets.findIndex(model => model.id === selectedRocket.id) + 1} / {selectableRockets.length}</span><h2>{selectedRocket.name}</h2></div>
          <div className={styles.rocketSchematic} aria-label={`${selectedRocket.name} schematic`}><img src={selectedRocket.img} alt="" /></div>
          <div className={styles.roomManifest}>
            <div className={styles.manifestHeading}><span>ROOM SLOTS</span><strong>FIXED CONFIGURATION</strong></div>
            <ol>{selectedRooms.map((room, index) => <li key={room.id}>
              <i>{String(index + 1).padStart(2, '0')}</i>
              <div><strong>{room.label}</strong><p>{ROOM_DESCRIPTIONS[room.role]}</p></div>
              <button type="button" disabled title="No alternate rooms are available yet">SWAP</button>
            </li>)}</ol>
            <p className={styles.modularNote}>MODULAR MOUNTS ONLINE · ALTERNATE ROOMS NOT YET AVAILABLE</p>
          </div>
          {selectableRockets.length > 1 && <nav className={styles.rocketSwitcher} aria-label="Available rockets">
            <button type="button" onClick={() => selectRelativeRocket(-1)} aria-label="Previous rocket"><ChevronGlyph direction="previous" /></button>
            <span>SWITCH ROCKET</span>
            <button type="button" onClick={() => selectRelativeRocket(1)} aria-label="Next rocket"><ChevronGlyph direction="next" /></button>
          </nav>}
          {movableVehicle && <div className={styles.stagedHold}>
            <span>STAGED VEHICLE</span><strong>{rocketModelForConfig(movableVehicle.rocket).name.toUpperCase()} IS ASSIGNED TO {movableMission?.title.toUpperCase() ?? 'ANOTHER PREPARED MISSION'}</strong>
            <p>MOVING IT HERE RELEASES THAT MISSION’S PREPARATION. NO SECOND CHARGE.</p>
            <button type="button" onClick={() => game.onMoveStagedRocket(movableVehicle.id)}>MOVE VEHICLE TO THIS MISSION</button>
          </div>}
          <p className={styles.purchaseTerms}>{selectedRocket.costFrancs === 0 ? 'BUILD QUEUE · ₣0 · SINGLE-USE AFTER LAUNCH' : `COMPANY SHIPMENT · ${formatCurrency(selectedRocket.costFrancs, { compact: true })} · CHARGED ONCE`}</p>
          <button type="button" className={styles.primary} disabled={!canAfford} onClick={() => game.onPurchaseRocket(selectedRocket.id)}><StepGlyph step={3} /> {selectedRocket.costFrancs === 0 ? 'BUILD EXPLORER · ₣0' : `BUILD ANOTHER ${selectedRocket.name.toUpperCase()} · ${formatCurrency(selectedRocket.costFrancs, { compact: true })}`}</button>
        </section>
      </SetupFrame>
    )
  }

  if (screen === 'fab' && game.mission && game.target) {
    const crewStatus = crewRequirementStatus(game.mission.requires.crew, game.player.crew ?? [])
    const crewReady = !game.mission.requires.crew || (game.player.shipCustomizerParts?.['crew-module'] === 'crew-quarters-t1' && crewStatus.met)
    const validation = validateBuild({ mission: game.mission, target: game.target, rocket: game.rocket, parts: game.catalog.parts, unlockedSkillNodes: game.player.unlockedSkillNodes ?? [] })
    const launchReady = validation.ok && crewReady
    const vehicleInHangar = game.player.pendingRocketLocation === 'hangar'
    const rocket = rocketModelForConfig(game.rocket)
    const reviewRooms = rocketCompositionForId(rocket.id).stages.flatMap(stage => stage.rooms)
    const selectedVehicle = game.player.stagedRockets?.find(vehicle => vehicle.id === game.player.selectedStagedRocketId)
    return <>
      <SetupFrame step={4} title={vehicleInHangar ? 'Hangar assembly' : 'Launch review'} onBack={() => game.goBack('rocket-buy')} hasCoach={hasCoach}>
        <section className={styles.missionReview} data-testid="mission-launch-review" data-location={vehicleInHangar ? 'hangar' : 'launchpad'}>
          {vehicleInHangar
            ? <HangarAssembly rocket={rocket} rocketImage={rocketDisplay.img} source={selectedVehicle?.source ?? 'company'} />
            : <div className={styles.launchpadReview}>
              <div className={styles.launchTower} aria-hidden="true"><i /><i /><i /></div>
              <img src={rocketDisplay.img} alt={`${rocket.name} on the launchpad`} />
              <div><span>LAUNCHPAD · VEHICLE LOCKED</span><strong>{rocket.name.toUpperCase()}</strong><small>TRANSFER COMPLETE · COUNTDOWN SYSTEM ONLINE</small></div>
            </div>}
          <aside className={styles.reviewBrief}>
            <div className={styles.reviewHeading}><span>{vehicleInHangar ? 'MISSION VEHICLE' : 'MISSION REVIEW'}</span><h2>{game.mission.title}</h2></div>
            <dl className={styles.reviewFacts}>
              <div><dt>{targetTypeLabel(game.target.type)} · DESTINATION</dt><dd>{game.target.name}</dd></div>
              <div><dt>VEHICLE</dt><dd data-testid="assembly-selected-rocket">{rocket.name}</dd></div>
              <div><dt>ROOMS</dt><dd>{reviewRooms.map(room => room.label).join(' · ')}</dd></div>
              <div><dt>REQUIRED CARGO</dt><dd><RequiredCargo minerals={game.mission.requires.minerals} catalog={game.catalog.minerals} /></dd></div>
            </dl>
            <div className={styles.clearance} data-ready={launchReady}>
              <span>{vehicleInHangar ? 'NEXT OPERATION' : 'LAUNCH CLEARANCE'}</span>
              <strong>{vehicleInHangar ? 'ROLL OUT TO LAUNCHPAD' : launchReady ? 'ALL PARAMETERS PASS' : 'BUILD HOLD'}</strong>
              {!launchReady && <small>{validation.problems[0] ?? crewStatus.reason ?? 'MISSION REQUIREMENTS NOT MET'}</small>}
            </div>
          {vehicleInHangar
            ? <button type="button" className={styles.primary} data-testid="transfer-to-launchpad-btn" disabled={!launchReady} onClick={onTransferToLaunchpad}><StepGlyph step={4} /> MOVE TO LAUNCHPAD</button>
            : <button type="button" className={styles.primary} data-testid="launch-btn" disabled={!launchReady} onClick={onLaunch}><StepGlyph step={4} /> ACCEPT &amp; PREPARE LAUNCH</button>}
          </aside>
        </section>
      </SetupFrame>
      {launchPending && !vehicleInHangar && <ErrorBoundary fallback={null} onError={onLaunchComplete}><LaunchSequenceCanvas rocketName={rocketDisplay.name} rocketImageSrc={rocketDisplay.img} targetName={game.target.name} onComplete={onLaunchComplete} /></ErrorBoundary>}
    </>
  }

  return null
}
