'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaultSpec, type MissionState, type ResourceKey } from '@takeon/engine'
import type { Mission, SurfaceTarget, Target } from '@/lib/data'
import { lifeStageForTarget } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import type { FieldBuildInput, FieldIdentity } from '@/lib/systems/SandboxSystem'
import { UI_ZONES } from '@/lib/ui-zones'
import type { TakeonHostEvent } from '@/lib/takeon/events'
import { TAKEON_TO_LANDNAM_MINERAL } from '@/lib/takeon/minerals'
import TakeOnMount, { type TakeOnMountHandle } from '@/components/takeon/TakeOnMount'
import SandboxFieldControls from '@/components/takeon/SandboxFieldControls'
import RoverDrivePad from '@/components/takeon/RoverDrivePad'
import { shareFieldCreation } from '@/lib/community/shareField'
import { captureGameEvent } from '@/lib/posthog'
import styles from './RoverMiningScreen.module.css'

/**
 * TakeOn's body registry uses authored simulation bodies, while Landnam's
 * mission catalog uses real target ids. Keep that translation at the host
 * boundary instead of teaching the engine about Landnam's astronomy catalog.
 */
const TAKEON_BODY_BY_LANDNAM_TARGET: Record<string, string> = {
  bennu: 'bennu',
  itokawa: 'ironrock',
  vesta: 'ceres',
  ceres: 'ceres',
  eros: 'ironrock',
  psyche: 'ironrock',
  mars: 'mars',
  moon: 'moon',
  europa: 'europa',
  io: 'io',
}

function stableSeed(value: string): number {
  let hash = 2166136261
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

export function takeonBodyForTarget(target: Pick<Target, 'id' | 'type'>): string {
  return TAKEON_BODY_BY_LANDNAM_TARGET[target.id]
    ?? (target.type === 'asteroid' ? 'ironrock' : 'mars')
}

export function roverCargoRequirements(mission: Mission, target: Target): Record<string, number> {
  if (Object.keys(mission.requires.minerals).length > 0) return { ...mission.requires.minerals }

  return Object.fromEntries(
    target.minerals.slice(0, 3).map((mineral, index) => [mineral, 2 + index])
  )
}

/** Translate the TakeOn rover hold into the contract-shaped Landnam manifest. */
export function landnamCargoFromTakeon(
  cargo: Partial<Record<ResourceKey, number>>,
  requirements: Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [resource, amount] of Object.entries(cargo)) {
    if (!amount || amount <= 0) continue
    const mineral = TAKEON_TO_LANDNAM_MINERAL[resource]
    const required = mineral ? requirements[mineral] : undefined
    if (!mineral || required == null) continue
    result[mineral] = Math.min(required, (result[mineral] ?? 0) + amount)
  }
  return result
}

export interface ExposedOreMarker {
  id: string
  label: string
  mineral: string
  x: number
  y: number
  /** Stable visual anchor over the field; the engine receives x/y above. */
  left: string
  top: string
}

export interface DrillFinding {
  attempt: number
  markerId: string
  label: string
  kind: 'trace' | 'vein' | 'mine-site'
}

/**
 * A fresh rover run always has three nearby exposed outcrops. The engine owns
 * the terrain and route; Landnam owns the readable prospecting objective.
 */
export function exposedOreMarkers(spawn: { x: number; y: number }): ExposedOreMarker[] {
  const boundedCoordinate = (coordinate: number) => Math.max(1, Math.min(30, coordinate))
  return [
    { id: 'ore-a', label: 'OUTCROP A', mineral: 'iron', x: boundedCoordinate(spawn.x + 3), y: boundedCoordinate(spawn.y), left: '62%', top: '43%' },
    { id: 'ore-b', label: 'OUTCROP B', mineral: 'copper', x: boundedCoordinate(spawn.x - 2), y: boundedCoordinate(spawn.y + 2), left: '38%', top: '31%' },
    { id: 'ore-c', label: 'OUTCROP C', mineral: 'aluminium', x: boundedCoordinate(spawn.x + 1), y: boundedCoordinate(spawn.y - 3), left: '76%', top: '24%' },
  ]
}

/** The third drill is the deterministic discovery guarantee for SSL-471. */
export function drillFinding(attempt: number, marker: ExposedOreMarker): DrillFinding {
  if (attempt >= 3) return { attempt, markerId: marker.id, label: 'MINE SITE LOCATED · CLAIM STAKED', kind: 'mine-site' }
  if (attempt === 2) return { attempt, markerId: marker.id, label: 'VEIN CONFIRMED · ONE MORE DRILL WILL OPEN THE SITE', kind: 'vein' }
  return { attempt, markerId: marker.id, label: `TRACE ${marker.mineral.toUpperCase()} · CONTINUE PROSPECTING`, kind: 'trace' }
}

interface RoverMiningScreenProps {
  mission: Mission
  target: Target
  onComplete: (cargo: Record<string, number>) => void
  onBack: () => void
  /** Client display name, retained through the handoff for context only — Landnam still owns the contract. */
  clientName?: string
  rocketImageSrc?: string
  /** SSL-316 sandbox: when the host supplies the player and build actions, the field gains build mode. */
  player?: Player
  onFieldBuild?: (field: FieldIdentity, structure: FieldBuildInput) => boolean
  onFieldDemolish?: (targetId: string, structureId: string) => void
  onFabricate?: (targetId: string, recipeId: string) => boolean
  onSeedBiosphere?: (target: SurfaceTarget) => boolean
}

export default function RoverMiningScreen({
  mission, target, onComplete, onBack, clientName, rocketImageSrc,
  player, onFieldBuild, onFieldDemolish, onFabricate, onSeedBiosphere,
}: RoverMiningScreenProps) {
  const requirements = useMemo(() => roverCargoRequirements(mission, target), [mission, target])
  const rover = useMemo(() => defaultSpec(), [])
  const bodyId = useMemo(() => takeonBodyForTarget(target), [target])
  const missionId = useMemo(() => `landnam-rover-${mission.id}-${target.id}`, [mission.id, target.id])
  const seed = useMemo(() => stableSeed(`${mission.id}:${target.id}:takeon`), [mission.id, target.id])
  const [cargo, setCargo] = useState<Record<string, number>>({})
  const [routeSteps, setRouteSteps] = useState(0)
  const [takeonReady, setTakeonReady] = useState(false)
  const [deployed, setDeployed] = useState(false)
  const [buildMode, setBuildMode] = useState(false)
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)')
    const sync = () => setNarrow(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])
  const [fieldNotice, setFieldNotice] = useState<string | null>(null)
  const [markers, setMarkers] = useState<ExposedOreMarker[]>([])
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null)
  const [drillings, setDrillings] = useState<DrillFinding[]>([])
  const [mineSite, setMineSite] = useState<ExposedOreMarker | null>(null)
  const [constructionStarted, setConstructionStarted] = useState(false)
  const takeonHandle = useRef<TakeOnMountHandle | null>(null)
  const fieldIdentity = useMemo<FieldIdentity>(() => ({ targetId: target.id }), [target.id])
  const lifeStage = lifeStageForTarget(target, player?.biosphereSeeds?.[target.id])
  const sandboxEnabled = !!player && !!onFieldBuild
  const selectedMarker = markers.find(marker => marker.id === selectedMarkerId) ?? null

  const handleTakeonEvent = useCallback((event: TakeonHostEvent) => {
    if (event.type === 'built') {
      if (!onFieldBuild) return
      const s = event.payload.structure
      const funded = onFieldBuild(fieldIdentity, { id: s.id, type: s.type, x: s.pos.x, y: s.pos.y, facing: s.facing ?? 0 })
      if (!funded) {
        takeonHandle.current?.demolish(s.id)
        setFieldNotice('Structure removed: it could not be funded from your stash.')
      } else {
        setFieldNotice(null)
      }
      return
    }
    if (event.type === 'demolished') {
      onFieldDemolish?.(fieldIdentity.targetId, event.payload.id)
      return
    }
    if (event.type === 'buildFailed') {
      setFieldNotice(`Cannot build here: ${event.payload.reason}.`)
      return
    }
    if (event.type !== 'mined' || !event.payload.resource) return
    const mineral = TAKEON_TO_LANDNAM_MINERAL[event.payload.resource]
    const required = mineral ? requirements[mineral] : undefined
    if (!mineral || required == null) return
    setCargo(previous => ({
      ...previous,
      [mineral]: Math.min(required, (previous[mineral] ?? 0) + event.payload.amount),
    }))
  }, [fieldIdentity, onFieldBuild, onFieldDemolish, requirements])

  const handleReady = useCallback((state: MissionState) => {
    setCargo(landnamCargoFromTakeon(state.rover.cargo, requirements))
    setMarkers(current => current.length > 0 ? current : exposedOreMarkers(state.rover.pos))
    setTakeonReady(true)
  }, [requirements])

  const handleRouteChange = useCallback((steps: number) => {
    setRouteSteps(steps)
  }, [])

  // Keep the full release journey deterministic in the development runner.
  // The real TakeOn interaction remains covered by the dedicated visual
  // review; this shortcut only supplies the contract-shaped cargo needed to
  // exercise the delivery and debrief legs in a bounded CI run.
  const handleDevSkip = useCallback(() => {
    onComplete(requirements)
  }, [onComplete, requirements])

  const beginDrill = useCallback(() => {
    if (!selectedMarker || mineSite) return
    const attempt = drillings.length + 1
    const finding = drillFinding(attempt, selectedMarker)
    takeonHandle.current?.orderMine(selectedMarker.x, selectedMarker.y)
    setRouteSteps(takeonHandle.current?.plannedRouteLength() ?? 0)
    setDrillings(previous => [...previous, finding])
    if (finding.kind === 'mine-site') setMineSite(selectedMarker)
    captureGameEvent('rover_exposed_ore_drilled', {
      target_id: target.id,
      marker_id: selectedMarker.id,
      drill_attempt: attempt,
      result: finding.kind,
    })
  }, [drillings.length, mineSite, selectedMarker, target.id])

  const selectMarker = useCallback((marker: ExposedOreMarker) => {
    setSelectedMarkerId(marker.id)
    takeonHandle.current?.orderMine(marker.x, marker.y)
    setRouteSteps(takeonHandle.current?.plannedRouteLength() ?? 0)
  }, [])

  return (
    <div className={`game-screen theme-blueprint ln-scene-takeon ${styles.screen}`} data-testid="rover-mining-screen">
      <main className={styles.content} data-ui-zone={UI_ZONES.screenContent}>
        <section className={styles.scenePanel} aria-label="TakeOn rover field" data-build-mode={buildMode && sandboxEnabled}>
          <TakeOnMount
            ref={takeonHandle}
            missionId={missionId}
            bodyId={bodyId}
            seed={seed}
            rover={rover}
            roverName="Mule Field Rover"
            target={target}
            lifeStage={lifeStage}
            onEvent={handleTakeonEvent}
            onReady={handleReady}
            onRouteChange={handleRouteChange}
            startView="iso"
            className={styles.takeonMount}
          />
          {deployed && <div className={styles.fieldHotbar} data-testid="rover-field-hotbar">
            <button type="button" onClick={onBack}>EXIT FIELD</button>
            <span>PROSPECTOR · {target.name.toUpperCase()}</span>
            <strong>{mineSite ? 'MINE SITE ACTIVE' : `${Math.max(0, 3 - drillings.length)} DRILLS TO GUARANTEED SITE`}</strong>
          </div>}
          {!deployed && (
            <div className={styles.landingHandoff} data-testid="deploy-surface-ops-handoff">
              {rocketImageSrc && <img src={rocketImageSrc} alt="Prospector rocket landed on the surface" />}
              <div>
                <span className={styles.eyebrow}>TOUCHDOWN · {target.name.toUpperCase()}</span>
                <h2>Deploy the Mule rover</h2>
                <p>The Prospector is your rocket. The Mule is the rover in its hold. Deploy it to drive across the visible terrain and drill the client order.</p>
                <button type="button" className={styles.primaryAction} onClick={() => { captureGameEvent('rover_deployed', { target_id: target.id }); setDeployed(true) }} data-testid="deploy-surface-ops-confirm">DEPLOY MULE ROVER</button>
              </div>
            </div>
          )}
          {deployed && (
            <div className={styles.controls} data-testid="rover-control-guide" data-route-steps={routeSteps}>
              <RoverDrivePad
                handle={takeonHandle}
                compact={buildMode || narrow}
                trailing={sandboxEnabled ? (
                  <button
                    type="button"
                    className={styles.buildToggle}
                    aria-pressed={buildMode}
                    onClick={() => setBuildMode(open => !open)}
                    data-testid="rover-build-mode-toggle"
                  >
                    {buildMode ? 'CLOSE BUILD' : 'BUILD'}
                  </button>
                ) : null}
              />
              <section className={styles.objectControls} data-testid="rover-object-controls">
                <span className={styles.eyebrow}>{selectedMarker ? `${selectedMarker.label} SELECTED` : 'SELECT EXPOSED ORE'}</span>
                <button
                  type="button"
                  className={styles.primaryAction}
                  disabled={!selectedMarker || !!mineSite || !takeonReady}
                  onClick={beginDrill}
                  data-testid="rover-drill-action"
                >
                  {mineSite ? 'MINE SITE OPEN' : 'DRILL EXPOSED ORE'}
                </button>
              </section>
            </div>
          )}
          {deployed && sandboxEnabled && buildMode && player && (
            <div className={styles.sandboxDock} data-testid="rover-sandbox-dock">
              <SandboxFieldControls
                player={player}
                handle={takeonHandle}
                target={target}
                targetId={target.id}
                lifeStage={lifeStage}
                notice={fieldNotice}
                onFabricate={onFabricate ? recipeId => onFabricate(target.id, recipeId) : undefined}
                onSeedBiosphere={onSeedBiosphere ? () => onSeedBiosphere(target) : undefined}
                onShare={snapshot => {
                  void shareFieldCreation(snapshot, target.name).then(result => setFieldNotice(result.message))
                }}
              />
            </div>
          )}
          {deployed && markers.map(marker => (
            <button
              key={marker.id}
              type="button"
              className={`${styles.oreMarker} ${selectedMarkerId === marker.id ? styles.oreMarkerSelected : ''} ${mineSite?.id === marker.id ? styles.oreMarkerClaimed : ''} ${(selectedMarkerId ? selectedMarkerId === marker.id : marker.id === markers[0]?.id) ? 'lock-on' : ''}`}
              style={{ left: marker.left, top: marker.top }}
              onClick={() => selectMarker(marker)}
              data-testid={`rover-ore-${marker.id}`}
              aria-pressed={selectedMarkerId === marker.id}
            >
              <i aria-hidden="true" />
              <span>{mineSite?.id === marker.id ? 'MINE SITE' : marker.label}</span>
            </button>
          ))}
          {deployed && mineSite && (
            <button
              type="button"
              className={styles.mineSiteControl}
              style={{ left: mineSite.left, top: mineSite.top }}
              onClick={() => {
                setConstructionStarted(true)
                captureGameEvent('rover_mine_site_construction_started', { target_id: target.id, marker_id: mineSite.id })
              }}
              data-testid="rover-mine-site-construction"
            >
              {constructionStarted ? 'FIRST MINE RIG · STARTED' : 'START FIRST MINE RIG'}
            </button>
          )}
        </section>

        {deployed && <aside className={styles.drillReadout} aria-label="Drill results" data-testid="rover-drill-readout">
          <div className={styles.readoutHeading}>
            <span className={styles.kicker}>DRILL RESULTS · {clientName ?? 'PROSPECTOR'}</span>
            <strong>{mineSite ? 'SITE LOCATED' : 'PROSPECTING'}</strong>
          </div>
          {drillings.length === 0 ? (
            <p>Select an exposed ore marker, drive into range, then use the drill. A mine site is guaranteed by drill three.</p>
          ) : (
            <ol>
              {drillings.map(finding => <li key={`${finding.markerId}-${finding.attempt}`} data-kind={finding.kind}>DRILL {finding.attempt} · {finding.label}</li>)}
            </ol>
          )}
          {mineSite && (
            <p className={styles.mineSiteStatus}>{constructionStarted ? 'FIRST MINE RIG IS STAKED ON THE FIELD.' : 'SELECT THE MINE SITE ON THE FIELD TO START THE FIRST RIG.'}</p>
          )}
          <button type="button" className={styles.primaryAction} disabled={!constructionStarted} onClick={() => { captureGameEvent('rover_returned_to_ship', { target_id: target.id }); onComplete(cargo) }} data-testid="rover-return-to-ship">RETURN PROSPECTOR</button>
        </aside>}
      </main>

      {process.env.NODE_ENV === 'development' && (
        <button
          data-testid="dev-skip-rover-mining-btn"
          onClick={handleDevSkip}
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 999,
            padding: '3px 8px',
            background: 'var(--ln-bp-paper)',
            border: '1px solid var(--ln-bp-green)',
            borderRadius: 6,
            color: 'var(--ln-bp-green)',
            fontFamily: 'var(--ln-font-mono)',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.12em',
            cursor: 'pointer',
            opacity: 0.8,
          }}
        >
          SKIP SURFACE OPS
        </button>
      )}
    </div>
  )
}
