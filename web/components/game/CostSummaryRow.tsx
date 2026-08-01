import type { ReactNode } from 'react'

interface CostSummaryRowProps {
  label: string
  value: ReactNode
  color: string
  last?: boolean
}

export default function CostSummaryRow({ label, value, color, last = false }: CostSummaryRowProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: last ? 'none' : '1px solid rgba(112,217,234,0.08)' }}>
      <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 15, fontWeight: 800, color }}>{value}</span>
    </div>
  )
}
