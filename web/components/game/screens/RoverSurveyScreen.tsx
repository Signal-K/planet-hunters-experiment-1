'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { defaultSpec } from '@takeon/engine'
import type { Mission, SurfaceTarget, Target } from '@/lib/data'
import { lifeStageForTarget } from '@/lib/data'
import { formatCurrency } from '@/lib/format'
import type { Player } from '@/lib/game-types'
import { UI_ZONES } from '@/lib/ui-zones'
import { openSettings } from '@/lib/mining/openChrome'
import { captureGameEvent } from '@/lib/posthog'
import type { TakeonHostEvent } from '@/lib/takeon/events'
import TakeOnMount, { type TakeOnMountHandle } from '@/components/takeon/TakeOnMount'
import { HubClockWidget } from '@/components/game/hub/HubClockWidget'
import { DockWordButton } from '@/components/game/hub/BaseDock'
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

/** Stock Takeon scout with the catalog deep radar, so a survey can use the engine scan. */
export function surveyRoverSpec() {
  return { ...defaultSpec(), modules: ['tool-scoop', 'scan-deep'] }
}

interface LoggedObservation {
  id: string
  name: string
}

interface RoverSurveyScreenProps {
  mission: Mission
  target: Target
  onComplete: () => void
  onBack: () => void
  rocketImageSrc?: string
  player?: Player
}

const ORIONIDS_ROVER_FORMATION_GOAL = 3

/** Takeon's own field, full screen. The rover surveys; it does not extract contract cargo. */
export default function RoverSurveyScreen({ mission, target, onComplete, onBack, player }: RoverSurveyScreenProps) {
  const rover = useMemo(() => surveyRoverSpec(), [])
  const bodyId = useMemo(() => takeonBodyForTarget(target), [target])
  const missionId = useMemo(() => `landnam-rover-survey-${mission.id}-${target.id}`, [mission.id, target.id])
  const seed = useMemo(() => stableSeed(`${mission.id}:${target.id}:takeon`), [mission.id, target.id])
  const lifeStage = lifeStageForTarget(target, undefined)
  const takeonHandle = useRef<TakeOnMountHandle | null>(null)
  const loggedRef = useRef<LoggedObservation[]>([])
  const [ready, setReady] = useState(false)
  const [logged, setLogged] = useState<LoggedObservation[]>([])
  const [clearSweep, setClearSweep] = useState<'range' | 'seen' | null>(null)
  loggedRef.current = logged
  // The Orionids survey asks for three different formations, so the rover has to drive between them (about a minute).
  const orionidsSurvey = mission.id === 'self-directed-orionids-surface-research'
  const goal = orionidsSurvey ? ORIONIDS_ROVER_FORMATION_GOAL : 1
  const done = logged.length >= goal

  const handleTakeonEvent = useCallback((event: TakeonHostEvent) => {
    if (event.type !== 'scan' || loggedRef.current.length >= goal) return
    if (event.payload.found.length === 0) {
      setClearSweep('range')
      return
    }
    const found = event.payload.found.find(f => !loggedRef.current.some(o => o.id === f.id))
    if (!found) {
      setClearSweep('seen')
      return
    }
    const observation = { id: found.id, name: found.name }
    setLogged(list => [...list, observation])
    setClearSweep(null)
    captureGameEvent('rover_outcrop_observed', { target_id: target.id, outcrop_id: found.id, mineral: found.type, mission_id: mission.id })
  }, [mission.id, target.id, goal])

  const scan = useCallback(() => {
    if (!ready || loggedRef.current.length >= goal) return
    takeonHandle.current?.scan()
  }, [ready, goal])

  const latest = logged[logged.length - 1]
  const status = done
    ? `OBSERVATION LOGGED · ${latest.name}`
    : clearSweep === 'seen'
      ? 'Already logged. Drive to a different formation and scan.'
      : clearSweep === 'range'
        ? 'Scanner range is clear. Drive closer and scan again.'
        : latest
          ? `LOGGED ${logged.length} OF ${goal} · ${latest.name}. Find the next formation.`
          : 'Drive the field. Scan when a formation is in range.'

  return (
    <div className={`game-screen theme-blueprint ln-scene-takeon ${styles.screen}`} data-testid="rover-survey-screen">
      <div className={styles.world} data-ui-zone={UI_ZONES.screenContent}>
        <TakeOnMount
          ref={takeonHandle}
          missionId={missionId}
          bodyId={bodyId}
          seed={seed}
          rover={rover}
          roverName="Mule Field Rover"
          target={target}
          lifeStage={lifeStage}
          startView="iso"
          onEvent={handleTakeonEvent}
          onReady={() => setReady(true)}
          className={styles.takeon}
        />
      </div>
      {mission.id === 'self-directed-orionids-surface-research' && (
        <div className={styles.eventBrief} data-testid="orionids-rover-brief">
          <span>ORIONIDS RESEARCH · FIELD ROVER DEPLOYED</span>
          <strong>Scan {goal} rock formations on {target.name}</strong>
          <small>Drive until one is in range, then scan. {logged.length} of {goal} logged. They are added to the community meteor record.</small>
        </div>
      )}
      <div className={styles.chrome}>
        <button type="button" className={styles.cog} data-testid="settings-button" aria-label="Settings" onClick={openSettings}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
        <div className={styles.clock}><HubClockWidget /></div>
        <div className={styles.chips}>
          <span className="scene-chip" data-testid="rover-francs-chip">{formatCurrency(player?.francs ?? 0, { compact: true })}</span>
          <span className="scene-chip" aria-label="Cargo" data-testid="rover-cargo-chip">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </span>
        </div>
        <div className={styles.hud}>
          <p className={styles.readout} data-testid="rover-survey-readout">{status}</p>
          <nav className={`scene-dock ${styles.dock}`} aria-label="Scene dock" data-testid="base-dock">
            <DockWordButton data-testid="rover-scan" disabled={!ready || done} onClick={scan}>Scan</DockWordButton>
            <span className="scene-dock-rule" aria-hidden="true" />
            <DockWordButton data-testid="hub-btn" onClick={onBack}>Hub</DockWordButton>
            <span className="scene-dock-rule" aria-hidden="true" />
            <DockWordButton data-testid="rover-continue-to-laser" disabled={!done} onClick={() => { captureGameEvent('rover_survey_complete', { target_id: target.id }); onComplete() }}>{mission.id === 'self-directed-orionids-surface-research' ? 'Log' : 'Laser'}</DockWordButton>
          </nav>
        </div>
      </div>
    </div>
  )
}
