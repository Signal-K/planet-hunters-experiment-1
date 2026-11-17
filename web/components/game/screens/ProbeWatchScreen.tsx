'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MoonCameraView, { type CameraFlash } from './MoonCameraView'
import { SceneTop, ScenePill, SceneCard, SceneNote, SceneActions, ScenePrimary, SceneGhost } from '@/components/game/hud/SceneChrome'
import type { Player } from '@/lib/game-types'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { DEBRIS_PRESETS, skyEventNow } from '@/lib/data/sky-events'
import { bestSighting, cameraCovers, cameraOffset, PROBE_CAPTURE_MS, PROBE_HALF_VIEW, PROBE_RUN_SECONDS, probeImpacts, probeShowerAt, type ProbeImpact, type ProbeObservation } from '@/lib/probes/field-probe'
import styles from './ProbeWatchScreen.module.css'

interface Props { player: Player; onBack: () => void; onSave: (observation: ProbeObservation) => void }
type Capture = ProbeObservation & { expiresAt: number }

export default function ProbeWatchScreen({ player, onBack, onSave }: Props) {
  const [at] = useState(() => {
    const fixture = typeof window !== 'undefined' && isDevLauncherEnabled() && new URLSearchParams(window.location.search).get('preset')?.includes('ui-probe-watch')
    return fixture ? Date.parse(DEBRIS_PRESETS.find(p => p.eventId === 'leonids-2026')!.peakUtc) : skyEventNow(isDevLauncherEnabled())
  })
  const shower = useMemo(() => probeShowerAt(at), [at])
  const showerName = shower ? shower.eventId.split('-')[0].replace(/^./, c => c.toUpperCase()) : ''
  const [aim, setAim] = useState(0)
  const [seconds, setSeconds] = useState(PROBE_RUN_SECONDS)
  const [finished, setFinished] = useState(false)
  const [capture, setCapture] = useState<Capture | null>(null)
  const captureRef = useRef(capture)
  captureRef.current = capture
  const intro = shower
    ? `${showerName} meteors are striking the Moon. Watch the ground for a flash, turn the camera to it, then confirm the sighting.`
    : 'No shower is reaching the Moon today. Your previous sightings are still in the record.'
  const [message, setMessage] = useState(intro)
  const [runId, setRunId] = useState(() => `watch-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const sequence = useRef(0)
  const claimed = useRef(new Set<string>())
  const recent = useRef<Capture[]>([])
  const aimRef = useRef(aim)
  aimRef.current = aim
  const stopped = useRef(finished)
  stopped.current = finished
  const [flashes, setFlashes] = useState<CameraFlash[]>([])
  /** The last impact that landed outside the frame: which way to turn. */
  const [missed, setMissed] = useState<{ bearing: number; until: number } | null>(null)
  const impacts = useMemo(() => probeImpacts(runId, shower, at), [runId, shower, at])

  const land = useCallback((impact: ProbeImpact) => {
    if (!shower || stopped.current) return
    const now = Date.now()
    const id = `${runId}-${++sequence.current}`
    setFlashes(list => [...list, { id, bearing: impact.bearing, distance: impact.distance, bornAt: now }])
    recent.current.push({
      id, runId, eventId: shower.eventId, bodyId: 'moon',
      observedAt: now, bearing: impact.bearing, distance: impact.distance, pos: { ...impact.pos }, expiresAt: now + PROBE_CAPTURE_MS,
    })
    if (!cameraCovers(impact.bearing, aimRef.current)) setMissed({ bearing: impact.bearing, until: now + PROBE_CAPTURE_MS })
  }, [shower, runId])

  /** The sighting on offer: the newest impact whose dust is still up, inside the frame and not yet logged. */
  const frameUp = useCallback(() => {
    const now = Date.now()
    recent.current = recent.current.filter(c => c.expiresAt > now && !claimed.current.has(c.id))
    const inFrame = [...recent.current].reverse().find(c => cameraCovers(c.bearing, aimRef.current)) ?? null
    setCapture(current => current?.id === inFrame?.id ? current : inFrame)
    const outside = recent.current.find(c => !cameraCovers(c.bearing, aimRef.current))
    setMissed(inFrame || !outside ? null : { bearing: outside.bearing, until: outside.expiresAt })
    if (stopped.current) return
    if (inFrame) setMessage('Impact in frame. Confirm the sighting before the dust settles.')
    else if (outside) setMessage(`A flash at ${outside.bearing}°, outside the frame. Turn the camera to it before the dust settles.`)
  }, [])

  useEffect(() => {
    if (finished) return
    const started = Date.now()
    let next = 0
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - started
      while (next < impacts.length && impacts[next].atMs <= elapsed) land(impacts[next++])
      const left = Math.max(0, PROBE_RUN_SECONDS - Math.floor(elapsed / 1000))
      setSeconds(left)
      frameUp()
      if (left === 0) { stopped.current = true; setFinished(true); setCapture(null); setMissed(null) }
    }, 200)
    return () => clearInterval(timer)
  }, [finished, impacts, land, frameUp])

  const observations = Object.values(player.probeObservations ?? {})
  const run = observations.filter(o => o.runId === runId)
  const best = bestSighting(run)

  const confirm = () => {
    if (!capture || finished || capture.expiresAt <= Date.now() || !cameraCovers(capture.bearing, aim) || claimed.current.has(capture.id)) return
    claimed.current.add(capture.id)
    const { expiresAt: _expiresAt, ...observation } = capture
    onSave(observation)
    setCapture(null)
    setMessage('Sighting logged. Keep watching for the next flash.')
    frameUp()
  }
  const turn = (delta: number) => { aimRef.current = (aimRef.current + delta + 360) % 360; setAim(aimRef.current); frameUp() }
  const again = () => {
    sequence.current = 0
    setRunId(`watch-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    recent.current = []
    setFinished(false); setSeconds(PROBE_RUN_SECONDS); setCapture(null); setMissed(null); setFlashes([])
    setMessage(intro)
  }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (finished) return
      if (event.key === 'ArrowLeft') turn(-30)
      if (event.key === 'ArrowRight') turn(30)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [finished])
  const missedSide = missed && !capture ? (cameraOffset(missed.bearing, aim) < 0 ? 'left' : 'right') : null

  return <div className={styles.scene} data-testid="probe-watch-screen">
    <MoonCameraView className={styles.view} aim={aim} flashes={flashes} held={capture} />
    <div className={styles.frame} aria-label={`Camera on the Moon pointing ${aim} degrees, ${PROBE_HALF_VIEW * 2} degree field of view`}>
      <i /><i /><i /><i />
      <span className={styles.cameraLabel} data-testid="probe-camera-label">Moon camera · {aim}°</span>
    </div>
    {!finished && <>
      <button type="button" className={styles.pan} data-side="left" data-cue={missedSide === 'left' || undefined} aria-label="Turn the camera 30 degrees left" onClick={() => turn(-30)}>‹<span>{missedSide === 'left' ? 'Flash' : '30°'}</span></button>
      <button type="button" className={styles.pan} data-side="right" data-cue={missedSide === 'right' || undefined} aria-label="Turn the camera 30 degrees right" onClick={() => turn(30)}>›<span>{missedSide === 'right' ? 'Flash' : '30°'}</span></button>
    </>}
    <SceneTop onBack={onBack}><ScenePill>Moon · field camera</ScenePill><ScenePill align="end" syncAnchor>{finished ? 'Watch complete' : `${seconds}s`} · {run.length} logged</ScenePill></SceneTop>
    <SceneCard label={finished ? 'Watch results' : 'Camera readout'}>
      {finished ? <>
        <strong className={styles.title}>Watch complete</strong>
        <SceneNote>{run.length} {run.length === 1 ? 'impact' : 'impacts'} logged this watch.</SceneNote>
        <SceneNote>{best ? `Closest sighting: ${best.distance.toFixed(1)} km from the camera, bearing ${Math.round(best.bearing)}°.` : 'No sightings confirmed. Turn the camera toward a flash and confirm it during the next watch.'}</SceneNote>
      </> : <SceneNote>{message}</SceneNote>}
      <SceneNote>{observations.length} saved {observations.length === 1 ? 'sighting' : 'sightings'} · closest {bestSighting(observations)?.distance.toFixed(1) ?? '—'} km</SceneNote>
    </SceneCard>
    <SceneActions>{finished ? <><ScenePrimary onClick={again}>Watch again</ScenePrimary><SceneGhost onClick={onBack}>Back to Control Station</SceneGhost></> : <><ScenePrimary disabled={!capture} onClick={confirm}>Confirm sighting</ScenePrimary><SceneGhost onClick={() => { stopped.current = true; setFinished(true); setCapture(null); setMissed(null) }}>Finish watch</SceneGhost></>}</SceneActions>
  </div>
}
