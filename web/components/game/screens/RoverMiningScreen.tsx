'use client'

import { useCallback, useMemo, useState } from 'react'
import { defaultSpec, type MissionState, type ResourceKey } from '@takeon/engine'
import type { Mission, Target } from '@/lib/data'
import { MINERAL_META } from '@/lib/data'
import { UI_ZONES } from '@/lib/ui-zones'
import type { TakeonHostEvent } from '@/lib/takeon/events'
import { TAKEON_TO_LANDNAM_MINERAL } from '@/lib/takeon/minerals'
import TakeOnMount from '@/components/takeon/TakeOnMount'
import TopBar from '@/components/ui/TopBar'
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

interface RoverMiningScreenProps {
  mission: Mission
  target: Target
  onComplete: (cargo: Record<string, number>) => void
  onBack: () => void
  /** Client display name, retained through the handoff for context only — Landnam still owns the contract. */
  clientName?: string
  rocketImageSrc?: string
}

export default function RoverMiningScreen({ mission, target, onComplete, onBack, clientName, rocketImageSrc }: RoverMiningScreenProps) {
  const requirements = useMemo(() => roverCargoRequirements(mission, target), [mission, target])
  const rover = useMemo(() => defaultSpec(), [])
  const bodyId = useMemo(() => takeonBodyForTarget(target), [target])
  const missionId = useMemo(() => `landnam-rover-${mission.id}-${target.id}`, [mission.id, target.id])
  const seed = useMemo(() => stableSeed(`${mission.id}:${target.id}:takeon`), [mission.id, target.id])
  const [cargo, setCargo] = useState<Record<string, number>>({})
  const [routeSteps, setRouteSteps] = useState(0)
  const [takeonReady, setTakeonReady] = useState(false)
  const [deployed, setDeployed] = useState(false)

  const cargoReady = Object.entries(requirements).every(
    ([mineral, amount]) => (cargo[mineral] ?? 0) >= amount
  )

  const handleTakeonEvent = useCallback((event: TakeonHostEvent) => {
    if (event.type !== 'mined' || !event.payload.resource) return
    const mineral = TAKEON_TO_LANDNAM_MINERAL[event.payload.resource]
    const required = mineral ? requirements[mineral] : undefined
    if (!mineral || required == null) return
    setCargo(previous => ({
      ...previous,
      [mineral]: Math.min(required, (previous[mineral] ?? 0) + event.payload.amount),
    }))
  }, [requirements])

  const handleReady = useCallback((state: MissionState) => {
    setCargo(landnamCargoFromTakeon(state.rover.cargo, requirements))
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

  const status = !deployed
    ? 'AWAITING ROVER DEPLOYMENT'
    : !takeonReady
      ? 'CONNECTING TO SURFACE SIM'
      : cargoReady
        ? 'MISSION CARGO READY'
        : 'ROVER ACTIVE · MINE THE ORDER'

  return (
    <div className={`game-screen theme-deep ln-scene-takeon ${styles.screen}`} data-testid="rover-mining-screen">
      <TopBar eyebrow={`SURFACE OPS · ${target.name.toUpperCase()}`} title="Field Rover" onBack={onBack} />

      <main className={styles.content} data-ui-zone={UI_ZONES.screenContent}>
        <section className={styles.scenePanel} aria-label="TakeOn rover field">
          <TakeOnMount
            missionId={missionId}
            bodyId={bodyId}
            seed={seed}
            rover={rover}
            roverName="Mule Field Rover"
            onEvent={handleTakeonEvent}
            onReady={handleReady}
            onRouteChange={handleRouteChange}
            className={styles.takeonMount}
          />
          {!deployed && (
            <div className={styles.landingHandoff} data-testid="deploy-surface-ops-handoff">
              {rocketImageSrc && <img src={rocketImageSrc} alt="Prospector rocket landed on the surface" />}
              <div>
                <span className={styles.eyebrow}>TOUCHDOWN · {target.name.toUpperCase()}</span>
                <h2>Deploy the Mule rover</h2>
                <p>The Prospector is your rocket. The Mule is the rover in its hold. Deploy it to drive across the visible terrain and drill the client order.</p>
                <button type="button" className={styles.primaryAction} onClick={() => setDeployed(true)} data-testid="deploy-surface-ops-confirm">DEPLOY MULE ROVER</button>
              </div>
            </div>
          )}
          {deployed && (
            <div className={styles.controls} data-testid="rover-control-guide">
              <span><strong>MOVE</strong> · TAP TERRAIN</span>
              <span><strong>DRILL</strong> · STOP ON AN EXPOSED DEPOSIT</span>
              <span data-testid="rover-route-readout"><strong>ROUTE</strong> · {routeSteps > 0 ? `${routeSteps} SAFE STEPS` : 'NOT SET'}</span>
            </div>
          )}
        </section>

        <aside className={styles.hud} aria-label="Mission cargo order">
          <div className={styles.statusHeader}>
            <div><span className={styles.kicker}>{clientName ? `${clientName} · CLIENT ORDER` : 'MISSION ORDER'}</span><strong>{mission.title}</strong></div>
            <span className={styles.statusPill} data-ready={cargoReady}>{status}</span>
          </div>
          <div className={styles.orderList} data-testid="rover-cargo-order">
            {Object.entries(requirements).map(([mineral, amount]) => {
              const loaded = Math.min(amount, cargo[mineral] ?? 0)
              const meta = MINERAL_META[mineral]
              return <div className={styles.orderRow} key={mineral}><span className={styles.mineralIdentity}><span className={styles.mineralDot} style={{ background: meta?.color ?? 'var(--ln-text-muted)' }} />{meta?.name ?? mineral}</span><strong>{loaded} / {amount} U</strong></div>
            })}
          </div>
          <button type="button" className={styles.primaryAction} disabled={!takeonReady || !cargoReady} onClick={() => onComplete(cargo)} data-testid="rover-return-to-ship">RETURN MULE TO PROSPECTOR</button>
        </aside>
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
            fontSize: 10,
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
