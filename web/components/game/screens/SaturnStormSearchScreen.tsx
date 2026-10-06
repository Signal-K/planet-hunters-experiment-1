'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Radio, Telescope } from 'lucide-react'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { PrimaryBtn } from '@/components/ui/Button'
import CommentsPanel from '@/components/game/CommentsPanel'
import NebulaBackdrop from '@/components/game/NebulaBackdrop'
import {
  SATURN_QUESTION,
  type SaturnCandidate,
  type SaturnVerdict,
} from '@/lib/data'
import { fetchReviewableSaturnCandidates } from '@/lib/saturn-subjects'
import type { Player } from '@/lib/game-types'
import { UI_ZONES } from '@/lib/ui-zones'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import { instrumentDigestDateKey, pickInstrumentInspectCandidate, unresolvedSaturnInstrumentDigest } from '@/lib/systems/InstrumentFeedSystem'

interface SaturnStormSearchScreenProps {
  player: Player
  inspectSubjectId?: string
  onBack: () => void
  onLaunchImager: () => void
  onSubmit: (candidateId: string, verdict: SaturnVerdict) => void
}

// Copy of the asteroid verdict screen with the sky plot replaced by the
// Cassini frame. Yes / No / Maybe maps onto the shared classification flow.
const VERDICT_ACTIONS: Array<{ id: SaturnVerdict; label: string }> = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
  { id: 'maybe', label: 'Maybe' },
]

export default function SaturnStormSearchScreen({ player, inspectSubjectId, onBack, onLaunchImager, onSubmit }: SaturnStormSearchScreenProps) {
  const classifications = useMemo(() => player.saturnClassifications ?? {}, [player.saturnClassifications])
  const [candidate, setCandidate] = useState<SaturnCandidate | null>(null)
  const [loading, setLoading] = useState(true)
  const isDesktop = useIsDesktop()

  useEffect(() => {
    if (!player.freeOperations || !player.saturnImagerLaunchedAt) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchReviewableSaturnCandidates()
      .then(pool => {
        if (cancelled) return
        const digest = unresolvedSaturnInstrumentDigest(pool, player, instrumentDigestDateKey())
        setCandidate(pickInstrumentInspectCandidate(digest, inspectSubjectId))
      })
      .catch(() => { if (!cancelled) setCandidate(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // `classifications` is deliberately not a dependency: submitting must not
    // clear the frame before the "saved" confirmation renders (see KES-116 in
    // AsteroidDiscoveryScreen).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectSubjectId, player.freeOperations, player.saturnImagerLaunchedAt])

  if (!player.freeOperations) {
    return (
      <GateScreen
        eyebrow="BASE / LOCKED"
        icon={<Telescope size={22} />}
        title="Free Operations Required"
        body="Saturn imager downlinks unlock after the starter contract arc."
        onBack={onBack}
      />
    )
  }

  if (!player.saturnImagerLaunchedAt) {
    return (
      <GateScreen
        eyebrow="BASE / IMAGER REQUIRED"
        icon={<Telescope size={22} />}
        title="Launch Saturn Imager"
        body="Deploy the Saturn imager from the Launchpad to start receiving Cassini frames."
        onBack={onBack}
        action={<PrimaryBtn testId="launch-saturn-imager-btn" onClick={onLaunchImager}>OPEN LAUNCHPAD</PrimaryBtn>}
      />
    )
  }

  if (loading) {
    return (
      <GateScreen eyebrow="BASE / DAILY DOWNLINK" icon={<Telescope size={22} />} title="Acquiring Signal" body="Pulling today's Cassini frame." onBack={onBack} />
    )
  }

  if (!candidate) {
    return (
      <GateScreen
        eyebrow="BASE / DAILY DOWNLINK"
        icon={<Radio size={22} />}
        title="No Frame Available"
        body="Every available Cassini frame is already classified. New frames arrive with the next downlink."
        onBack={onBack}
      />
    )
  }

  const classification = classifications[candidate.id]

  const dataPanel = (
    <Panel accent="var(--ln-cyan)" style={{ padding: 12, marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 18, color: 'var(--ln-text)' }}>{candidate.opusId.toUpperCase()}</div>
          <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 14, color: 'var(--ln-text-muted)', marginTop: 4 }}>
            Cassini ISS · subject {candidate.subjectId}
          </div>
        </div>
        <StatusPill kind={classification ? 'ok' : 'info'}>
          {classification ? classification.verdict.toUpperCase() : 'REVIEW'}
        </StatusPill>
      </div>

      <div
        data-testid="saturn-data-provenance"
        style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 14, color: 'var(--ln-text-dim)', marginBottom: 12 }}
      >
        Real Cassini imaging data · Zooniverse Saturn Thunderstorm Search
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-testid="saturn-frame"
        src={candidate.imageUrl}
        alt={`Cassini frame ${candidate.opusId}`}
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8, border: '1px solid var(--ln-hairline-strong)', background: 'var(--ln-bg)' }}
      />

      <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 16, color: 'var(--ln-text)', marginTop: 16 }} data-testid="saturn-question">
        {SATURN_QUESTION}
      </div>
    </Panel>
  )

  const verdictActions = classification ? (
    <div style={{ textAlign: 'center' }}>
      <StatusPill kind="ok">ANNOTATION SAVED</StatusPill>
    </div>
  ) : (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
      {VERDICT_ACTIONS.map(action => (
        <button
          key={action.id}
          data-testid={`saturn-verdict-${action.id}`}
          onClick={() => onSubmit(candidate.id, action.id)}
          style={{
            minHeight: 48, borderRadius: 10, border: '1px solid var(--ln-cyan-border)', background: 'var(--ln-cyan-soft)',
            color: 'var(--ln-cyan-bright)', fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 14,
            letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  )

  const payoffPanel = classification ? (
    <Panel accent="var(--ln-ok)" style={{ padding: 12 }}>
      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--ln-ok)', textTransform: 'uppercase', marginBottom: 8 }}>
        Annotation Logged
      </div>
      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: 'var(--ln-text-dim)', lineHeight: 1.45 }}>
        Your call was saved. Cassini storm-cloud searches rely on many independent classifications of each frame before it is retired from the queue.
      </div>
    </Panel>
  ) : null

  return (
    <div className="game-screen theme-deep ln-scene-asteroid-discovery" data-testid="saturn-storm-search-screen">
      <TopBar eyebrow="INSTRUMENT DATA FEED · DAILY DOWNLINK" title={candidate.opusId.toUpperCase()} onBack={onBack} />
      {isDesktop ? (
        <div style={{ position: 'absolute', inset: 0, top: 72, display: 'grid', gridTemplateColumns: '55% 45%', gap: 16, padding: '0 var(--ln-s-4) var(--ln-s-4)' }}>
          <div style={{ overflowY: 'auto' }} data-ui-zone={UI_ZONES.screenContent}>{dataPanel}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
            {payoffPanel}
            <CommentsPanel recordType="classification" recordId={candidate.id} />
            <div data-ui-zone={UI_ZONES.bottomActions}>{verdictActions}</div>
          </div>
        </div>
      ) : (
        <>
          <div className="screen-scroll" data-ui-zone={UI_ZONES.screenContent}>
            {dataPanel}
            {payoffPanel && <div style={{ marginTop: 12 }}>{payoffPanel}</div>}
            <div style={{ marginTop: 12, paddingBottom: 64 }}>
              <CommentsPanel recordType="classification" recordId={candidate.id} />
            </div>
          </div>
          <div className="sticky-actions" data-ui-zone={UI_ZONES.bottomActions}>{verdictActions}</div>
        </>
      )}
    </div>
  )
}

function GateScreen({ eyebrow, icon, title, body, onBack, action }: {
  eyebrow: string
  icon: ReactNode
  title: string
  body: string
  onBack: () => void
  action?: ReactNode
}) {
  return (
    <div className="game-screen theme-deep ln-scene-asteroid-discovery">
      <NebulaBackdrop />
      <TopBar eyebrow={eyebrow} title="Saturn Imager" onBack={onBack} />
      <div className="screen-scroll" data-ui-zone={UI_ZONES.screenContent}>
        <Panel accent="var(--ln-cyan)" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--ln-cyan-soft)', border: '1px solid var(--ln-cyan-border)', color: 'var(--ln-cyan)' }}>
              {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 16, color: 'var(--ln-cyan)' }}>{title}</div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: 'var(--ln-text-muted)', marginTop: 4 }}>{body}</div>
            </div>
          </div>
          {action && <div style={{ marginTop: 16 }}>{action}</div>}
        </Panel>
      </div>
    </div>
  )
}
