'use client'

import { useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { PrimaryBtn } from '@/components/ui/Button'

type Verdict = 'planet' | 'not_planet'

const POINTS = [
  34, 33, 35, 32, 34, 33, 35, 34, 33, 32, 34, 35,
  34, 35, 43, 61, 72, 64, 45, 35, 34, 33, 35, 34,
  33, 35, 34, 32, 34, 35, 33, 34, 33, 35, 34, 32,
]

function Lightcurve() {
  const width = 344
  const height = 220
  const path = POINTS.map((value, index) => {
    const x = 10 + index * ((width - 20) / (POINTS.length - 1))
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${value}`
  }).join(' ')

  return (
    <div className="classification-plot" aria-label="TESS candidate lightcurve showing a repeating transit dip">
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <defs>
          <linearGradient id="dip-zone" x1="0" x2="1">
            <stop offset="0" stopColor="#3fa9ff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#3fa9ff" stopOpacity="0.18" />
            <stop offset="1" stopColor="#3fa9ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 6 }, (_, i) => <line key={`h${i}`} x1="10" x2="334" y1={22 + i * 32} y2={22 + i * 32} />)}
        {Array.from({ length: 9 }, (_, i) => <line key={`v${i}`} y1="18" y2="188" x1={10 + i * 40.5} x2={10 + i * 40.5} />)}
        <rect x="133" y="18" width="78" height="170" fill="url(#dip-zone)" />
        <path className="lightcurve-line" d={path} />
        {POINTS.map((value, index) => {
          const x = 10 + index * ((width - 20) / (POINTS.length - 1))
          return <circle key={index} cx={x} cy={value} r="2.2" />
        })}
        <path className="dip-marker" d="M 172 84 L 172 126 M 166 120 L 172 126 L 178 120" />
        <text x="184" y="117">TRANSIT DIP · 2.7%</text>
        <text x="10" y="210">TIME · 4.12 DAYS</text>
        <text x="255" y="210">NORMALIZED FLUX</text>
      </svg>
    </div>
  )
}

export default function ClassifyLightcurveScreen({ onBack, onSubmit, hasCoach }: {
  onBack: () => void
  onSubmit: (verdict: Verdict) => void
  hasCoach?: boolean
}) {
  const [verdict, setVerdict] = useState<Verdict | null>(null)

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
          <div className="order-heading"><span>Transit Photometry</span><strong>Folded</strong></div>
          <Lightcurve />
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
          <button className={verdict === 'planet' ? 'selected' : ''} onClick={() => setVerdict('planet')}>
            <span className="verdict-orbit"><i /></span>
            <strong>Planet</strong>
            <small>Consistent transit</small>
          </button>
          <button className={verdict === 'not_planet' ? 'selected negative' : ''} onClick={() => setVerdict('not_planet')}>
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
        <PrimaryBtn kind="amber" disabled={!verdict} onClick={() => verdict && onSubmit(verdict)}>Submit Classification</PrimaryBtn>
      </div>
    </div>
  )
}
