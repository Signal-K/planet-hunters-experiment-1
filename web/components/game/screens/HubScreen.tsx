'use client'

import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import type { Player, Screen } from '@/game-context'
import ProgressionCard from '@/components/game/ProgressionCard'

interface HubScreenProps {
  player: Player
  hasCoach?: boolean
  onGoBuilding: (b: string) => void
  onNav: (s: Screen) => void
  onUpgradeLaunchpad?: () => void
}

function AmbientStars() {
  const dots = useMemo(() => {
    const out: { x: number; y: number; r: number; o: number; d: number }[] = []
    let seed = 1337
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
    for (let i = 0; i < 55; i++) {
      out.push({ x: rnd() * 100, y: rnd() * 92, r: 0.6 + rnd() * 1.4, o: 0.3 + rnd() * 0.6, d: 1.6 + rnd() * 2.8 })
    }
    return out
  }, [])
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
      {dots.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o}>
          <animate attributeName="opacity" values={`${s.o};${s.o * 0.25};${s.o}`} dur={s.d + 's'} repeatCount="indefinite"/>
        </circle>
      ))}
    </svg>
  )
}

function Cloud({ style, dur = '60s', delay = '0s' }: { style?: React.CSSProperties; dur?: string; delay?: string }) {
  return (
    <div style={{ position: 'absolute', animation: `cloud-drift ${dur} linear infinite`, animationDelay: delay, ...style }}>
      <svg width="120" height="50" viewBox="0 0 120 50" fill="none">
        <ellipse cx="32" cy="32" rx="22" ry="14" fill="#ffffff" opacity="0.82"/>
        <ellipse cx="58" cy="26" rx="26" ry="16" fill="#ffffff" opacity="0.86"/>
        <ellipse cx="84" cy="30" rx="20" ry="12" fill="#ffffff" opacity="0.78"/>
        <ellipse cx="48" cy="36" rx="28" ry="10" fill="#ffffff" opacity="0.65"/>
      </svg>
    </div>
  )
}

function SoilCrossSection() {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 96, height: 168, zIndex: 4, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 0, borderTop: '1.5px dashed rgba(255,225,160,0.5)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 18, background: 'linear-gradient(180deg, rgba(60,40,20,0.5), transparent)' }} />
      <svg width="100%" height="100%" viewBox="0 0 402 168" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="strata1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a1a0e" stopOpacity="0.0"/>
            <stop offset="100%" stopColor="#1a0f06" stopOpacity="0.35"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="402" height="168" fill="url(#strata1)"/>
        <path d="M0 44 Q 100 40, 200 46 T 402 42" stroke="rgba(255,220,160,0.18)" strokeWidth="1" fill="none"/>
        <path d="M0 96 Q 120 102, 220 94 T 402 100" stroke="rgba(255,220,160,0.14)" strokeWidth="1" fill="none"/>
        <circle cx="74" cy="66" r="3" fill="#d97150" opacity="0.9"/>
        <circle cx="80" cy="72" r="1.8" fill="#ff9a78" opacity="0.8"/>
        <circle cx="86" cy="66" r="2.2" fill="#d97150" opacity="0.85"/>
        <circle cx="316" cy="90" r="2.6" fill="#b9d8ff" opacity="0.9"/>
        <circle cx="322" cy="96" r="1.6" fill="#e0f0ff" opacity="0.8"/>
        <circle cx="328" cy="90" r="2" fill="#b9d8ff" opacity="0.85"/>
        <circle cx="250" cy="132" r="2.8" fill="#ffd166" opacity="0.9"/>
        <circle cx="256" cy="138" r="1.6" fill="#fff0b0" opacity="0.8"/>
        <circle cx="80" cy="68" r="14" fill="#d97150" opacity="0.12"/>
        <circle cx="322" cy="92" r="14" fill="#b9d8ff" opacity="0.12"/>
        <circle cx="252" cy="134" r="12" fill="#ffd166" opacity="0.12"/>
        <g stroke="#2a1a0e" strokeWidth="1.4" fill="none" opacity="0.55" strokeLinecap="round">
          <path d="M40 0 q -4 24, 4 50"/>
          <path d="M150 0 q 6 30, -6 56"/>
          <path d="M360 0 q 8 20, -4 48"/>
        </g>
      </svg>
      <div style={{ position: 'absolute', right: 14, top: 58, padding: '3px 8px', background: 'rgba(8,12,22,0.7)', border: '1px solid rgba(122,80,40,0.55)', borderRadius: 999, fontFamily: 'var(--ln-font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#9c8d70' }}>
        · Subsurface ·
      </div>
    </div>
  )
}

interface BuildingProps {
  kind: string
  label: string
  sub: string
  status: 'ok' | 'warn' | 'info'
  hot?: boolean
  w: number
  style?: React.CSSProperties
  onClick: () => void
}

function Building({ kind, label, sub, status, hot, w, style, onClick }: BuildingProps) {
  const statusColors = { ok: '#39d36a', warn: '#ffb347', info: '#7ec8ff' }
  const color = statusColors[status]
  return (
    <button data-testid={`building-${kind}`} onClick={onClick} style={{ position: 'absolute', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, ...style }}>
      <div style={{ width: w, height: w * 0.6, position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        {kind === 'launchpad' && (
          <svg width={w} height={w * 0.6} viewBox="0 0 132 80">
            <rect x="10" y="50" width="112" height="8" fill="#2a3a4a" stroke="#3fa9ff" strokeWidth="1"/>
            <rect x="44" y="10" width="44" height="44" rx="4" fill="#0e1c2e" stroke="#3fa9ff" strokeWidth="1.2"/>
            <rect x="54" y="20" width="24" height="28" rx="3" fill="#1a3050" stroke="#6cc2ff" strokeWidth="1"/>
            <circle cx="66" cy="34" r="5" fill="#f5a623" opacity="0.9"/>
            <path d="M58 54 L74 54 L72 44 L60 44 Z" fill="#d68a0d" opacity="0.8"/>
            {hot && <circle cx="66" cy="54" r="18" fill="#f5a623" opacity="0.15"><animate attributeName="r" values="16;22;16" dur="1.6s" repeatCount="indefinite"/></circle>}
          </svg>
        )}
        {kind === 'control' && (
          <svg width={w} height={w * 0.6} viewBox="0 0 84 60">
            <rect x="8" y="14" width="68" height="42" rx="3" fill="#0e1c2e" stroke="#f5a623" strokeWidth="1.2"/>
            <rect x="14" y="20" width="22" height="16" rx="2" fill="#1a2e44" stroke="#3fa9ff" strokeWidth="0.8"/>
            <rect x="14" y="42" width="56" height="6" fill="#1a3050"/>
            <circle cx="30" cy="28" r="3" fill="#f5a623" opacity="0.9"/>
            <rect x="44" y="20" width="24" height="16" rx="2" fill="#1a2e44" stroke="#3fa9ff" strokeWidth="0.8"/>
          </svg>
        )}
        {kind === 'satellite' && (
          <svg width={w} height={w * 0.6} viewBox="0 0 78 60">
            <rect x="28" y="16" width="22" height="28" rx="3" fill="#0e1c2e" stroke="#39d36a" strokeWidth="1.2"/>
            <rect x="4" y="24" width="24" height="12" fill="#1a3050" stroke="#3fa9ff" strokeWidth="0.8" rx="1"/>
            <rect x="50" y="24" width="24" height="12" fill="#1a3050" stroke="#3fa9ff" strokeWidth="0.8" rx="1"/>
            <circle cx="39" cy="30" r="4" fill="#39d36a" opacity="0.8"/>
            <line x1="39" y1="10" x2="39" y2="16" stroke="#a9b8ce" strokeWidth="1.5"/>
          </svg>
        )}
        {kind === 'refinery' && (
          <svg width={w} height={w * 0.6} viewBox="0 0 84 60">
            <rect x="6" y="20" width="72" height="30" rx="3" fill="#0e1c2e" stroke="#f5a623" strokeWidth="1.2"/>
            <rect x="20" y="8" width="12" height="14" rx="2" fill="#1a3050" stroke="#f5a623" strokeWidth="0.8"/>
            <rect x="52" y="8" width="12" height="14" rx="2" fill="#1a3050" stroke="#f5a623" strokeWidth="0.8"/>
            <circle cx="26" cy="14" r="3" fill="#f5a623" opacity="0.6"/>
            <circle cx="58" cy="14" r="3" fill="#f5a623" opacity="0.6"/>
            <path d="M26 22 L42 20 L58 22" stroke="#f5a623" strokeWidth="1" fill="none" opacity="0.5"/>
          </svg>
        )}
      </div>
      <div style={{
        padding: '4px 10px', borderRadius: 999,
        background: 'rgba(8,12,22,0.8)', backdropFilter: 'blur(6px)',
        border: `1px solid ${color}66`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      }}>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 9, letterSpacing: '0.1em', color: '#e6efff', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 4, height: 4, borderRadius: 999, background: color, boxShadow: `0 0 6px ${color}` }} />
          <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, letterSpacing: '0.16em', color, textTransform: 'uppercase' }}>{sub}</span>
        </div>
      </div>
    </button>
  )
}

function EmptyPlot({ w = 90, style, onClick }: { w?: number; style?: React.CSSProperties; onClick: () => void }) {
  return (
    <button data-testid="build-plot" onClick={onClick} style={{ position: 'absolute', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, ...style }}>
      <div style={{ width: w, height: w * 0.5, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '88%', height: 26, borderRadius: '50% / 60%', background: 'radial-gradient(ellipse at 50% 35%, rgba(135,207,250,0.18), rgba(135,207,250,0.04) 70%)', border: '2px dashed rgba(135,207,250,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pad-pulse 2s ease-in-out infinite' }}>
          <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 16, fontWeight: 800, color: 'rgba(135,207,250,0.8)', marginTop: -2 }}>+</span>
        </div>
      </div>
      <div style={{ padding: '3px 9px', borderRadius: 999, background: 'rgba(8,12,22,0.7)', backdropFilter: 'blur(6px)', fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9EDCFF', whiteSpace: 'nowrap' }}>
        + Build
      </div>
    </button>
  )
}

export default function HubScreen({ player, hasCoach, onGoBuilding, onNav, onUpgradeLaunchpad }: HubScreenProps) {
  const [editMode, setEditMode] = useState(false)
  const placed = player.placed ?? []
  const placementPlots = player.placementPlots ?? {}
  const legacyPlaced = (kind: string) => placed.includes(kind) && placementPlots[kind] == null
  const effectivePlots: Record<string, number> = {
    ...placementPlots,
    ...(legacyPlaced('launchpad') ? { launchpad: 1 } : {}),
    ...(legacyPlaced('control') ? { control: 2 } : {}),
    ...(legacyPlaced('satellite') ? { satellite: 0 } : {}),
  }
  const plotStyles: React.CSSProperties[] = [
    { left: 22, top: 570 },
    { left: 112, top: 570 },
    { left: 210, top: 570 },
    { left: 300, top: 570 },
  ]
  const structureForPlot = (plot: number) => Object.entries(effectivePlots).find(([, p]) => p === plot)?.[0] ?? null
  const structureProps = (kind: string) => {
    if (kind === 'launchpad') {
      return {
        kind, label: 'Launchpad',
        sub: player.activeMission ? 'IN FLIGHT' : 'READY',
        status: (player.activeMission ? 'warn' : 'ok') as 'ok' | 'warn',
        hot: !!player.pendingLaunch,
        w: 98,
        onClick: () => onGoBuilding('launchpad'),
      }
    }
    if (kind === 'control') {
      return {
        kind, label: 'Control',
        sub: player.missionCount + ' JOBS',
        status: 'warn' as const,
        w: 84,
        onClick: () => onGoBuilding('missions'),
      }
    }
    if (kind === 'satellite') {
      return {
        kind, label: 'Satellite',
        sub: 'SCANNING',
        status: 'ok' as const,
        w: 78,
        onClick: () => onGoBuilding('satellite'),
      }
    }
    if (kind === 'refinery') {
      return {
        kind, label: 'Refinery',
        sub: 'ORE PROCESSING',
        status: 'ok' as const,
        w: 84,
        onClick: () => onGoBuilding('refinery'),
      }
    }
    return {
      kind, label: kind,
      sub: 'BUILT',
      status: 'info' as const,
      w: 78,
      onClick: () => onGoBuilding(kind),
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Earth backdrop */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Image src="/scenes/earth-day.png" alt="Earth" fill style={{ objectFit: 'cover' }} priority />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,9,15,0.0) 0%, transparent 22%, transparent 74%, rgba(6,9,15,0.45) 100%)' }} />
      </div>

      {/* Drifting clouds */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '42%', overflow: 'hidden', pointerEvents: 'none' }}>
        <AmbientStars />
        <Cloud style={{ left: '-30%', top: 40, opacity: 0.7, transform: 'scale(0.8)' }} dur="62s" delay="0s" />
        <Cloud style={{ left: '-30%', top: 96, opacity: 0.5, transform: 'scale(0.55)' }} dur="80s" delay="-30s" />
      </div>

      {/* Top HUD: title + resources */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 18,
        padding: '16px 14px 22px',
        background: 'linear-gradient(180deg, rgba(6,9,15,0.85) 0%, rgba(6,9,15,0.35) 60%, transparent 100%)',
        display: 'flex', alignItems: 'flex-start', gap: 10, pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>EARTH BASE · LV {player.level}</div>
          <h1 style={{ margin: '2px 0 0', fontFamily: 'var(--ln-font-display)', fontSize: 24, fontWeight: 800, letterSpacing: '-0.01em', color: '#fff', lineHeight: 1, textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>Earth Base</h1>
        </div>
        <span style={{ flex: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', pointerEvents: 'auto' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', background: 'rgba(8,12,22,0.7)', backdropFilter: 'blur(6px)', border: '1px solid rgba(245,166,35,0.5)', borderRadius: 999, fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', color: '#f5a623' }}>
            ▲ {player.francs.toLocaleString()}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(8,12,22,0.7)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,179,71,0.4)', borderRadius: 999, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', color: '#ffb347', textTransform: 'uppercase' }}>
            <span style={{ width: 4, height: 4, borderRadius: 999, background: '#ffb347', boxShadow: '0 0 6px #ffb347' }} />
            {player.missionCount} Jobs
          </span>
        </div>
      </div>

      {/* Progression card — visible even during tutorial, shifted down when coach pill is present */}
      <ProgressionCard player={player} onGoBuilding={onGoBuilding} onNav={onNav} top={hasCoach ? 152 : 132} />

      {/* Surface buildings */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
          {plotStyles.map((style, plot) => {
            const kind = structureForPlot(plot)
            if (!kind) {
              if (!editMode) return null
              return <EmptyPlot key={plot} w={78} style={style} onClick={() => onGoBuilding('build')} />
            }
            const building = structureProps(kind)
            return <Building key={kind} {...building} style={style} />
          })}
        </div>
      </div>

      {/* Soil cross-section */}
      <SoilCrossSection />

      {/* Edit / Build mode toggle — hidden during tutorial to avoid conflicting overlays. Acts as long-press analog (iOS home screen style). */}
      {!hasCoach && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 110, zIndex: 5, display: 'flex', justifyContent: 'center', gap: 8 }}>
          {editMode && (
            <>
              <button onClick={() => onGoBuilding('build')} style={{ padding: '5px 14px', background: 'rgba(57,211,106,0.15)', backdropFilter: 'blur(6px)', border: '1px solid rgba(57,211,106,0.5)', borderRadius: 999, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#39d36a', textTransform: 'uppercase', cursor: 'pointer' }}>
                + New Structure
              </button>
              {player.placed.includes('launchpad') && !player.launchpadUpgraded && onUpgradeLaunchpad && (
                <button onClick={onUpgradeLaunchpad} style={{ padding: '5px 14px', background: 'rgba(245,166,35,0.15)', backdropFilter: 'blur(6px)', border: '1px solid rgba(245,166,35,0.5)', borderRadius: 999, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#f5a623', textTransform: 'uppercase', cursor: 'pointer' }}>
                  Upgrade Launchpad (₣1B)
                </button>
              )}
            </>
          )}
          <button onClick={() => setEditMode(v => !v)} style={{ padding: '5px 14px', background: editMode ? 'rgba(245,166,35,0.25)' : 'rgba(8,16,28,0.75)', backdropFilter: 'blur(6px)', border: editMode ? '1px solid rgba(245,166,35,0.6)' : '1px solid rgba(135,207,250,0.4)', borderRadius: 999, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: editMode ? '#f5a623' : '#9EDCFF', textTransform: 'uppercase', cursor: 'pointer' }}>
            {editMode ? 'Done' : 'Edit · Build'}
          </button>
        </div>
      )}
    </div>
  )
}
