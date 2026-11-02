'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaultSpec } from '@takeon/engine'
import type { Mission, SurfaceTarget, Target } from '@/lib/data'
import { lifeStageForTarget } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import { UI_ZONES } from '@/lib/ui-zones'
import { openSettings } from '@/lib/mining/openChrome'
import { captureGameEvent } from '@/lib/posthog'
import type { TakeonHostEvent } from '@/lib/takeon/events'
import { TAKEON_TO_LANDNAM_MINERAL } from '@/lib/takeon/minerals'
import TakeOnMount, { type TakeOnBlockedReason, type TakeOnMountHandle } from '@/components/takeon/TakeOnMount'
import { MiningActionButton, MiningBackButton, MiningDPad, MiningFireButton, MiningGuideMark } from './MiningControls'
import controlStyles from './MiningControls.module.css'
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
  /** Units the rocket's hold takes. The rover stops adding to its haul once it is full. */
  holdCapacity?: number
  /** Load the rover's haul aboard and fly it home (or on to the mission's delivery stop). */
  onLoadAndReturn?: (haul: Record<string, number>) => void
}

const ORIONIDS_ROVER_FORMATION_GOAL = 3

/** How many loose layers one DRILL press digs through looking for rock. */
const ROVER_DIG_LAYERS = 6

/** Takeon drive directions as seen on screen (0 right/SE, 1 down/SW, 2 left/NW, 3 up/NE). */
type DriveDir = 0 | 1 | 2 | 3

/** Field guide for the rover menu; the controls match laser mining (d-pad, round action button, second button). */
const ROVER_GUIDE = [
  { kind: 'scroll', label: 'Drive', desc: 'D-pad or arrow keys. Hold to keep driving.' },
  { kind: 'fire', label: 'Drill', desc: 'The big round button or E. One press digs through loose ground to the rock below. The ring is the battery.' },
  { kind: 'scan', label: 'Scan', desc: 'The second button or X. Logs a rock formation in range.' },
  { kind: 'return', label: 'Return', desc: 'Once something is in the hold, the button at the bottom loads it aboard and flies home.' },
]

// A refused drive used to be silent, so the arrow keys looked broken. Say why the rover did not move.
// "busy" is left out: a held arrow key repeats faster than one step takes, and every early repeat is refused as busy.
const BLOCKED_NOTE: Partial<Record<TakeOnBlockedReason, string>> = {
  cliff: 'Too steep to drive there. Try another way.',
  edge: 'That is the edge of the survey area.',
  battery: 'Battery flat. The rover cannot drive or drill.',
}

/** Takeon's own field, full screen. The rover surveys, and (SSL-718) drills the rock ahead into its hold. */
export default function RoverSurveyScreen({ mission, target, onComplete, onBack, holdCapacity, onLoadAndReturn }: RoverSurveyScreenProps) {
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
  // SSL-718: rover mining uses Takeon's drill. The haul is counted in Landnam mineral ids.
  const [haul, setHaul] = useState<Record<string, number>>({})
  const [mineNote, setMineNote] = useState<string | null>(null)
  const haulUnits = Object.values(haul).reduce((sum, n) => sum + n, 0)
  const haulUnitsRef = useRef(0)
  /** Regolith layers a single MINE press may still dig through before it gives up. */
  const digLayersRef = useRef(0)
  haulUnitsRef.current = haulUnits
  loggedRef.current = logged
  // The Orionids survey asks for three different formations, so the rover has to drive between them (about a minute).
  const orionidsSurvey = mission.id === 'self-directed-orionids-surface-research'
  const goal = orionidsSurvey ? ORIONIDS_ROVER_FORMATION_GOAL : 1
  const done = logged.length >= goal

  const handleTakeonEvent = useCallback((event: TakeonHostEvent) => {
    if (event.type === 'mined') {
      // Landnam counts the haul; Takeon's own small hold would otherwise fill with regolith and refuse to drill.
      takeonHandle.current?.emptyCargo()
      const mineral = event.payload.resource ? TAKEON_TO_LANDNAM_MINERAL[event.payload.resource] : undefined
      if (!mineral || event.payload.amount <= 0) {
        // One MINE press digs down through the loose layers on its own until it reaches rock.
        if (digLayersRef.current > 0) {
          digLayersRef.current -= 1
          setMineNote('Digging through loose regolith…')
          window.setTimeout(() => {
            if (!takeonHandle.current?.mine()) { digLayersRef.current = 0; setMineNote('Only loose regolith here. Try another spot.') }
          }, 160)
        } else setMineNote('Only loose regolith here. Try another spot.')
        return
      }
      digLayersRef.current = 0
      const room = holdCapacity === undefined ? event.payload.amount : Math.max(0, holdCapacity - haulUnitsRef.current)
      const amount = Math.min(event.payload.amount, room)
      if (amount <= 0) { setMineNote('Hold full. Load it aboard and return.'); return }
      setHaul(current => ({ ...current, [mineral]: (current[mineral] ?? 0) + amount }))
      setMineNote(`Mined +${amount} ${mineral[0].toUpperCase()}${mineral.slice(1)}${amount < event.payload.amount ? '. Hold full.' : ''}`)
      captureGameEvent('rover_mined', { target_id: target.id, mineral, amount, mission_id: mission.id })
      return
    }
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
  }, [mission.id, target.id, goal, holdCapacity])

  const scan = useCallback(() => {
    if (!ready || loggedRef.current.length >= goal) return
    setMineNote(null)
    takeonHandle.current?.scan()
  }, [ready, goal])

  useEffect(() => {
    if (!ready) return
    takeonHandle.current?.emptyCargo()
    return takeonHandle.current?.onBlocked(reason => { const note = BLOCKED_NOTE[reason]; if (note) setMineNote(note) })
  }, [ready])

  const mine = useCallback(() => {
    if (!ready) return
    digLayersRef.current = ROVER_DIG_LAYERS
    if (!takeonHandle.current?.mine()) { digLayersRef.current = 0; setMineNote('Nothing to drill here. Drive onto open ground and try again.') }
  }, [ready])

  const [menuOpen, setMenuOpen] = useState(false)
  const [battery, setBattery] = useState(1)
  const batteryPct = Math.round(battery * 100)
  const driveDirRef = useRef<DriveDir | null>(null)
  const drive = useCallback((dir: DriveDir) => {
    driveDirRef.current = dir
    takeonHandle.current?.move(dir)
  }, [])
  const stopDrive = useCallback(() => { driveDirRef.current = null }, [])
  // A held d-pad keeps driving (Takeon's 90 ms step rate), and the battery ring follows the rover.
  useEffect(() => {
    if (!ready) return
    const id = window.setInterval(() => {
      const dir = driveDirRef.current
      if (dir !== null) takeonHandle.current?.move(dir)
      const pose = takeonHandle.current?.rover()
      if (pose) setBattery(b => (Math.abs(b - pose.battery) >= 0.01 ? pose.battery : b))
    }, 90)
    return () => window.clearInterval(id)
  }, [ready])

  const canReturn = !!onLoadAndReturn && haulUnits > 0 && !orionidsSurvey
  const progressAction: 'return' | 'continue' | null = canReturn ? 'return' : done ? 'continue' : null
  const progressLabel = orionidsSurvey
    ? (done ? 'Formations logged · Log' : `Formations ${logged.length}/${goal}`)
    : canReturn ? `Hold ${haulUnits}${holdCapacity ? `/${holdCapacity}` : ''} · Return`
    : done ? 'Survey logged · Laser'
    : `Hold ${haulUnits}${holdCapacity ? `/${holdCapacity}` : ''}`
  const onProgress = () => {
    if (progressAction === 'return') {
      captureGameEvent('rover_haul_loaded', { target_id: target.id, units: haulUnits })
      onLoadAndReturn?.(haul)
    } else if (progressAction === 'continue') {
      captureGameEvent('rover_survey_complete', { target_id: target.id })
      onComplete()
    }
  }

  const latest = logged[logged.length - 1]
  const status = mineNote
    ? mineNote
    : done
    ? `OBSERVATION LOGGED · ${latest.name}`
    : clearSweep === 'seen'
      ? 'Already logged. Drive to a different formation and scan.'
      : clearSweep === 'range'
        ? 'Scanner range is clear. Drive closer and scan again.'
        : latest
          ? `LOGGED ${logged.length} OF ${goal} · ${latest.name}. Find the next formation.`
          : 'Drive to rock, then drill or scan.'

  return (
    <div className={`game-screen theme-blueprint mining-screen ln-scene-takeon ${styles.screen}`} data-testid="rover-survey-screen">
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
          onMineKey={mine}
          className={styles.takeon}
        />
      </div>
      {mission.id === 'self-directed-orionids-surface-research' && (
        <div className={styles.eventBrief} data-testid="orionids-rover-brief">
          <span>Orionids research</span>
          <strong>Scan {goal} rock formations on {target.name}</strong>
          <small>Drive close to one, then press SCAN. {logged.length} of {goal} logged for the community record.</small>
        </div>
      )}
      {/* Same controls as laser mining (SSL-708): Menu top-left, d-pad bottom-left, round DRILL bottom-right, SCAN beside it. */}
      <MiningBackButton open={menuOpen} onClick={() => setMenuOpen(o => !o)} />
      {/* SSL-730 drawing 3: a round gauge top-left beside Menu. The rover runs on battery, so that is what it reads. */}
      <div
        className={styles.gauge}
        data-testid="rover-battery"
        data-low={batteryPct <= 20 ? 'true' : undefined}
        role="meter"
        aria-label="Battery"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={batteryPct}
        style={{ '--charge': `${batteryPct}%` } as React.CSSProperties}
      >
        <span className={styles.gaugeDial} aria-hidden="true"><b>{batteryPct}</b></span>
        <span className={styles.gaugeLabel}>Battery</span>
      </div>
      {menuOpen && (
        <div className="mining-guide-dock" role="region" aria-label="Mission menu" data-testid="rover-menu">
          <div className="mining-guide-top">
            <div className="mining-menu-head">
              <span className="mining-menu-eyebrow">{orionidsSurvey ? 'Orionids research' : 'Rover'}</span>
              <strong>{mission.title}</strong>
              <span>{target.name} · {orionidsSurvey ? `${logged.length} of ${goal} logged` : `${haulUnits} in the hold`} · Battery {batteryPct}%</span>
            </div>
            <button type="button" className="mining-guide-x" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path d="M4 4 L14 14 M14 4 L4 14" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </div>
          <div className="mining-guide-actions">
            <div className="mining-guide-column">
              <button type="button" className="mining-guide-close" data-testid="rover-resume-btn" onClick={() => setMenuOpen(false)}>Resume</button>
              <button type="button" className="mining-guide-close" data-testid="hub-btn" onClick={() => { setMenuOpen(false); onBack() }}>Return to hub</button>
              <button type="button" className="mining-guide-close" data-testid="settings-button" onClick={() => { setMenuOpen(false); openSettings() }}>Settings</button>
            </div>
          </div>
          <div className="mining-guide-scroll">
            <div className="mining-guide-column">
              <span className="mining-menu-eyebrow">How to play</span>
              {ROVER_GUIDE.map(item => (
                <article key={item.label} className="mining-guide-card">
                  <MiningGuideMark kind={item.kind} />
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.desc}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className={styles.controls} data-testid="rover-controls">
        <MiningDPad
          disabled={!ready}
          labels={{ up: 'Drive north', down: 'Drive south', left: 'Drive west', right: 'Drive east' }}
          onAltitude={d => (d === 0 ? stopDrive() : drive(d < 0 ? 3 : 1))}
          onSpeed={d => (d === 0 ? stopDrive() : drive(d < 0 ? 2 : 0))}
        />
        <button
          type="button"
          className={`${controlStyles.progress} ${styles.hold}`}
          data-testid={progressAction === 'return' ? 'rover-load-return' : progressAction === 'continue' ? 'rover-continue-to-laser' : 'rover-progress'}
          data-ready={progressAction ? true : undefined}
          disabled={!progressAction}
          onClick={onProgress}
        >
          <span data-testid="rover-survey-readout">{progressLabel}</span>
          <span className={controlStyles.progressCue}>{status}</span>
        </button>
        <MiningActionButton
          action="scan"
          label="Scan"
          keyLabel="X"
          ready={false}
          pressed={false}
          disabled={!ready || done}
          onPress={scan}
          testId="rover-scan"
        />
        <MiningFireButton
          charges={batteryPct}
          max={100}
          charging={false}
          firing={false}
          disabled={!ready}
          label="Drill"
          countText={`${batteryPct}%`}
          ariaLabel={`Drill, battery ${batteryPct}%`}
          testId="rover-mine"
          onPress={mine}
          onRelease={() => {}}
          onKeyFire={mine}
        />
      </div>
    </div>
  )
}
