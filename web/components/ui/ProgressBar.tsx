import type { CSSProperties } from 'react'

/**
 * Continuous fill meter (STS-516). The game had several hand-rolled
 * `width: ${pct}%` bars with slightly different track/fill styling; this is the
 * one implementation for the continuous case. Discrete "N of M pips" meters
 * stay on `ui/SegmentedBar` — they are a different read, not a variant.
 */

export type ProgressBarTone = 'cyan' | 'amber' | 'ok' | 'crit'

const TONE: Record<ProgressBarTone, { track: string; fill: string; glow: string }> = {
  cyan: {
    track: 'rgba(112,217,234,0.12)',
    fill: 'linear-gradient(90deg, var(--ln-cyan-press), var(--ln-cyan-bright))',
    glow: '0 0 6px rgba(112,217,234,0.5)',
  },
  amber: {
    track: 'rgba(245,166,35,0.14)',
    fill: 'linear-gradient(90deg, var(--ln-amber-press), var(--ln-amber-bright))',
    glow: '0 0 6px rgba(245,166,35,0.45)',
  },
  ok: {
    track: 'rgba(57,211,106,0.14)',
    fill: 'linear-gradient(90deg, #2c9c53, var(--ln-ok))',
    glow: '0 0 6px rgba(57,211,106,0.45)',
  },
  crit: {
    track: 'rgba(220,50,50,0.14)',
    fill: 'linear-gradient(90deg, #8d2020, var(--ln-crimson))',
    glow: '0 0 6px rgba(220,50,50,0.45)',
  },
}

interface ProgressBarProps {
  /** Current value; clamped against `max` so a caller can pass raw game state. */
  value: number
  max?: number
  tone?: ProgressBarTone
  height?: number
  /** Drops the fill's glow — for dense rows where it would bloom into the text. */
  flat?: boolean
  style?: CSSProperties
  label?: string
}

export default function ProgressBar({
  value,
  max = 100,
  tone = 'cyan',
  height = 3,
  flat = false,
  style,
  label,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const palette = TONE[tone]
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      style={{ height, borderRadius: Math.max(2, height / 2), background: palette.track, overflow: 'hidden', ...style }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: Math.max(2, height / 2),
          background: palette.fill,
          boxShadow: flat ? 'none' : palette.glow,
          transition: 'width .2s ease-out',
        }}
      />
    </div>
  )
}
