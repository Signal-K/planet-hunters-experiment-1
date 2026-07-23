import type { ReactNode } from 'react'
import SegmentedBar from '@/components/ui/SegmentedBar'

interface RocketStatBaseProps {
  label: string
  value: string
}

interface RocketStatMeter {
  segments: number
  filled: number
  tone?: 'cyan' | 'amber' | 'ok' | 'crit'
}

type RocketStatCardProps = RocketStatBaseProps & (
  | {
      variant: 'compact'
      icon: ReactNode
      detail?: never
      /** Highlights the card — used to reflect a linked selection (e.g. a
       * clicked ship compartment) elsewhere on screen. Purely visual. */
      active?: boolean
      /** Optional real-data segmented meter rendered under the value. */
      meter?: RocketStatMeter
      onClick?: () => void
    }
  | {
      variant?: 'detailed'
      detail: string
      icon?: never
      active?: never
      meter?: never
      onClick?: never
    }
)

export default function RocketStatCard(props: RocketStatCardProps) {
  if (props.variant === 'compact') {
    const active = props.active ?? false
    const Wrapper = props.onClick ? 'button' : 'div'
    return (
      <Wrapper
        type={props.onClick ? 'button' : undefined}
        onClick={props.onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '7px 8px',
          borderRadius: 7,
          background: active ? 'rgba(112,217,234,0.14)' : 'rgba(8,16,28,0.72)',
          border: `1px solid ${active ? 'var(--ln-cyan)' : 'rgba(126,200,255,0.18)'}`,
          boxShadow: active ? '0 0 0 1px rgba(112,217,234,0.35), 0 0 14px rgba(112,217,234,0.3)' : 'none',
          minWidth: 0,
          width: '100%',
          textAlign: 'left',
          font: 'inherit',
          cursor: props.onClick ? 'pointer' : 'default',
          transition: 'background .15s, border-color .15s, box-shadow .15s',
        }}
      >
        <div aria-hidden="true" style={{ width: 22, height: 22, display: 'grid', placeItems: 'center', color: active ? 'var(--ln-cyan)' : 'var(--ln-cyan)', flexShrink: 0 }}>
          {props.icon}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <StatLabel>{props.label}</StatLabel>
          <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 11, fontWeight: 800, color: 'var(--ln-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {props.value}
          </div>
          {props.meter && (
            <SegmentedBar
              segments={props.meter.segments}
              filled={props.meter.filled}
              tone={props.meter.tone ?? 'cyan'}
              height={4}
              style={{ marginTop: 4 }}
            />
          )}
        </div>
      </Wrapper>
    )
  }

  return (
    <div style={{
      flex: 1, padding: '10px 10px 8px',
      background: 'rgba(6,12,22,0.6)',
      borderRadius: 8,
      border: '1px solid rgba(135,207,250,0.14)',
    }}>
      <StatLabel>{props.label}</StatLabel>
      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 18, fontWeight: 800, color: 'var(--ln-cyan)', marginTop: 4, letterSpacing: '-0.01em' }}>
        {props.value}
      </div>
      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 10, color: 'var(--ln-text-muted)', marginTop: 3, lineHeight: 1.3 }}>
        {props.detail}
      </div>
    </div>
  )
}

function StatLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>
      {children}
    </div>
  )
}
