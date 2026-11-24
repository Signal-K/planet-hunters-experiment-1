'use client'

import { useMemo, useState } from 'react'
import { MINERAL_META, type Target } from '@/lib/data'
import type { ProbeRecord } from '@/lib/probes/survey-probe'
import { BAND_MIN_NM, BAND_MAX_NM, bodyBands, probeAnalysisResult, sectorSpectrum } from '@/lib/probes/survey-probe'
import styles from './ProbeSpectralAnalysis.module.css'

const name = (id: string) => MINERAL_META[id]?.name ?? id
const label = (id: string) => {
  const [col, row] = id.split('_').map(Number)
  return `${String.fromCharCode(65 + row)}${col + 1}`
}

export default function ProbeSpectralAnalysis({ target, record, onClose, onSave }: {
  target: Target
  record: ProbeRecord
  onClose: () => void
  onSave: (sector: string, marks: string[]) => void
}) {
  const [step, setStep] = useState<'pick' | 'read' | 'logged'>('pick')
  const [sector, setSector] = useState<string | null>(null)
  const [marks, setMarks] = useState<string[]>([])
  const available = Object.keys(record.readings).sort((a, b) => {
    const [ac, ar] = a.split('_').map(Number), [bc, br] = b.split('_').map(Number)
    return ar - br || ac - bc
  })
  const bands = useMemo(() => bodyBands(target), [target])
  const data = useMemo(() => sector ? sectorSpectrum(target, sector) : [], [target, sector])
  const polyline = data.map((v, i) => `${22 + (i / (data.length - 1)) * 336},${146 - v * 112}`).join(' ')
  const prior = sector ? record.readings[sector] : undefined
  const finished = prior?.analyzedAt !== undefined
  const displayed = finished ? prior.marked : marks
  const outcome = sector ? probeAnalysisResult(target, sector, displayed) : null

  return (
    <div className={styles.overlay} data-testid="probe-level-2" aria-label="Level 2 spectral analysis">
      <header className={styles.header}>
        <div><small>LEVEL 2 · SPECTRAL ANALYSIS</small><h2>{target.name}</h2></div>
        <button type="button" onClick={onClose} aria-label="Back to probe map">Back to map</button>
      </header>
      <div className={styles.steps} aria-label="Analysis stages">
        <span data-current={step === 'pick'}>1 Pick</span><span data-current={step === 'read'}>2 Read</span><span data-current={step === 'logged'}>3 Logged</span>
      </div>
      {step === 'pick' && <>
        <p>Choose a downloaded sector. Its basic survey and mineral quantities are already recorded.</p>
        <div className={styles.sectors} data-testid="probe-analysis-sectors">
          {available.map(id => <button key={id} type="button" data-testid={`probe-analyze-${id}`}
            onClick={() => { setSector(id); setMarks([]); setStep(record.readings[id].analyzedAt === undefined ? 'read' : 'logged') }}>
            {label(id)} <small>{record.readings[id].analyzedAt !== undefined ? 'Logged' : 'Ready'}</small>
          </button>)}
        </div>
        {!available.length && <p>No downloaded sectors. Return when the probe has sent a scan.</p>}
      </>}
      {step === 'read' && sector && <>
        <p>Mark the absorption bands you identify in sector {label(sector)}. This is optional analysis; the basic mineral survey is unaffected.</p>
        <svg className={styles.spectrum} viewBox="0 0 380 170" role="img" aria-label="Reflectance spectrum from 400 to 2500 nanometres">
          <path d="M22 15V146H358" fill="none" stroke="#9faabc" strokeWidth="1.5" />
          <polyline points={polyline} fill="none" stroke="#64e6b1" strokeWidth="2.5" strokeLinejoin="round" />
          {bands.filter(b => marks.includes(b.mineral)).map(b => <line key={b.mineral}
            x1={22 + (b.nm - BAND_MIN_NM) / (BAND_MAX_NM - BAND_MIN_NM) * 336}
            x2={22 + (b.nm - BAND_MIN_NM) / (BAND_MAX_NM - BAND_MIN_NM) * 336}
            y1="15" y2="146" stroke="#f4ca76" strokeDasharray="4 3" />)}
          <text x="22" y="162">400 nm</text><text x="300" y="162">2500 nm</text>
        </svg>
        <div className={styles.bands} role="group" aria-label="Mark spectral absorption bands">
          {bands.map(b => <button type="button" key={b.mineral} aria-pressed={marks.includes(b.mineral)}
            onClick={() => setMarks(prev => prev.includes(b.mineral) ? prev.filter(x => x !== b.mineral) : [...prev, b.mineral])}>
            {b.nm} nm · {name(b.mineral)}
          </button>)}
        </div>
        <div className={styles.actions}><button type="button" onClick={() => setStep('pick')}>Previous</button>
          <button type="button" className={styles.primary} data-testid="probe-submit-analysis"
            onClick={() => { onSave(sector, marks); setStep('logged') }}>Log analysis</button></div>
      </>}
      {step === 'logged' && sector && outcome && <>
        <div className={styles.result} data-testid="probe-analysis-result">
          <h3>{finished ? 'Analysis on file' : 'Analysis logged locally'}</h3>
          <p>Sector {label(sector)} · {displayed.length} band{displayed.length === 1 ? '' : 's'} marked.</p>
          <p>Matching bands: {outcome.correct.length ? outcome.correct.map(name).join(', ') : 'none'}.</p>
          <p>Unmarked bands: {outcome.missed.length ? outcome.missed.map(name).join(', ') : 'none'}.</p>
          {outcome.extra.length > 0 && <p>Other marks: {outcome.extra.map(name).join(', ')}.</p>}
          <small>Saved in your agency's local survey record; cloud acknowledgement is not shown here. This does not create another research stamp or award fragments.</small>
        </div>
        <div className={styles.actions}><button type="button" onClick={() => setStep('pick')}>Other sectors</button>
          <button type="button" className={styles.primary} onClick={onClose}>Back to map</button></div>
      </>}
    </div>
  )
}
