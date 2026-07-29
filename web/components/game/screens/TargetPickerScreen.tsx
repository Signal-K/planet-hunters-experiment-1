'use client'

import React, { useState } from 'react'
import StatusPill from '@/components/ui/StatusPill'
import { PrimaryBtn } from '@/components/ui/Button'
import { compatibleTargetsFor, orbitBandLabel, type Mission, type Target } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'
import TutorialHighlight from '@/components/game/TutorialHighlight'
import GalaxyMap from '@/components/TargetPicker/GalaxyMap'
import MineralChip from '@/components/game/MineralChip'
import MissionSetupShell, {
  MissionSetupCard,
  MissionSetupFrame,
} from '@/components/game/screens/MissionSetupShell'

const RARITY_RANK: Record<string, number> = { exotic: 3, rare: 2, uncommon: 1, common: 0 }
const DEPOSIT_MIX_CAP = 6

interface TargetPickerScreenProps {
  mission: Mission
  onBack: () => void
  onPick: (id: string) => void
  hasCoach?: boolean
  catalog: Catalog
}

function PlanetSVG({ id, size }: { id: string; size: number }) {
  const gradientId = React.useId()
  const colors: Record<string, { fill: string; low: string; stroke: string; mark: string }> = {
    mercury: { fill: '#8a7060', low: '#4d4038', stroke: '#a08070', mark: '#c1a292' },
    venus:   { fill: '#e8c870', low: '#9f7434', stroke: '#d4a840', mark: '#fff0a8' },
    earth:   { fill: '#2a6ea4', low: '#123152', stroke: '#4a9ec4', mark: '#54b36a' },
    mars:    { fill: '#c1440e', low: '#5e2414', stroke: '#e05020', mark: '#f08a45' },
    belt:    { fill: '#8a7a5a', low: '#3e372c', stroke: '#aaa080', mark: '#d0c29a' },
    jupiter: { fill: '#c8a060', low: '#6f4f2a', stroke: '#e0b870', mark: '#f2d39a' },
    saturn:  { fill: '#e0c880', low: '#8a7145', stroke: '#c8a860', mark: '#fff2b8' },
    neptune: { fill: '#2040c0', low: '#091d66', stroke: '#4060e0', mark: '#79a2ff' },
    ceres:   { fill: '#8e8f86', low: '#444740', stroke: '#b7b8ac', mark: '#d2d0bf' },
  }
  const asteroidIds = new Set(['eros', 'vesta', 'itokawa', 'ryugu', 'psyche', 'bennu', 'ceres'])
  const col = colors[id] ?? { fill: '#607080', low: '#283340', stroke: '#809090', mark: '#aab8bd' }
  const r = size / 2
  const isAsteroid = asteroidIds.has(id)
  const asteroidPoints = `${r * 0.52},${r * 0.08} ${r * 1.26},${r * 0.2} ${r * 1.82},${r * 0.72} ${r * 1.58},${r * 1.48} ${r * 0.9},${r * 1.88} ${r * 0.2},${r * 1.44} ${r * 0.08},${r * 0.62}`
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id={`${gradientId}-body`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={col.mark}/>
          <stop offset="45%" stopColor={col.fill}/>
          <stop offset="100%" stopColor={col.low}/>
        </radialGradient>
        <clipPath id={`${gradientId}-clip`}>
          {isAsteroid
            ? <polygon points={asteroidPoints} />
            : <circle cx={r} cy={r} r={r - 1} />}
        </clipPath>
      </defs>
      {isAsteroid
        ? <polygon points={asteroidPoints} fill={`url(#${gradientId}-body)`} stroke={col.stroke} strokeWidth={1.5} />
        : <circle cx={r} cy={r} r={r - 1} fill={`url(#${gradientId}-body)`} stroke={col.stroke} strokeWidth={1.5}/>}
      <g clipPath={`url(#${gradientId}-clip)`} opacity={0.9}>
        {id === 'jupiter' || id === 'saturn' || id === 'venus'
          ? <>
              <path d={`M${r * -0.1} ${r * 0.7} C${r * 0.5} ${r * 0.52}, ${r * 1.2} ${r * 0.9}, ${r * 2.1} ${r * 0.66}`} stroke={col.mark} strokeWidth={Math.max(1, size * 0.08)} opacity={0.45} fill="none"/>
              <path d={`M${r * -0.1} ${r * 1.18} C${r * 0.5} ${r * 1.0}, ${r * 1.2} ${r * 1.35}, ${r * 2.1} ${r * 1.1}`} stroke={col.low} strokeWidth={Math.max(1, size * 0.1)} opacity={0.45} fill="none"/>
            </>
          : <>
              <circle cx={r * 0.72} cy={r * 0.78} r={r * 0.16} fill={col.low} opacity={0.45}/>
              <circle cx={r * 1.28} cy={r * 0.62} r={r * 0.11} fill={col.mark} opacity={0.35}/>
              <path d={`M${r * 0.25} ${r * 1.28} C${r * 0.72} ${r * 1.08}, ${r * 1.24} ${r * 1.45}, ${r * 1.8} ${r * 1.18}`} stroke={col.mark} strokeWidth={1} opacity={0.3} fill="none"/>
            </>}
      </g>
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

export default function TargetPickerScreen({ mission, onBack, onPick, hasCoach, catalog }: TargetPickerScreenProps) {
  const { targets: TARGETS, minerals: MINERAL_META } = catalog
  const compat = compatibleTargetsFor(mission, TARGETS)
  const compatIds = new Set(compat.map(t => t.id))
  const quickPickForOnboarding = hasCoach && mission.sequence === 1
  // Default pick first compatible, prioritizing recommended if they are actually in compat
  const [picked, setPicked] = useState<string>(
    compat.find(t => t.recommended)?.id ?? compat[0]?.id ?? ''
  )

  const pickedTarget = TARGETS.find(x => x.id === picked)
  const deliveryTarget = mission.deliveryTargetId ? TARGETS.find(t => t.id === mission.deliveryTargetId) : undefined
  const pickedIsCompatible = pickedTarget ? compatIds.has(pickedTarget.id) : false
  const missionMineralKeys = Object.keys(mission.requires.minerals)

  // Deposit mix — required minerals sort first (regardless of rarity), then
  // by rarity descending, capped with a "+N more" overflow like the design.
  const depositMixAll = pickedTarget
    ? [...pickedTarget.minerals].sort((a, b) => {
        const aWanted = missionMineralKeys.includes(a) ? 1 : 0
        const bWanted = missionMineralKeys.includes(b) ? 1 : 0
        if (aWanted !== bWanted) return bWanted - aWanted
        const aRank = RARITY_RANK[MINERAL_META[a]?.rarity ?? 'common'] ?? 0
        const bRank = RARITY_RANK[MINERAL_META[b]?.rarity ?? 'common'] ?? 0
        return bRank - aRank
      })
    : []
  const depositMixShown = depositMixAll.slice(0, DEPOSIT_MIX_CAP)
  const depositMixOverflow = Math.max(0, depositMixAll.length - DEPOSIT_MIX_CAP)

  return (
    <MissionSetupShell
      className="mission-setup-screen--target"
      eyebrow={mission.title.toUpperCase()}
      title="Pick Target"
      onBack={onBack}
      hasCoach={hasCoach}
      step="Target"
      stepDescription={
        deliveryTarget
          ? `Choose a mining site, then deliver cargo to ${deliveryTarget.name} before returning to Earth.`
          : 'Choose a reachable mining site, then continue to build your rocket.'
      }
      actions={pickedTarget && (
        <PrimaryBtn testId="continue-build-btn" onClick={() => onPick(pickedTarget.id)}>Continue · Build →</PrimaryBtn>
      )}
    >
      <div className="mission-board-layout" style={{ minHeight: 0, flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
        {deliveryTarget && (
          <div style={{
            padding: '8px 12px', borderRadius: 6,
            background: 'rgba(63,169,255,0.08)', border: '1px solid rgba(63,169,255,0.3)',
            fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.08em', color: 'var(--ln-cyan)', textTransform: 'uppercase',
          }}>
            Two-stop job · Mine here, then deliver cargo to {deliveryTarget.name} before returning to Earth
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', minHeight: 0, flex: 1 }}>
          <div style={{ padding: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>Compatible · {compat.length}</span>
            <span style={{ flex: 1 }} />
            <StatusPill kind="amber" dim>Rocket range · Orbit ≤ {mission.requires.max_orbit}</StatusPill>
          </div>
          {/* Orbit was shown as a bare number everywhere, with no statement of
              what it buys the player — while the rarity gates it drives are
              real game logic (target-archetypes.ts). One line, once, where
              orbit is first read (STS-544). */}
          <div style={{ padding: '0 0 8px', fontFamily: 'var(--ln-font-body)', fontSize: 11, color: 'var(--ln-text-muted)', lineHeight: 1.4 }}>
            <b style={{ color: 'var(--ln-text-dim)', fontWeight: 700 }}>Orbit</b> is the distance band from Earth — farther orbits reach rarer minerals, and need more rocket range.
          </div>
          <MissionSetupFrame style={{ position: 'relative', height: '100%' }}>
            <GalaxyMap
              mission={mission}
              targets={TARGETS}
              compatibleIds={compatIds}
              pickedId={picked}
              onPick={setPicked}
            />
            {hasCoach && <TutorialHighlight borderRadius={14} />}
          </MissionSetupFrame>
        </div>
        </div>

      <div className="mission-board-detail">
      {/* Off-screen buttons per target — E2E test hooks; force-click via {force:true} */}
      <div style={{ position: 'fixed', left: -600, top: 0 }}>
        {compat.map(t => (
          <button key={t.id} data-testid={`target-${t.id}`} aria-label={`Select ${t.name}`}
            onClick={() => setPicked(t.id)}
            style={{ width: 4, height: 4 }}
          />
        ))}
      </div>

      {pickedTarget ? (
        <MissionSetupCard>
              {missionMineralKeys.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                  padding: '8px 10px', borderRadius: 6,
                  border: '1px dashed var(--ln-amber-border)', background: 'var(--ln-amber-soft)',
                }}>
                  <span style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: 'var(--ln-text-dim)', lineHeight: 1.4 }}>
                    Contract wants{' '}
                    <b style={{ color: 'var(--ln-amber)', fontWeight: 700 }}>
                      {missionMineralKeys.map(m => MINERAL_META[m]?.name ?? m).join(', ')}
                    </b>
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <PlanetSVG id={pickedTarget.id} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: pickedIsCompatible ? 'var(--ln-ok)' : 'var(--ln-crit)', textTransform: 'uppercase' }}>
                    {pickedIsCompatible ? 'Reachable' : 'Not compatible'}
                  </div>
                  <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 20, color: 'var(--ln-text)', letterSpacing: '0.02em' }}>{pickedTarget.name}</div>
                  {pickedTarget.recommended && <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, color: 'var(--ln-ok)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Recommended</div>}
                  <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, letterSpacing: '0.16em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>Orbit {pickedTarget.orbit} · {pickedTarget.difficulty}</div>
                  <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ln-cyan)', textTransform: 'uppercase', marginTop: 2 }}>
                    {orbitBandLabel(pickedTarget.orbit)}
                  </div>
                </div>
              </div>
              {!hasCoach && (
                <div style={{ marginTop: 10, fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-dim)', lineHeight: 1.4 }}>{pickedTarget.brief}</div>
              )}
              {/* Deposit mix — required minerals first, then rarest first, capped */}
              <div style={{ marginTop: hasCoach ? 6 : 10 }}>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase', marginBottom: 5 }}>Deposit mix</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {depositMixShown.map(min => (
                    <MineralChip key={min} meta={MINERAL_META[min] ? { name: MINERAL_META[min].name, sym: MINERAL_META[min].sym, color: MINERAL_META[min].color } : { name: min, sym: min, color: '#ffffff' }} />
                  ))}
                  {depositMixOverflow > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: 'var(--ln-text-muted)' }}>
                      +{depositMixOverflow} more
                    </span>
                  )}
                </div>
              </div>
        </MissionSetupCard>
      ) : compat.length === 0 ? (
        <MissionSetupCard>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 14, color: '#ff8290' }}>No reachable targets.</div>
          <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', marginTop: 4 }}>Wait for higher-tier propulsion or pick a different mission.</div>
        </MissionSetupCard>
      ) : <div />}
      </div>
      </div>

    </MissionSetupShell>
  )
}
