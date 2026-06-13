'use client'

import { useState } from 'react'
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { PrimaryBtn } from '@/components/ui/Button'
import LightcurvePlot from '../LightcurvePlot'

type Verdict = 'planet' | 'not_planet'

const SWIPE_THRESHOLD = 90
const SWIPE_VELOCITY = 500

export default function ClassifyLightcurveScreen({ onBack, onSubmit, hasCoach, classificationError }: {
  onBack: () => void
  onSubmit: (verdict: Verdict) => void
  hasCoach?: boolean
  classificationError?: string | null
}) {
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const dragX = useMotionValue(0)
  const cardRotate = useTransform(dragX, [-160, 0, 160], [-8, 0, 8])
  const planetStampOpacity = useTransform(dragX, [0, SWIPE_THRESHOLD], [0, 1])
  const notPlanetStampOpacity = useTransform(dragX, [-SWIPE_THRESHOLD, 0], [1, 0])

  const handleHandleSubmit = async (v: Verdict) => {
    setSubmitting(true)
    try {
      await onSubmit(v)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDragEnd = (_e: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (submitting) return
    const { offset, velocity } = info
    if (offset.x > SWIPE_THRESHOLD || velocity.x > SWIPE_VELOCITY) {
      setVerdict('planet')
    } else if (offset.x < -SWIPE_THRESHOLD || velocity.x < -SWIPE_VELOCITY) {
      setVerdict('not_planet')
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

        <motion.div
          className="swipe-card"
          data-testid="classify-swipe-card"
          style={{ x: dragX, rotate: cardRotate }}
          drag="x"
          dragElastic={0.6}
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          whileTap={{ cursor: 'grabbing' }}
        >
          <motion.div className="swipe-stamp swipe-stamp--planet" style={{ opacity: planetStampOpacity }}>
            PLANET
          </motion.div>
          <motion.div className="swipe-stamp swipe-stamp--not-planet" style={{ opacity: notPlanetStampOpacity }}>
            NOT PLANET
          </motion.div>
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
        </motion.div>

        <div>
          <span className="ln-micro">Your Classification</span>
          <p className="classification-copy">Does the repeating U-shaped dip look like a planet crossing its host star?</p>
          <p className="classification-hint">Swipe the chart right for Planet, left for Not Planet — or tap a verdict below.</p>
        </div>

        <div className="verdict-grid">
          <button
            data-testid="classify-verdict-planet"
            className={verdict === 'planet' ? 'selected' : ''}
            onClick={() => setVerdict('planet')}
            disabled={submitting}
          >
            <span className="verdict-orbit"><i /></span>
            <strong>Planet</strong>
            <small>Consistent transit</small>
          </button>
          <button
            data-testid="classify-verdict-not-planet"
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
            <div className="classification-ready" data-testid="classify-verdict-ready">
              <StatusPill kind={verdict === 'planet' ? 'ok' : 'crit'}>{verdict === 'planet' ? 'Candidate Confirmed' : 'False Positive Flagged'}</StatusPill>
              <span>Ready to transmit to the science database.</span>
            </div>
          </Panel>
        )}
      </div>
      {classificationError && (
        <div style={{ padding: '10px 14px' }}>
          <Panel accent="var(--ln-crit)" style={{ padding: 10 }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 12, color: '#ff5a6a' }}>Sync Error</div>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: '#ff8290', marginTop: 4 }}>{classificationError}</div>
            <div style={{ marginTop: 8 }}>
              <button onClick={() => handleHandleSubmit('planet')} style={{ padding: '4px 12px', background: 'rgba(255,90,106,0.2)', border: '1px solid #ff5a6a', borderRadius: 6, color: '#fff', fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                Retry
              </button>
            </div>
          </Panel>
        </div>
      )}
      <div className="sticky-actions">
        <PrimaryBtn
          kind="amber"
          testId="classify-submit-btn"
          disabled={!verdict || submitting}
          onClick={() => verdict && handleHandleSubmit(verdict)}
        >
          {submitting ? 'Transmitting...' : 'Submit Classification'}
        </PrimaryBtn>
      </div>
    </div>
  )
}
