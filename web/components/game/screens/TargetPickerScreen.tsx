'use client'

import React, { useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { PrimaryBtn } from '@/components/ui/Button'
import { compatibleTargetsFor, type Mission, type Target } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'

interface TargetPickerScreenProps {
  mission: Mission
  onBack: () => void
  onPick: (id: string) => void
  hasCoach?: boolean
  catalog: Catalog
}

const ANGLES: Record<string, number> = {
  mercury: 200, venus: 320, earth: 70, mars: 140,
  eros: 45, bennu: 170, vesta: 310, psyche: 85,
  belt: 250, ceres: 190,
  jupiter: 30, saturn: 340, neptune: 120,
}
const RADII: Record<number, number> = { 1: 36, 2: 60, 3: 84, 4: 108, 5: 132, 6: 158, 7: 184, 8: 208 }

function PlanetSVG({ id, size }: { id: string; size: number }) {
  const colors: Record<string, { fill: string; stroke: string }> = {
    mercury: { fill: '#8a7060', stroke: '#a08070' },
    venus:   { fill: '#e8c870', stroke: '#d4a840' },
    earth:   { fill: '#2a6ea4', stroke: '#4a9ec4' },
    mars:    { fill: '#c1440e', stroke: '#e05020' },
    belt:    { fill: '#8a7a5a', stroke: '#aaa080' },
    jupiter: { fill: '#c8a060', stroke: '#e0b870' },
    saturn:  { fill: '#e0c880', stroke: '#c8a860' },
    neptune: { fill: '#2040c0', stroke: '#4060e0' },
  }
  const col = colors[id] ?? { fill: '#607080', stroke: '#809090' }
  const r = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={r} cy={r} r={r - 1} fill={col.fill} stroke={col.stroke} strokeWidth={1.5}/>
      {id === 'saturn' && <ellipse cx={r} cy={r} rx={r * 1.6} ry={r * 0.35} fill="none" stroke={col.stroke} strokeWidth={1.5} opacity={0.7}/>}
      {id === 'belt' && <>
        <circle cx={r * 0.6} cy={r * 0.7} r={r * 0.22} fill={col.stroke} opacity={0.7}/>
        <circle cx={r * 1.3} cy={r * 0.5} r={r * 0.15} fill={col.stroke} opacity={0.6}/>
        <circle cx={r * 1.1} cy={r * 1.2} r={r * 0.18} fill={col.stroke} opacity={0.65}/>
      </>}
      <ellipse cx={r * 0.65} cy={r * 0.65} rx={r * 0.22} ry={r * 0.14} fill="#fff" opacity={0.2}/>
    </svg>
  )
}

function SunSVG({ size }: { size: number }) {
  const r = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={r} cy={r} r={r * 0.7} fill="#ffe1a8"/>
      <circle cx={r} cy={r} r={r * 0.85} fill="none" stroke="#f5a623" strokeWidth={1.5} opacity={0.5}/>
    </svg>
  )
}

function Greebly({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const sty: React.CSSProperties = { position: 'absolute', width: 18, height: 18, pointerEvents: 'none' }
  if (pos === 'tl') Object.assign(sty, { top: 8, left: 8, borderTop: '1.5px solid #87CFFA', borderLeft: '1.5px solid #87CFFA' })
  if (pos === 'tr') Object.assign(sty, { top: 8, right: 8, borderTop: '1.5px solid #87CFFA', borderRight: '1.5px solid #87CFFA' })
  if (pos === 'bl') Object.assign(sty, { bottom: 8, left: 8, borderBottom: '1.5px solid #87CFFA', borderLeft: '1.5px solid #87CFFA' })
  if (pos === 'br') Object.assign(sty, { bottom: 8, right: 8, borderBottom: '1.5px solid #87CFFA', borderRight: '1.5px solid #87CFFA' })
  return <div style={sty} />
}

export default function TargetPickerScreen({ mission, onBack, onPick, hasCoach, catalog }: TargetPickerScreenProps) {
  const { targets: TARGETS, minerals: MINERAL_META } = catalog
  const compat = compatibleTargetsFor(mission, TARGETS)
  const compatIds = new Set(compat.map(t => t.id))
  // Default pick first compatible, prioritizing recommended if they are actually in compat
  const [picked, setPicked] = useState<string>(
    compat.find(t => t.recommended)?.id ?? compat[0]?.id ?? ''
  )

  function place(t: Target) {
    const a = ((ANGLES[t.id] ?? 0) * Math.PI) / 180
    const r = RADII[t.orbit] ?? 84
    return { x: Math.cos(a) * r, y: Math.sin(a) * r }
  }

  const pickedTarget = TARGETS.find(x => x.id === picked)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#03060c' }}>
      <TopBar eyebrow={mission.title.toUpperCase()} title="Pick Target" onBack={onBack} />

      <div style={{ position: 'absolute', inset: 0, paddingTop: hasCoach ? 146 : 72, paddingBottom: 96, overflowY: 'auto' }}>
        <div style={{ padding: '0 14px 6px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>Compatible · {compat.length}</span>
          <span style={{ flex: 1 }} />
          <StatusPill kind="amber" dim>Reach ≤ Orbit {mission.requires.max_orbit}</StatusPill>
        </div>

        {/* System map */}
        <div style={{ margin: '6px 14px', height: 360, borderRadius: 14, background: 'radial-gradient(60% 60% at 50% 50%, #0a1422 0%, #03060a 90%)', border: '1px solid #434C5E', position: 'relative', overflow: 'hidden' }}>
          {/* Stars */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(1px 1px at 8% 12%, #fff8, transparent 60%), radial-gradient(1px 1px at 44% 18%, #fff5, transparent 60%), radial-gradient(1.4px 1.4px at 58% 30%, #fff7, transparent 60%), radial-gradient(1px 1px at 84% 76%, #fff5, transparent 60%), radial-gradient(1.2px 1.2px at 26% 76%, #fff6, transparent 60%), radial-gradient(1px 1px at 80% 92%, #fff5, transparent 60%)' }} />
          {/* Grid */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, transparent 0 39px, rgba(135,207,250,0.06) 39px 40px), repeating-linear-gradient(90deg, transparent 0 39px, rgba(135,207,250,0.06) 39px 40px)' }} />
          <Greebly pos="tl" /><Greebly pos="tr" /><Greebly pos="bl" /><Greebly pos="br" />

          {/* Orbits */}
          {[1,2,3,4,5,6,7,8].map(o => {
            const tOnOrbit = TARGETS.find(t => t.orbit === o)
            const reachable = !!tOnOrbit && o <= mission.requires.max_orbit
            return (
              <div key={o} style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: RADII[o]*2, height: RADII[o]*2, borderRadius: 999, border: `1px ${reachable ? 'solid' : 'dashed'} ${reachable ? 'rgba(239,231,211,0.16)' : 'rgba(255,90,106,0.22)'}` }} />
            )
          })}

          {/* Range disc */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: (RADII[mission.requires.max_orbit] ?? 132)*2 + 24, height: (RADII[mission.requires.max_orbit] ?? 132)*2 + 24, borderRadius: 999, border: '1px solid rgba(245,166,35,0.4)', boxShadow: 'inset 0 0 40px rgba(245,166,35,0.05)', pointerEvents: 'none' }} />

          {/* Sun */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
            <SunSVG size={44} />
          </div>

          {/* Planets */}
          {TARGETS.map(t => {
            const p = place(t)
            const isCompat = compatIds.has(t.id)
            const isPicked = t.id === picked
            return (
              <button key={t.id} onClick={() => isCompat && setPicked(t.id)} style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: p.x, marginTop: p.y, transform: 'translate(-50%,-50%)', background: 'transparent', border: 'none', padding: 0, cursor: isCompat ? 'pointer' : 'not-allowed', opacity: isCompat ? 1 : 0.25, filter: isCompat ? 'none' : 'grayscale(1)' }}>
                <div style={{ position: 'relative', borderRadius: 999, outline: isPicked ? '2px solid #f5a623' : 'none', outlineOffset: 4, boxShadow: isPicked ? '0 0 22px rgba(245,166,35,0.6)' : 'none' }}>
                  <PlanetSVG id={t.id} size={t.id === 'belt' ? 36 : 26} />
                </div>
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: isPicked ? '#f5a623' : '#cde4ff', letterSpacing: '0.06em', whiteSpace: 'nowrap', background: 'rgba(8,12,22,0.7)', padding: '1px 5px', borderRadius: 3 }}>
                  {t.name}
                </div>
              </button>
            )
          })}
        </div>

        {/* Picked target detail */}
        {pickedTarget && (
          <div style={{ padding: '14px 14px 0 14px' }}>
            <Panel accent="#f5a623">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <PlanetSVG id={pickedTarget.id} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: '#f5a623', textTransform: 'uppercase' }}>Target Selected</div>
                  <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 20, color: '#e6efff', letterSpacing: '0.02em' }}>{pickedTarget.name}</div>
                  {pickedTarget.recommended && <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, color: 'var(--ln-ok)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Recommended</div>}
                  <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, letterSpacing: '0.16em', color: '#7a8294', textTransform: 'uppercase' }}>Orbit {pickedTarget.orbit} · {pickedTarget.difficulty}</div>
                </div>
              </div>
              <div style={{ marginTop: 10, fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', lineHeight: 1.4 }}>{pickedTarget.brief}</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {pickedTarget.minerals.map(min => {
                  const meta = MINERAL_META[min]
                  const needed = mission.requires.minerals[min]
                  return (
                    <div key={min} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', background: 'rgba(8,16,28,0.7)', border: `1px solid ${meta.color}${needed ? 'aa' : '55'}`, borderRadius: 6, boxShadow: needed ? `0 0 12px ${meta.color}33` : 'none' }}>
                      <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, fontWeight: 800, color: meta.color }}>{meta.sym}</span>
                      <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 700, color: meta.color }}>{meta.name}{needed ? ` · need ${needed}` : ''}</span>
                    </div>
                  )
                })}
              </div>
            </Panel>
            <div style={{ marginTop: 12 }}>
              <PrimaryBtn onClick={() => onPick(pickedTarget.id)}>Continue · Build →</PrimaryBtn>
            </div>
          </div>
        )}

        {compat.length === 0 && (
          <div style={{ padding: '14px' }}>
            <Panel accent="#ff5a6a">
              <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 14, color: '#ff8290' }}>No reachable targets.</div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', marginTop: 4 }}>Wait for higher-tier propulsion or pick a different mission.</div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  )
}
