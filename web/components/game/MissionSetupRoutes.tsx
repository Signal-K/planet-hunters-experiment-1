'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { useGame } from '@/game-context'
import type { Screen } from '@/lib/game-types'
import {
  ROCKET_MODELS,
  feasibleTargetsFor,
  rocketDisplayForConfig,
  rocketModelForConfig,
  validateBuild,
} from '@/lib/data'
import { earthStorageBuilt } from '@/lib/systems/EconomySystem'
import { crewRequirementStatus } from '@/lib/systems/AcademySystem'
import { getRequiredRocketModel } from '@/lib/rockets'
import { recipeIsAffordable, rocketCompositionForId } from '@/lib/data/rocket-composition'
import { useMissionRelayModels } from '@/lib/hooks/useMissionRelayModels'
import { formatCurrency } from '@/lib/format'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import ClientMark from '@/components/ui/ClientMark'
import MineralChip from '@/components/game/MineralChip'
import GalaxyMap from '@/components/TargetPicker/GalaxyMap'
import { LaunchSequenceCanvas } from '@/components/game/LaunchSequenceCanvas'
import FreeOpsBuildScreen from '@/components/game/screens/FreeOpsBuildScreen'
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
  onLaunch: () => void
  onLaunchComplete: () => void
}

const STEP_LABELS = ['CONTRACT', 'TARGET', 'VEHICLE', 'LAUNCH'] as const

function BackGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7M8 12h12" /></svg>
}

function StepGlyph({ step }: { step: number }) {
  if (step === 1) return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
  if (step === 2) return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M2 12h4M18 12h4M12 2v4M12 18v4" /></svg>
  if (step === 3) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c4 3 6 7 6 12l-6 7-6-7c0-5 2-9 6-12Z" /><circle cx="12" cy="10" r="2" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
}

function SetupFrame({ step, title, onBack, children }: { step: number; title: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className={`game-screen theme-deep ${styles.root}`} data-testid="mission-setup-scaffold" data-step={step}>
      <div className={styles.blueprint} aria-hidden="true"><span /><span /><span /></div>
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={onBack} aria-label="Back"><BackGlyph /></button>
        <div className={styles.titleGlyph}><StepGlyph step={step} /></div>
        <div className={styles.title}><span>MISSION CONTROL · SETUP {step}/4</span><h1>{title}</h1></div>
        <ol className={styles.progress} aria-label={`Mission setup step ${step} of 4`}>
          {STEP_LABELS.map((label, index) => <li key={label} data-current={index + 1 === step} data-complete={index + 1 < step}><i>{index + 1}</i><span>{label}</span></li>)}
        </ol>
      </header>
      <main className={styles.stage}>{children}</main>
      <footer className={styles.footer}><span>LANDNAM MISSION CONTROL</span><span>EARTH BASE · LIVE OPERATIONS</span><span>COMMAND VER 4.0.2</span></footer>
    </div>
  )
}

export default function MissionSetupRoutes({ screen, game, rocketDisplay, launchPending, onLaunch, onLaunchComplete }: MissionSetupRoutesProps) {
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
  const availableRockets = ROCKET_MODELS.filter(model => !model.locked && model.missionsRequired <= game.player.missionsDone)
  const [rocketId, setRocketId] = useState(requiredRocket.id)
  const selectedRocket = availableRockets.find(model => model.id === rocketId) ?? requiredRocket
  const composition = rocketCompositionForId(selectedRocket.id)
  const siloOnline = earthStorageBuilt(game.player)
  const fabricationReady = composition.recipes.every(recipe => (game.player.fabricatedRocketParts?.[recipe.id] ?? 0) > 0)

  useEffect(() => setTargetId(compatibleTargets.find(target => target.recommended)?.id ?? compatibleTargets[0]?.id ?? ''), [compatibleTargets])
  useEffect(() => setRocketId(requiredRocket.id), [requiredRocket.id])

  if (screen === 'fab' && (!game.mission || !game.target)) {
    return <FreeOpsBuildScreen onBack={() => game.goBack()} onMissions={() => game.go('missions')} onInfrastructure={() => game.go('build')} />
  }

  if (screen === 'missions') {
    const model = relay.previewModel
    const client = model?.client
    return (
      <SetupFrame step={1} title="Contract Relay" onBack={() => game.goBack()}>
        <section className={styles.relayScene} data-testid="mission-board-section-client">
          <div className={styles.relayMast} aria-hidden="true"><i /><i /><i /><div><span /><span /><span /></div></div>
          <div className={styles.signalHeader}><span className={styles.kicker}>INCOMING CLIENT SIGNAL</span><strong>{relay.cardModels.length} LIVE CONTRACT{relay.cardModels.length === 1 ? '' : 'S'}</strong></div>
          {model ? (
            <article className={styles.contractConsole}>
              <div className={styles.clientIdentity}>
                <ClientMark initial={client?.initial ?? 'OP'} color={client?.color ?? 'var(--ln-cyan)'} uiRole={client?.uiRole ?? 'starter'} clientId={client?.id} size={76} />
                <div><span>{client?.name ?? 'YOUR PROGRAM'}</span><h2>{model.mission.title}</h2><small>{model.routeLabel ?? `${model.targetCount} COMPATIBLE TARGET${model.targetCount === 1 ? '' : 'S'}`}</small></div>
              </div>
              <div className={styles.contractTelemetry}>
                <div><span>CONTRACT VALUE</span><strong>{formatCurrency(model.displayPayout, { compact: true })}</strong></div>
                <div><span>CLIENT AFFINITY</span><strong>+{model.mission.payout.affinity}</strong></div>
                <div><span>MISSION TIER</span><strong>{model.mission.difficulty}</strong></div>
              </div>
              <div className={styles.orderPanel}>
                <span className={styles.kicker}>CARGO ORDER</span>
                <div>{Object.entries(model.mission.requires.minerals).map(([id, amount]) => <MineralChip key={id} mineral={id} count={amount} meta={game.catalog.minerals[id]} />)}</div>
              </div>
              <p className={styles.brief}>{model.mission.brief}</p>
              <button type="button" className={styles.primary} disabled={!model.unlocked || relay.tutorialMissionInProgress} onClick={() => game.onPickMission(model.mission.id)}>
                <StepGlyph step={1} /> ACCEPT CONTRACT
              </button>
            </article>
          ) : <div className={styles.empty}>NO COMPATIBLE CLIENT SIGNALS</div>}
          <nav className={styles.relayNav} aria-label="Contract relay">
            <button type="button" onClick={() => relay.selectRelativeSignal(-1)} aria-label="Previous contract">‹</button>
            <div>{relay.cardModels.map((item, index) => <i key={item.mission.id} data-active={index === relay.selectedIndex} />)}</div>
            <button type="button" onClick={() => relay.selectRelativeSignal(1)} aria-label="Next contract">›</button>
          </nav>
        </section>
      </SetupFrame>
    )
  }

  if (screen === 'targets' && game.mission) {
    const selectedTarget = compatibleTargets.find(target => target.id === targetId)
    return (
      <SetupFrame step={2} title="System Atlas" onBack={() => game.go('missions')}>
        <section className={styles.atlasStage}>
          <GalaxyMap mission={game.mission} targets={game.catalog.targets} compatibleIds={new Set(compatibleTargets.map(target => target.id))} pickedId={targetId} onPick={setTargetId} />
          <aside className={styles.atlasTelemetry}>
            <span className={styles.kicker}>TARGET LOCK</span>
            <h2>{selectedTarget?.name ?? 'SELECT A BODY'}</h2>
            {selectedTarget && <div className={styles.targetStats}><span>ORBIT <strong>{selectedTarget.orbit}</strong></span><span>TYPE <strong>{selectedTarget.type.toUpperCase()}</strong></span><span>STATUS <strong>COMPATIBLE</strong></span></div>}
            <div className={styles.mineralRow}>{selectedTarget?.minerals.map(id => <MineralChip key={id} mineral={id} variant="avatar" meta={game.catalog.minerals[id]} />)}</div>
            <button type="button" className={styles.primary} data-testid="continue-build-btn" disabled={!selectedTarget} onClick={() => selectedTarget && game.onPickTarget(selectedTarget.id)}><StepGlyph step={2} /> LOCK TARGET</button>
          </aside>
        </section>
      </SetupFrame>
    )
  }

  if (screen === 'rocket-buy' && game.mission && game.target) {
    const canAfford = game.player.francs >= selectedRocket.costFrancs
    return (
      <SetupFrame step={3} title="Vehicle Bay" onBack={() => game.goBack()}>
        <section className={styles.rocketBay}>
          <div className={styles.bayRig} aria-hidden="true"><i /><i /><i /><span /></div>
          <div className={styles.rocketHero}><span className={styles.vehicleDesignation}>LV-{selectedRocket.tier} · {selectedRocket.name.toUpperCase()}</span><img src={selectedRocket.img} alt={`${selectedRocket.name} rocket`} /><div className={styles.scanline} /></div>
          <aside className={styles.vehicleTelemetry}>
            <span className={styles.kicker}>FLIGHT VEHICLE</span><h2>{selectedRocket.name}</h2>
            <div className={styles.statGrid}><div><span>CARGO</span><strong>{selectedRocket.stats.cargo} U</strong></div><div><span>MAX ORBIT</span><strong>{selectedRocket.stats.maxOrbit}</strong></div><div><span>DRILL</span><strong>T{selectedRocket.stats.drillTier}</strong></div><div><span>COST</span><strong>{formatCurrency(selectedRocket.costFrancs, { compact: true })}</strong></div></div>
            <div className={styles.vehicleChoices} role="radiogroup" aria-label="Available rocket types">
              {availableRockets.map(rocket => <button key={rocket.id} type="button" role="radio" aria-checked={rocket.id === selectedRocket.id} data-testid={`rocket-choice-${rocket.id}`} data-active={rocket.id === selectedRocket.id} onClick={() => setRocketId(rocket.id)}><img src={rocket.img} alt="" /><span>{rocket.name.toUpperCase()}</span><small>TIER {rocket.tier}</small></button>)}
            </div>
            {siloOnline && <div className={styles.fabrication} data-testid="rocket-fabrication-recipes">{composition.recipes.map(recipe => { const built = game.player.fabricatedRocketParts?.[recipe.id] ?? 0; return <button key={recipe.id} type="button" disabled={built > 0 || !recipeIsAffordable(recipe, game.player.stash ?? {})} onClick={() => game.onFabricateRocketPart(selectedRocket.id, recipe.id)}><span>{recipe.label}</span><strong>{built > 0 ? 'BUILT' : 'FABRICATE'}</strong></button> })}</div>}
            <button type="button" className={styles.primary} disabled={fabricationReady && siloOnline ? false : !canAfford} onClick={() => fabricationReady && siloOnline ? game.onAssembleFabricatedRocket(selectedRocket.id) : game.onPurchaseRocket(selectedRocket.id)}><StepGlyph step={3} /> {fabricationReady && siloOnline ? 'ASSEMBLE VEHICLE' : selectedRocket.costFrancs === 0 ? 'STAGE VEHICLE' : `PURCHASE · ${formatCurrency(selectedRocket.costFrancs, { compact: true })}`}</button>
          </aside>
        </section>
      </SetupFrame>
    )
  }

  if (screen === 'fab' && game.mission && game.target) {
    const crewStatus = crewRequirementStatus(game.mission.requires.crew, game.player.crew ?? [])
    const crewReady = !game.mission.requires.crew || (game.player.shipCustomizerParts?.['crew-module'] === 'crew-quarters-t1' && crewStatus.met)
    const validation = validateBuild({ mission: game.mission, target: game.target, rocket: game.rocket, parts: game.catalog.parts, unlockedSkillNodes: game.player.unlockedSkillNodes ?? [] })
    const launchReady = validation.ok && crewReady
    const rocket = rocketModelForConfig(game.rocket)
    return <>
      <SetupFrame step={4} title="Launch Clearance" onBack={() => game.goBack('rocket-buy')}>
        <section className={styles.preflight}>
          <div className={styles.launchTower} aria-hidden="true"><i /><i /><i /></div>
          <div className={styles.preflightRocket}><img src={rocketDisplay.img} alt={`${rocket.name} staged for launch`} /></div>
          <aside className={styles.clearance}>
            <span className={styles.kicker}>FLIGHT MANIFEST</span><h2>{rocket.name} · {launchReady ? 'GO' : 'HOLD'}</h2>
            <div className={styles.clearanceRows}><div><StepGlyph step={1} /><span>CONTRACT</span><strong>{game.mission.title}</strong><i /></div><div><StepGlyph step={2} /><span>TARGET</span><strong>{game.target.name}</strong><i /></div><div><StepGlyph step={3} /><span>VEHICLE</span><strong data-testid="assembly-selected-rocket">{rocket.name}</strong><i /></div><div><StepGlyph step={4} /><span>CLEARANCE</span><strong>{launchReady ? 'ALL SYSTEMS GO' : validation.problems[0] ?? crewStatus.reason ?? 'BUILD HOLD'}</strong><i data-ok={launchReady} /></div></div>
            <button type="button" className={styles.primary} data-testid="launch-btn" disabled={!launchReady} onClick={onLaunch}><StepGlyph step={4} /> INITIATE LAUNCH</button>
          </aside>
        </section>
      </SetupFrame>
      {launchPending && <ErrorBoundary fallback={null} onError={onLaunchComplete}><LaunchSequenceCanvas rocketName={rocketDisplay.name} rocketImageSrc={rocketDisplay.img} targetName={game.target.name} onComplete={onLaunchComplete} /></ErrorBoundary>}
    </>
  }

  return null
}
