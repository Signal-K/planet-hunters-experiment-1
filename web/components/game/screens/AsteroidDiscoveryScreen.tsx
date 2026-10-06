'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Radio, Telescope } from 'lucide-react'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import { GhostBtn, PrimaryBtn } from '@/components/ui/Button'
import NebulaBackdrop from '@/components/game/NebulaBackdrop'
import AsteroidSkyPlot from '@/components/game/AsteroidSkyPlot'
import InstrumentViewport, { InstrumentAnswerRow, InstrumentDevDayBar } from '@/components/game/instrument-viewport/InstrumentViewport'
import viewportStyles from '@/components/game/instrument-viewport/InstrumentViewport.module.css'
import type { AsteroidCandidate, AsteroidClassification, AsteroidVerdict } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import { UI_ZONES } from '@/lib/ui-zones'
import { fetchReviewableAsteroidCandidates } from '@/lib/asteroid-subjects'
import { sharedBackendMisconfigured } from '@/lib/pb-config'
import { instrumentDigestDateKey, pickInstrumentInspectCandidate, unresolvedDeepSpaceInstrumentDigest } from '@/lib/systems/InstrumentFeedSystem'

interface AsteroidDiscoveryScreenProps {
  player: Player
  inspectSubjectId?: string
  /** Fixed record supplied only by the named visual dev preset. */
  visualCandidate?: AsteroidCandidate
  onBack: () => void
  onLaunchTelescope: () => void
  onSubmit: (candidateId: string, verdict: AsteroidVerdict) => void
}

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

  useEffect(() => {
    if (visualCandidate) {
      setCandidate(visualCandidate)
      setLoadFailed(false)
      setLoading(false)
      return
    }
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
  }, [visualCandidate, inspectSubjectId, player.freeOperations, player.deepSpaceTelescopeBuilt, player.deepSpaceTelescopeLevel, devDayOffset, retryToken])

  if (!player.freeOperations) {
    return (
      <GateScreen
        eyebrow="BASE / LOCKED"
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
        eyebrow="BASE / TELESCOPE REQUIRED"
        icon={<Telescope size={22} />}
        tone="cyan"
        title="Launch Deep Space Telescope"
        body="Deploy the Deep Space Telescope from the Launchpad to start receiving NEOCP asteroid candidates."
        onBack={onBack}
        action={<PrimaryBtn testId="launch-deep-space-telescope-btn" onClick={onLaunchTelescope}>OPEN LAUNCHPAD</PrimaryBtn>}
      />
    )
  }

  if (loading) {
    return (
      <GateScreen
        eyebrow="BASE / DAILY DOWNLINK"
        icon={<Telescope size={22} />}
        tone="cyan"
        title="Acquiring Signal"
        body="Pulling the day's unresolved NEOCP candidate from the shared feed."
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
        title={misconfigured ? 'Feed Not Configured' : loadFailed ? 'Live Feed Unavailable' : 'No Reviewable Candidate'}
        body={misconfigured
          ? 'This build has no shared backend configured. Reloading will not help — this needs a deploy fix.'
          : loadFailed
            ? 'The shared NEOCP candidate feed could not be reached.'
            : 'Every live NEOCP candidate is currently classified or has resolved off the feed.'}
        onBack={onBack}
        action={loadFailed && !misconfigured ? (
          <GhostBtn onClick={() => setRetryToken(token => token + 1)}>Retry Downlink</GhostBtn>
        ) : undefined}
        devBar={process.env.NODE_ENV === 'development' ? (
          <InstrumentDevDayBar testIdPrefix="neocp" offset={devDayOffset} onAdvance={() => setDevDayOffset(offset => offset + 1)} onReset={() => setDevDayOffset(0)} />
        ) : undefined}
      />
    )
  }

  const classification: AsteroidClassification | undefined = classifications[candidate.id]

  const castVerdict = (id: AsteroidVerdict) => {
    if (classification) return
    onSubmit(candidate.id, id)
  }

  return (
    <InstrumentViewport
      testId="asteroid-discovery-screen"
      sceneClassName="ln-scene-asteroid-discovery"
      eyebrow="INSTRUMENT DATA FEED · DAILY DOWNLINK"
      title={candidate.tempDesig}
      onBack={onBack}
      status={classification ? 'ANNOTATION SAVED' : 'REVIEW'}
      devBar={process.env.NODE_ENV === 'development' ? (
        <InstrumentDevDayBar testIdPrefix="neocp" offset={devDayOffset} onAdvance={() => setDevDayOffset(offset => offset + 1)} onReset={() => setDevDayOffset(0)} />
      ) : undefined}
      caption={(
        <p className={viewportStyles.caption} data-testid="neocp-data-provenance">
          RA {candidate.ra.toFixed(4)}h · DEC {candidate.decl.toFixed(4)}°
        </p>
      )}
      viewport={(
        <AsteroidSkyPlot
          tempDesig={candidate.tempDesig}
          ra={candidate.ra}
          decl={candidate.decl}
          vMag={candidate.vMag}
          arcDays={candidate.arcDays}
          lastSeenDays={candidate.lastSeenDays}
        />
      )}
      answers={classification ? (
        <div className={viewportStyles.saved}>Annotation saved</div>
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
    <div className="game-screen theme-deep ln-scene-asteroid-discovery">
      <NebulaBackdrop />
      <TopBar eyebrow={eyebrow} title="Deep Space Telescope" onBack={onBack} />
      <div className="screen-scroll" data-ui-zone={UI_ZONES.screenContent}>
        {devBar}
        <Panel accent={accent} style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: bg, border: `1px solid ${border}`, color: accent }}>
              {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 16, color: accent }}>{title}</div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: 'var(--ln-text-muted)', marginTop: 4 }}>{body}</div>
            </div>
          </div>
          {action && <div style={{ marginTop: 16 }}>{action}</div>}
        </Panel>
      </div>
    </div>
  )
}
