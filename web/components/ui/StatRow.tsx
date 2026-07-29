import type { CSSProperties, ReactNode } from 'react'

/**
 * Label-on-the-left, value-on-the-right row (STS-516) — the shape used by
 * itemized payout/expense lists and small dossier readouts, previously
 * reimplemented per screen.
 *
 * `CostSummaryRow` stays separate: it is the boxed, bordered summary-table row
 * used inside cost panels, not this bare line.
 */

interface StatRowProps {
  label: ReactNode
  value: ReactNode
  /** Colour for the value; defaults to the amber payout treatment. */
  valueColor?: string
  /** Hairline above the row — on by default, since these stack into lists. */
  divider?: boolean
  style?: CSSProperties
  testId?: string
}

export default function StatRow({
  label,
  value,
  valueColor = 'var(--ln-amber)',
  divider = true,
  style,
  testId,
}: StatRowProps) {
  return (
    <div
      data-testid={testId}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        padding: '4px 0',
        borderTop: divider ? '1px solid rgba(255,255,255,0.05)' : undefined,
        ...style,
      }}
    >
      <span style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-dim)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 12, color: valueColor, whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}
