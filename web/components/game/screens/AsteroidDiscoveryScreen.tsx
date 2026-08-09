'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Radio, Telescope } from 'lucide-react'
import TopBar from '@/components/ui/TopBar'
import StatCard from '@/components/ui/StatCard'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { PrimaryBtn } from '@/components/ui/Button'
import CommentsPanel from '@/components/game/CommentsPanel'
import NebulaBackdrop from '@/components/game/NebulaBackdrop'
import type { AsteroidCandidate, AsteroidClassification, AsteroidVerdict } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import { UI_ZONES } from '@/lib/ui-zones'
import { fetchReviewableAsteroidCandidates } from '@/lib/asteroid-subjects'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import { instrumentDigestDateKey, unresolvedDeepSpaceInstrumentDigest } from '@/lib/systems/InstrumentFeedSystem'
import AsteroidDiscoveryCoach, { useAsteroidDiscoveryCoach } from '@/components/game/AsteroidDiscoveryCoach'

interface AsteroidDiscoveryScreenProps {
  player: Player
  onBack: () => void
  onBuildTelescope: () => void
  onSubmit: (candidateId: string, verdict: AsteroidVerdict) => void
}

// Real, live MPC NEOCP feed — a candidate is either flagged for priority
// follow-up (a real observatory would chase it), marked as a likely
// non-astronomical artifact (satellite glint, cosmic ray, processing
// error), or skipped. No mark-then-submit interaction like TESS transits —
// the readout is the raw NEOCP row, so the verdict is a direct read call.
const VERDICT_ACTIONS: Array<{ id: AsteroidVerdict; label: string; kind: 'amber' | 'cyan' | 'ghost' }> = [
  { id: 'likely_real', label: 'Flag Likely Real', kind: 'amber' },
  { id: 'likely_artifact', label: 'Mark Artifact', kind: 'cyan' },
  { id: 'unsure', label: 'Skip', kind: 'ghost' },
]

export default function AsteroidDiscoveryScreen({ player, onBack, onBuildTelescope, onSubmit }: AsteroidDiscoveryScreenProps) {
  // Stabilize the fallback so the fetch effect below (keyed on `classifications`)
  // doesn't get a new object identity every render when the field is unset —
  // e.g. preset-loaded dev state, which bypasses normalizeAndRepair()'s
  // default backfill. A fresh `{}` each render re-fires the effect
  // indefinitely, and each new fetch cancels the previous one before it can
  // resolve, so the screen never leaves its loading state.
  const classifications = useMemo(() => player.asteroidClassifications ?? {}, [player.asteroidClassifications])
  const [candidate, setCandidate] = useState<AsteroidCandidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  // Dev/staging-only day-skip, same rationale as TessDiscoveryScreen's
  // devDayOffset — the daily pool is keyed by real calendar date.
  const [devDayOffset, setDevDayOffset] = useState(0)

  useEffect(() => {
    if (!player.freeOperations || !player.deepSpaceTelescopeBuilt) {
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
        const nextDaily = unresolvedDeepSpaceInstrumentDigest(liveCandidates, player, today)[0]
        setCandidate(nextDaily ?? null)
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
    // KES-116: `classifications` is deliberately NOT a dependency here.
    // submitAsteroidClassification() writes straight into
    // player.asteroidClassifications, which used to re-trigger this effect
    // immediately after every submission -- re-deriving "unresolved"
    // candidates correctly filtered out the one just classified, nulling
    // `candidate` before the "ANNOTATION SAVED" panel (keyed on
    // classifications[candidate.id] via the `classification` const below)
    // ever got a render frame. At the default one-candidate-per-day
    // telescope level this made the confirmation unreachable for every
    // player. `classification` is still derived fresh from `classifications`
    // on every render, so the confirmation state itself is never stale --
    // this just stops a fresh submission from clearing the candidate the
    // player is still looking at. A new candidate is only fetched on mount
    // or when the telescope/day actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.freeOperations, player.deepSpaceTelescopeBuilt, player.deepSpaceTelescopeLevel, devDayOffset])

  const isDesktop = useIsDesktop()
  const coach = useAsteroidDiscoveryCoach()

  if (!player.freeOperations) {
    return (
      <GateScreen
        eyebrow="EARTH BASE / LOCKED"
        icon={<Telescope size={22} />}
        tone="amber"
        title="Free Operations Required"
        body="NEOCP candidate downlinks unlock after the starter contract arc."
        onBack={onBack}
      />
    )
  }

  if (!player.deepSpaceTelescopeBuilt) {
    return (
      <GateScreen
        eyebrow="EARTH BASE / TELESCOPE REQUIRED"
        icon={<Telescope size={22} />}
        tone="cyan"
        title="Build Deep Space Telescope"
        body="Place the Earth-base Deep Space Telescope to start receiving NEOCP asteroid candidates."
        onBack={onBack}
        action={<PrimaryBtn testId="build-deep-space-telescope-btn" onClick={onBuildTelescope}>Build Telescope</PrimaryBtn>}
      />
    )
  }

  if (loading) {
    return (
      <GateScreen
        eyebrow="EARTH BASE / DAILY DOWNLINK"
        icon={<Telescope size={22} />}
        tone="cyan"
        title="Acquiring Signal"
        body="Pulling the day's unresolved NEOCP candidate from the shared feed."
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
        title={loadFailed ? 'Live Feed Unavailable' : 'No Reviewable Candidate'}
        body={loadFailed
          ? 'The shared NEOCP candidate feed could not be reached. Check back later.'
          : 'Every live NEOCP candidate is currently classified or has resolved off the feed.'}
        onBack={onBack}
        devBar={process.env.NODE_ENV === 'development' ? (
          <DevDaySkipBar offset={devDayOffset} onAdvance={() => setDevDayOffset(o => o + 1)} onReset={() => setDevDayOffset(0)} />
        ) : undefined}
      />
    )
  }

  const classification: AsteroidClassification | undefined = classifications[candidate.id]

  const castVerdict = (id: AsteroidVerdict) => {
    if (classification) return
    onSubmit(candidate.id, id)
  }

  const dataPanel = (
    <Panel accent="var(--ln-amber)" style={{ padding: 12, marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <LiveDot active={!classification} />
            <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 18, color: '#e8f0fe' }}>{candidate.tempDesig}</div>
          </div>
          <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: '#6b7fa3', marginTop: 2 }}>
            SCORE {candidate.score} / V{candidate.vMag.toFixed(1)} / DISC. {candidate.discoveryDate || 'UNKNOWN'}
          </div>
        </div>
        <StatusPill kind={classification ? 'ok' : 'info'}>
          {classification ? classification.verdict.replace('_', ' ').toUpperCase() : 'REVIEW'}
        </StatusPill>
      </div>

      <div
        data-testid="neocp-data-provenance"
        style={{
          fontFamily: 'var(--ln-font-mono)', fontSize: 8, letterSpacing: '0.06em', color: '#4a5a75',
          textTransform: 'uppercase', marginBottom: 10, marginTop: -4,
        }}
      >
        Real candidate data · Minor Planet Center NEOCP — your call feeds live follow-up prioritisation
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        <StatCard variant="readout" label="NEO Score" value={`${candidate.score}`} />
        <StatCard variant="readout" label="V Mag" value={candidate.vMag.toFixed(1)} />
        <StatCard variant="readout" label="H Mag" value={candidate.hMag.toFixed(1)} />
        <StatCard variant="readout" label="Observations" value={`${candidate.nObs}`} />
        <StatCard variant="readout" label="Arc" value={`${candidate.arcDays.toFixed(2)}D`} />
        <StatCard variant="readout" label="Not Seen" value={`${candidate.lastSeenDays.toFixed(1)}D`} />
        <StatCard variant="readout" label="R.A. (hrs)" value={candidate.ra.toFixed(4)} />
        <StatCard variant="readout" label="Decl. (deg)" value={candidate.decl.toFixed(4)} />
        <StatCard variant="readout" label="Discovered" value={candidate.discoveryDate || 'UNKNOWN'} />
      </div>
    </Panel>
  )

  const verdictActions = (
    classification ? (
      <div style={{ textAlign: 'center' }}>
        <StatusPill kind="ok">ANNOTATION SAVED</StatusPill>
      </div>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {VERDICT_ACTIONS.map(action => (
          <VerdictButton key={action.id} action={action} onClick={() => castVerdict(action.id)} />
        ))}
      </div>
    )
  )

  const payoffPanel = classification ? (
    <Panel accent={classification.verdict === 'likely_real' ? 'var(--ln-ok)' : 'var(--ln-cyan)'} style={{ padding: 12 }}>
      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: classification.verdict === 'likely_real' ? 'var(--ln-ok)' : 'var(--ln-cyan)', textTransform: 'uppercase', marginBottom: 6 }}>
        Annotation Logged
      </div>
      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: '#dbe8f8', lineHeight: 1.45 }}>
        Your call was saved to the review queue. First submissions award research XP — real NEO follow-up observers use this same score/arc/magnitude data to prioritise which candidates get chased before they drop off the confirmation page.
      </div>
    </Panel>
  ) : null

  return (
    <div className="game-screen" data-testid="asteroid-discovery-screen">
      <TopBar eyebrow="INSTRUMENT DATA FEED · DAILY DOWNLINK" title={candidate.tempDesig} onBack={onBack} />
      {coach.visible && <AsteroidDiscoveryCoach onDismiss={coach.dismiss} />}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ position: 'absolute', top: 72, left: 'var(--ln-s-4)', right: 'var(--ln-s-4)', zIndex: 5 }}>
          <DevDaySkipBar offset={devDayOffset} onAdvance={() => setDevDayOffset(o => o + 1)} onReset={() => setDevDayOffset(0)} />
        </div>
      )}
      {isDesktop ? (
        <div data-testid="asteroid-discovery-desktop-grid" style={{ position: 'absolute', inset: 0, top: 72, display: 'grid', gridTemplateColumns: '55% 45%', gap: 16, padding: '0 var(--ln-s-4) var(--ln-s-4)' }}>
          <div style={{ overflowY: 'auto' }} data-ui-zone={UI_ZONES.screenContent}>
            {dataPanel}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
            {payoffPanel}
            <CommentsPanel recordType="classification" recordId={candidate.id} />
            <div style={{ marginTop: 'auto' }} data-ui-zone={UI_ZONES.bottomActions}>
              {verdictActions}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="screen-scroll" data-ui-zone={UI_ZONES.screenContent}>
            {dataPanel}
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
    </div>
  )
}

// Standard gate/status screen — same shape as TessDiscoveryScreen's GateScreen.
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
      <TopBar eyebrow={eyebrow} title="Deep Space Telescope" onBack={onBack} />
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

// Dev/staging-only day-skip control — see devDayOffset comment above.
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
      <button data-testid="neocp-dev-skip-day" onClick={onAdvance} style={{
        padding: '3px 8px', borderRadius: 5, border: '1px solid var(--ln-cyan-border)', background: 'var(--ln-cyan-soft)',
        color: 'var(--ln-cyan)', fontFamily: 'var(--ln-font-mono)', fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', cursor: 'pointer',
      }}>
        +1 DAY
      </button>
      {offset !== 0 && (
        <button data-testid="neocp-dev-reset-day" onClick={onReset} style={{
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

function VerdictButton({ action, onClick }: { action: { id: AsteroidVerdict; label: string; kind: 'amber' | 'cyan' | 'ghost' }; onClick: () => void }) {
  const palette: Record<typeof action.kind, { border: string; bg: string; color: string; glow: string }> = {
    amber: { border: 'rgba(245,166,35,0.7)', bg: 'linear-gradient(180deg, rgba(245,166,35,0.28), rgba(232,112,64,0.18))', color: 'var(--ln-amber-bright)', glow: 'rgba(245,166,35,0.4)' },
    cyan:  { border: 'rgba(112,217,234,0.6)', bg: 'rgba(112,217,234,0.12)', color: 'var(--ln-cyan-bright)', glow: 'rgba(112,217,234,0.35)' },
    ghost: { border: 'rgba(169,184,206,0.25)', bg: 'rgba(20,20,23,0.5)', color: 'var(--ln-text-muted)', glow: 'transparent' },
  }
  const p = palette[action.kind]
  return (
    <button
      data-testid={`neocp-verdict-${action.id}`}
      onClick={onClick}
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
        cursor: 'pointer',
        boxShadow: `0 0 14px ${p.glow}`,
      }}
    >
      {action.label}
    </button>
  )
}
