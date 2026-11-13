'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getBody } from '@takeon/engine'
import TakeOnMount from '@/components/takeon/TakeOnMount'
import { SceneTop, ScenePill, SceneCard, SceneNote, SceneActions, ScenePrimary, SceneGhost } from '@/components/game/hud/SceneChrome'
import type { Player } from '@/lib/game-types'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { DEBRIS_PRESETS, skyEventNow } from '@/lib/data/sky-events'
import type { TakeonHostEvent } from '@/lib/takeon/events'
import { bestSighting, cameraCovers, cameraOffset, FIELD_PROBE, impactBearing, PROBE_CAPTURE_MS, PROBE_HALF_VIEW, PROBE_RUN_SECONDS, probeRatePerMinute, probeShowerAt, probeWeatherRates, type ProbeObservation } from '@/lib/probes/field-probe'
import styles from './ProbeWatchScreen.module.css'

interface Props { player: Player; onBack: () => void; onSave: (observation: ProbeObservation) => void }
type Capture = ProbeObservation & { expiresAt: number }

export default function ProbeWatchScreen({ player, onBack, onSave }: Props) {
  const [at] = useState(() => {
    const fixture = typeof window !== 'undefined' && isDevLauncherEnabled() && new URLSearchParams(window.location.search).get('preset')?.includes('ui-probe-watch')
    return fixture ? Date.parse(DEBRIS_PRESETS.find(p => p.eventId === 'leonids-2026')!.peakUtc) : skyEventNow(isDevLauncherEnabled())
  })
  const shower = useMemo(() => probeShowerAt(at), [at])
  const [aim, setAim] = useState(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [seconds, setSeconds] = useState(PROBE_RUN_SECONDS)
  const [finished, setFinished] = useState(false)
  const [capture, setCapture] = useState<Capture | null>(null)
  const captureRef = useRef(capture)
  captureRef.current = capture
  const [message, setMessage] = useState('Turn the camera. When an impact enters the frame, confirm it to save the sighting.')
  const [runId, setRunId] = useState(() => `watch-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const sequence = useRef(0)
  const origin = useRef({ x: 48, y: 48 })
  const claimed = useRef(new Set<string>())
  const aimRef = useRef(aim)
  aimRef.current = aim
  const stopped = useRef(finished)
  stopped.current = finished
  const startedAt = useRef<number | null>(null)
  const weather = useMemo(() => {
    const rate = shower ? probeRatePerMinute(shower, at) : 0
    return { rates: probeWeatherRates(getBody('moon')!, shower, at), initial: rate > 0 ? { type: 'meteor-shower' as const, duration: PROBE_RUN_SECONDS + 10, remaining: PROBE_RUN_SECONDS + 10, intensity: Math.min(1, rate / shower!.peakRatePerMinute) } : null }
  }, [shower, at])
  const observations = Object.values(player.probeObservations ?? {})
  const run = observations.filter(o => o.runId === runId)
  const best = bestSighting(run)

  useEffect(() => {
    if (!ready || finished) return
    startedAt.current ??= Date.now()
    const timer = window.setInterval(() => {
      const left = Math.max(0, PROBE_RUN_SECONDS - Math.floor((Date.now() - startedAt.current!) / 1000))
      setSeconds(left)
      setCapture(current => current && current.expiresAt <= Date.now() ? null : current)
      if (left === 0) { stopped.current = true; setFinished(true); setCapture(null) }
    }, 250)
    return () => clearInterval(timer)
  }, [ready, finished])

  const receive = useCallback((event: TakeonHostEvent) => {
    if (event.type !== 'meteorImpact' || !shower || stopped.current) return
    const bearing = impactBearing(event.payload.pos, origin.current)
    if (!cameraCovers(bearing, aimRef.current)) {
      if (!captureRef.current || captureRef.current.expiresAt <= Date.now()) setMessage(`Impact at ${Math.round(bearing)}°. Turn toward it to cover that part of the surface.`)
      return
    }
    const now = Date.now()
    setCapture(current => current && current.expiresAt > now ? current : ({
      id: `${runId}-${++sequence.current}`, runId, eventId: shower.eventId, bodyId: 'moon',
      observedAt: now, bearing, distance: event.payload.distance, pos: { ...event.payload.pos }, expiresAt: now + PROBE_CAPTURE_MS,
    }))
    setMessage('Impact in frame. Confirm the sighting while the camera buffer is open.')
  }, [shower, runId])
  const confirm = () => {
    if (!capture || finished || capture.expiresAt <= Date.now() || !cameraCovers(capture.bearing, aim) || claimed.current.has(capture.id)) return
    claimed.current.add(capture.id)
    const { expiresAt: _expiresAt, ...observation } = capture
    onSave(observation)
    setCapture(null)
    setMessage('Sighting logged. Keep watching for the next impact.')
  }
  const turn = (delta: number) => { setAim(value => (value + delta + 360) % 360); setCapture(null) }
  const again = () => {
    startedAt.current = null
    sequence.current = 0
    setRunId(`watch-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    setReady(false); setFinished(false); setSeconds(PROBE_RUN_SECONDS); setCapture(null)
    setMessage('A new watch. Aim the camera and confirm an impact in frame.')
  }
  const offset = capture ? cameraOffset(capture.bearing, aim) : 0

  return <div className={styles.scene} data-testid="probe-watch-screen">
    <div className={styles.ground}>
      <TakeOnMount key={runId} missionId={runId} bodyId="moon" rover={FIELD_PROBE} className={styles.field} readOnly startView="iso" fieldWeather={weather} onEvent={receive} onReady={state => { origin.current = { ...state.rover.pos }; setReady(true) }} onError={e => setError(e.message)} />
    </div>
    <div className={styles.camera} aria-label={`Camera pointing ${aim} degrees, ${PROBE_HALF_VIEW * 2} degree field of view`}>
      <span className={styles.cameraLabel}>LUNAR FIELD CAMERA · {aim}°</span>
      <svg viewBox="0 0 360 200" width="100%" height="100%" aria-hidden="true">
        <path d="M180 200 20 20H340Z" className={styles.cone} />
        <path d="M180 85V115M165 100H195" className={styles.cross} />
        {capture && <g className={styles.impact} transform={`translate(${180 + offset * 2.4} 85)`}><path d="M-25-30 0 0" /><circle r="12" /><circle r="3" /></g>}
        <g className={styles.probe} transform="translate(180 188)"><path d="m-15 10 8-15h14l8 15M-7-5v-12H7v12M0-17v-9l12-6" /><rect x="-7" y="-17" width="14" height="12" /></g>
      </svg>
      <div className={styles.pan}>
        <button type="button" disabled={finished} aria-label="Aim camera left" onClick={() => turn(-30)}>‹ 30°</button>
        <span>{aim}°</span>
        <button type="button" disabled={finished} aria-label="Aim camera right" onClick={() => turn(30)}>30° ›</button>
      </div>
    </div>
    <SceneTop onBack={onBack}><ScenePill>{shower?.eventId.split('-')[0] ?? 'No active shower'}</ScenePill><ScenePill align="end" syncAnchor>{finished ? 'WATCH COMPLETE' : `${seconds}s`} · {run.length} LOGGED</ScenePill></SceneTop>
    <SceneCard label={finished ? 'Watch results' : 'Camera readout'}>
      {finished ? <>
        <strong className={styles.title}>WATCH COMPLETE</strong>
        <SceneNote>{run.length} {run.length === 1 ? 'meteor' : 'meteors'} logged this watch.</SceneNote>
        <SceneNote>{best ? `Best sighting: ${best.distance.toFixed(1)} tiles away, bearing ${Math.round(best.bearing)}°.` : 'No sightings confirmed. Turn the camera toward an impact and confirm it during the next watch.'}</SceneNote>
      </> : <SceneNote>{error ? `Camera unavailable: ${error}` : !ready ? 'Connecting to the field camera…' : !shower ? 'No shower is active today. Your previous sightings are still in the record.' : message}</SceneNote>}
      <SceneNote>{observations.length} saved {observations.length === 1 ? 'sighting' : 'sightings'} · best {bestSighting(observations)?.distance.toFixed(1) ?? '—'} tiles</SceneNote>
    </SceneCard>
    <SceneActions>{finished ? <><ScenePrimary onClick={again}>WATCH AGAIN</ScenePrimary><SceneGhost onClick={onBack}>BACK TO CONTROL STATION</SceneGhost></> : <><ScenePrimary disabled={!capture || !ready || !!error} onClick={confirm}>CONFIRM SIGHTING</ScenePrimary><SceneGhost onClick={() => { stopped.current = true; setFinished(true); setCapture(null) }}>FINISH WATCH</SceneGhost></>}</SceneActions>
  </div>
}
