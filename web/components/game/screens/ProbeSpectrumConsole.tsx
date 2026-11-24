'use client'

import type { Player } from '@/lib/game-types'
import { useContributionReadout } from '@/lib/research/useContributionReadout'
import { useState } from 'react'
import type { Target } from '@/lib/data'
import InstrumentViewport, { InstrumentAnswerRow } from '@/components/game/instrument-viewport/InstrumentViewport'
import { BAND_MIN_NM, BAND_MAX_NM, sectorSpectrum, type ProbeRecord } from '@/lib/probes/survey-probe'

const name = (id: string) => { const [c, r] = id.split('_').map(Number); return `${String.fromCharCode(65 + r)}${c + 1}` }

/** Level 4 shares the citizen science instrument and readout, with one step per page. */
export default function ProbeSpectrumConsole({ player, target, record, onBack, onLog, onAgency }: {
  player: Player; onAgency: () => void; target: Target; record: ProbeRecord; onBack: () => void
  onLog: (sector: string, wavelengths: number[]) => void
}) {
  const [sector, setSector] = useState<string | null>(null)
  const [marks, setMarks] = useState<number[]>([])
  const [wavelength, setWavelength] = useState(1450)
  const saved = sector ? record.readings[sector]?.analysis : undefined
  const contribution = useContributionReadout(player, 'classification', saved?.at ?? 0)
  const readings = Object.keys(record.readings)
  const next = readings.find(id => id !== sector && !record.readings[id].analysis)
  const spectrum = sector ? sectorSpectrum(target, sector, 211) : []
  const shown = saved?.wavelengths ?? marks
  const mark = (nm: number) => { if (!saved) setMarks(old => old.length < 12 ? [...new Set([...old, Math.round(nm)])] : old) }
  const pick = (id: string) => { setSector(id); setMarks([]) }
  return <InstrumentViewport
    testId="probe-spectrum-console" sceneClassName="ln-scene-probe-spectrum"
    eyebrow={`LEVEL 4 · DEPOSIT SURVEY · ${sector ? saved ? '3 LOGGED' : '2 READ' : '1 PICK'}`}
    title={sector ? `${target.name} · ${name(sector)}` : target.name}
    onBack={() => sector ? setSector(null) : onBack()}
    status={saved ? 'READING SAVED LOCALLY' : sector ? 'MARK ABSORPTION DIPS' : 'CHOOSE A DOWNLOADED SECTOR'}
    simple instrumentId="survey-probe" level={4} done={!!saved} singleStep
    viewport={sector ? <svg viewBox="0 0 600 300" role="img" aria-label="Reflectance spectrum: tap a dip to mark its wavelength" style={{ width: '100%', height: '100%', color: 'var(--ln-world-glass)' }} onPointerDown={event => {
      const rect = event.currentTarget.getBoundingClientRect()
      // SVG uses meet scaling; account for letterboxing before mapping the pointer to wavelength.
      const scale = Math.min(rect.width / 600, rect.height / 300)
      const x = (event.clientX - rect.left - (rect.width - 600 * scale) / 2) / scale
      const y = (event.clientY - rect.top - (rect.height - 300 * scale) / 2) / scale
      if (x >= 30 && x <= 570 && y >= 20 && y <= 265) mark(BAND_MIN_NM + (x - 30) / 540 * (BAND_MAX_NM - BAND_MIN_NM))
    }}>
      <path d="M30 20V265H570" fill="none" stroke="currentColor" />
      <polyline points={spectrum.map((value, i) => `${30 + i / (spectrum.length - 1) * 540},${245 - value * 210}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="3" />
      {shown.map(nm => <line key={nm} x1={30 + (nm - 400) / 2100 * 540} x2={30 + (nm - 400) / 2100 * 540} y1="20" y2="265" stroke="var(--ln-world-hull-lit)" strokeWidth="2" />)}
      <text x="30" y="290" fill="currentColor" fontSize="18">400 nm</text><text x="570" y="290" textAnchor="end" fill="currentColor" fontSize="18">2500 nm</text>
    </svg> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8, padding: 16 }}>
      {readings.map(id => <button key={id} type="button" style={{ minHeight: 44, fontSize: 14, color: 'var(--ln-world-hull-lit)', background: 'var(--ln-world-night-mid)', border: '1px solid var(--ln-world-glass)', borderRadius: 8 }} onClick={() => pick(id)} aria-label={`Sector ${name(id)}${record.readings[id].analysis ? ', logged' : ''}`}>{name(id)}{record.readings[id].analysis ? ' ·' : ''}</button>)}
    </div>}
    caption={sector ? 'Tap the dips, or choose a wavelength below. Your marks are a measurement, not a grade.' : 'Only downloaded sectors are available.'}
    readout={sector ? { name: 'READOUT · YOUR RESULT', testId: 'probe-spectrum-readout', rows: [
      { label: 'Project', value: 'Deposit survey' },
      { label: 'Marks', value: shown.length ? shown.map(nm => `${nm} nm`).join(' · ') : 'NONE' },
      ...(saved ? contribution : [{ label: 'Research', value: 'Not submitted' }]),
    ] } : undefined}
    tool={sector && !saved ? <label style={{ display: 'grid', gap: 8 }}>Wavelength · {wavelength} nm
      <input aria-label="Wavelength" type="range" min={400} max={2500} step={1} value={wavelength} onChange={event => setWavelength(Number(event.target.value))} style={{ minHeight: 44, width: '100%' }} />
    </label> : undefined}
    answers={<InstrumentAnswerRow groupTestId="probe-spectrum-actions" actions={[
      ...(sector && !saved ? [
        { id: 'mark', label: 'MARK', onClick: () => mark(wavelength), disabled: marks.length >= 12 },
        { id: 'undo', label: 'UNDO', onClick: () => setMarks(old => old.slice(0, -1)), disabled: !marks.length },
        { id: 'log', label: 'LOG READING', primary: true, disabled: !marks.length, onClick: () => onLog(sector, marks) },
      ] : []),
      ...(saved && next ? [{ id: 'next', label: `NEXT SECTOR ${name(next)}`, primary: true, onClick: () => pick(next) }] : []),
      { id: 'back', label: 'BACK TO MAP', onClick: onBack },
      ...(saved ? [{ id: 'agency', label: 'RETURN TO BASE', onClick: onAgency }] : []),
    ].map(action => ({ ...action, testId: `probe-spectrum-${action.id}` }))} />}
  />
}
