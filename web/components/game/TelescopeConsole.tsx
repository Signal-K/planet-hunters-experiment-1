'use client'

import type { CSSProperties, ReactNode } from 'react'
import { Radio, Activity, Gauge, Cpu, HardDrive, Wifi, Zap } from 'lucide-react'

/**
 * TelescopeConsole — hardware-bezel wrapper for an instrument viewport
 * (currently ObservatoryChart). Ported from a v0 mockup built for the Star
 * Sailors client project (see Knowns doc
 * specs/design-references/telescopeobservatory-console-ui-reference-v0-mockup):
 * chunky bezel, corner rivets, top status lights, a compact gauge row, and
 * a bottom sector/status strip — translated to Landnam's own --ln-* tokens
 * and compressed for the 402px portrait canvas (the reference used two full
 * desktop side columns; here that becomes one gauge row instead).
 *
 * The crosshair reticle and starfield/nebula backdrop stay on the chart
 * itself (ObservatoryChart) — this component is chrome only.
 */
export default function TelescopeConsole({
  sector,
  targetCount,
  signal,
  children,
}: {
  sector: string
  targetCount: number
  signal: number
  children: ReactNode
}) {
  return (
    <div style={{
      position: 'relative',
      borderRadius: 16,
      padding: 8,
      background: 'linear-gradient(160deg, rgba(24,48,75,0.9), rgba(10,18,29,0.95))',
      border: '1px solid var(--ln-hairline-strong)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 24px rgba(0,0,0,0.45)',
    }}>
      <Rivet corner="tl" /><Rivet corner="tr" /><Rivet corner="bl" /><Rivet corner="br" />

      {/* Top status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 8px' }}>
        <PulseDot color="var(--ln-ok)" />
        <PulseDot color="var(--ln-amber)" pulse={false} />
        <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--ln-text)', textTransform: 'uppercase' }}>
          Telescope
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: 'var(--ln-ok)' }}>
          <Radio size={11} /> ONLINE
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: 'var(--ln-cyan-bright)' }}>
          <Activity size={11} /> STABLE
        </span>
      </div>

      {/* Viewport — the instrument surface itself */}
      <div style={{ borderRadius: 10, overflow: 'hidden', border: '2px solid rgba(63,169,255,0.28)' }}>
        {children}
      </div>

      {/* Compact gauge row (compressed side-panel from the reference into one strip) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, padding: '8px 4px 4px' }}>
        <GaugeBox icon={<Gauge size={13} />} label="FOCUS" level={0.7} color="var(--ln-cyan)" />
        <GaugeBox icon={<Zap size={13} />} label="SIG" level={Math.max(0.05, Math.min(1, signal / 25))} color="var(--ln-amber)" />
        <GaugeBox icon={<Wifi size={13} />} label="LINK" level={0.9} color="var(--ln-ok)" />
        <GaugeBox icon={<Cpu size={13} />} label="DATA" level={0.55} color="#c084ff" />
      </div>

      {/* Bottom status strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '6px 8px 4px', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: 'var(--ln-cyan-bright)' }}>
          <HardDrive size={11} /> {sector.toUpperCase()}
        </span>
        <span style={{ width: 1, height: 12, background: 'var(--ln-hairline)' }} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: 'var(--ln-amber)' }}>
          <Zap size={11} /> {targetCount} TARGET{targetCount !== 1 ? 'S' : ''}
        </span>
      </div>
    </div>
  )
}

function Rivet({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const pos: Record<typeof corner, CSSProperties> = {
    tl: { top: 6, left: 6 },
    tr: { top: 6, right: 6 },
    bl: { bottom: 6, left: 6 },
    br: { bottom: 6, right: 6 },
  }
  return (
    <span style={{
      position: 'absolute', ...pos[corner],
      width: 5, height: 5, borderRadius: '50%',
      background: 'rgba(126,200,255,0.4)',
      boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.5)',
    }} />
  )
}

function PulseDot({ color, pulse = true }: { color: string; pulse?: boolean }) {
  return (
    <span style={{
      width: 6, height: 6, borderRadius: '50%', background: color,
      boxShadow: `0 0 6px ${color}`,
      animation: pulse ? 'ln-pulse 1.4s ease-in-out infinite' : 'none',
    }} />
  )
}

function GaugeBox({ icon, label, level, color }: { icon: ReactNode; label: string; level: number; color: string }) {
  return (
    <div style={{ borderRadius: 7, border: '1px solid rgba(126,200,255,0.14)', background: 'rgba(8,16,28,0.58)', padding: '6px 6px 5px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <span style={{ color }}>{icon}</span>
      <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 7, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--ln-text-muted)' }}>{label}</span>
      <div style={{ width: '100%', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(level * 100)}%`, height: '100%', background: color, boxShadow: `0 0 4px ${color}` }} />
      </div>
    </div>
  )
}
