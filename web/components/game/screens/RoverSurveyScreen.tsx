'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaultSpec, type MissionState } from '@takeon/engine'
import type { Mission, SurfaceTarget, Target } from '@/lib/data'
import { lifeStageForTarget } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import type { FieldBuildInput, FieldIdentity } from '@/lib/systems/SandboxSystem'
import { UI_ZONES } from '@/lib/ui-zones'
import type { TakeonHostEvent } from '@/lib/takeon/events'
import TakeOnMount, { type TakeOnMountHandle } from '@/components/takeon/TakeOnMount'
import SandboxFieldControls from '@/components/takeon/SandboxFieldControls'
import RoverDrivePad from '@/components/takeon/RoverDrivePad'
import { shareFieldCreation } from '@/lib/community/shareField'
import { captureGameEvent } from '@/lib/posthog'
import styles from './RoverSurveyScreen.module.css'

const TAKEON_BODY_BY_LANDNAM_TARGET: Record<string, string> = {
  bennu: 'bennu', itokawa: 'ironrock', vesta: 'ceres', ceres: 'ceres', eros: 'ironrock', psyche: 'ironrock', mars: 'mars', moon: 'moon', europa: 'europa', io: 'io',
}

function stableSeed(value: string): number {
  let hash = 2166136261
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

export function takeonBodyForTarget(target: Pick<Target, 'id' | 'type'>): string {
  return TAKEON_BODY_BY_LANDNAM_TARGET[target.id] ?? (target.type === 'asteroid' ? 'ironrock' : 'mars')
}

interface Outcrop { id: string; label: string; mineral: string; left: string; top: string }

export function exposedOutcrops(spawn: { x: number; y: number }): Outcrop[] {
  const suffix = Math.max(1, Math.min(30, Math.round(spawn.x + spawn.y)))
  return [
    { id: `outcrop-a-${suffix}`, label: 'OUTCROP A', mineral: 'iron', left: '62%', top: '43%' },
    { id: `outcrop-b-${suffix}`, label: 'OUTCROP B', mineral: 'copper', left: '38%', top: '31%' },
    { id: `outcrop-c-${suffix}`, label: 'OUTCROP C', mineral: 'aluminium', left: '50%', top: '66%' },
  ]
}

interface RoverSurveyScreenProps {
  mission: Mission
  target: Target
  onComplete: () => void
  onBack: () => void
  rocketImageSrc?: string
  player?: Player
  onFieldBuild?: (field: FieldIdentity, structure: FieldBuildInput) => boolean
  onFieldDemolish?: (targetId: string, structureId: string) => void
  onFabricate?: (targetId: string, recipeId: string) => boolean
  onSeedBiosphere?: (target: SurfaceTarget) => boolean
}

/** A rover is a surface survey instrument. It never extracts contract cargo. */
export default function RoverSurveyScreen({ mission, target, onComplete, onBack, rocketImageSrc, player, onFieldBuild, onFieldDemolish, onFabricate, onSeedBiosphere }: RoverSurveyScreenProps) {
  const rover = useMemo(() => defaultSpec(), [])
  const bodyId = useMemo(() => takeonBodyForTarget(target), [target])
  const missionId = useMemo(() => `landnam-rover-survey-${mission.id}-${target.id}`, [mission.id, target.id])
  const seed = useMemo(() => stableSeed(`${mission.id}:${target.id}:takeon`), [mission.id, target.id])
  const [routeSteps, setRouteSteps] = useState(0)
  const [takeonReady, setTakeonReady] = useState(false)
  const [deployed, setDeployed] = useState(false)
  const [buildMode, setBuildMode] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [fieldNotice, setFieldNotice] = useState<string | null>(null)
  const [outcrops, setOutcrops] = useState<Outcrop[]>([])
  const [observedOutcropId, setObservedOutcropId] = useState<string | null>(null)
  const takeonHandle = useRef<TakeOnMountHandle | null>(null)
  const fieldIdentity = useMemo<FieldIdentity>(() => ({ targetId: target.id }), [target.id])
  const lifeStage = lifeStageForTarget(target, player?.biosphereSeeds?.[target.id])
  const sandboxEnabled = !!player && !!onFieldBuild
  const selectedOutcrop = outcrops.find(outcrop => outcrop.id === observedOutcropId) ?? null

  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)')
    const sync = () => setNarrow(query.matches)
    sync(); query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  const handleTakeonEvent = useCallback((event: TakeonHostEvent) => {
    if (event.type === 'built') {
      if (!onFieldBuild) return
      const structure = event.payload.structure
      if (!onFieldBuild(fieldIdentity, { id: structure.id, type: structure.type, x: structure.pos.x, y: structure.pos.y, facing: structure.facing ?? 0 })) {
        takeonHandle.current?.demolish(structure.id)
        setFieldNotice('Structure removed: it could not be funded from your stash.')
      } else setFieldNotice(null)
      return
    }
    if (event.type === 'demolished') onFieldDemolish?.(fieldIdentity.targetId, event.payload.id)
    if (event.type === 'buildFailed') setFieldNotice(`Cannot build here: ${event.payload.reason}.`)
  }, [fieldIdentity, onFieldBuild, onFieldDemolish])

  const handleReady = useCallback((state: MissionState) => {
    setOutcrops(current => current.length ? current : exposedOutcrops(state.rover.pos))
    setTakeonReady(true)
  }, [])

  const observe = useCallback((outcrop: Outcrop) => {
    if (!takeonReady) return
    setObservedOutcropId(outcrop.id)
    captureGameEvent('rover_outcrop_observed', { target_id: target.id, outcrop_id: outcrop.id, mineral: outcrop.mineral })
  }, [takeonReady, target.id])

  return (
    <div className={`game-screen theme-blueprint ln-scene-takeon ${styles.screen}`} data-testid="rover-survey-screen">
      <main className={styles.content} data-ui-zone={UI_ZONES.screenContent}>
        <section className={styles.scenePanel} aria-label="Rover survey field" data-build-mode={buildMode && sandboxEnabled}>
          <TakeOnMount ref={takeonHandle} missionId={missionId} bodyId={bodyId} seed={seed} rover={rover} roverName="Mule Field Rover" target={target} lifeStage={lifeStage} onEvent={handleTakeonEvent} onReady={handleReady} onRouteChange={setRouteSteps} startView="iso" className={styles.takeonMount} />
          {deployed && <div className={styles.fieldHotbar} data-testid="rover-field-hotbar"><button type="button" onClick={onBack}>EXIT FIELD</button><span>PROSPECTOR · {target.name.toUpperCase()}</span><strong>{selectedOutcrop ? 'OUTCROP OBSERVED' : 'SCOUT AN EXPOSED OUTCROP'}</strong></div>}
          {!deployed && <div className={styles.landingHandoff} data-testid="deploy-rover-survey-handoff">
            {rocketImageSrc && <img src={rocketImageSrc} alt="Prospector rocket landed on the surface" />}
            <div><span className={styles.eyebrow}>TOUCHDOWN · {target.name.toUpperCase()}</span><h2>Deploy the Mule rover</h2><p>Use the rover to scout and log one exposed outcrop. Ship laser extraction begins after the survey.</p><button type="button" className={styles.primaryAction} onClick={() => { captureGameEvent('rover_deployed', { target_id: target.id }); setDeployed(true) }} data-testid="deploy-rover-survey-confirm">DEPLOY MULE ROVER</button></div>
          </div>}
          {deployed && <div className={styles.lowerStack}><div className={styles.controls} data-testid="rover-control-guide" data-route-steps={routeSteps}>
            <RoverDrivePad handle={takeonHandle} compact={buildMode || narrow} trailing={sandboxEnabled ? <button type="button" className={styles.buildToggle} aria-pressed={buildMode} onClick={() => setBuildMode(open => !open)} data-testid="rover-build-mode-toggle">{buildMode ? 'CLOSE BUILD' : 'BUILD'}</button> : null} />
            <section className={styles.objectControls} data-testid="rover-object-controls"><span className={styles.eyebrow}>{selectedOutcrop ? `${selectedOutcrop.label} OBSERVED` : 'TAP EXPOSED OUTCROP TO LOG A SURVEY'}</span></section>
          </div>{sandboxEnabled && buildMode && player && <div className={styles.sandboxDock} data-testid="rover-sandbox-dock"><SandboxFieldControls player={player} handle={takeonHandle} target={target} targetId={target.id} lifeStage={lifeStage} notice={fieldNotice} onFabricate={onFabricate ? recipeId => onFabricate(target.id, recipeId) : undefined} onSeedBiosphere={onSeedBiosphere ? () => onSeedBiosphere(target) : undefined} onShare={snapshot => { void shareFieldCreation(snapshot, target.name).then(result => setFieldNotice(result.message)) }} /></div>}</div>}
          {deployed && outcrops.map(outcrop => <button key={outcrop.id} type="button" className={`${styles.oreMarker} ${observedOutcropId === outcrop.id ? styles.oreMarkerSelected : ''} ${(observedOutcropId ? observedOutcropId === outcrop.id : outcrop.id === outcrops[0]?.id) ? 'lock-on' : ''}`} style={{ left: outcrop.left, top: outcrop.top }} onClick={() => observe(outcrop)} data-testid={`rover-outcrop-${outcrop.id}`} aria-pressed={observedOutcropId === outcrop.id}><i aria-hidden="true" /><span>{outcrop.label}</span></button>)}
        </section>
        {deployed && <aside className={styles.drillReadout} aria-label="Survey results" data-testid="rover-survey-readout"><div className={styles.readoutHeading}><span className={styles.kicker}>SURVEY RESULTS · PROSPECTOR</span><strong>{selectedOutcrop ? 'OBSERVATION LOGGED' : 'SCOUTING'}</strong></div><p>{selectedOutcrop ? `${selectedOutcrop.label} logged. The ship laser is ready for extraction.` : 'Use the drive pad to scout the field, then tap an exposed outcrop to log a surface observation.'}</p><button type="button" className={styles.primaryAction} disabled={!selectedOutcrop} onClick={() => { captureGameEvent('rover_survey_complete', { target_id: target.id }); onComplete() }} data-testid="rover-continue-to-laser">CONTINUE TO SHIP LASER</button></aside>}
      </main>
    </div>
  )
}
