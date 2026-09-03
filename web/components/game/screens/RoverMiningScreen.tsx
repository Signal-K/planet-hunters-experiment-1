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
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { PrimaryBtn } from '@/components/ui/Button'
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
}

export default function RoverMiningScreen({ mission, target, onComplete, onBack }: RoverMiningScreenProps) {
  const requirements = useMemo(() => roverCargoRequirements(mission, target), [mission, target])
  const rover = useMemo(() => defaultSpec(), [])
  const bodyId = useMemo(() => takeonBodyForTarget(target), [target])
  const missionId = useMemo(() => `landnam-rover-${mission.id}-${target.id}`, [mission.id, target.id])
  const seed = useMemo(() => stableSeed(`${mission.id}:${target.id}:takeon`), [mission.id, target.id])
  const [cargo, setCargo] = useState<Record<string, number>>({})
  const [routeSteps, setRouteSteps] = useState(0)
  const [takeonReady, setTakeonReady] = useState(false)

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

  const status = !takeonReady
    ? 'CONNECTING TO SURFACE SIM'
    : cargoReady
      ? 'MISSION CARGO READY'
      : 'ROVER ACTIVE · MINE THE ORDER'

  return (
    <div className={`game-screen theme-deep ln-scene-takeon ${styles.screen}`} data-testid="rover-mining-screen">
      <TopBar eyebrow={`SURFACE OPS · ${target.name.toUpperCase()}`} title="Rover Mining" onBack={onBack} />

      <main className={styles.content} data-ui-zone={UI_ZONES.screenContent}>
        <section className={styles.scenePanel} aria-label="TakeOn rover field">
          <div className={styles.sceneHeading}>
            <div>
              <span className={styles.eyebrow}>LIVE FIELD · {target.name.toUpperCase()}</span>
              <h2>Prospector surface run</h2>
            </div>
            <span className={styles.statusPill}>{takeonReady ? 'SYNCED' : 'LOADING'}</span>
          </div>
          <p className={styles.sceneCopy}>Tap terrain to plot a safe route. Stop on exposed deposits to drill the minerals listed in the client order.</p>
          <div className={styles.routeReadout} data-testid="rover-route-readout">
            <span>FIELD ROUTE</span>
            <strong>{routeSteps > 0 ? `${routeSteps} SAFE STEPS` : 'TAP TERRAIN TO PLAN'}</strong>
          </div>
          <TakeOnMount
            missionId={missionId}
            bodyId={bodyId}
            seed={seed}
            rover={rover}
            roverName="Mission Prospector"
            onEvent={handleTakeonEvent}
            onReady={handleReady}
            onRouteChange={handleRouteChange}
            className={styles.takeonMount}
          />
        </section>

        <aside className={styles.hud} aria-label="Mission cargo order">
          <Panel accent={cargoReady ? 'var(--ln-ok)' : 'var(--ln-cyan)'} style={{ padding: 16 }}>
            <div className={styles.statusHeader}>
              <div>
                <span className={styles.kicker}>CLIENT ORDER</span>
                <strong>{mission.title}</strong>
              </div>
              <StatusPill kind={cargoReady ? 'ok' : 'info'}>{status}</StatusPill>
            </div>

            <div className={styles.orderList} data-testid="rover-cargo-order">
              {Object.entries(requirements).map(([mineral, amount]) => {
                const loaded = Math.min(amount, cargo[mineral] ?? 0)
                const meta = MINERAL_META[mineral]
                return (
                  <div className={styles.orderRow} key={mineral}>
                    <span className={styles.mineralIdentity}>
                      <span className={styles.mineralDot} style={{ background: meta?.color ?? 'var(--ln-text-muted)' }} />
                      {meta?.name ?? mineral}
                    </span>
                    <strong>{loaded} / {amount} U</strong>
                  </div>
                )
              })}
            </div>

            <p className={styles.instruction}>
              TakeOn owns the rover, terrain and drill loop. Landnam records only the required contract minerals.
            </p>

            <PrimaryBtn
              kind="green"
              disabled={!takeonReady || !cargoReady}
              onClick={() => onComplete(cargo)}
              testId="rover-return-to-ship"
            >
              RETURN TO SHIP
            </PrimaryBtn>
          </Panel>
        </aside>
      </main>
    </div>
  )
}
