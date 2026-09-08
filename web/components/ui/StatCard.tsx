import type { ReactNode } from 'react'
import SegmentedBar from '@/components/ui/SegmentedBar'

interface StatCardBaseProps {
  label: string
  value: string
}

interface StatCardMeter {
  segments: number
  filled: number
  tone?: 'cyan' | 'amber' | 'ok' | 'crit'
}

/**
 * Shared instrument readout (STS-516). Started life as RocketStatCard for the
 * preflight screens; the same icon + uppercase label + mono value block was
 * hand-rolled on the Hangar, Rocket Purchase, Assembly and TESS screens, so it
 * lives in ui/ now and carries the variants those call sites need.
 */
type StatCardProps = StatCardBaseProps & (
  | {
      variant: 'compact'
      icon: ReactNode
      detail?: never
      /** Highlights the card — used to reflect a linked selection (e.g. a
       * clicked ship compartment) elsewhere on screen. Purely visual. */
      active?: boolean
      /** Optional real-data segmented meter rendered under the value. */
      meter?: StatCardMeter
      onClick?: () => void
    }
  | {
      variant?: 'detailed'
      detail: string
      icon?: never
      active?: never
      meter?: never
      onClick?: never
      tone?: never
    }
  | {
      /** Bare label + mono value, no icon and no detail line — the compact
       *  payoff/summary readout (TessDiscoveryScreen's discovery stats). */
      variant: 'readout'
      tone?: 'cyan' | 'ok'
      detail?: never
      icon?: never
      active?: never
      meter?: never
      onClick?: never
    }
)

export default function StatCard(props: StatCardProps) {
  if (props.variant === 'readout') {
    const border = props.tone === 'ok' ? 'var(--ln-stat-card-ok-border, rgba(57,211,106,0.22))' : 'var(--ln-stat-card-border, rgba(112,217,234,0.18))'
    return (
      <div style={{ minWidth: 0, padding: '7px 6px', borderRadius: 7, background: 'var(--ln-stat-card-bg, rgba(20,20,23,0.72))', border: `1px solid ${border}` }}>
        <StatLabel>{props.label}</StatLabel>
        <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, fontWeight: 800, color: 'var(--ln-stat-card-text, #e8f0fe)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>
          {props.value}
        </div>
      </div>
    )
  }

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
          background: active ? 'var(--ln-stat-card-active-bg, rgba(112,217,234,0.14))' : 'var(--ln-stat-card-bg, rgba(20,20,23,0.72))',
          border: `1px solid ${active ? 'var(--ln-cyan)' : 'var(--ln-stat-card-border, rgba(112,217,234,0.18))'}`,
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
      background: 'var(--ln-stat-card-bg, rgba(11,11,13,0.6))',
      borderRadius: 8,
      border: '1px solid var(--ln-stat-card-border, rgba(112,217,234,0.14))',
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
