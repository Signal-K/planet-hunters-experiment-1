'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { PrimaryBtn, GhostBtn } from '@/components/ui/Button'
import LightcurvePlot, { type LightcurvePoint } from '@/components/game/LightcurvePlot'
import { pbShared } from '@/lib/pb'

type Verdict = 'planet' | 'not_planet' | 'unsure'

interface Subject {
  id: string
  tic_id: string
  toi_id: string
  sectors: string
  lightcurve_points: LightcurvePoint[]
  period_days: number
  depth_pct: number
  duration_hrs: number
}

interface ClassifyLightcurveScreenProps {
  onBack: () => void
  onSubmit: (verdict: Verdict, subjectId: string, dipMarkers: number[]) => void
  hasCoach?: boolean
  classificationError?: string | null
}

// Used when the API endpoint isn't reachable (dev environment or empty pool).
// lightcurve_points is empty so LightcurvePlot renders its synthetic fallback.
const FALLBACK_SUBJECT: Subject = {
  id: 'tess-451b',
  tic_id: '261136679',
  toi_id: '451',
  sectors: '1',
  lightcurve_points: [],
  period_days: 4.12,
  depth_pct: 2.7,
  duration_hrs: 1.8,
}

function estimatedPeriod(markers: number[]): number | null {
  if (markers.length < 2) return null
  const sorted = [...markers].sort((a, b) => a - b)
  return (sorted[sorted.length - 1] - sorted[0]) / (sorted.length - 1)
}

export default function ClassifyLightcurveScreen({
  onBack,
  onSubmit,
  hasCoach,
  classificationError,
}: ClassifyLightcurveScreenProps) {
  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [markers, setMarkers] = useState<number[]>([])
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setLoading(true)
    setMarkers([])
    setVerdict(null)

    pbShared.send('/api/ss/subjects/next?type=transit', { method: 'GET' })
      .then((data: Subject) => {
        // lightcurve_points may arrive as a JSON string from PocketBase
        let pts: LightcurvePoint[] = []
        if (typeof data.lightcurve_points === 'string') {
          try { pts = JSON.parse(data.lightcurve_points) } catch { pts = [] }
        } else {
          pts = data.lightcurve_points ?? []
        }
        setSubject({ ...data, lightcurve_points: pts })
        setLoading(false)
      })
      .catch(() => {
        // API not available (dev environment or empty pool) — use static
        // fallback so the classification step isn't gated on backend uptime.
        setSubject(FALLBACK_SUBJECT)
        setLoading(false)
      })
  }, [])

  function handleMarker(x: number) {
    if (x < 0) {
      // Negative x signals removal of marker at Math.abs(x)
      setMarkers(prev => prev.filter(m => Math.abs(m - Math.abs(x)) >= 0.4))
      return
    }
    setMarkers(prev => {
      if (prev.includes(x)) return prev
      return [...prev, x]
    })
  }

  function clearMarkers() { setMarkers([]) }

  async function handleSubmit(v: Verdict) {
    if (!subject) return
    setSubmitting(true)
    try {
      await onSubmit(v, subject.id, markers)
    } finally {
      setSubmitting(false)
    }
  }

  const period = estimatedPeriod(markers)
  const canSubmit = !!verdict && !submitting

  // --- Loading / error states ---
  if (loading) {
    return (
      <div className="game-screen classification-screen">
        <TopBar eyebrow="TESS SCIENCE" title="Classify Signal" onBack={onBack} />
        <div className="screen-scroll" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
          <StatusPill kind="info">Loading subject…</StatusPill>
        </div>
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="game-screen classification-screen">
        <TopBar eyebrow="TESS SCIENCE" title="Classify Signal" onBack={onBack} />
        <div className="screen-scroll" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
          <StatusPill kind="info">Loading subject…</StatusPill>
        </div>
      </div>
    )
  }

  // --- Main classification UI ---
  return (
    <div className="game-screen classification-screen">
      <TopBar
        eyebrow={`TESS SCIENCE · TIC ${subject.tic_id}`}
        title="Classify Signal"
        onBack={onBack}
      />

      <div className={`screen-scroll classification-scroll ${hasCoach ? 'screen-scroll--coach' : ''}`}>

        {/* Subject metadata */}
        <div className="classification-heading">
          <div>
            <span className="ln-micro">Target</span>
            <h2>TOI-{subject.toi_id || subject.tic_id}</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            <StatusPill kind="info">Depth {subject.depth_pct.toFixed(2)}%</StatusPill>
            {subject.sectors && <StatusPill kind="mute">Sector {subject.sectors}</StatusPill>}
          </div>
        </div>

        {/* Interactive lightcurve */}
        <Panel accent="var(--ln-blue)">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div className="order-heading" style={{ margin: 0 }}>
              <span>Raw Photometry</span>
              <strong>Tap chart to mark dips</strong>
            </div>
            {markers.length > 0 && (
              <GhostBtn onClick={clearMarkers}>Clear</GhostBtn>
            )}
          </div>
          <LightcurvePlot
            points={subject.lightcurve_points}
            markers={markers}
            onMarker={handleMarker}
            height={200}
          />

          {/* Hint shown until first marker */}
          {markers.length === 0 && (
            <div style={{ marginTop: 6, fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: '#5d7390', letterSpacing: '0.1em', textAlign: 'center' }}>
              TAP THE CHART WHERE YOU SEE A DIP · TAP AGAIN TO REMOVE
            </div>
          )}

          {/* Marker count + period estimate */}
          {markers.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <StatusPill kind="amber">{markers.length} dip{markers.length !== 1 ? 's' : ''} marked</StatusPill>
              {period != null && (
                <StatusPill kind="ok">
                  Est. period · {period.toFixed(2)} d
                </StatusPill>
              )}
              {markers.length === 1 && (
                <StatusPill kind="mute">Mark another dip to estimate period</StatusPill>
              )}
            </div>
          )}

          {/* Known period for context (shown after 1+ markers) */}
          {markers.length > 0 && subject.period_days > 0 && (
            <div style={{ marginTop: 6, fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: '#5d7390', letterSpacing: '0.1em' }}>
              ARCHIVE PERIOD · {subject.period_days.toFixed(2)} d · {subject.duration_hrs.toFixed(1)} hr DURATION
            </div>
          )}
        </Panel>

        {/* Classification question */}
        <div>
          <span className="ln-micro">Your Classification</span>
          <p className="classification-copy">
            Does the repeating dip pattern look like a planet crossing its host star?
          </p>
        </div>

        {/* Verdict grid — planet / not planet / unsure */}
        <div className="verdict-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            className={verdict === 'planet' ? 'selected' : ''}
            onClick={() => setVerdict('planet')}
            disabled={submitting}
          >
            <span className="verdict-orbit"><i /></span>
            <strong>Planet</strong>
            <small>Consistent transit</small>
          </button>
          <button
            className={verdict === 'not_planet' ? 'selected negative' : ''}
            onClick={() => setVerdict('not_planet')}
            disabled={submitting}
          >
            <span className="verdict-cross">×</span>
            <strong>Not Planet</strong>
            <small>Noise or binary</small>
          </button>
        </div>
        <button
          onClick={() => setVerdict('unsure')}
          disabled={submitting}
          style={{
            width: '100%', marginTop: 6, padding: '10px 14px',
            background: verdict === 'unsure' ? 'rgba(122,130,148,0.25)' : 'rgba(8,12,22,0.6)',
            border: `1px solid ${verdict === 'unsure' ? 'rgba(122,130,148,0.7)' : 'rgba(122,130,148,0.3)'}`,
            borderRadius: 8, cursor: 'pointer',
            fontFamily: 'var(--ln-font-display)', fontWeight: 700, fontSize: 11,
            letterSpacing: '0.14em', color: verdict === 'unsure' ? '#e6efff' : '#7a8294',
            textTransform: 'uppercase',
          }}
        >
          Not Sure
        </button>

        {verdict && (
          <Panel accent={verdict === 'planet' ? 'var(--ln-ok)' : verdict === 'not_planet' ? 'var(--ln-crit)' : 'var(--ln-text-muted)'}>
            <div className="classification-ready">
              <StatusPill kind={verdict === 'planet' ? 'ok' : verdict === 'not_planet' ? 'crit' : 'mute'}>
                {verdict === 'planet' ? 'Candidate Confirmed' : verdict === 'not_planet' ? 'False Positive Flagged' : 'Flagged for Review'}
              </StatusPill>
              <span>Ready to transmit to the science database.</span>
            </div>
          </Panel>
        )}

        {classificationError && (
          <Panel accent="var(--ln-crit)" style={{ padding: 10 }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 12, color: '#ff5a6a' }}>Sync Error</div>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: '#ff8290', marginTop: 4 }}>{classificationError}</div>
          </Panel>
        )}
      </div>

      <div className="sticky-actions">
        <PrimaryBtn
          kind="amber"
          disabled={!canSubmit}
          onClick={() => verdict && handleSubmit(verdict)}
        >
          {submitting ? 'Transmitting…' : 'Submit Classification'}
        </PrimaryBtn>
      </div>
    </div>
  )
}
