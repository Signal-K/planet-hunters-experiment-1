'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { PrimaryBtn } from '@/components/ui/Button'
import type { Mission, Target } from '@/lib/data'
import { MINERAL_META } from '@/lib/data'
import { UI_ZONES } from '@/lib/ui-zones'
import { formatCountdown } from '@/lib/format'
import { deriveRoverScoutingResult, ROVER_TERRAIN_CLASSES, type RoverTerrainClass } from '@/lib/data/rover-scouting'
import RoverMiningCanvas from './RoverMiningCanvas'

const ROVER_MINING_DURATION_MS = 2 * 60 * 1000

// Rover cargo mirrors what the mission actually requires — same contract as
// the laser MiningScreen's mission.requires.minerals — so a rover deployment
// yields real, usable mission cargo instead of an arbitrary fixed haul.
function generateRoverCargo(mission: Mission, target: Target, terrain: RoverTerrainClass): Record<string, number> {
  const required = mission.requires.minerals
  const cargo: Record<string, number> = Object.keys(required).length > 0 ? { ...required } : {}
  if (Object.keys(cargo).length === 0) {
    const minerals = target.minerals.slice(0, 3)
    minerals.forEach((mineral, i) => {
      cargo[mineral] = 2 + i
    })
  }
  const scouting = deriveRoverScoutingResult(target, terrain)
  cargo[scouting.mineral] = (cargo[scouting.mineral] ?? 0) + scouting.cargoBonus
  return cargo
}

interface RoverMiningScreenProps {
  mission: Mission
  target: Target
  onComplete: (cargo: Record<string, number>) => void
  onBack: () => void
  terrainClassification?: RoverTerrainClass
  onClassifyTerrain: (terrain: RoverTerrainClass) => void
  /** Wall-clock start of this run, restored across a Back-to-hub pause so the extraction timer doesn't restart. */
  startedAt?: number
}

export default function RoverMiningScreen({ mission, target, onComplete, onBack, startedAt: startedAtProp, terrainClassification, onClassifyTerrain }: RoverMiningScreenProps) {
  const [now, setNow] = useState(() => Date.now())

  const startedAt = startedAtProp ?? now
  const elapsed = terrainClassification ? now - startedAt : 0
  const done = elapsed >= ROVER_MINING_DURATION_MS
  const progressPct = Math.min(100, (elapsed / ROVER_MINING_DURATION_MS) * 100)
  const remaining = Math.max(0, ROVER_MINING_DURATION_MS - elapsed)
  const cargo = terrainClassification ? generateRoverCargo(mission, target, terrainClassification) : {}
  const scouting = terrainClassification ? deriveRoverScoutingResult(target, terrainClassification) : null

  const countdown = formatCountdown(remaining)

  useEffect(() => {
    if (done) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [done, terrainClassification])

  return (
    <div className="game-screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <TopBar eyebrow={`SURFACE OPS · ${target.name.toUpperCase()}`} title="Rover Mining" onBack={onBack} />

      {/* PixiJS rover scene — grows to fill available space */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0, marginTop: 56 }}>
        <RoverMiningCanvas target={target} done={done} />
      </div>

      {/* HUD strip — status + timer + cargo */}
      <div data-ui-zone={UI_ZONES.screenContent} style={{
        padding: '10px 16px',
        background: 'linear-gradient(180deg, transparent, var(--ln-void) 18%)',
        flexShrink: 0,
      }}>
        <Panel accent={done ? 'var(--ln-ok)' : 'var(--ln-amber)'} style={{ padding: 10, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: done ? 0 : 8 }}>
            <RoverIcon done={done} />
            <div>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 14, color: done ? 'var(--ln-ok)' : 'var(--ln-amber)' }}>
                {!terrainClassification ? 'SURVEY THE SITE' : done ? 'EXTRACTION COMPLETE' : 'EXTRACTING DEPOSITS'}
              </div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: '#a9b8ce', marginTop: 2 }}>
                {mission.title}
              </div>
            </div>
          </div>
          {!terrainClassification ? (
            <div data-testid="rover-scouting-classification" style={{ marginTop: 10 }}>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', lineHeight: 1.4, marginBottom: 8 }}>
                Classify the rover&apos;s synthetic terrain observation to identify a deposit signature before extraction.
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ROVER_TERRAIN_CLASSES.map(terrain => (
                  <PrimaryBtn key={terrain} kind={terrain === 'vein' ? 'green' : undefined} onClick={() => onClassifyTerrain(terrain)} testId={`rover-classify-${terrain}`}>
                    {terrain.toUpperCase().replace('-', ' ')}
                  </PrimaryBtn>
                ))}
              </div>
            </div>
          ) : !done && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: '#6b7fa3' }}>OPERATION PROGRESS</span>
                <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--ln-amber)' }}>{countdown}</span>
              </div>
              <div style={{ height: 5, background: 'rgba(245,166,35,0.15)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--ln-amber)', borderRadius: 3, transition: 'width 1s linear' }} />
              </div>
            </>
          )}
        </Panel>

        {scouting && (
          <StatusPill kind={scouting.terrain === 'vein' ? 'ok' : 'info'}>
            {scouting.depositLabel} · {MINERAL_META[scouting.mineral]?.sym ?? scouting.mineral.toUpperCase()} SIGNATURE +{scouting.cargoBonus}
          </StatusPill>
        )}

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
          {Object.entries(cargo).map(([mineral, amount]) => {
            const meta = MINERAL_META[mineral]
            return (
              <div key={mineral} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 6, background: (meta?.color ?? '#888') + '18', border: `1px solid ${meta?.color ?? '#888'}44` }}>
                <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, fontWeight: 700, color: meta?.color ?? '#888' }}>
                  {meta?.sym ?? mineral.slice(0, 2).toUpperCase()}
                </span>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 11, color: '#e8f0fe' }}>×{amount}</span>
              </div>
            )
          })}
        </div>

        {terrainClassification && done ? (
          <>
            <StatusPill kind="ok">ROVER RETURNED — MINERALS SECURED</StatusPill>
            <div style={{ marginTop: 8 }}>
              <PrimaryBtn kind="green" onClick={() => onComplete(cargo)}>
                COLLECT CARGO
              </PrimaryBtn>
            </div>
          </>
        ) : terrainClassification ? (
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, letterSpacing: '0.15em', color: '#6b7fa3', textTransform: 'uppercase' }}>
            Use joystick to drive rover · Drill auto-activates when stationary
          </div>
        ) : null}
      </div>
    </div>
  )
}

function RoverIcon({ done }: { done: boolean }) {
  const color = done ? 'var(--ln-ok)' : 'var(--ln-amber)'
  return (
    <svg width={28} height={28} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="8" y="12" width="16" height="10" rx="2" stroke={color} strokeWidth="1.5" />
      <path d="M8 17h16M13 12V9m6 3V9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="24" r="2.5" stroke={color} strokeWidth="1.5" />
      <circle cx="22" cy="24" r="2.5" stroke={color} strokeWidth="1.5" />
      {done && <path d="M13 16l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  )
}
