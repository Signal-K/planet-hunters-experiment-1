'use client'

import { useEffect, useMemo, useState } from 'react'
import { GhostBtn, PrimaryBtn } from '@/components/ui/Button'
import AsteroidSkyPlot, { SKY_FIELD_LIMITS, eclipticLatitude } from '@/components/game/AsteroidSkyPlot'
import InstrumentViewport, { InstrumentAnswerRow, InstrumentDevDayBar, InstrumentKnob, InstrumentLamp, InstrumentStandbyViewport, InstrumentSwitch, type InstrumentReadoutRow } from '@/components/game/instrument-viewport/InstrumentViewport'
import type { InstrumentCommandResult, InstrumentView } from '@/lib/instrument-viewport/view'
import viewportStyles from '@/components/game/instrument-viewport/InstrumentViewport.module.css'
import type { AsteroidCandidate, AsteroidClassification, AsteroidVerdict } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import { fetchReviewableAsteroidCandidates } from '@/lib/asteroid-subjects'
import { sharedBackendMisconfigured } from '@/lib/pb-config'
import { asteroidFeedOnline, instrumentDigestDateKey, pickInstrumentInspectCandidate, unresolvedDeepSpaceInstrumentDigest } from '@/lib/systems/InstrumentFeedSystem'

interface AsteroidDiscoveryScreenProps {
  player: Player
  inspectSubjectId?: string
  /** Fixed record supplied only by the named visual dev preset. */
  visualCandidate?: AsteroidCandidate
  onBack: () => void
  onLaunchTelescope: () => void
  onSubmit: (candidateId: string, verdict: AsteroidVerdict) => void
}

/** Widest ecliptic offset the OFFSET knob can log, in degrees. */
const OFFSET_MAX = 60
const signed = (n: number, digits = 0) => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}°`

const VERDICT_ACTIONS: Array<{ id: AsteroidVerdict; label: string }> = [
  { id: 'likely_real', label: 'Flag Likely Real' },
  { id: 'likely_artifact', label: 'Mark Artifact' },
  { id: 'unsure', label: 'Skip' },
]

export default function AsteroidDiscoveryScreen({ player, inspectSubjectId, visualCandidate, onBack, onLaunchTelescope, onSubmit }: AsteroidDiscoveryScreenProps) {
  const classifications = useMemo(() => player.asteroidClassifications ?? {}, [player.asteroidClassifications])
  const [candidate, setCandidate] = useState<AsteroidCandidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [devDayOffset, setDevDayOffset] = useState(0)
  const [retryToken, setRetryToken] = useState(0)
  // SSL-745: astrometry module — FIELD narrows the sky chart around the object; GRID and ECLIPTIC switch overlays.
  const [field, setField] = useState(1)
  // SSL-747: the player reads the object's offset from the ecliptic off the chart and dials it in.
  // Nothing computes it for them before they submit; the readout shows the true value afterwards.
  const [offsetRead, setOffsetRead] = useState<number | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [showEcliptic, setShowEcliptic] = useState(true)
  useEffect(() => { setField(1); setOffsetRead(null) }, [candidate?.id])

  useEffect(() => {
    if (visualCandidate) {
      setCandidate(visualCandidate)
      setLoadFailed(false)
      setLoading(false)
      return
    }
    if (!asteroidFeedOnline(player)) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadFailed(false)

    fetchReviewableAsteroidCandidates()
      .then(liveCandidates => {
        if (cancelled) return
        const todayDate = new Date()
        if (devDayOffset) todayDate.setDate(todayDate.getDate() + devDayOffset)
        const today = instrumentDigestDateKey(todayDate)
        const nextDaily = unresolvedDeepSpaceInstrumentDigest(liveCandidates, player, today)
        setCandidate(pickInstrumentInspectCandidate(nextDaily, inspectSubjectId))
      })
      .catch(error => {
        console.warn('[NEOCP] live candidate fetch failed', error)
        if (cancelled) return
        setCandidate(null)
        setLoadFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
    // Classifications stay out of the dependency list so a fresh submission
    // does not clear the candidate before the saved state can render (KES-116).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualCandidate, inspectSubjectId, player.freeOperations, player.deepSpaceTelescopeBuilt, player.placed, player.deepSpaceTelescopeLevel, devDayOffset, retryToken])

  const devBar = process.env.NODE_ENV === 'development' ? (
    <InstrumentDevDayBar testIdPrefix="neocp" offset={devDayOffset} onAdvance={() => setDevDayOffset(offset => offset + 1)} onReset={() => setDevDayOffset(0)} />
  ) : undefined

  if (!player.freeOperations) {
    return (
      <InstrumentStandbyViewport
        testId="asteroid-discovery-standby"
        sceneClassName="ln-scene-asteroid-discovery"
        eyebrow="LOCKED"
        title="Space Telescope"
        onBack={onBack}
        status="LOCKED"
        messageTitle="Free Operations Required"
        messageBody="NEOCP candidate downlinks unlock after the starter contract arc."
      />
    )
  }

  if (!asteroidFeedOnline(player)) {
    return (
      <InstrumentStandbyViewport
        testId="asteroid-discovery-standby"
        sceneClassName="ln-scene-asteroid-discovery"
        eyebrow="TELESCOPE REQUIRED"
        title="Space Telescope"
        onBack={onBack}
        status="NO TELESCOPE"
        messageTitle="Launch Space Telescope"
        messageBody="Deploy the Space Telescope from the Launchpad to start receiving NEOCP asteroid candidates."
        answers={<PrimaryBtn testId="launch-deep-space-telescope-btn" onClick={onLaunchTelescope}>PREPARE LAUNCH</PrimaryBtn>}
      />
    )
  }

  if (loading) {
    return (
      <InstrumentStandbyViewport
        testId="asteroid-discovery-standby"
        sceneClassName="ln-scene-asteroid-discovery"
        eyebrow="DAILY DOWNLINK"
        title="Space Telescope"
        onBack={onBack}
        status="ACQUIRING"
        messageTitle="Acquiring Signal"
        messageBody="Pulling the day's unresolved NEOCP candidate from the shared feed."
      />
    )
  }

  if (!candidate) {
    const misconfigured = loadFailed && sharedBackendMisconfigured()
    return (
      <InstrumentStandbyViewport
        testId="asteroid-discovery-standby"
        sceneClassName="ln-scene-asteroid-discovery"
        eyebrow="DAILY DOWNLINK"
        title="Space Telescope"
        onBack={onBack}
        status={loadFailed ? 'FEED OFFLINE' : 'EMPTY FEED'}
        messageTitle={misconfigured ? 'Feed Not Configured' : loadFailed ? 'Live Feed Unavailable' : 'No Reviewable Candidate'}
        messageBody={misconfigured
          ? 'This build has no shared backend configured. Reloading will not help — this needs a deploy fix.'
          : loadFailed
            ? 'The shared NEOCP candidate feed could not be reached. The viewport stays empty until a subject arrives.'
            : 'Every live NEOCP candidate is currently classified or has resolved off the feed.'}
        answers={loadFailed && !misconfigured ? (
          <GhostBtn onClick={() => setRetryToken(token => token + 1)}>Retry Downlink</GhostBtn>
        ) : undefined}
        devBar={devBar}
      />
    )
  }

  const classification: AsteroidClassification | undefined = classifications[candidate.id]

  const beta = eclipticLatitude(candidate.ra, candidate.decl)
  const fieldDeg = 180 / field
  const onCommand = (line: string, view: InstrumentView): InstrumentCommandResult | null => {
    const [verb, arg] = line.trim().toUpperCase().split(/\s+/)
    if (verb === 'FIELD') {
      const n = Number(arg)
      if (!Number.isFinite(n) || !arg) return { view, lines: [`> FIELD  ×${field.toFixed(1)} · ${fieldDeg.toFixed(0)}°`] }
      const next = Math.min(SKY_FIELD_LIMITS.max, Math.max(SKY_FIELD_LIMITS.min, n))
      setField(next)
      return { view, lines: [`> FIELD  ×${next.toFixed(1)} · ${(180 / next).toFixed(0)}°`] }
    }
    if (verb === 'GRID') { setShowGrid(on => !on); return { view, lines: [`> GRID  ${showGrid ? 'OFF' : 'ON'}`] } }
    if (verb === 'ECLIPTIC') { setShowEcliptic(on => !on); return { view, lines: [`> ECLIPTIC  ${showEcliptic ? 'OFF' : 'ON'}`] } }
    if (verb === 'OFFSET') {
      const n = Number(arg)
      if (!arg || !Number.isFinite(n)) return { view, lines: [`> OFFSET  ${offsetRead == null ? 'NOT READ' : signed(offsetRead)}`] }
      const next = Math.max(-OFFSET_MAX, Math.min(OFFSET_MAX, Math.round(n)))
      setOffsetRead(next)
      return { view, lines: [`> OFFSET  ${signed(next)} LOGGED`] }
    }
    return null
  }

  const verdictLabel: Record<AsteroidVerdict, string> = { likely_real: 'LIKELY REAL', likely_artifact: 'ARTIFACT', unsure: 'SKIPPED' }
  const readoutRows: InstrumentReadoutRow[] = [
    { label: 'Target', value: candidate.tempDesig },
    { label: 'Position', value: `${candidate.ra.toFixed(2)}h ${candidate.decl >= 0 ? '+' : ''}${candidate.decl.toFixed(2)}°` },
    { label: 'Your ecl offset', value: offsetRead == null ? 'NOT READ' : signed(offsetRead), testId: 'neocp-readout-offset' },
    { label: 'Field used', value: `×${field.toFixed(1)} · ${fieldDeg < 20 ? fieldDeg.toFixed(1) : fieldDeg.toFixed(0)}°` },
    { label: 'Verdict', value: classification ? verdictLabel[classification.verdict] : 'PENDING', testId: 'neocp-readout-verdict' },
    ...(classification ? [{ label: 'True ecl offset', value: `${signed(beta, 1)}`, testId: 'neocp-readout-beta' }] : []),
  ]

  const castVerdict = (id: AsteroidVerdict) => {
    if (classification) return
    onSubmit(candidate.id, id)
  }

  return (
    <InstrumentViewport
      instrumentId="deep-space-telescope"
      level={player.deepSpaceTelescopeLevel ?? 1}
      testId="asteroid-discovery-screen"
      sceneClassName="ln-scene-asteroid-discovery"
      eyebrow="DEEP SPACE · NEO WATCH"
      title={candidate.tempDesig}
      onBack={onBack}
      status={classification ? 'CLASSIFICATION SUBMITTED' : 'REVIEW'}
      devBar={devBar}
      onCommand={onCommand}
      module={{
        name: 'ASTROMETRY · AS-03',
        testId: 'neocp-astrometry',
        lights: <InstrumentLamp label="READ" on={offsetRead != null} tone="amber" />,
        content: <>
          <InstrumentKnob label="FIELD" testId="neocp-field" min={SKY_FIELD_LIMITS.min} max={SKY_FIELD_LIMITS.max} step={0.5} value={field} readout={`${fieldDeg < 20 ? fieldDeg.toFixed(1) : fieldDeg.toFixed(0)}°`} onChange={setField} />
          <InstrumentKnob label="OFFSET" testId="neocp-offset" min={-OFFSET_MAX} max={OFFSET_MAX} step={1} value={offsetRead ?? 0} readout={offsetRead == null ? 'READ' : signed(offsetRead)} onChange={value => !classification && setOffsetRead(Math.round(value))} />
          <InstrumentSwitch label="GRID" testId="neocp-grid" pressed={showGrid} onToggle={() => setShowGrid(on => !on)} />
          <InstrumentSwitch label="ECLIPTIC" testId="neocp-ecliptic" pressed={showEcliptic} onToggle={() => setShowEcliptic(on => !on)} />
        </>,
      }}
      readout={{ name: 'READOUT · YOUR RESULT', testId: 'neocp-result', rows: readoutRows }}
      caption={(
        <p className={viewportStyles.caption} data-testid="neocp-data-provenance">
          RA {candidate.ra.toFixed(4)}h · DEC {candidate.decl.toFixed(4)}°
        </p>
      )}
      viewportChrome={(
        <dl className={viewportStyles.readout} data-testid="neocp-readout" aria-label="Minor Planet Center data">
          <div data-tone={candidate.score >= 80 ? 'hot' : undefined}><dt>NEO score</dt><dd>{Math.round(candidate.score)}%</dd></div>
          <div><dt>Brightness V</dt><dd>{candidate.vMag.toFixed(1)}</dd></div>
          <div><dt>Size H</dt><dd>{candidate.hMag.toFixed(1)}</dd></div>
          <div><dt>Sightings</dt><dd>{candidate.nObs}</dd></div>
          <div><dt>Arc</dt><dd>{candidate.arcDays < 1 ? `${(candidate.arcDays * 24).toFixed(1)} h` : `${candidate.arcDays.toFixed(1)} d`}</dd></div>
          <div><dt>Last seen</dt><dd>{candidate.lastSeenDays.toFixed(1)} d ago</dd></div>
        </dl>
      )}
      viewport={(
        <AsteroidSkyPlot
          tempDesig={candidate.tempDesig}
          ra={candidate.ra}
          decl={candidate.decl}
          vMag={candidate.vMag}
          arcDays={candidate.arcDays}
          lastSeenDays={candidate.lastSeenDays}
          field={field}
          showGrid={showGrid}
          showEcliptic={showEcliptic}
        />
      )}
      answers={classification ? (
        <div className={viewportStyles.saved}>Classification submitted</div>
      ) : (
        <InstrumentAnswerRow
          actions={VERDICT_ACTIONS.map(action => ({
            id: action.id,
            label: action.label,
            testId: `neocp-verdict-${action.id}`,
            onClick: () => castVerdict(action.id),
          }))}
        />
      )}
      emptyToolLabel="No tool"
    />
  )
}
