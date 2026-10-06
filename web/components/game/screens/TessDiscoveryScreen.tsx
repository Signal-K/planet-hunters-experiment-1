'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Radio, Satellite } from 'lucide-react'
import TopBar from '@/components/ui/TopBar'
import { useHelp } from '@/components/ui/useHelp'
import Panel from '@/components/ui/Panel'
import { GhostBtn, PrimaryBtn } from '@/components/ui/Button'
import ObservatoryChart from '@/components/game/ObservatoryChart'
import PixiGalaxyStarMap from '@/components/game/PixiGalaxyStarMap'
import SolSystemPreview from '@/components/game/SolSystemPreview'
import NebulaBackdrop from '@/components/game/NebulaBackdrop'
import InstrumentViewport, { InstrumentAnswerRow, InstrumentDevDayBar, InstrumentToolButton } from '@/components/game/instrument-viewport/InstrumentViewport'
import viewportStyles from '@/components/game/instrument-viewport/InstrumentViewport.module.css'
import { periodFromRanges, sectorWindows, tessCandidateToExoplanetTarget, tessLightcurvePoints, type Target, type TessCandidate, type TessClassification, type TessVerdict, type TransitRange } from '@/lib/data'
import type { InstrumentCommandResult, InstrumentView } from '@/lib/instrument-viewport/view'
import type { Player } from '@/lib/game-types'
import { UI_ZONES } from '@/lib/ui-zones'
import { captureGameEvent } from '@/lib/posthog'
import { fetchReviewableTessCandidates } from '@/lib/tess-subjects'
import { sharedBackendMisconfigured } from '@/lib/pb-config'
import { TRAINING_ID_PREFIX } from '@/lib/visual-fixtures'
import { instrumentDigestDateKey, pickInstrumentInspectCandidate, unresolvedTransitInstrumentDigest } from '@/lib/systems/InstrumentFeedSystem'

interface TessDiscoveryScreenProps {
  player: Player
  inspectSubjectId?: string
  /** Fixed record supplied only by the named visual dev preset. */
  visualCandidate?: TessCandidate
  onBack: () => void
  onBuildStation: () => void
  onOpenProgram: () => void
  onSubmit: (subjectId: string, verdict: TessVerdict, ranges: TransitRange[], discoveredTarget?: Target) => void
  onChooseTarget: (subjectId: string) => void
  /** Set while a training try is active, so the help sheet can point at Menu > Training. */
  onReplayTraining?: () => void
}

const VERDICT_ACTIONS: Array<{ id: TessVerdict; label: string; requiresMark: boolean }> = [
  { id: 'planet', label: 'Confirm Transit', requiresMark: true },
  { id: 'not_planet', label: 'Mark Noise', requiresMark: true },
  { id: 'unsure', label: 'Skip', requiresMark: false },
]

export default function TessDiscoveryScreen({ player, inspectSubjectId, visualCandidate, onBack, onOpenProgram, onSubmit, onChooseTarget, onReplayTraining }: TessDiscoveryScreenProps) {
  const help = useHelp('galaxy', { onReplayTraining })
  const classifications = useMemo(() => player.tessClassifications ?? {}, [player.tessClassifications])
  const [candidate, setCandidate] = useState<TessCandidate | null>(null)
  const [pool, setPool] = useState<TessCandidate[]>([])
  const [ranges, setRanges] = useState<TransitRange[]>([])
  const [sectorIndex, setSectorIndex] = useState(0)
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null)
  const [viewingSol, setViewingSol] = useState(false)
  const [forceMapView, setForceMapView] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [devDayOffset, setDevDayOffset] = useState(0)
  const [retryToken, setRetryToken] = useState(0)
  const [dragArmed, setDragArmed] = useState(true)

  useEffect(() => {
    if (visualCandidate) {
      setCandidate(visualCandidate)
      setPool([visualCandidate])
      setRanges([])
      setSectorIndex(0)
      setViewingSol(false)
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
        setViewingSol(false)
      })
      .catch(error => {
        console.warn('[TESS] live candidate fetch failed', error)
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
  const yDomain = useMemo<[number, number] | undefined>(() => {
    if (!points.length) return undefined
    const ys = points.map(point => point.y)
    return [Math.min(...ys), Math.max(...ys)]
  }, [points])

  if (!visualCandidate && !player.freeOperations) {
    return (
      <GateScreen
        eyebrow="BASE / LOCKED"
        icon={<Satellite size={22} />}
        tone="amber"
        title="Free Operations Required"
        body="TESS candidate downlinks unlock after the starter contract arc."
        onBack={onBack}
      />
    )
  }

  if (!visualCandidate && !player.transitSatelliteLaunchedAt) {
    return (
      <GateScreen
        eyebrow="BASE / TELESCOPE"
        icon={<Radio size={22} />}
        tone="amber"
        title="Launch Transit Telescope"
        body="Deploy your own telescope from the Launchpad. Its daily data will downlink here after the flight."
        onBack={onBack}
        action={<PrimaryBtn testId="open-transit-telescope-program-btn" kind="amber" onClick={onOpenProgram}>Open Your Program</PrimaryBtn>}
      />
    )
  }

  if (loading) {
    return (
      <GateScreen
        eyebrow="BASE / DAILY DOWNLINK"
        icon={<Satellite size={22} />}
        tone="cyan"
        title="Acquiring Signal"
        body="Pulling the day's unresolved TESS transit anomaly from the shared feed."
        onBack={onBack}
      />
    )
  }

  if (!candidate) {
    const misconfigured = loadFailed && sharedBackendMisconfigured()
    return (
      <GateScreen
        eyebrow="BASE / DAILY DOWNLINK"
        icon={<Radio size={22} />}
        tone="amber"
        title={misconfigured ? 'Feed Not Configured' : loadFailed ? 'Live Feed Unavailable' : 'No Reviewable Anomaly'}
        body={misconfigured
          ? 'This build has no shared backend configured. Reloading will not help — this needs a deploy fix.'
          : loadFailed
            ? 'The shared TESS subject feed could not be reached.'
            : 'Every live TESS transit subject is currently confirmed, rejected, or already resolved by consensus.'}
        onBack={onBack}
        action={loadFailed && !misconfigured ? (
          <GhostBtn onClick={() => { captureGameEvent('tess_downlink_retry'); setRetryToken(token => token + 1) }}>Retry Downlink</GhostBtn>
        ) : undefined}
        devBar={process.env.NODE_ENV === 'development' ? (
          <InstrumentDevDayBar testIdPrefix="tess" offset={devDayOffset} onAdvance={() => setDevDayOffset(offset => offset + 1)} onReset={() => setDevDayOffset(0)} />
        ) : undefined}
      />
    )
  }

  const castVerdict = (id: TessVerdict) => {
    if (classification) return
    const measuredPeriod = periodFromRanges(ranges)
    onSubmit(candidate.id, id, ranges, id === 'planet' ? tessCandidateToExoplanetTarget(candidate, measuredPeriod) : undefined)
  }

  const activeRanges = classification?.ranges ?? ranges
  const markCount = activeRanges.length
  const visitedIds = new Set(Object.keys(classifications))
  const targetChosen = pendingTargetId ?? player.satelliteTargetId ?? null
  const showMap = classification != null || forceMapView

  const onCommand = (line: string, view: InstrumentView): InstrumentCommandResult | null => {
    const [head, arg] = line.trim().split(/\s+/)
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
      testId="tess-discovery-screen"
      sceneClassName="ln-scene-tess-discovery"
      eyebrow="INSTRUMENT DATA FEED · DAILY DOWNLINK"
      title={candidate.toi}
      onBack={onBack}
      help={help.button}
      helpLayer={help.layer}
      status={classification ? 'ANNOTATION SAVED' : 'REVIEW'}
      onCommand={onCommand}
      devBar={process.env.NODE_ENV === 'development' ? (
        <InstrumentDevDayBar testIdPrefix="tess" offset={devDayOffset} onAdvance={() => setDevDayOffset(offset => offset + 1)} onReset={() => setDevDayOffset(0)} />
      ) : undefined}
      caption={(
        <p className={viewportStyles.caption} data-testid="tess-data-provenance">
          {showMap ? 'TARGET SELECT' : (activeSector?.label ?? 'LIGHT CURVE')}
        </p>
      )}
      viewportChrome={(
        <div className={viewportStyles.viewportChrome}>
          {!classification && sectors.length > 1 && sectors.map((sector, index) => (
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
          {!classification && player.pendingRepick && !forceMapView && (
            <button type="button" className={viewportStyles.chip} onClick={() => setForceMapView(true)}>Point satellite</button>
          )}
          {forceMapView && !classification && (
            <button type="button" className={viewportStyles.chip} onClick={() => setForceMapView(false)}>Back to review</button>
          )}
        </div>
      )}
      viewport={showMap ? (
        viewingSol ? (
          <div style={{ position: 'absolute', inset: 0 }}>
            <SolSystemPreview onBack={() => setViewingSol(false)} />
          </div>
        ) : (
          <div style={{ position: 'absolute', inset: 0 }}>
            <PixiGalaxyStarMap
              candidates={pool}
              visitedIds={visitedIds}
              selectedId={targetChosen}
              onSelect={id => { setPendingTargetId(id); onChooseTarget(id); setForceMapView(false) }}
              onOpenSol={() => setViewingSol(true)}
            />
          </div>
        )
      ) : (
        <div className={visualCandidate ? 'tess-training-dip-band' : undefined} data-coach-target="tess-chart" style={{ position: 'absolute', inset: 0 }}>
          <ObservatoryChart
            points={sectorPoints}
            ranges={activeRanges}
            onRange={(x1, x2) => { setRanges(prev => [...prev, { x1, x2 }]); help.reportAction('mark') }}
            onRemoveRange={index => setRanges(prev => prev.filter((_, current) => current !== index))}
            locked={!dragArmed}
            yDomain={yDomain}
          />
        </div>
      )}
      answers={classification ? (
        <div className={viewportStyles.saved}>Annotation saved</div>
      ) : (
        <InstrumentAnswerRow
          coachTarget="tess-verdicts"
          actions={VERDICT_ACTIONS.map(action => ({
            id: action.id,
            label: action.label,
            testId: `tess-verdict-${action.id}`,
            disabled: action.requiresMark && markCount === 0,
            onClick: () => castVerdict(action.id),
          }))}
        />
      )}
      tool={(
        <InstrumentToolButton
          testId="tess-drag-dip"
          label={markCount > 0 ? `Drag dip · ${markCount}` : 'Drag dip'}
          pressed={dragArmed && !showMap}
          disabled={!!classification || showMap}
          onClick={() => setDragArmed(armed => !armed)}
        />
      )}
    />
  )
}

function GateScreen({ eyebrow, icon, tone, title, body, onBack, action, devBar }: {
  eyebrow: string
  icon: ReactNode
  tone: 'amber' | 'cyan'
  title: string
  body: string
  onBack: () => void
  action?: ReactNode
  devBar?: ReactNode
}) {
  const accent = tone === 'amber' ? 'var(--ln-warn)' : 'var(--ln-cyan)'
  const bg = tone === 'amber' ? 'var(--ln-warn-soft)' : 'var(--ln-cyan-soft)'
  const border = tone === 'amber' ? 'var(--ln-warn)' : 'var(--ln-cyan-border)'
  return (
    <div className="game-screen theme-deep ln-scene-tess-discovery">
      <NebulaBackdrop />
      <TopBar eyebrow={eyebrow} title="Transit Telescope" onBack={onBack} />
      <div className="screen-scroll" data-ui-zone={UI_ZONES.screenContent}>
        {devBar}
        <Panel accent={accent} style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, display: 'grid', placeItems: 'center', background: bg, border: `1px solid ${border}`, color: accent }}>
              {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 15, color: accent }}>{title}</div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: 'var(--ln-text-muted)', marginTop: 4 }}>{body}</div>
            </div>
          </div>
          {action && <div style={{ marginTop: 12 }}>{action}</div>}
        </Panel>
      </div>
    </div>
  )
}
