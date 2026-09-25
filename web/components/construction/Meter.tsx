'use client'

import React from 'react'

type MeterTone = 'cyan' | 'ok' | 'warn' | 'crit' | 'amber'

const TONE_VAR: Record<MeterTone, string> = {
  cyan: 'var(--ln-cyan)',
  ok: 'var(--ln-ok)',
  warn: 'var(--ln-warn)',
  crit: 'var(--ln-crit)',
  amber: 'var(--ln-amber)', // amber allowed — reserved for genuine payout/currency meters; callers must not use it for build-timer or chrome meters
}

interface MeterProps {
  label: string
  value: string
  tone?: MeterTone
  /** segmented: discrete pips (throughput). linear: single fill (buffer/output). build: striped fill (in-progress). sparkline: trend bars (yield ramp). */
  variant?: 'segmented' | 'linear' | 'build' | 'sparkline'
  segments?: { filled: number; total: number }
  pct?: number
  spark?: number[]
}

/** Construction Kit "meters" primitive (KES-280) — throughput/buffer/build-progress/yield-ramp readouts, token-driven so it re-skins for free across themes. */
export default function Meter({ label, value, tone = 'cyan', variant = 'linear', segments, pct = 0, spark }: MeterProps) {
  const color = TONE_VAR[tone]
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ font: '700 9.5px var(--ln-font-display)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>{label}</span>
        <span style={{ font: '400 11px var(--ln-font-mono)', color }}>{value}</span>
      </div>

      {variant === 'segmented' && segments && (
        <div style={{ display: 'flex', gap: 2 }}>
          {Array.from({ length: segments.total }).map((_, i) => (
            <span key={i} style={{ flex: 1, height: 8, borderRadius: 1.5, background: i < segments.filled ? color : 'var(--ln-hairline)' }} />
          ))}
        </div>
      )}

      {(variant === 'linear' || variant === 'build') && (
        <div style={{ height: 8, borderRadius: 2, background: 'var(--ln-hairline)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.max(0, Math.min(100, pct))}%`,
              height: '100%',
              background:
                variant === 'build'
                  ? `repeating-linear-gradient(135deg, ${color} 0px, ${color} 6px, color-mix(in srgb, ${color} 55%, transparent) 6px, color-mix(in srgb, ${color} 55%, transparent) 12px)`
                  : color,
            }}
          />
        </div>
      )}

      {variant === 'sparkline' && spark && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 34 }}>
          {spark.map((v, i) => (
            <span key={i} style={{ flex: 1, height: `${Math.max(6, v * 100)}%`, background: color, opacity: 0.35 + v * 0.65 }} />
          ))}
        </div>
      )}
    </div>
  )
}
