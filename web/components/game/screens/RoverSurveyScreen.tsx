'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Mission, SurfaceTarget, Target } from '@/lib/data'
import { formatCurrency } from '@/lib/format'
import type { Player } from '@/lib/game-types'
import type { FieldBuildInput, FieldIdentity } from '@/lib/systems/SandboxSystem'
import { UI_ZONES } from '@/lib/ui-zones'
import { openSettings } from '@/lib/mining/openChrome'
import { captureGameEvent } from '@/lib/posthog'
import { HubClockWidget } from '@/components/game/hub/HubClockWidget'
import { DockArrowButton, DockWordButton } from '@/components/game/hub/BaseDock'
import type { DriveInput, SurveyOutcrop } from '@/lib/rover/terrain'
import RoverDriveCanvas from './RoverDriveCanvas'
import styles from './RoverSurveyScreen.module.css'

const TAKEON_BODY_BY_LANDNAM_TARGET: Record<string, string> = {
  bennu: 'bennu', itokawa: 'ironrock', vesta: 'ceres', ceres: 'ceres', eros: 'ironrock', psyche: 'ironrock', mars: 'mars', moon: 'moon', europa: 'europa', io: 'io',
}

export function takeonBodyForTarget(target: Pick<Target, 'id' | 'type'>): string {
  return TAKEON_BODY_BY_LANDNAM_TARGET[target.id] ?? (target.type === 'asteroid' ? 'ironrock' : 'mars')
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
export default function RoverSurveyScreen({ mission, target, onComplete, onBack, player }: RoverSurveyScreenProps) {
  const driveRef = useRef<DriveInput>(0)
  const [near, setNear] = useState<SurveyOutcrop | null>(null)
  const [logged, setLogged] = useState<SurveyOutcrop | null>(null)
  const held = useRef({ left: false, right: false, keyLeft: false, keyRight: false })
  const nearRef = useRef(near)
  const loggedRef = useRef(logged)
  nearRef.current = near
  loggedRef.current = logged

  const syncDrive = useCallback(() => {
    const left = held.current.left || held.current.keyLeft
    const right = held.current.right || held.current.keyRight
    driveRef.current = right === left ? 0 : right ? 1 : -1
  }, [])

  const scan = useCallback(() => {
    const found = nearRef.current
    if (!found || loggedRef.current) return
    setLogged(found)
    captureGameEvent('rover_outcrop_observed', { target_id: target.id, outcrop_id: found.id, mineral: found.mineral, mission_id: mission.id })
  }, [mission.id, target.id])

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.repeat) return
      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') held.current.keyLeft = true
      if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') held.current.keyRight = true
      if (event.key === ' ' || event.key === 'e' || event.key === 'E') {
        event.preventDefault()
        scan()
      }
      syncDrive()
    }
    const up = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') held.current.keyLeft = false
      if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') held.current.keyRight = false
      syncDrive()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [scan, syncDrive])

  const hold = (side: 'left' | 'right', on: boolean) => {
    held.current[side] = on
    syncDrive()
  }

  const status = logged
    ? `${logged.label} logged. The ship laser is ready for extraction.`
    : near
      ? `${near.label} beside the wheels. Scan it.`
      : 'Drive the ridge. Scan an outcrop when the wheels are beside it.'

  return (
    <div className={`game-screen theme-blueprint ${styles.screen}`} data-testid="rover-survey-screen">
      <div className={styles.world} data-ui-zone={UI_ZONES.screenContent}>
        <RoverDriveCanvas driveRef={driveRef} onPose={(_pose, next) => {
          setNear(current => current?.id === next?.id ? current : next)
        }} />
      </div>
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
          <p className={styles.readout} data-testid="rover-survey-readout">{logged ? 'OBSERVATION LOGGED' : status}</p>
          <nav className={`scene-dock ${styles.dock}`} aria-label="Scene dock" data-testid="base-dock">
            <DockArrowButton
              direction="left"
              data-testid="rover-drive-left"
              aria-label="Drive left"
              onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); hold('left', true) }}
              onPointerUp={() => hold('left', false)}
              onPointerCancel={() => hold('left', false)}
              onLostPointerCapture={() => hold('left', false)}
            />
            <DockWordButton data-testid="rover-scan" disabled={!near || !!logged} onClick={scan}>Scan</DockWordButton>
            <span className="scene-dock-rule" aria-hidden="true" />
            <DockWordButton data-testid="hub-btn" onClick={onBack}>Hub</DockWordButton>
            <span className="scene-dock-rule" aria-hidden="true" />
            <DockWordButton data-testid="rover-continue-to-laser" disabled={!logged} onClick={() => { captureGameEvent('rover_survey_complete', { target_id: target.id }); onComplete() }}>Laser</DockWordButton>
            <DockArrowButton
              direction="right"
              data-testid="rover-drive-right"
              aria-label="Drive right"
              onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); hold('right', true) }}
              onPointerUp={() => hold('right', false)}
              onPointerCancel={() => hold('right', false)}
              onLostPointerCapture={() => hold('right', false)}
            />
          </nav>
        </div>
      </div>
    </div>
  )
}
