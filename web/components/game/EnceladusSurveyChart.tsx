'use client'

import type { MoonSurveyChart, SaturnClassification, SaturnVerdict } from '@/lib/data'

const CELL = 72
const PAD = 12
const SIZE = CELL * 3 + PAD * 2
const MARK: Record<SaturnVerdict, string> = { yes: 'Y', no: 'N', maybe: 'M' }
const FILL: Record<SaturnVerdict, string> = { yes: 'var(--ln-ok-soft)', no: 'var(--ln-surface-2)', maybe: 'var(--ln-cyan-soft)' }

interface EnceladusSurveyChartProps {
  chart: MoonSurveyChart
  /** The completed frame's nine squares; missing squares render empty. */
  classification?: SaturnClassification
  testId?: string
}

/**
 * Enceladus survey chart (SSL-492): the nine squares the player classified,
 * laid over the moon, with storm squares ringed. Shown when a frame completes
 * and again from the Control Station so the plot can be revisited.
 */
export default function EnceladusSurveyChart({ chart, classification, testId = 'enceladus-survey-chart' }: EnceladusSurveyChartProps) {
  const cells = classification?.cells ?? {}
  const stormCount = Object.values(cells).filter(cell => cell.storm).length
  const status = chart.tier === 'gold'
    ? chart.territoryPlotClaimedAt ? 'PLOT CLAIMED' : 'PLOT READY TO CLAIM'
    : 'ATLAS RECORDED'
  return (
    <figure style={{ margin: 0, display: 'grid', gap: 8, justifyItems: 'center' }} data-testid={testId}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Enceladus survey chart, ${stormCount} storm squares marked`} style={{ width: 'min(100%, 280px)', height: 'auto' }}>
        <rect width={SIZE} height={SIZE} fill="var(--ln-panel)" stroke="var(--ln-hairline-strong)" />
        <circle cx={SIZE / 2} cy={SIZE / 2} r={CELL * 1.5} fill="var(--ln-surface-2)" stroke="var(--ln-cyan-border)" strokeWidth={2} />
        {Array.from({ length: 9 }, (_, index) => {
          const x = PAD + (index % 3) * CELL
          const y = PAD + Math.floor(index / 3) * CELL
          const cell = cells[index]
          return (
            <g key={index} data-testid={`${testId}-cell-${index}`}>
              <rect x={x} y={y} width={CELL} height={CELL} fill={cell ? FILL[cell.verdict] : 'transparent'} stroke="var(--ln-hairline-strong)" />
              {cell && <text x={x + CELL / 2} y={y + CELL / 2 + 5} textAnchor="middle" fontSize={14} fontWeight={800} fill="var(--ln-text)">{MARK[cell.verdict]}</text>}
              {cell?.storm && <circle cx={x + CELL / 2} cy={y + CELL / 2} r={CELL / 2 - 8} fill="none" stroke="var(--ln-cyan)" strokeWidth={3} />}
            </g>
          )
        })}
      </svg>
      <figcaption style={{ font: '800 14px var(--ln-font-display)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ln-text)', textAlign: 'center' }}>
        Enceladus survey · {stormCount} storm square{stormCount === 1 ? '' : 's'} · {status}
      </figcaption>
    </figure>
  )
}
