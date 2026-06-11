'use client'

import { useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { PrimaryBtn } from '@/components/ui/Button'
import LightcurvePlot from '../LightcurvePlot'

type Verdict = 'planet' | 'not_planet'

export default function ClassifyLightcurveScreen({ onBack, onSubmit, hasCoach, coachTarget }: {
  onBack: () => void
  onSubmit: (verdict: Verdict) => void
  hasCoach?: boolean
  coachTarget?: string | null
}) {
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleHandleSubmit = async (v: Verdict) => {
    setSubmitting(true)
    try {
      await onSubmit(v)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="game-screen classification-screen">
      <TopBar eyebrow="TESS SCIENCE · CANDIDATE 451" title="Classify Signal" onBack={onBack} />
      <div className={`screen-scroll classification-scroll ${hasCoach ? 'screen-scroll--coach' : ''}`}>
        <div className="classification-heading">
          <div>
            <span className="ln-micro">Target</span>
            <h2>TESS-451 b</h2>
          </div>
          <StatusPill kind="info">S/N 14.8</StatusPill>
        </div>

        <Panel accent="var(--ln-blue)">
          <div className="order-heading"><span>Transit Photometry</span><strong>Dynamic Folded</strong></div>
          <div className="my-4 bg-black/20 rounded-lg overflow-hidden border border-white/5 p-2">
            <LightcurvePlot />
          </div>
          <div className="classification-facts">
            <span><b>PERIOD</b> 4.12 d</span>
            <span><b>DEPTH</b> 2.7%</span>
            <span><b>EVENTS</b> 3</span>
          </div>
        </Panel>

        <div>
          <span className="ln-micro">Your Classification</span>
          <p className="classification-copy">Does the repeating U-shaped dip look like a planet crossing its host star?</p>
        </div>

        <div className="verdict-grid">
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

        {verdict && (
          <Panel accent={verdict === 'planet' ? 'var(--ln-ok)' : 'var(--ln-crit)'}>
            <div className="classification-ready">
              <StatusPill kind={verdict === 'planet' ? 'ok' : 'crit'}>{verdict === 'planet' ? 'Candidate Confirmed' : 'False Positive Flagged'}</StatusPill>
              <span>Ready to transmit to the science database.</span>
            </div>
          </Panel>
        )}
      </div>
      <div className="sticky-actions">
        <PrimaryBtn
          kind="amber"
          disabled={!verdict || submitting}
          onClick={() => verdict && handleHandleSubmit(verdict)}
          highlight={coachTarget === 'submit-classification-btn' && !!verdict && !submitting}
        >
          {submitting ? 'Transmitting...' : 'Submit Classification'}
        </PrimaryBtn>
      </div>
    </div>
  )
}
