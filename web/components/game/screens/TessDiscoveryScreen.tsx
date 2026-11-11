'use client'

import { onboardingMissionDone } from '@/lib/systems/FlightPlanSystem'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useHelp } from '@/components/ui/useHelp'
import { GhostBtn, PrimaryBtn } from '@/components/ui/Button'
import ObservatoryChart from '@/components/game/ObservatoryChart'
import type { ConsensusReadout } from '@/lib/community/consensus'
import InstrumentViewport, { type InstrumentReadoutRow, InstrumentAnswerRow, InstrumentDevDayBar, InstrumentKnob, InstrumentLamp, InstrumentModuleKey, InstrumentStandbyViewport, InstrumentSwitch, InstrumentToolHint, type InstrumentQuickCommand } from '@/components/game/instrument-viewport/InstrumentViewport'
import { DEFAULT_LIGHTCURVE_CONTROLS, LIGHTCURVE_LIMITS, applyLightcurveCommand, lightcurveDisplay, measureDips, nextBin, type LightcurveControls } from '@/lib/instrument-viewport/lightcurve-controls'
import viewportStyles from '@/components/game/instrument-viewport/InstrumentViewport.module.css'
import { periodFromRanges, sectorWindows, tessCandidateToExoplanetTarget, tessLightcurvePoints, type Target, type TessCandidate, type TessClassification, type TessVerdict, type TransitRange } from '@/lib/data'
import type { InstrumentCommandResult, InstrumentView } from '@/lib/instrument-viewport/view'
import type { Player } from '@/lib/game-types'
import { captureGameEvent } from '@/lib/posthog'
import { fetchReviewableTessCandidates } from '@/lib/tess-subjects'
import { sharedBackendMisconfigured } from '@/lib/pb-config'
import { queueClassificationCapture, renderLightcurveCapture } from '@/lib/capture/classificationCapture'
import { TRAINING_ID_PREFIX } from '@/lib/visual-fixtures'
import { RESEARCH_XP_PER_FIRST_TESS_CLASSIFICATION, instrumentDigestDateKey, pickInstrumentInspectCandidate, unresolvedTransitInstrumentDigest } from '@/lib/systems/InstrumentFeedSystem'

interface TessDiscoveryScreenProps {
  player: Player
  inspectSubjectId?: string
  /** Fixed record supplied only by the named visual dev preset. */
  visualCandidate?: TessCandidate
  onBack: () => void
  onBuildStation: () => void
  onOpenProgram: () => void
  onSubmit: (subjectId: string, verdict: TessVerdict, ranges: TransitRange[], discoveredTarget?: Target) => void
  /** Set while a training try is active, so the help sheet can point at Menu > Training. */
  onReplayTraining?: () => void
  /** After the training verdict's result card: move on to the next try. */
  onTrainingContinue?: () => void
  /** SSL-746: share this finished readout, to ask for consensus or (when `reviewing`) to answer a review. */
  onShareReadout?: (subjectId: string, readout: ConsensusReadout) => void
  /** True when the player came here to do their own run on someone else's subject. */
  reviewing?: boolean
}

const TRAINING_RESULT: Record<TessVerdict, { status: string; title: string; body: string }> = {
  planet: {
    status: 'SUBMITTED · TRANSIT',
    title: 'Classification submitted: transit',
    body: 'You marked a repeating dip in a star\'s light: the shadow of a planet crossing it. Once your Space Telescope is in orbit, real candidates arrive here every day and your verdicts go to Exoplanet Hunters.',
  },
  not_planet: {
    status: 'SUBMITTED · NOISE',
    title: 'Classification submitted: noise',
    body: 'You ruled out a dip that is not a transit. Ruling out noise is half the job: real candidates arrive here every day once your Space Telescope is in orbit.',
  },
  unsure: {
    status: 'SKIPPED',
    title: 'Skipped',
    body: 'Skipping is fine when a curve is unclear. Real candidates arrive here every day once your Space Telescope is in orbit.',
  },
}

/** Readout rows kept on the simple console: whose star, what you marked, your verdict. */
const SIMPLE_READOUT = new Set(['Star', 'Marks', 'Verdict', 'Catalogue P'])

const VERDICT_ACTIONS: Array<{ id: TessVerdict; label: string; requiresMark: boolean }> = [
  { id: 'planet', label: 'Planet transit', requiresMark: true },
  { id: 'not_planet', label: 'Just noise', requiresMark: true },
  { id: 'unsure', label: 'Skip', requiresMark: false },
]

export default function TessDiscoveryScreen({ player, inspectSubjectId, visualCandidate, onBack, onOpenProgram, onSubmit, onReplayTraining, onTrainingContinue, onShareReadout, reviewing }: TessDiscoveryScreenProps) {
  const classifications = useMemo(() => player.tessClassifications ?? {}, [player.tessClassifications])
  // Liam, 2.11 ("too much going on, more of an interactive tutorial"): until the first classification the console is
  // just the light curve and the answers, and the first visit plays the read → mark → submit coach.
  const firstClassification = Object.keys(classifications).length === 0
  const help = useHelp('galaxy', { onReplayTraining, firstVisit: firstClassification || !onboardingMissionDone(player.flightPlan), firstVisitCoach: true })
  const [allControls, setAllControls] = useState(false)
  const [candidate, setCandidate] = useState<TessCandidate | null>(null)
  const [pool, setPool] = useState<TessCandidate[]>([])
  const [ranges, setRanges] = useState<TransitRange[]>([])
  const [sectorIndex, setSectorIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [devDayOffset, setDevDayOffset] = useState(0)
  const [retryToken, setRetryToken] = useState(0)
  const [needsMark, setNeedsMark] = useState(false)
  // Training verdict just cast: show what it earned before moving on (Liam, 31.10: Confirm Transit had no reward or feedback).
  const [trainingVerdict, setTrainingVerdict] = useState<TessVerdict | null>(null)
  // SSL-745: photometry module — time zoom, scan, bin and phase fold act on the data itself.
  const [lc, setLc] = useState<LightcurveControls>(DEFAULT_LIGHTCURVE_CONTROLS)
  const chartCaptureRef = useRef<(() => Promise<Blob | null>) | null>(null)
  useEffect(() => { setLc(DEFAULT_LIGHTCURVE_CONTROLS) }, [candidate?.id])

  useEffect(() => {
    if (visualCandidate) {
      setCandidate(visualCandidate)
      setPool([visualCandidate])
      setRanges([])
      setSectorIndex(0)
      setLoadFailed(false)
      setLoading(false)
      return
    }
    if (!player.freeOperations || !player.transitSatelliteLaunchedAt) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadFailed(false)

    fetchReviewableTessCandidates()
      .then(liveCandidates => {
        if (cancelled) return
        const todayDate = new Date()
        if (devDayOffset) todayDate.setDate(todayDate.getDate() + devDayOffset)
        const today = instrumentDigestDateKey(todayDate)
        const nextDaily = unresolvedTransitInstrumentDigest(liveCandidates, player, today)
        setPool(liveCandidates)
        setCandidate(pickInstrumentInspectCandidate(nextDaily, inspectSubjectId))
        setRanges([])
        setSectorIndex(0)
      })
      .catch(error => {
        if (cancelled) return
        captureGameEvent('tess_downlink_load_failed', { error: error instanceof Error ? error.message : String(error) })
        setPool([])
        setCandidate(null)
        setLoadFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
    // Do not refetch merely because this screen submitted a classification.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualCandidate, inspectSubjectId, player.freeOperations, player.transitSatelliteLaunchedAt, player.transitSatelliteLevel, player.satelliteTargetId, devDayOffset, retryToken])

  const classification: TessClassification | undefined = candidate && !candidate.id.startsWith(TRAINING_ID_PREFIX) ? classifications[candidate.id] : undefined
  const points = useMemo(() => candidate ? tessLightcurvePoints(candidate) : [], [candidate])
  const sectors = useMemo(() => candidate ? sectorWindows(points, candidate.sector) : [], [candidate, points])
  const activeSector = sectors[Math.min(sectorIndex, Math.max(0, sectors.length - 1))]
  const sectorPoints = activeSector?.points ?? points
  // SSL-744: the training hint sits on the deepest dip in this sector, as a share of the plot width.
  const dipShare = useMemo(() => {
    if (!sectorPoints.length) return 0.5
    const xs = sectorPoints.map(point => point.x)
    const xMin = Math.min(...xs), xMax = Math.max(...xs)
    if (xMax <= xMin) return 0.5
    // The transit nearest mid-sector, from the ephemeris; noise makes the single lowest point unreliable.
    const period = candidate?.periodDays ?? 0
    const epoch = candidate?.transitEpoch
    if (period > 0 && epoch != null) {
      const mid = (xMin + xMax) / 2
      const transit = epoch + Math.round((mid - epoch) / period) * period
      if (transit >= xMin && transit <= xMax) return (transit - xMin) / (xMax - xMin)
    }
    const deepest = sectorPoints.reduce((low, point) => point.y < low.y ? point : low, sectorPoints[0])
    return (deepest.x - xMin) / (xMax - xMin)
  }, [sectorPoints, candidate])
  const yDomain = useMemo<[number, number] | undefined>(() => {
    if (!points.length) return undefined
    const ys = points.map(point => point.y)
    return [Math.min(...ys), Math.max(...ys)]
  }, [points])

  const markedRanges = (candidate && !candidate.id.startsWith(TRAINING_ID_PREFIX) ? classifications[candidate.id]?.ranges : undefined) ?? ranges
  // Fold around the player's first marked dip, so a correct period stacks their marks on T0.
  const foldEpoch = markedRanges.length ? (markedRanges[0].x1 + markedRanges[0].x2) / 2 : (points[0]?.x ?? 0)
  const display = useMemo(() => lightcurveDisplay(sectorPoints, points, lc, foldEpoch), [sectorPoints, points, lc, foldEpoch])
  // SSL-747: the player's own measurements of their marks, for the readout. Never a grade.
  const measured = useMemo(() => measureDips(points, markedRanges), [points, markedRanges])

  const devBar = process.env.NODE_ENV === 'development' ? (
    <InstrumentDevDayBar testIdPrefix="tess" offset={devDayOffset} onAdvance={() => setDevDayOffset(offset => offset + 1)} onReset={() => setDevDayOffset(0)} />
  ) : undefined

  if (trainingVerdict) {
    const result = TRAINING_RESULT[trainingVerdict]
    return (
      <InstrumentStandbyViewport
        testId="tess-training-result"
        sceneClassName="ln-scene-tess-discovery"
        eyebrow="TRAINING · SCAN"
        title="Space Telescope"
        onBack={onBack}
        status={result.status}
        messageTitle={`${result.title} · +${RESEARCH_XP_PER_FIRST_TESS_CLASSIFICATION} research XP`}
        messageBody={result.body}
        answers={<InstrumentAnswerRow actions={[{ id: 'continue', label: 'Continue · Next: tune a rocket part', testId: 'tess-training-continue', primary: true, onClick: () => onTrainingContinue?.() }]} />}
      />
    )
  }

  if (!visualCandidate && !player.freeOperations) {
    return (
      <InstrumentStandbyViewport
        testId="tess-discovery-standby"
        sceneClassName="ln-scene-tess-discovery"
        eyebrow="LOCKED"
        title="Space Telescope"
        onBack={onBack}
        status="LOCKED"
        messageTitle="Free Operations Required"
        messageBody="TESS candidate downlinks unlock after the starter contract arc."
      />
    )
  }

  if (!visualCandidate && !player.transitSatelliteLaunchedAt) {
    return (
      <InstrumentStandbyViewport
        testId="tess-discovery-standby"
        sceneClassName="ln-scene-tess-discovery"
        eyebrow="TELESCOPE"
        title="Space Telescope"
        onBack={onBack}
        status="NO TELESCOPE"
        messageTitle="Launch Space Telescope"
        messageBody="Deploy your own telescope from the Program tab. Its daily data will downlink here after the flight."
        answers={<PrimaryBtn testId="open-transit-telescope-program-btn" onClick={onOpenProgram}>Open Program</PrimaryBtn>}
      />
    )
  }

  if (loading) {
    return (
      <InstrumentStandbyViewport
        testId="tess-discovery-standby"
        sceneClassName="ln-scene-tess-discovery"
        eyebrow="DAILY DOWNLINK"
        title="Space Telescope"
        onBack={onBack}
        status="ACQUIRING"
        messageTitle="Acquiring Signal"
        messageBody="Pulling the day's unresolved TESS transit anomaly from the shared feed."
      />
    )
  }

  if (!candidate) {
    const misconfigured = loadFailed && sharedBackendMisconfigured()
    return (
      <InstrumentStandbyViewport
        testId="tess-discovery-standby"
        sceneClassName="ln-scene-tess-discovery"
        eyebrow="DAILY DOWNLINK"
        title="Space Telescope"
        onBack={onBack}
        status={loadFailed ? 'FEED OFFLINE' : 'EMPTY FEED'}
        messageTitle={misconfigured ? 'Feed Not Configured' : loadFailed ? 'Live Feed Unavailable' : 'No Reviewable Anomaly'}
        messageBody={misconfigured
          ? 'This build has no shared backend configured. Reloading will not help — this needs a deploy fix.'
          : loadFailed
            ? 'The shared TESS subject feed could not be reached. The viewport stays empty until a subject arrives.'
            : 'Every live TESS transit subject is currently confirmed, rejected, or already resolved by consensus.'}
        answers={loadFailed && !misconfigured ? (
          <GhostBtn onClick={() => { captureGameEvent('tess_downlink_retry'); setRetryToken(token => token + 1) }}>Retry Downlink</GhostBtn>
        ) : undefined}
        devBar={devBar}
      />
    )
  }

  const castVerdict = (id: TessVerdict) => {
    if (classification) return
    // A verdict that needs a marked dip explains itself instead of sitting disabled and looking dead.
    if (VERDICT_ACTIONS.find(action => action.id === id)?.requiresMark && ranges.length === 0) { setNeedsMark(true); return }
    const measuredPeriod = periodFromRanges(ranges)
    if (candidate.id.startsWith(TRAINING_ID_PREFIX)) setTrainingVerdict(id)
    help.reportAction('submit')
    if (!candidate.id.startsWith(TRAINING_ID_PREFIX)) {
      // The full answer (every range at full width) with the light curve and the marked copy.
      const target = candidate
      const marked = ranges
      const title = `${/^TIC/i.test(target.ticId) ? target.ticId : `TIC ${target.ticId}`}${target.toi ? ` · TOI ${target.toi}` : ''} · ${target.host} · sector ${target.sector}`
      // The marked copy is the chart exactly as the player had it (view, bin,
      // marks); the plain copy is the whole light curve without marks.
      const onScreen = chartCaptureRef.current?.() ?? Promise.resolve(null)
      void Promise.all([renderLightcurveCapture(points, marked, title, id), onScreen]).then(([{ image, annotated: drawn }, shot]) => ({ image, annotated: shot ?? drawn })).then(({ image, annotated }) => queueClassificationCapture({
        kind: 'tess',
        subject: target.id,
        recordCollection: 'subject_classifications',
        annotations: { verdict: id, view: { span: lc.span, scan: lc.scan, bin: lc.bin, fold: lc.fold, xDomain: display.xDomain }, ranges: marked, measuredPeriodDays: measuredPeriod, dips: measured, candidate: target, lightcurvePoints: points },
        image,
        annotatedImage: annotated,
      }))
    }
    onSubmit(candidate.id, id, ranges, id === 'planet' ? tessCandidateToExoplanetTarget(candidate, measuredPeriod) : undefined)
  }

  const activeRanges = classification?.ranges ?? ranges
  const markCount = activeRanges.length
  // The simple console lasts through the first result too, so the lesson does not end in a wall of panels.
  const simpleEligible = firstClassification || (Object.keys(classifications).length === 1 && classification != null)
  const simpleConsole = simpleEligible && !allControls

  // SSL-747: a full readout of the player's result: their marks, what they measured from them,
  // the view they used and their verdict. The catalogue period only appears once they have submitted.
  const meanDepth = measured.dips.length ? measured.dips.reduce((sum, dip) => sum + dip.depthPpt, 0) / measured.dips.length : null
  const verdictLabel: Record<TessVerdict, string> = { planet: 'TRANSIT', not_planet: 'NOISE', unsure: 'SKIPPED' }
  // SSL-749: the target star's details sit on the readout, beside what the player measured from its light.
  const readoutRows: InstrumentReadoutRow[] = [
    { label: 'Star', value: `${candidate.host} · ${/^TIC/i.test(candidate.ticId) ? candidate.ticId : `TIC ${candidate.ticId}`}`, testId: 'tess-readout-star' },
    ...(candidate.starTeffK ? [{ label: 'Teff', value: `${Math.round(candidate.starTeffK).toLocaleString('en-US')} K`, testId: 'tess-readout-star-teff' }] : []),
    { label: 'Where', value: [candidate.constellation, candidate.distanceLy ? `${Math.round(candidate.distanceLy).toLocaleString('en-US')} LY` : null].filter(Boolean).join(' · ') || '—', testId: 'tess-readout-star-where' },
    { label: 'Sector', value: activeSector?.label ?? candidate.sector ?? '—' },
    { label: 'Marks', value: markCount ? String(markCount) : 'NONE · DRAG A DIP', testId: 'tess-readout-marks' },
    ...measured.dips.slice(0, 4).map((dip, index) => ({
      label: `Dip ${index + 1}`,
      value: `${dip.centre.toFixed(2)}d · ${dip.hours.toFixed(1)}h · ${dip.depthPpt.toFixed(2)}ppt`,
      testId: `tess-readout-dip-${index + 1}`,
    })),
    ...(measured.dips.length > 4 ? [{ label: 'More', value: `+${measured.dips.length - 4} DIPS` }] : []),
    { label: 'Gaps', value: measured.gaps.length ? measured.gaps.map(gap => `${gap.toFixed(2)}d`).join(' · ') : '—', testId: 'tess-readout-gaps' },
    { label: 'Depth', value: meanDepth != null ? `${meanDepth.toFixed(2)}ppt · R/R★ ${Math.sqrt(Math.max(0, meanDepth) / 1000).toFixed(3)}` : '—' },
    { label: 'Fold', value: lc.fold ? `P ${lc.period.toFixed(2)}d` : 'OFF', testId: 'tess-readout-fold' },
    { label: 'View', value: `${display.folded ? 'ALL SECTORS' : `${(display.xDomain[1] - display.xDomain[0]).toFixed(1)}d`} · BIN ×${lc.bin}` },
    { label: 'Verdict', value: classification ? verdictLabel[classification.verdict] : 'PENDING', testId: 'tess-readout-verdict' },
    ...(classification && candidate.periodDays ? [{ label: 'Catalogue P', value: `${candidate.periodDays.toFixed(2)}d`, testId: 'tess-readout-catalogue' }] : []),
  ]

  // SSL-749: the downlink's own keys, so the terminal shows what it does without typing.
  const quickCommands: InstrumentQuickCommand[] = [
    { label: lc.fold ? 'FOLD OFF' : 'FOLD', line: lc.fold ? 'FOLD OFF' : 'FOLD', testId: 'tess-cmd-fold' },
    { label: `BIN ×${nextBin(lc.bin)}`, line: `BIN ${nextBin(lc.bin)}`, testId: 'tess-cmd-bin' },
    ...(sectors.length > 1 ? [{ label: `SECTOR ${((sectorIndex + 1) % sectors.length) + 1}`, line: `SECTOR ${((sectorIndex + 1) % sectors.length) + 1}`, testId: 'tess-cmd-sector' }] : []),
    ...(classification && onShareReadout ? [{ label: reviewing ? 'SEND FOR REVIEW' : 'ASK COMMUNITY', line: 'CONSENSUS', testId: 'tess-cmd-consensus' }] : []),
    { label: 'HELP', line: 'HELP', testId: 'tess-cmd-help' },
  ]

  // SSL-753: on the simple console FOLD stacks the light at the gap between the player's own marks,
  // so two marks on a real transit land on top of each other. The full console keeps its PERIOD dial.
  const markedGap = periodFromRanges(ranges)
  const canSimpleFold = simpleConsole && !classification && markedGap != null
  const toggleSimpleFold = () => {
    if (lc.fold) { setLc(c => ({ ...c, fold: false })); return }
    const period = Math.min(LIGHTCURVE_LIMITS.periodMax, Math.max(LIGHTCURVE_LIMITS.periodMin, markedGap ?? lc.period))
    setLc(c => ({ ...c, fold: true, period }))
    help.reportAction('fold')
  }

  const onCommand = (line: string, view: InstrumentView): InstrumentCommandResult | null => {
    const photometry = applyLightcurveCommand(lc, line)
    if (photometry) { setLc(photometry.controls); return { view, lines: photometry.lines } }
    const [head, arg] = line.trim().split(/\s+/)
    if (head?.toUpperCase() === 'CONSENSUS' && classification && onShareReadout) {
      // The catalogue period is the answer key, so it never travels with a readout.
      onShareReadout(candidate.id, { verdict: verdictLabel[classification.verdict], rows: readoutRows.filter(row => row.label !== 'Catalogue P').map(({ label, value }) => ({ label, value })) })
      return { view, lines: [reviewing ? '> REVIEW  SENT' : '> CONSENSUS  REQUESTED'] }
    }
    if (head?.toUpperCase() === 'HELP' || head === '?') {
      return { view, lines: ['> HELP', `FOLD [P|OFF] · PERIOD ${LIGHTCURVE_LIMITS.periodMin}-${LIGHTCURVE_LIMITS.periodMax}`, `TIME ${LIGHTCURVE_LIMITS.spanMin}-${LIGHTCURVE_LIMITS.spanMax} · SCAN 0-100`, 'BIN 1|2|4|8', `SECTOR 1-${Math.max(1, sectors.length)}`, 'ZOOM · FOCUS · POINT', 'FINISH  CONSOLE COLOUR'] }
    }
    if (head?.toUpperCase() !== 'SECTOR') return null
    const index = Number(arg) - 1
    if (!Number.isInteger(index) || index < 0 || index >= sectors.length) {
      return { view, lines: [`> SECTOR  USE 1-${Math.max(1, sectors.length)}`] }
    }
    setSectorIndex(index)
    return { view, lines: [`> SECTOR ${index + 1}  OK`] }
  }

  return (
    <InstrumentViewport
      instrumentId="transit-telescope"
      level={player.transitSatelliteLevel ?? 1}
      testId="tess-discovery-screen"
      sceneClassName="ln-scene-tess-discovery"
      eyebrow="INSTRUMENT DATA FEED · DAILY DOWNLINK"
      title={candidate.toi}
      onBack={onBack}
      help={help.button}
      helpLayer={help.layer}
      status={classification ? 'CLASSIFICATION SUBMITTED' : 'REVIEW'}
      onCommand={onCommand}
      devBar={devBar}
      module={{
        name: 'PHOTOMETRY · TP-02',
        testId: 'tess-photometry',
        lights: <>
          <InstrumentLamp label="FOLD" on={lc.fold} />
          <InstrumentLamp label="BIN" on={lc.bin > 1} tone="amber" />
        </>,
        content: <>
          <InstrumentKnob label="TIME" testId="tess-time" min={LIGHTCURVE_LIMITS.spanMin} max={LIGHTCURVE_LIMITS.spanMax} step={0.5} value={lc.span} readout={display.folded ? '—' : `${(display.xDomain[1] - display.xDomain[0]).toFixed(1)}d`} onChange={span => setLc(c => ({ ...c, span, fold: false }))} />
          <InstrumentKnob label="SCAN" testId="tess-scan" min={0} max={1} step={0.02} value={lc.scan} readout={display.folded ? '—' : `D${display.xDomain[0].toFixed(1)}`} onChange={scan => setLc(c => ({ ...c, scan, fold: false }))} />
          <InstrumentKnob label="PERIOD" testId="tess-period" min={LIGHTCURVE_LIMITS.periodMin} max={LIGHTCURVE_LIMITS.periodMax} step={0.01} value={lc.period} readout={`${lc.period.toFixed(2)}d`} onChange={period => setLc(c => ({ ...c, period, fold: true }))} />
          <InstrumentModuleKey testId="tess-bin" label="BIN" readout={`×${lc.bin}`} pressed={lc.bin > 1} onClick={() => setLc(c => ({ ...c, bin: nextBin(c.bin) }))} />
          <InstrumentSwitch label="FOLD" testId="tess-fold" pressed={lc.fold} onToggle={() => setLc(c => ({ ...c, fold: !c.fold }))} />
        </>,
      }}
      simple={simpleConsole}
      readout={{ name: 'READOUT · YOUR RESULT', testId: 'tess-readout', rows: simpleConsole ? readoutRows.filter(row => SIMPLE_READOUT.has(row.label) || row.label.startsWith('Dip ') || (row.label === 'Fold' && lc.fold)) : readoutRows }}
      caption={(
        <p className={viewportStyles.caption} data-testid="tess-data-provenance" data-attention={needsMark ? 'true' : undefined}>
          {display.folded ? `FOLDED · P ${lc.period.toFixed(2)}D · FOLD OFF TO MARK` : !classification && markCount === 0 ? (needsMark ? 'DRAG ACROSS THE DIP FIRST' : 'DRAG ACROSS THE DIP') : (activeSector?.label ?? 'LIGHT CURVE')}
        </p>
      )}
      viewportChrome={(
        <div className={viewportStyles.viewportChrome}>
          {simpleEligible && (
            <button type="button" className={viewportStyles.chip} data-testid="tess-all-controls" aria-pressed={allControls} onClick={() => setAllControls(on => !on)}>
              {allControls ? 'Simple view' : 'All controls'}
            </button>
          )}
          {!classification && !simpleConsole && sectors.length > 1 && sectors.map((sector, index) => (
            <button
              key={sector.label}
              type="button"
              className={viewportStyles.chip}
              data-active={index === sectorIndex ? 'true' : 'false'}
              data-testid={`sector-pill-${index}`}
              onClick={() => setSectorIndex(index)}
            >
              {sector.label}
            </button>
          ))}
        </div>
      )}
      viewport={(
        <div data-coach-target="tess-chart" style={{ position: 'absolute', inset: 0 }}>
          {visualCandidate && !display.folded && lc.span === 1 && (
            /* Dip hint on the deepest transit; ObservatoryChart's plot runs from 66px to 100% - 14px. */
            <span
              aria-hidden="true"
              data-testid="tess-dip-hint"
              style={{ position: 'absolute', pointerEvents: 'none', zIndex: 2, left: `calc(66px + ${dipShare} * (100% - 80px) - 22px)`, width: 44, top: 22, bottom: 58, background: 'rgba(var(--hw-c-rgb), 0.12)', borderInline: '1px solid rgba(var(--hw-c-rgb), 0.55)', boxShadow: '0 0 18px rgba(var(--hw-c-rgb), 0.18)' }}
            />
          )}
          <ObservatoryChart
            points={display.points}
            xDomain={display.xDomain}
            folded={display.folded}
            ranges={display.folded ? [] : activeRanges}
            onRange={(x1, x2) => { setRanges(prev => [...prev, { x1, x2 }]); setNeedsMark(false); help.reportAction('mark') }}
            onRemoveRange={index => setRanges(prev => prev.filter((_, current) => current !== index))}
            locked={display.folded}
            yDomain={yDomain}
            captureRef={chartCaptureRef}
          />
        </div>
      )}
      answers={classification ? (
        <div className={viewportStyles.saved}>Classification submitted</div>
      ) : (
        <InstrumentAnswerRow
          coachTarget="tess-verdicts"
          actions={VERDICT_ACTIONS.map(action => ({
            id: action.id,
            label: action.label,
            testId: `tess-verdict-${action.id}`,
            dim: action.requiresMark && markCount === 0,
            primary: action.id === 'planet' && markCount > 0,
            onClick: () => castVerdict(action.id),
          }))}
        />
      )}
      quickCommands={quickCommands}
      toolStepLabels={{ find: 'Find the dip in the star\'s light', answer: 'Is it a planet passing in front?' }}
      tool={(
        <>
          <InstrumentToolHint
            testId="tess-drag-dip"
            text={classification ? 'Marks saved with your classification' : display.folded ? 'Folded at the gap between your marks' : 'Drag across a dip on the chart'}
            detail={classification ? undefined : display.folded ? 'Dips that repeat stack into one' : markCount > 0 ? `${markCount} marked · tap a mark to clear it` : undefined}
          />
          {canSimpleFold && (
            <button type="button" className={viewportStyles.quickKey} data-testid="tess-simple-fold" data-coach-target="tess-fold" aria-pressed={lc.fold} onClick={toggleSimpleFold}>
              {lc.fold ? 'FOLD OFF · BACK TO MARKS' : `FOLD · P ${markedGap!.toFixed(2)}D`}
            </button>
          )}
        </>
      )}
    />
  )
}
