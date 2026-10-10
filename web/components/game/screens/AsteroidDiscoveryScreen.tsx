'use client'

import { useEffect, useMemo, useState } from 'react'
import { GhostBtn, PrimaryBtn } from '@/components/ui/Button'
import AsteroidSkyPlot from '@/components/game/AsteroidSkyPlot'
import InstrumentViewport, { InstrumentAnswerRow, InstrumentDevDayBar, InstrumentStandbyViewport } from '@/components/game/instrument-viewport/InstrumentViewport'
import viewportStyles from '@/components/game/instrument-viewport/InstrumentViewport.module.css'
import type { AsteroidCandidate, AsteroidClassification, AsteroidVerdict } from '@/lib/data'
import type { Player } from '@/lib/game-types'
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

  const devBar = process.env.NODE_ENV === 'development' ? (
    <InstrumentDevDayBar testIdPrefix="neocp" offset={devDayOffset} onAdvance={() => setDevDayOffset(offset => offset + 1)} onReset={() => setDevDayOffset(0)} />
  ) : undefined

  if (!player.freeOperations) {
    return (
      <InstrumentStandbyViewport
        testId="asteroid-discovery-standby"
        sceneClassName="ln-scene-asteroid-discovery"
        eyebrow="BASE / LOCKED"
        title="Deep Space Telescope"
        onBack={onBack}
        status="LOCKED"
        messageTitle="Free Operations Required"
        messageBody="NEOCP candidate downlinks unlock after the starter contract arc."
      />
    )
  }

  if (!player.deepSpaceTelescopeBuilt) {
    return (
      <InstrumentStandbyViewport
        testId="asteroid-discovery-standby"
        sceneClassName="ln-scene-asteroid-discovery"
        eyebrow="BASE / TELESCOPE REQUIRED"
        title="Deep Space Telescope"
        onBack={onBack}
        status="NO TELESCOPE"
        messageTitle="Launch Deep Space Telescope"
        messageBody="Deploy the Deep Space Telescope from the Launchpad to start receiving NEOCP asteroid candidates."
        answers={<PrimaryBtn testId="launch-deep-space-telescope-btn" onClick={onLaunchTelescope}>OPEN LAUNCHPAD</PrimaryBtn>}
      />
    )
  }

  if (loading) {
    return (
      <InstrumentStandbyViewport
        testId="asteroid-discovery-standby"
        sceneClassName="ln-scene-asteroid-discovery"
        eyebrow="BASE / DAILY DOWNLINK"
        title="Deep Space Telescope"
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
        eyebrow="BASE / DAILY DOWNLINK"
        title="Deep Space Telescope"
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
      devBar={devBar}
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
