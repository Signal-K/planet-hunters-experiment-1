'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import { PrimaryBtn } from '@/components/ui/Button'
import StatusPill from '@/components/ui/StatusPill'
import { Scene } from '@/lib/engine/Scene'
import type { EntityData } from '@/lib/engine/types'

const DEFAULT_PLOTS: EntityData[] = [
  { id: 'plot-0', name: 'Plot 0', transform: { position: { x: 14, y: 628 }, rotation: 0, scale: { x: 1, y: 1 } }, components: [{ type: 'BuildPlot', index: 0 }] },
  { id: 'plot-1', name: 'Plot 1', transform: { position: { x: 110, y: 628 }, rotation: 0, scale: { x: 1, y: 1 } }, components: [{ type: 'BuildPlot', index: 1 }] },
  { id: 'plot-2', name: 'Plot 2', transform: { position: { x: 206, y: 628 }, rotation: 0, scale: { x: 1, y: 1 } }, components: [{ type: 'BuildPlot', index: 2 }] },
  { id: 'plot-3', name: 'Plot 3', transform: { position: { x: 302, y: 628 }, rotation: 0, scale: { x: 1, y: 1 } }, components: [{ type: 'BuildPlot', index: 3 }] },
]

interface BuildPlaceScreenProps {
  onPlaced: (kind: string, plot: number) => void
  onBack: () => void
  hasCoach?: boolean
}

const CATALOG = [
  { id: 'launchpad', name: 'Launchpad', cost: 0, desc: 'Assemble rockets and launch mining missions.', avail: true },
]

function StructureIcon({ kind, size = 32 }: { kind: string; size?: number }) {
  if (kind === 'launchpad') {
    return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 3c4 5 6 10 6 16H10c0-6 2-11 6-16Z" fill="currentColor" opacity=".85"/><circle cx="16" cy="12" r="3" fill="var(--ln-void)"/><path d="m10 17-5 7 6-2m11-5 5 7-6-2M13 20l3 9 3-9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  }
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M5 13h22v14H5zM3 13l4-8h18l4 8" stroke="currentColor" strokeWidth="2"/><path d="M10 27V17h6v10m4-8h4" stroke="currentColor" strokeWidth="2"/></svg>
}

export default function BuildPlaceScreen({ onPlaced, onBack, hasCoach }: BuildPlaceScreenProps) {
  const [phase, setPhase] = useState<'pick' | 'place'>('pick')
  const [picked, setPicked] = useState('launchpad')
  const [cell, setCell] = useState<number | null>(null)
  const [plotEntities, setPlotEntities] = useState<EntityData[]>(DEFAULT_PLOTS)

  useEffect(() => {
    Scene.load('/game/scenes/build-place.scene.json')
      .then(data => { if (data.entities?.length) setPlotEntities(data.entities) })
      .catch(() => {})
  }, [])

  const sel = CATALOG.find(c => c.id === picked) ?? CATALOG[0]

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <Image src="/scenes/earth-day.png" alt="" fill priority style={{ objectFit: 'cover', filter: `brightness(${phase === 'place' ? 0.65 : 0.88})` }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,9,15,0.45) 0%, transparent 25%, transparent 74%, rgba(6,9,15,0.45) 100%)' }} />
      </div>

      <TopBar
        eyebrow={phase === 'pick' ? 'EARTH BASE · SETUP' : 'PLACE STRUCTURE'}
        title={phase === 'pick' ? 'Build' : 'Choose a Plot'}
        onBack={phase === 'place' ? () => setPhase('pick') : onBack}
      />

      {phase === 'pick' && (
        <div style={{ position: 'absolute', inset: 0, paddingTop: hasCoach ? 184 : 128, paddingBottom: 96, overflowY: 'auto' }}>
          <div style={{ padding: '0 14px 8px' }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>Available Structures</div>
          </div>
          <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CATALOG.map(c => {
              const on = c.id === picked
              const unlocked = c.avail
              return (
                <button key={c.id} onClick={() => unlocked && setPicked(c.id)} style={{ background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: unlocked ? 'pointer' : 'not-allowed', opacity: unlocked ? 1 : 0.5 }}>
                  <Panel accent={on ? '#f5a623' : '#3fa9ff'} style={{ padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 48, height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,18,29,0.8)', borderRadius: 8, border: `1px solid ${on ? '#f5a623' : '#3fa9ff'}40` }}>
                        <span style={{ color: on ? 'var(--ln-amber)' : 'var(--ln-cyan)' }}><StructureIcon kind={c.id} /></span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 15, color: on ? '#f5a623' : '#e6efff', letterSpacing: '0.02em' }}>{c.name}</div>
                        <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: '#a9b8ce', marginTop: 2, lineHeight: 1.35 }}>{c.desc}</div>
                        <div style={{ marginTop: 6 }}>
                          {c.avail
                            ? <StatusPill kind={c.cost === 0 ? 'ok' : 'amber'}>{c.cost === 0 ? 'Free · Starter' : `▲ ${c.cost}`}</StatusPill>
                            : <StatusPill kind="mute">Locked</StatusPill>}
                        </div>
                      </div>
                      {on && <span style={{ color: '#f5a623', fontSize: 22 }}>✓</span>}
                    </div>
                  </Panel>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {phase === 'pick' && (
        <div className="sticky-actions">
          <PrimaryBtn kind="amber" onClick={() => setPhase('place')}>Select a Plot →</PrimaryBtn>
        </div>
      )}

      {phase === 'place' && (
        <>
          <div style={{ position: 'absolute', left: 14, right: 14, top: hasCoach ? 166 : 130, zIndex: 12 }}>
            <Panel accent="#f5a623" style={{ padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--ln-amber)' }}><StructureIcon kind="launchpad" size={28} /></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: '#f5a623', textTransform: 'uppercase' }}>Placing · {sel.name}</div>
                  <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', marginTop: 2 }}>{cell == null ? 'Tap a glowing pad on the surface.' : 'Pad chosen — confirm to build here.'}</div>
                </div>
              </div>
            </Panel>
          </div>

          <div style={{ position: 'absolute', left: 0, right: 0, top: 702, height: 3, zIndex: 6, background: 'linear-gradient(90deg, transparent, rgba(255,225,160,0.55) 20%, rgba(255,225,160,0.55) 80%, transparent)' }} />

          <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
            {plotEntities
              .slice()
              .sort((a, b) => {
                const ai = (a.components.find(c => c.type === 'BuildPlot')?.index as number) ?? 0
                const bi = (b.components.find(c => c.type === 'BuildPlot')?.index as number) ?? 0
                return ai - bi
              })
              .map(entity => {
                const idx = (entity.components.find(c => c.type === 'BuildPlot')?.index as number) ?? 0
                const on = cell === idx
                return (
                  <button key={idx} data-testid={`build-plot-${idx}`} onClick={() => setCell(idx)} style={{ position: 'absolute', left: entity.transform.position.x, top: entity.transform.position.y, width: 86, cursor: 'pointer', background: 'transparent', border: 'none', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'auto' }}>
                    <div style={{ width: 64, height: 64, marginBottom: 2, opacity: on ? 1 : 0, transform: on ? 'translateY(0)' : 'translateY(6px)', transition: 'all 160ms', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                      {on && <span style={{ color: 'var(--ln-amber)' }}><StructureIcon kind={picked} size={40} /></span>}
                    </div>
                    <div style={{ width: '100%', height: 30, borderRadius: '50% / 60%', background: on ? 'radial-gradient(ellipse at 50% 35%, rgba(245,166,35,0.5), rgba(245,166,35,0.12) 70%)' : 'radial-gradient(ellipse at 50% 35%, rgba(135,207,250,0.28), rgba(135,207,250,0.05) 70%)', border: `2px dashed ${on ? '#f5a623' : 'rgba(135,207,250,0.6)'}`, boxShadow: on ? '0 0 22px rgba(245,166,35,0.55)' : '0 2px 6px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: on ? 'none' : 'pad-pulse 1.8s ease-in-out infinite', transition: 'all 160ms' }}>
                      {!on && <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 20, fontWeight: 800, color: 'rgba(135,207,250,0.85)', marginTop: -2 }}>+</span>}
                    </div>
                  </button>
                )
              })}
          </div>

          <div className="sticky-actions">
            <PrimaryBtn kind="amber" disabled={cell == null} onClick={() => cell != null && onPlaced(picked, cell)}>Confirm · Build Here →</PrimaryBtn>
          </div>
        </>
      )}
    </div>
  )
}
