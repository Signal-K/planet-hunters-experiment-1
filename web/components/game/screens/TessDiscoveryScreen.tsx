'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Radio, Satellite } from 'lucide-react'
import TopBar from '@/components/ui/TopBar'
import StatCard from '@/components/ui/StatCard'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { GhostBtn, PrimaryBtn } from '@/components/ui/Button'
import ObservatoryChart from '@/components/game/ObservatoryChart'
import TelescopeConsole from '@/components/game/TelescopeConsole'
import ObservatoryReadout from '@/components/game/ObservatoryReadout'
import CommentsPanel from '@/components/game/CommentsPanel'
import { TessCoachHelpButton, TessCoachOverlay, useTessCoach } from '@/components/game/TessCoachMarks'
import PixiGalaxyStarMap from '@/components/game/PixiGalaxyStarMap'
import SolSystemPreview from '@/components/game/SolSystemPreview'
import NebulaBackdrop from '@/components/game/NebulaBackdrop'
import { deriveObservatoryStats, periodFromRanges, rangeCoversTransit, sectorWindows, tessCandidateToExoplanetTarget, tessLightcurvePoints, type Target, type TessCandidate, type TessClassification, type TessVerdict, type TransitRange } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import { UI_ZONES } from '@/lib/ui-zones'
import { captureGameEvent } from '@/lib/posthog'
import { fetchReviewableTessCandidates } from '@/lib/tess-subjects'
import { sharedBackendMisconfigured } from '@/lib/pb-config'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import { instrumentDigestDateKey, pickInstrumentInspectCandidate, unresolvedTransitInstrumentDigest } from '@/lib/systems/InstrumentFeedSystem'
import { dipInView, gainDomain, gainFromSlider, gainLabel, GAIN_MAX, GAIN_MIN, sliderFromGain, TESS_COACH_MISSED_HINT, TESS_TRAINING_CANDIDATE } from '@/lib/tess-coach'

interface TessDiscoveryScreenProps {
  player: Player
  inspectSubjectId?: string
  /** Fixed record supplied only by the named visual dev preset. */
  visualCandidate?: TessCandidate
  onBack: () => void
  onBuildStation: () => void
  onOpenProgram: () => void
  onSubmit: (subjectId: string, verdict: TessVerdict, ranges: TransitRange[], discoveredTarget?: Target) => void
  /** `dateKey` is the day on screen; the pick applies from the next one. */
  onChooseTarget: (subjectId: string, dateKey: string) => void
}

// Direct-action verdict buttons (tap = submit immediately), matching the
// citizen-science ticket wording (kkhyll: CONFIRM TRANSIT / MARK NOISE / SKIP)
// rather than the old select-then-submit trio.
// KES-171: "Confirm Transit" is a primary CTA, not a payout/reward moment —
// was amber, which violates the amber-restricted-to-payout-emphasis rule.
const VERDICT_ACTIONS: Array<{ id: TessVerdict; label: string; requiresMark: boolean; kind: 'amber' | 'cyan' | 'ghost' }> = [
  { id: 'planet', label: 'Confirm Transit', requiresMark: true, kind: 'cyan' },
  { id: 'not_planet', label: 'Mark Noise', requiresMark: true, kind: 'cyan' },
  { id: 'unsure', label: 'Skip', requiresMark: false, kind: 'ghost' },
]

export default function TessDiscoveryScreen({ player, inspectSubjectId, visualCandidate, onBack, onBuildStation, onOpenProgram, onSubmit, onChooseTarget }: TessDiscoveryScreenProps) {
  // Stabilize the fallback — see the identical comment on
  // AsteroidDiscoveryScreen's classifications memo (STS-622 review found
  // this pattern first here; a fresh `{}` every render when the field is
  // unset re-fires the fetch effect indefinitely).
  const classifications = useMemo(() => player.tessClassifications ?? {}, [player.tessClassifications])
  // InstrumentFeedSystem resolves today's level-scaled downlink — either the
  // player's satellite-pointing pick (player.satelliteTargetId, chosen via
  // PixiGalaxyStarMap after a prior classification) plus a deterministic daily
  // hash fallback. `pool` keeps the full reviewable list around so the
  // pointing map has something to plot.
  const [dailyCandidate, setCandidate] = useState<TessCandidate | null>(null)
  const [pool, setPool] = useState<TessCandidate[]>([])
  const [ranges, setRanges] = useState<TransitRange[]>([])
  const [sectorIndex, setSectorIndex] = useState(0)
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null)
  const [viewingSol, setViewingSol] = useState(false)
  const [forceMapView, setForceMapView] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  // Dev/staging-only: the daily candidate pool is keyed by real calendar date
  // (InstrumentFeedSystem below), so there's no in-scene timer to fast-forward
  // the way TransitScreen's ETA has — testing "the next day's downlink"
  // otherwise means literally waiting a day. This offset fakes `today` by N
  // days; it's a no-op (stays 0) outside development builds.
  const [devDayOffset, setDevDayOffset] = useState(0)
  // Bumped by the "Retry Downlink" action so a genuine (non-misconfiguration)
  // fetch failure can be retried in place instead of being a dead end for
  // the rest of the visit.
  const [retryToken, setRetryToken] = useState(0)
  const [isCompactLandscape, setIsCompactLandscape] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(orientation: landscape) and (max-height: 520px)')
    const update = () => setIsCompactLandscape(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

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
        const today = screenDateKey(devDayOffset)
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
    // Do not refetch merely because this screen submitted a classification
    // or pointed the satellite. The current candidate must remain mounted to
    // show the post-confirmation target-selection map, and a star pick only
    // applies to the next day's downlink (SSL-358) — refetching on
    // satelliteTargetId swapped in a new curve the moment a star was tapped.
    // Re-entering the screen, or the dev day-skip, resolves the next daily
    // candidate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualCandidate, inspectSubjectId, player.freeOperations, player.transitSatelliteLaunchedAt, player.transitSatelliteLevel, devDayOffset, retryToken])

  // SSL-359: the first-ever visit teaches on a confirmed planet (training
  // curve) before today's live candidate. The coach owns the gates below.
  const screenRef = useRef<HTMLDivElement>(null)
  const coachEligible = Object.keys(classifications).length === 0 && !!player.freeOperations && !!player.transitSatelliteLaunchedAt
  const coach = useTessCoach(coachEligible)
  const completeCoachStep = coach.complete
  const [gain, setGain] = useState(GAIN_MAX)
  const [trainingRanges, setTrainingRanges] = useState<TransitRange[]>([])
  const [missedMark, setMissedMark] = useState(false)
  const training = coach.training
  const liveCandidate = dailyCandidate
  const shownCandidate = training ? TESS_TRAINING_CANDIDATE : liveCandidate
  const shownRanges = training ? trainingRanges : ranges
  const setShownRanges = training ? setTrainingRanges : setRanges
  const coachStepId = coach.step?.id ?? null

  const classification: TessClassification | undefined = liveCandidate && !training ? classifications[liveCandidate.id] : undefined
  const discoveredTarget = liveCandidate && classification?.verdict === 'planet'
    ? tessCandidateToExoplanetTarget(liveCandidate, periodFromRanges(classification.ranges))
    : null
  const points = useMemo(() => shownCandidate ? tessLightcurvePoints(shownCandidate) : [], [shownCandidate])
  const sectors = useMemo(() => shownCandidate ? sectorWindows(points, shownCandidate.sector) : [], [shownCandidate, points])
  const activeSector = sectors[Math.min(sectorIndex, Math.max(0, sectors.length - 1))]
  const sectorPoints = activeSector?.points ?? points
  // Fixed across all sectors — see ObservatoryChart's yDomain doc comment.
  const fluxRange = useMemo<[number, number] | undefined>(() => {
    if (!points.length) return undefined
    const ys = points.map(p => p.y)
    return [Math.min(...ys), Math.max(...ys)]
  }, [points])
  // SSL-359: display gain stretches that fixed range; full gain is the
  // pre-gain view.
  const yDomain = fluxRange ? gainDomain(fluxRange[0], fluxRange[1], gain) : undefined
  const dipShowing = !!shownCandidate && !!fluxRange && dipInView(shownCandidate.depthPpm, fluxRange[0], fluxRange[1], gain)
  // Hooks must run unconditionally — the gate screens below return early,
  // so anything hook-based (not just plain derived values) has to sit
  // above them, or its call order breaks the moment a gate flag flips
  const isDesktop = useIsDesktop()

  // Each coach step starts from the state that makes its action meaningful:
  // gain step starts flat (dip hidden), the training run starts unmarked.
  useEffect(() => {
    if (coachStepId === 'gain') {
      setGain(GAIN_MIN)
      setMissedMark(false)
      if (training) setTrainingRanges([])
      else setRanges([])
    }
  }, [coachStepId, training])

  // Step 1 gate: the dip is in view. Waits for the drag to settle so the
  // hint does not jump mid-gesture.
  useEffect(() => {
    if (coachStepId !== 'gain' || !dipShowing) return
    const timer = window.setTimeout(() => completeCoachStep('gain'), 450)
    return () => window.clearTimeout(timer)
  }, [completeCoachStep, coachStepId, dipShowing])

  // Step 2 gate: a mark. On the known-planet curve it must land on a
  // transit; a miss is cleared with a nudge so the retry starts clean.
  useEffect(() => {
    if (coachStepId !== 'mark' || shownRanges.length === 0 || !shownCandidate) return
    if (training && !shownRanges.some(range => rangeCoversTransit(shownCandidate, range))) {
      setMissedMark(true)
      setTrainingRanges([])
      return
    }
    setMissedMark(false)
    completeCoachStep('mark')
  }, [completeCoachStep, coachStepId, shownCandidate, shownRanges, training])

  if (!player.freeOperations) {
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

  if (!player.transitSatelliteLaunchedAt) {
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

  if (loading && !training) {
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

  if (!shownCandidate) {
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
          <GhostBtn onClick={() => { captureGameEvent('tess_downlink_retry'); setRetryToken(t => t + 1) }}>Retry Downlink</GhostBtn>
        ) : undefined}
        devBar={process.env.NODE_ENV === 'development' ? (
          <DevDaySkipBar offset={devDayOffset} onAdvance={() => setDevDayOffset(o => o + 1)} onReset={() => setDevDayOffset(0)} />
        ) : undefined}
      />
    )
  }

  const candidate = shownCandidate
  // A landscape phone (844x390) has to show the chart and the gain control
  // together for the first coach step.
  const chartHeight = isCompactLandscape ? 168 : 280
  const castVerdict = (id: TessVerdict) => {
    if (classification) return
    // The training curve is a known planet, not a live subject: confirming
    // it teaches the step and is never sent to the shared feed.
    if (training) {
      if (id === 'planet') coach.complete('confirm')
      return
    }
    const measuredPeriod = periodFromRanges(ranges)
    onSubmit(candidate.id, id, ranges, id === 'planet' ? tessCandidateToExoplanetTarget(candidate, measuredPeriod) : undefined)
    if (coachStepId === 'confirm' && id === 'planet') coach.complete('confirm')
  }

  const activeRanges = classification?.ranges ?? shownRanges
  const markCount = activeRanges.length
  const stats = deriveObservatoryStats(candidate, points, activeRanges)
  const visitedIds = new Set(Object.keys(classifications))
  const targetChosen = pendingTargetId ?? player.satelliteTargetId ?? null
  const coachHint = coachStepId === 'mark' && missedMark ? TESS_COACH_MISSED_HINT : coach.step?.hint ?? ''
  // A global 5-vote confirmation lets the player re-pick their satellite
  // target immediately, without waiting for the normal post-classification
  // moment — but doesn't replace today's review flow, so this is a
  // separate, explicit toggle rather than folded into `classification`.
  const showMap = classification != null || forceMapView

  // Chart/candidate panel — shared between the mobile single-column layout
  // and the left (55%) column of the desktop two-column layout (kkhyll's
  // originally-specified split, never built until now). `includeReadout`
  // keeps ObservatoryReadout nested inside this panel on mobile (unchanged
  // from before) while desktop pulls it into the right column instead.
  const chartPanel = (includeReadout: boolean) => (
    <Panel accent="var(--ln-cyan)" style={{ padding: 12, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LiveDot active={!classification} />
                <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 18, color: 'var(--ln-text)' }}>{candidate.host}</div>
              </div>
              <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: 'var(--ln-text-muted)', marginTop: 2 }}>
                {candidate.constellation.toUpperCase()} / {candidate.distanceLy} LY / S/N {candidate.signalToNoise.toFixed(1)} / {candidate.periodDays.toFixed(1)}D
              </div>
            </div>
            <StatusPill kind={classification || coachStepId === 'outcome' ? 'ok' : 'info'}>
              {classification ? classification.verdict.replace('_', ' ').toUpperCase() : training ? 'KNOWN PLANET' : 'REVIEW'}
            </StatusPill>
          </div>

          <div
            data-testid="tess-data-provenance"
            style={{
              fontFamily: 'var(--ln-font-mono)', fontSize: 8, letterSpacing: '0.06em', color: 'var(--ln-text-dim)',
              textTransform: 'uppercase', marginBottom: 8, marginTop: -4,
            }}
          >
            {training
              ? `Training curve · modelled on confirmed planet ${candidate.toi} (NASA TESS) · not sent to the live feed`
              : 'Real light-curve data · NASA TESS / Planet Hunters — your call feeds live classification consensus'}
          </div>

          {!classification && sectors.length > 1 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {sectors.map((sector, index) => (
                <button
                  key={sector.label}
                  data-testid={`sector-pill-${index}`}
                  onClick={() => setSectorIndex(index)}
                  style={{
                    padding: '4px 8px', borderRadius: 999, cursor: 'pointer',
                    border: `1px solid ${index === sectorIndex ? 'var(--ln-cyan-border)' : 'var(--ln-hairline)'}`,
                    background: index === sectorIndex ? 'var(--ln-cyan-soft)' : 'var(--ln-overlay)',
                    color: index === sectorIndex ? 'var(--ln-cyan)' : 'var(--ln-text-muted)',
                    fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                  }}
                >
                  {sector.label}
                </button>
              ))}
            </div>
          )}

          {!classification && player.pendingRepick && !forceMapView && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              marginBottom: 8, padding: '8px 8px', borderRadius: 8,
              background: 'var(--ln-cyan-soft)', border: '1px solid var(--ln-cyan-border)',
            }}>
              <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: 'var(--ln-cyan)' }}>
                A candidate was just confirmed as a real planet
              </span>
              <button
                onClick={() => setForceMapView(true)}
                style={{
                  padding: '4px 8px', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
                  border: '1px solid var(--ln-cyan-border)', background: 'var(--ln-cyan-soft)',
                  color: 'var(--ln-cyan-bright)', fontFamily: 'var(--ln-font-display)', fontSize: 9,
                  fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                }}
              >
                Re-point Satellite
              </button>
            </div>
          )}

          {/* Viewport: the lightcurve while reviewing, replaced by the
              galaxy star map (pick tomorrow's target) once classified, or
              immediately via the re-pick banner above. */}
          <div data-coach-target="tess-chart">
            <TelescopeConsole
              sector={showMap ? 'TARGET SELECT' : (activeSector?.label ?? candidate.sector)}
              targetCount={showMap ? pool.length : 1}
              signal={candidate.signalToNoise}
              compact={isCompactLandscape}
            >
              {showMap ? (
                viewingSol ? (
                  <div style={{ height: 280 }}>
                    <SolSystemPreview onBack={() => setViewingSol(false)} />
                  </div>
                ) : (
                  <PixiGalaxyStarMap
                    candidates={pool}
                    visitedIds={visitedIds}
                    selectedId={targetChosen}
                    onSelect={id => { setPendingTargetId(id); onChooseTarget(id, screenDateKey(devDayOffset)); setForceMapView(false) }}
                    onOpenSol={() => setViewingSol(true)}
                    height={280}
                  />
                )
              ) : (
                <ObservatoryChart
                  points={sectorPoints}
                  ranges={activeRanges}
                  onRange={(x1, x2) => setShownRanges(prev => [...prev, { x1, x2 }])}
                  onRemoveRange={index => setShownRanges(prev => prev.filter((_, current) => current !== index))}
                  // Marking waits until the dip is in view (coach step 1).
                  locked={coachStepId === 'gain' || coachStepId === 'outcome'}
                  height={chartHeight}
                  yDomain={yDomain}
                />
              )}
            </TelescopeConsole>
          </div>

          {!showMap && (
            <GainControl gain={gain} onChange={setGain} />
          )}

          {showMap ? (
            <div style={{ marginTop: 8, textAlign: 'center', fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: targetChosen ? 'var(--ln-cyan)' : 'var(--ln-text-muted)' }}>
              {targetChosen
                ? `Satellite will point here tomorrow — ${pool.find(c => c.id === targetChosen)?.toi ?? targetChosen}`
                : 'Tap a star to point the satellite tomorrow · green = already searched'}
              {forceMapView && !classification && (
                <>
                  {' · '}
                  <button
                    onClick={() => setForceMapView(false)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ln-cyan-bright)', fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline' }}
                  >
                    back to review
                  </button>
                </>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 8, textAlign: 'center', fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: markCount > 0 ? 'var(--ln-cyan)' : 'var(--ln-text-muted)' }}>
              {markCount === 0
                ? 'Tap or drag over a dip to mark a transit'
                : `${markCount} region${markCount !== 1 ? 's' : ''} marked`}
            </div>
          )}

          {includeReadout && (
            <div style={{ marginTop: 10 }}>
              <ObservatoryReadout stats={stats} />
            </div>
          )}
    </Panel>
  )

  const verdictActions = (
    classification ? (
      <div style={{ textAlign: 'center' }}>
        <StatusPill kind="ok">ANNOTATION SAVED</StatusPill>
      </div>
    ) : (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {VERDICT_ACTIONS.map(action => (
            <VerdictButton
              key={action.id}
              action={action}
              disabled={action.requiresMark && markCount === 0}
              onClick={() => castVerdict(action.id)}
              coachTarget={action.id === 'planet' ? 'tess-confirm' : undefined}
            />
          ))}
        </div>
        {markCount > 0 && (
          <div style={{ marginTop: 8 }}>
            <GhostBtn onClick={() => setShownRanges([])}>CLEAR MARKS</GhostBtn>
          </div>
        )}
      </>
    )
  )

  const payoffPanel = classification ? (
    <Panel accent={classification.verdict === 'planet' ? 'var(--ln-ok)' : 'var(--ln-cyan)'} style={{ padding: 12 }}>
      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: classification.verdict === 'planet' ? 'var(--ln-ok)' : 'var(--ln-cyan)', textTransform: 'uppercase', marginBottom: 6 }}>
        Discovery Logged
      </div>
      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-dim)', lineHeight: 1.45 }}>
        {classification.verdict === 'planet' && discoveredTarget
          ? `${candidate.host} is now a candidate world in your operations map. A survey flight is available from the Mission Board, and this first submission awarded research XP.`
          : 'Your annotation was saved to the review queue. Noise marks matter: they keep the shared feed clean for the next real transit, and first submissions award research XP.'}
      </div>
      {classification.verdict === 'planet' && discoveredTarget && (
        <div data-testid="tess-discovery-payoff" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 10 }}>
          <PayoffStat label="Target" value={discoveredTarget.name} />
          <PayoffStat label="Orbit" value={`L${discoveredTarget.orbit}`} />
          <PayoffStat label="Minerals" value={discoveredTarget.minerals.slice(0, 2).join(' / ')} />
        </div>
      )}
    </Panel>
  ) : null

  return (
    <div ref={screenRef} className="game-screen theme-deep ln-scene-tess-discovery" data-testid="tess-discovery-screen">
      <TopBar
        eyebrow={training ? 'INSTRUMENT DATA FEED · TRAINING CURVE' : 'INSTRUMENT DATA FEED · DAILY DOWNLINK'}
        title={candidate.toi}
        onBack={onBack}
        right={!classification && !coach.active ? <TessCoachHelpButton onClick={() => coach.start(false)} /> : undefined}
      />
      {isDesktop || isCompactLandscape ? (
        /* SSL-300: the DEV day-skip bar used to be absolutely positioned over
           the grid, so its height was never subtracted from the space the
           right column thought it had — at 844x390 that pushed the comments
           composer's Post button underneath the pinned verdict dock. Put the
           bar in flow above the grid inside one bounded column so the
           scroll region is always sized from what is actually left. */
        <div data-testid="tess-discovery-desktop-frame" style={{ position: 'absolute', inset: 0, top: 72, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '0 var(--ln-s-4) var(--ln-s-4)' }}>
          {process.env.NODE_ENV === 'development' && (
            <div style={{ flex: '0 0 auto' }}>
              <DevDaySkipBar offset={devDayOffset} onAdvance={() => setDevDayOffset(o => o + 1)} onReset={() => setDevDayOffset(0)} />
            </div>
          )}
          <div data-testid="tess-discovery-desktop-grid" style={{ flex: '1 1 0px', minHeight: 0, display: 'grid', gridTemplateColumns: '55% 45%', gridTemplateRows: 'minmax(0, 1fr)', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0, overflowY: 'auto' }} data-ui-zone={UI_ZONES.screenContent}>
              {chartPanel(false)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 0px', minHeight: 0, overflowY: 'auto' }}>
                <ObservatoryReadout stats={stats} />
                {payoffPanel}
                {!training && <CommentsPanel recordType="classification" recordId={candidate.id} />}
              </div>
              <div style={{ flex: '0 0 auto', background: 'var(--ln-void)' }} data-ui-zone={UI_ZONES.bottomActions}>
                {verdictActions}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {process.env.NODE_ENV === 'development' && (
            <div style={{ position: 'absolute', top: 72, left: 'var(--ln-s-4)', right: 'var(--ln-s-4)', zIndex: 5 }}>
              <DevDaySkipBar offset={devDayOffset} onAdvance={() => setDevDayOffset(o => o + 1)} onReset={() => setDevDayOffset(0)} />
            </div>
          )}
          <div className={`screen-scroll${!classification && markCount > 0 ? ' screen-scroll--tall-actions' : ''}`} data-ui-zone={UI_ZONES.screenContent}>
            {chartPanel(true)}
            {payoffPanel && <div style={{ marginTop: 12 }}>{payoffPanel}</div>}
            {!training && (
              <div style={{ marginTop: 12 }}>
                <CommentsPanel recordType="classification" recordId={candidate.id} />
              </div>
            )}
          </div>
          <div className="sticky-actions" data-ui-zone={UI_ZONES.bottomActions}>
            {verdictActions}
          </div>
        </>
      )}

      {coach.step && coach.stepIndex != null && (
        <TessCoachOverlay
          step={coach.step}
          stepIndex={coach.stepIndex}
          total={coach.total}
          hint={coachHint}
          rootRef={screenRef}
          onSkip={coach.skip}
          onDone={coachStepId === 'outcome' ? () => completeCoachStep('outcome') : undefined}
        />
      )}
    </div>
  )
}

function PayoffStat({ label, value }: { label: string; value: string }) {
  return <StatCard variant="readout" tone="ok" label={label} value={value} />
}

// Standard gate/status screen — Panel-wrapped icon + text, same shape as
// every other screen in the game (TopBar + screen-scroll + Panel).
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
  // "amber" tone here means a locked/blocked gate state, not a reward — mapped
  // to --ln-warn rather than --ln-amber so it stays outside the reward-only
  // amber restriction. {/* amber allowed */}
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
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-muted)', marginTop: 2 }}>{body}</div>
            </div>
          </div>
          {action && <div style={{ marginTop: 12 }}>{action}</div>}
        </Panel>
      </div>
    </div>
  )
}

// Dev/staging-only day-skip control — see devDayOffset comment above. Never
// rendered in production (guarded at each call site).
function DevDaySkipBar({ offset, onAdvance, onReset }: { offset: number; onAdvance: () => void; onReset: () => void }) {
  const simulated = new Date()
  simulated.setDate(simulated.getDate() + offset)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', marginBottom: 10,
      borderRadius: 7, border: '1px dashed var(--ln-hairline-strong)', background: 'var(--ln-overlay)',
    }}>
      <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: 'var(--ln-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        DEV · Simulated day {simulated.toISOString().slice(0, 10)} ({offset >= 0 ? '+' : ''}{offset}d)
      </span>
      <span style={{ flex: 1 }} />
      <button data-testid="tess-dev-skip-day" onClick={onAdvance} style={{
        padding: '4px 8px', borderRadius: 5, border: '1px solid var(--ln-cyan-border)', background: 'var(--ln-cyan-soft)',
        color: 'var(--ln-cyan)', fontFamily: 'var(--ln-font-mono)', fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', cursor: 'pointer',
      }}>
        +1 DAY
      </button>
      {offset !== 0 && (
        <button data-testid="tess-dev-reset-day" onClick={onReset} style={{
          padding: '4px 8px', borderRadius: 5, border: '1px solid var(--ln-hairline-strong)', background: 'transparent',
          color: 'var(--ln-text-muted)', fontFamily: 'var(--ln-font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer',
        }}>
          RESET
        </button>
      )}
    </div>
  )
}

function LiveDot({ active }: { active: boolean }) {
  return (
    <span style={{
      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
      background: active ? 'var(--ln-ok)' : 'var(--ln-text-muted)',
      boxShadow: active ? '0 0 8px var(--ln-ok)' : 'none',
      animation: active ? 'ln-pulse 1.4s ease-in-out infinite' : 'none',
    }} />
  )
}

function VerdictButton({ action, disabled, onClick, coachTarget }: { action: { id: TessVerdict; label: string; kind: 'amber' | 'cyan' | 'ghost' }; disabled: boolean; onClick: () => void; coachTarget?: string }) {
  const palette: Record<typeof action.kind, { border: string; bg: string; color: string; glow: string }> = {
    // "amber" kind is reserved for a future reward-tier verdict action; not
    // wired up by VERDICT_ACTIONS today. {/* amber allowed */}
    amber: { border: 'var(--ln-amber-border)', bg: 'var(--ln-amber-soft)', color: 'var(--ln-amber-bright)', glow: 'var(--ln-amber-border)' },
    cyan:  { border: 'var(--ln-cyan-border)', bg: 'var(--ln-cyan-soft)', color: 'var(--ln-cyan-bright)', glow: 'var(--ln-cyan-border)' },
    ghost: { border: 'var(--ln-hairline-strong)', bg: 'var(--ln-overlay)', color: 'var(--ln-text-muted)', glow: 'transparent' },
  }
  const p = palette[action.kind]
  return (
    <button
      data-testid={`tess-verdict-${action.id}`}
      data-coach-target={coachTarget}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      style={{
        minHeight: 46,
        borderRadius: 10,
        border: `1px solid ${p.border}`,
        background: p.bg,
        color: p.color,
        fontFamily: 'var(--ln-font-display)',
        fontWeight: 800,
        fontSize: 10,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        boxShadow: disabled ? 'none' : `0 0 12px ${p.glow}`,
      }}
    >
      {action.label}
    </button>
  )
}

// The UTC day the screen is showing: today, moved by the dev day-skip.
function screenDateKey(devDayOffset: number): string {
  const date = new Date()
  if (devDayOffset) date.setDate(date.getDate() + devDayOffset)
  return instrumentDigestDateKey(date)
}

// SSL-359: display gain for the flux axis. Low gain flattens the curve; the
// TESS coach starts here so the player raises it until the dip shows.
function GainControl({ gain, onChange }: { gain: number; onChange: (gain: number) => void }) {
  return (
    <label
      data-coach-target="tess-gain"
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--ln-s-3)', minHeight: 44,
        marginTop: 'var(--ln-s-2)', padding: '0 var(--ln-s-2)',
      }}
    >
      <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>
        Gain
      </span>
      <input
        type="range"
        data-testid="tess-gain"
        aria-label="Flux gain"
        min={0}
        max={1}
        step={0.01}
        value={sliderFromGain(gain)}
        onChange={event => onChange(gainFromSlider(Number(event.target.value)))}
        style={{ flex: 1, minWidth: 0, height: 32, accentColor: 'var(--ln-cyan)', cursor: 'pointer' }}
      />
      <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 11, color: 'var(--ln-cyan)', minWidth: 32, textAlign: 'right' }}>
        {gainLabel(gain)}
      </span>
    </label>
  )
}
