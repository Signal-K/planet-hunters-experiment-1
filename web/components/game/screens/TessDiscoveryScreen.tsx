'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
import ObservatoryCoach, { useObservatoryCoach } from '@/components/game/ObservatoryCoach'
import PixiGalaxyStarMap from '@/components/game/PixiGalaxyStarMap'
import SolSystemPreview from '@/components/game/SolSystemPreview'
import NebulaBackdrop from '@/components/game/NebulaBackdrop'
import { deriveObservatoryStats, periodFromRanges, sectorWindows, tessCandidateToExoplanetTarget, tessLightcurvePoints, type Target, type TessCandidate, type TessClassification, type TessVerdict, type TransitRange } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import { UI_ZONES } from '@/lib/ui-zones'
import { fetchReviewableTessCandidates } from '@/lib/tess-subjects'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import { instrumentDigestDateKey, unresolvedTransitInstrumentDigest } from '@/lib/systems/InstrumentFeedSystem'

interface TessDiscoveryScreenProps {
  player: Player
  onBack: () => void
  onBuildStation: () => void
  onOpenProgram: () => void
  onSubmit: (subjectId: string, verdict: TessVerdict, ranges: TransitRange[], discoveredTarget?: Target) => void
  onChooseTarget: (subjectId: string) => void
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

export default function TessDiscoveryScreen({ player, onBack, onBuildStation, onOpenProgram, onSubmit, onChooseTarget }: TessDiscoveryScreenProps) {
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
  const [candidate, setCandidate] = useState<TessCandidate | null>(null)
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

  useEffect(() => {
    if (!player.freeOperations || !player.satelliteMonitoringBuilt || !player.transitSatelliteLaunchedAt) {
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
        const nextDaily = unresolvedTransitInstrumentDigest(liveCandidates, player, today)[0]
        setPool(liveCandidates)
        setCandidate(nextDaily ?? null)
        setRanges([])
        setSectorIndex(0)
        setViewingSol(false)
      })
      .catch(error => {
        console.warn('[TESS] live candidate fetch failed', error)
        if (cancelled) return
        setPool([])
        setCandidate(null)
        setLoadFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
    // Do not refetch merely because this screen submitted a classification.
    // The current candidate must remain mounted long enough to show the
    // post-confirmation target-selection map. Re-entering the screen remounts
    // it and naturally resolves the next still-unclassified daily candidate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.freeOperations, player.satelliteMonitoringBuilt, player.satelliteMonitoringLevel, player.transitSatelliteLaunchedAt, player.transitSatelliteLevel, player.satelliteTargetId, devDayOffset])

  const classification: TessClassification | undefined = candidate ? classifications[candidate.id] : undefined
  const discoveredTarget = candidate && classification?.verdict === 'planet'
    ? tessCandidateToExoplanetTarget(candidate, periodFromRanges(classification.ranges))
    : null
  const points = useMemo(() => candidate ? tessLightcurvePoints(candidate) : [], [candidate])
  const sectors = useMemo(() => candidate ? sectorWindows(points, candidate.sector) : [], [candidate, points])
  const activeSector = sectors[Math.min(sectorIndex, Math.max(0, sectors.length - 1))]
  const sectorPoints = activeSector?.points ?? points
  // Fixed across all sectors — see ObservatoryChart's yDomain doc comment.
  const yDomain = useMemo<[number, number] | undefined>(() => {
    if (!points.length) return undefined
    const ys = points.map(p => p.y)
    return [Math.min(...ys), Math.max(...ys)]
  }, [points])
  // Hooks must run unconditionally — the gate screens below return early,
  // so anything hook-based (not just plain derived values) has to sit
  // above them, or its call order breaks the moment a gate flag flips
  // (e.g. satelliteMonitoringBuilt going false -> true mid-session).
  const coach = useObservatoryCoach()
  const isDesktop = useIsDesktop()

  if (!player.freeOperations) {
    return (
      <GateScreen
        eyebrow="EARTH BASE / LOCKED"
        icon={<Satellite size={22} />}
        tone="amber"
        title="Free Operations Required"
        body="TESS candidate downlinks unlock after the starter contract arc."
        onBack={onBack}
      />
    )
  }

  if (!player.satelliteMonitoringBuilt) {
    return (
      <GateScreen
        eyebrow="EARTH BASE / SMS REQUIRED"
        icon={<Satellite size={22} />}
        tone="cyan"
        title="Build Satellite Monitoring Station"
        body="Place the Earth-base SMS before launching a transit telescope."
        onBack={onBack}
        action={<PrimaryBtn testId="build-sms-btn" onClick={onBuildStation}>Build SMS</PrimaryBtn>}
      />
    )
  }

  if (!player.transitSatelliteLaunchedAt) {
    return (
      <GateScreen
        eyebrow="EARTH BASE / TELESCOPE"
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
        eyebrow="EARTH BASE / DAILY DOWNLINK"
        icon={<Satellite size={22} />}
        tone="cyan"
        title="Acquiring Signal"
        body="Pulling the day's unresolved TESS transit anomaly from the shared feed."
        onBack={onBack}
      />
    )
  }

  if (!candidate) {
    return (
      <GateScreen
        eyebrow="EARTH BASE / DAILY DOWNLINK"
        icon={<Radio size={22} />}
        tone="amber"
        title={loadFailed ? 'Live Feed Unavailable' : 'No Reviewable Anomaly'}
        body={loadFailed
          ? 'The shared TESS subject feed could not be reached. Check back later.'
          : 'Every live TESS transit subject is currently confirmed, rejected, or already resolved by consensus.'}
        onBack={onBack}
        devBar={process.env.NODE_ENV === 'development' ? (
          <DevDaySkipBar offset={devDayOffset} onAdvance={() => setDevDayOffset(o => o + 1)} onReset={() => setDevDayOffset(0)} />
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
  const stats = deriveObservatoryStats(candidate, points, activeRanges)
  const showCoach = coach.visible && !classification
  const visitedIds = new Set(Object.keys(classifications))
  const targetChosen = pendingTargetId ?? player.satelliteTargetId ?? null
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
    <Panel accent="var(--ln-amber)" style={{ padding: 12, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LiveDot active={!classification} />
                <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 18, color: '#e8f0fe' }}>{candidate.host}</div>
              </div>
              <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: '#6b7fa3', marginTop: 2 }}>
                {candidate.constellation.toUpperCase()} / {candidate.distanceLy} LY / S/N {candidate.signalToNoise.toFixed(1)} / {candidate.periodDays.toFixed(1)}D
              </div>
            </div>
            <StatusPill kind={classification ? 'ok' : 'info'}>
              {classification ? classification.verdict.replace('_', ' ').toUpperCase() : 'REVIEW'}
            </StatusPill>
          </div>

          <div
            data-testid="tess-data-provenance"
            style={{
              fontFamily: 'var(--ln-font-mono)', fontSize: 8, letterSpacing: '0.06em', color: '#4a5a75',
              textTransform: 'uppercase', marginBottom: 8, marginTop: -4,
            }}
          >
            Real light-curve data · NASA TESS / Planet Hunters — your call feeds live classification consensus
          </div>

          {!classification && sectors.length > 1 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {sectors.map((sector, index) => (
                <button
                  key={sector.label}
                  data-testid={`sector-pill-${index}`}
                  onClick={() => setSectorIndex(index)}
                  style={{
                    padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                    border: `1px solid ${index === sectorIndex ? 'rgba(245,166,35,0.6)' : 'rgba(112,217,234,0.2)'}`,
                    background: index === sectorIndex ? 'rgba(245,166,35,0.14)' : 'rgba(20,20,23,0.5)',
                    color: index === sectorIndex ? 'var(--ln-amber)' : 'var(--ln-text-muted)',
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
              marginBottom: 8, padding: '8px 10px', borderRadius: 8,
              background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.4)',
            }}>
              <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: 'var(--ln-amber)' }}>
                A candidate was just confirmed as a real planet
              </span>
              <button
                onClick={() => setForceMapView(true)}
                style={{
                  padding: '5px 10px', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
                  border: '1px solid rgba(245,166,35,0.6)', background: 'rgba(245,166,35,0.2)',
                  color: 'var(--ln-amber-bright)', fontFamily: 'var(--ln-font-display)', fontSize: 9,
                  fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                }}
              >
                Point Satellite Now
              </button>
            </div>
          )}

          {/* Viewport: the lightcurve while reviewing, replaced by the
              galaxy star map (pick tomorrow's target) once classified, or
              immediately via the re-pick banner above. */}
          <TelescopeConsole
            sector={showMap ? 'TARGET SELECT' : (activeSector?.label ?? candidate.sector)}
            targetCount={showMap ? pool.length : 1}
            signal={candidate.signalToNoise}
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
                  onSelect={id => { setPendingTargetId(id); onChooseTarget(id); setForceMapView(false) }}
                  onOpenSol={() => setViewingSol(true)}
                  height={280}
                />
              )
            ) : (
              <ObservatoryChart
                points={sectorPoints}
                ranges={activeRanges}
                onRange={(x1, x2) => setRanges(prev => [...prev, { x1, x2 }])}
                onRemoveRange={index => setRanges(prev => prev.filter((_, current) => current !== index))}
                locked={false}
                height={280}
                yDomain={yDomain}
              />
            )}
          </TelescopeConsole>

          {showMap ? (
            <div style={{ marginTop: 8, textAlign: 'center', fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: targetChosen ? 'var(--ln-amber)' : '#5d7390' }}>
              {targetChosen
                ? `Target locked — ${pool.find(c => c.id === targetChosen)?.toi ?? targetChosen}`
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
            <div style={{ marginTop: 8, textAlign: 'center', fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: markCount > 0 ? 'var(--ln-amber)' : '#5d7390' }}>
              {markCount === 0
                ? 'Drag over the lightcurve to mark a transit'
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
            />
          ))}
        </div>
        {markCount > 0 && (
          <div style={{ marginTop: 8 }}>
            <GhostBtn onClick={() => setRanges([])}>CLEAR MARKS</GhostBtn>
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
      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: '#dbe8f8', lineHeight: 1.45 }}>
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
    <div className="game-screen" data-testid="tess-discovery-screen">
      <TopBar eyebrow="INSTRUMENT DATA FEED · DAILY DOWNLINK" title={candidate.toi} onBack={onBack} />
      {process.env.NODE_ENV === 'development' && (
        <div style={{ position: 'absolute', top: 72, left: 'var(--ln-s-4)', right: 'var(--ln-s-4)', zIndex: 5 }}>
          <DevDaySkipBar offset={devDayOffset} onAdvance={() => setDevDayOffset(o => o + 1)} onReset={() => setDevDayOffset(0)} />
        </div>
      )}
      {isDesktop ? (
        <div data-testid="tess-discovery-desktop-grid" style={{ position: 'absolute', inset: 0, top: 72, display: 'grid', gridTemplateColumns: '55% 45%', gap: 16, padding: '0 var(--ln-s-4) var(--ln-s-4)' }}>
          <div style={{ overflowY: 'auto' }} data-ui-zone={UI_ZONES.screenContent}>
            {chartPanel(false)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
            <ObservatoryReadout stats={stats} />
            {payoffPanel}
            <CommentsPanel recordType="classification" recordId={candidate.id} />
            <div style={{ marginTop: 'auto' }} data-ui-zone={UI_ZONES.bottomActions}>
              {verdictActions}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={`screen-scroll${!classification && markCount > 0 ? ' screen-scroll--tall-actions' : ''}`} data-ui-zone={UI_ZONES.screenContent}>
            {chartPanel(true)}
            {payoffPanel && <div style={{ marginTop: 12 }}>{payoffPanel}</div>}
            <div style={{ marginTop: 12 }}>
              <CommentsPanel recordType="classification" recordId={candidate.id} />
            </div>
          </div>
          <div className="sticky-actions" data-ui-zone={UI_ZONES.bottomActions}>
            {verdictActions}
          </div>
        </>
      )}

      {showCoach && <ObservatoryCoach onDismiss={coach.dismiss} />}
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
  const accent = tone === 'amber' ? 'var(--ln-amber)' : 'var(--ln-cyan)'
  const bg = tone === 'amber' ? 'rgba(245,166,35,0.12)' : 'rgba(57,211,239,0.12)'
  const border = tone === 'amber' ? 'rgba(245,166,35,0.42)' : 'rgba(57,211,239,0.42)'
  return (
    <div className="game-screen">
      <NebulaBackdrop />
      <TopBar eyebrow={eyebrow} title="Satellite Monitoring Station" onBack={onBack} />
      <div className="screen-scroll" data-ui-zone={UI_ZONES.screenContent}>
        {devBar}
        <Panel accent={accent} style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, display: 'grid', placeItems: 'center', background: bg, border: `1px solid ${border}`, color: accent }}>
              {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 15, color: accent }}>{title}</div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', marginTop: 2 }}>{body}</div>
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
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 10,
      borderRadius: 7, border: '1px dashed var(--ln-hairline-strong)', background: 'rgba(20,20,23,0.6)',
    }}>
      <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: 'var(--ln-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        DEV · Simulated day {simulated.toISOString().slice(0, 10)} ({offset >= 0 ? '+' : ''}{offset}d)
      </span>
      <span style={{ flex: 1 }} />
      <button data-testid="tess-dev-skip-day" onClick={onAdvance} style={{
        padding: '3px 8px', borderRadius: 5, border: '1px solid var(--ln-cyan-border)', background: 'var(--ln-cyan-soft)',
        color: 'var(--ln-cyan)', fontFamily: 'var(--ln-font-mono)', fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', cursor: 'pointer',
      }}>
        +1 DAY
      </button>
      {offset !== 0 && (
        <button data-testid="tess-dev-reset-day" onClick={onReset} style={{
          padding: '3px 8px', borderRadius: 5, border: '1px solid var(--ln-hairline-strong)', background: 'transparent',
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
      boxShadow: active ? '0 0 6px var(--ln-ok)' : 'none',
      animation: active ? 'ln-pulse 1.4s ease-in-out infinite' : 'none',
    }} />
  )
}

function VerdictButton({ action, disabled, onClick }: { action: { id: TessVerdict; label: string; kind: 'amber' | 'cyan' | 'ghost' }; disabled: boolean; onClick: () => void }) {
  const palette: Record<typeof action.kind, { border: string; bg: string; color: string; glow: string }> = {
    amber: { border: 'rgba(245,166,35,0.7)', bg: 'linear-gradient(180deg, rgba(245,166,35,0.28), rgba(232,112,64,0.18))', color: 'var(--ln-amber-bright)', glow: 'rgba(245,166,35,0.4)' },
    cyan:  { border: 'rgba(112,217,234,0.6)', bg: 'rgba(112,217,234,0.12)', color: 'var(--ln-cyan-bright)', glow: 'rgba(112,217,234,0.35)' },
    ghost: { border: 'rgba(169,184,206,0.25)', bg: 'rgba(20,20,23,0.5)', color: 'var(--ln-text-muted)', glow: 'transparent' },
  }
  const p = palette[action.kind]
  return (
    <button
      data-testid={`tess-verdict-${action.id}`}
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
        boxShadow: disabled ? 'none' : `0 0 14px ${p.glow}`,
      }}
    >
      {action.label}
    </button>
  )
}
