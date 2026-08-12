'use client'

import React, { useEffect, useRef, useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import { PrimaryBtn } from '@/components/ui/Button'
import { canAffordStructure, STRUCTURES, structureUnlocked } from '@/lib/data'
import type { StructureBlueprint } from '@/lib/data'
import { Scene } from '@/lib/engine/Scene'
import type { EntityData } from '@/lib/engine/types'
import { buildPlotEntities } from '@/lib/engine/prefabs'
import { readComponentNumber } from '@/lib/engine/registry'
import { UI_ZONES } from '@/lib/ui-zones'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { SoilCrossSection } from '@/components/game/hub/SoilCrossSection'
import HubPixiCanvas from '@/components/game/hub/HubPixiCanvas'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import type { HubBuildingDef } from '@/lib/pixi/hubScene'
import { formatCurrency } from '@/lib/format'
import { FEATURE_FLAGS } from '@/lib/featureFlags'

// Instantiated from the build-plot prefab rather than written out by hand.
// This same list previously existed in four places (both hub scene files and
// both screens); the prefab is the one definition and a test asserts it still
// reproduces hub.scene.json exactly.
const DEFAULT_PLOTS: EntityData[] = buildPlotEntities()

const STRUCTURE_COLORS: Record<string, string> = {
  launchpad: '#3fa9ff',
  refinery: '#f5a623',
  'scan-station': '#39d36a',
  'satellite-monitoring-station': '#7ec8ff',
  'deep-space-telescope': '#9d7cff',
  'astronaut-academy': '#6cc2ff',
}

interface BuildPlaceScreenProps {
  onPlaced: (kind: string, plot: number) => void
  onBack: () => void
  hasCoach?: boolean
  player: {
    francs: number
    stash?: Record<string, number>
    placed: string[]
    freeOperations: boolean
    refineryUnlocked?: boolean
    academyResearched?: boolean
    placementPlots?: Record<string, number>
    satelliteMonitoringLevel?: number
    clientMissions?: Record<string, number>
    deepSpaceTelescopeMissionCompletedAt?: number | null
    scanStationMissionCompletedAt?: number | null
  }
}

function StructureIcon({ kind, size = 32 }: { kind: string; size?: number }) {
  if (kind === 'launchpad') {
    return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 3c4 5 6 10 6 16H10c0-6 2-11 6-16Z" fill="currentColor" opacity=".85"/><circle cx="16" cy="12" r="3" fill="var(--ln-void)"/><path d="m10 17-5 7 6-2m11-5 5 7-6-2M13 20l3 9 3-9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  }
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M5 13h22v14H5zM3 13l4-8h18l4 8" stroke="currentColor" strokeWidth="2"/><path d="M10 27V17h6v10m4-8h4" stroke="currentColor" strokeWidth="2"/></svg>
}

function formatStructureCost(structure: StructureBlueprint): string {
  const mineralCost = Object.entries(structure.costMaterials ?? {})
    .map(([mineral, amount]) => `${amount} ${mineral}`)
    .join(' · ')
  const francs = structure.cost === 0 ? 'Free' : formatCurrency(structure.cost)
  return mineralCost ? `${francs} · ${mineralCost}` : francs
}

export default function BuildPlaceScreen({ onPlaced, onBack, hasCoach, player }: BuildPlaceScreenProps) {
  const [picked, setPicked] = useState('launchpad')
  const [cell, setCell] = useState<number | null>(null)
  const [plotEntities, setPlotEntities] = useState<EntityData[]>(DEFAULT_PLOTS)
  const [sceneLoaded, setSceneLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Scene.load('/game/scenes/hub.scene.json')
      .then(data => { if (data.entities?.length) setPlotEntities(data.entities) })
      .catch(() => {})
      .finally(() => setSceneLoaded(true))
  }, [])

  const catalog = STRUCTURES.filter(s =>
    s.id !== 'garage'
    && (FEATURE_FLAGS.scanStation || s.id !== 'scan-station')
    && (player.placed.includes(s.id) || structureUnlocked(s, { refineryUnlocked: player.refineryUnlocked, academyResearched: player.academyResearched, placed: player.placed, freeOperations: player.freeOperations, satelliteMonitoringLevel: player.satelliteMonitoringLevel, clientMissions: player.clientMissions, deepSpaceTelescopeMissionCompletedAt: player.deepSpaceTelescopeMissionCompletedAt, scanStationMissionCompletedAt: player.scanStationMissionCompletedAt }))
  )
  const sel = catalog.find(c => c.id === picked) ?? catalog[0]
  const sortedEntities = plotEntities.slice().sort((a, b) => {
    const ai = readComponentNumber(a, 'BuildPlot', 'index', 0)
    const bi = readComponentNumber(b, 'BuildPlot', 'index', 0)
    return ai - bi
  })

  const placementPlots = player.placementPlots ?? {}
  // Pre-placementPlots saves always put the launchpad in plot 0 (mirrors HubScreen's legacy handling).
  const legacyLaunchpadPlot0 = player.placed.includes('launchpad') && placementPlots.launchpad == null
  const occupiedPlots = new Set<number>([
    ...Object.values(placementPlots),
    ...(legacyLaunchpadPlot0 ? [0] : []),
  ])
  const previewBuildings: HubBuildingDef[] = cell == null
    ? []
    : sortedEntities.flatMap(entity => {
      const idx = readComponentNumber(entity, 'BuildPlot', 'index', 0)
      if (idx !== cell) return []
      return [{
        kind: picked,
        plotX: entity.transform.position.x,
        w: picked === 'launchpad' ? 98 : picked === 'refinery' ? 84 : 80,
        hot: false,
        status: 'ok' as const,
      }]
    })
  const canSelectStructure = (structure: StructureBlueprint) => {
    const alreadyBuilt = player.placed.includes(structure.id)
    return !alreadyBuilt
      && structureUnlocked(structure, { refineryUnlocked: player.refineryUnlocked, academyResearched: player.academyResearched, placed: player.placed, freeOperations: player.freeOperations, satelliteMonitoringLevel: player.satelliteMonitoringLevel, clientMissions: player.clientMissions, deepSpaceTelescopeMissionCompletedAt: player.deepSpaceTelescopeMissionCompletedAt, scanStationMissionCompletedAt: player.scanStationMissionCompletedAt })
      && canAffordStructure(structure, { francs: player.francs, stash: player.stash })
  }

  useEffect(() => {
    const current = catalog.find(c => c.id === picked)
    if (!current || !canSelectStructure(current)) {
      const first = catalog.find(canSelectStructure)
      if (first) setPicked(first.id)
    }
  }, [catalog, picked, player.academyResearched, player.francs, player.freeOperations, player.placed, player.refineryUnlocked, player.stash])

  function handlePick(id: string) {
    setPicked(id)
    setCell(null)
  }

  return (
    <div
      ref={containerRef}
      data-testid="build-place-screen"
      data-scene-loaded={sceneLoaded ? 'true' : 'false'}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      {/* Earth background */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <HubWorldBackground />
        <ErrorBoundary fallback={null}>
          <HubPixiCanvas buildings={previewBuildings} />
        </ErrorBoundary>
        <SoilCrossSection />
      </div>

      <TopBar eyebrow="EARTH BASE · SETUP" title="Build" onBack={onBack} />

      {/* Plot pads */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        {sortedEntities
          .map(entity => {
            const idx = readComponentNumber(entity, 'BuildPlot', 'index', 0)
            const on = cell === idx
            const taken = occupiedPlots.has(idx)
            const color = STRUCTURE_COLORS[picked] ?? '#3fa9ff'
            return (
              <button
                key={idx}
                className="build-plot-button"
                data-testid={`build-plot-${idx}`}
                onClick={() => !taken && setCell(on ? null : idx)}
                disabled={taken}
                style={{
                  position: 'absolute',
                  left: `calc(${(entity.transform.position.x / 402) * 100}%)`,
                  bottom: 'calc(22% - 20px)',
                  width: 86,
                  transform: 'translateX(-50%)',
                  cursor: taken ? 'not-allowed' : 'pointer',
                  opacity: taken ? 0.35 : 1,
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  pointerEvents: 'auto',
                }}
              >
                <div style={{
                  width: 64,
                  height: 64,
                  marginBottom: 4,
                  opacity: 0,
                  transform: on ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.85)',
                  transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  filter: on ? 'drop-shadow(0 0 12px rgba(245,166,35,0.6))' : 'none',
                }}>
                  {on && <span style={{ color: 'var(--ln-amber)' }}><StructureIcon kind={picked} size={44} /></span>}
                </div>
                <div
                  data-coach-id={idx === 0 ? 'build-plot-0' : undefined}
                  style={{
                  width: '100%',
                  height: 30,
                  borderRadius: '50% / 60%',
                  background: on
                    ? `radial-gradient(ellipse at 50% 35%, ${color}88, ${color}15 70%)`
                    : 'radial-gradient(ellipse at 50% 35%, rgba(112,217,234,0.22), rgba(112,217,234,0.04) 70%)',
                  border: `2px ${on ? 'solid' : 'dashed'} ${on ? color : 'rgba(112,217,234,0.4)'}`,
                  boxShadow: on ? `0 0 24px ${color}66` : '0 2px 6px rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 200ms',
                }}>
                  {on
                    ? <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 16, fontWeight: 800, color, marginTop: -1 }}>⌄</span>
                    : <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 20, fontWeight: 800, color: 'rgba(112,217,234,0.7)', marginTop: -2 }}>+</span>}
                </div>
              </button>
            )
          })}
      </div>

      {/* Structure picker — compact strip below plots, above sticky actions */}
      <div data-ui-zone={UI_ZONES.screenContent} data-coach-id="build-structure-strip" style={{
        position: 'absolute',
        left: 0, right: 0,
        bottom: 48,
        zIndex: 12,
        pointerEvents: 'none',
      }}>
        <div style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(10,10,11,0.60) 20%, rgba(10,10,11,0.85) 100%)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          padding: '10px 12px 0',
        }}>
          <div style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 4,
            pointerEvents: 'auto',
            scrollbarWidth: 'none',
          }}>
            {catalog.map(c => {
              const on = c.id === picked
              const alreadyBuilt = player.placed.includes(c.id)
              const unlocked = structureUnlocked(c, { refineryUnlocked: player.refineryUnlocked, academyResearched: player.academyResearched, placed: player.placed, freeOperations: player.freeOperations, satelliteMonitoringLevel: player.satelliteMonitoringLevel, clientMissions: player.clientMissions, deepSpaceTelescopeMissionCompletedAt: player.deepSpaceTelescopeMissionCompletedAt, scanStationMissionCompletedAt: player.scanStationMissionCompletedAt }) && !alreadyBuilt
              const affordable = canAffordStructure(c, { francs: player.francs, stash: player.stash })
              const canSelect = unlocked && affordable
              const color = STRUCTURE_COLORS[c.id] ?? '#3fa9ff'
              return (
                <button
                  key={c.id}
                  onClick={() => canSelect && handlePick(c.id)}
                  disabled={!canSelect}
                  style={{
                    flex: '0 0 auto',
                    scrollSnapAlign: 'start',
                    background: on
                      ? `linear-gradient(180deg, ${color}22, ${color}08)`
                      : 'rgba(24,24,28,0.70)',
                    border: `1px solid ${on ? color : 'rgba(112,217,234,0.12)'}`,
                    borderRadius: 10,
                    padding: '6px 10px',
                    cursor: canSelect ? 'pointer' : 'default',
                    opacity: canSelect || alreadyBuilt ? 1 : 0.4,
                    textAlign: 'left',
                    minWidth: 90,
                    maxWidth: 120,
                    transition: 'all 150ms',
                    outline: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: on ? color : 'var(--ln-cyan)', flexShrink: 0 }}>
                      <StructureIcon kind={c.id} size={20} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'var(--ln-font-display)',
                        fontWeight: 800,
                        fontSize: 10,
                        color: on ? color : '#c8d6ea',
                        letterSpacing: '0.01em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>{c.name}</div>
                      <div style={{
                        fontFamily: 'var(--ln-font-mono)',
                        fontSize: 8,
                        color: on ? color : '#7a8294',
                        marginTop: 1,
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                      }}>
                        {alreadyBuilt ? 'BUILT' : unlocked ? (c.cost === 0 ? 'FREE' : formatCurrency(c.cost, { compact: true })) : c.unlocksAt}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Status line */}
          <div style={{
            pointerEvents: 'none',
            padding: '6px 2px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{ color: STRUCTURE_COLORS[picked] ?? '#3fa9ff', flexShrink: 0 }}>
              <StructureIcon kind={picked} size={14} />
            </span>
            <span style={{
              fontFamily: 'var(--ln-font-body)',
              fontSize: 11,
              color: '#a9b8ce',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {cell == null
                ? `Select a plot for the ${sel.name} · ${formatStructureCost(sel)}`
                : `Place ${sel.name} here? · ${formatStructureCost(sel)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Glow line */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0,
        bottom: 44,
        height: 2,
        zIndex: 6,
        background: 'linear-gradient(90deg, transparent, rgba(255,225,160,0.35) 15%, rgba(255,225,160,0.35) 85%, transparent)',
      }} />

      <div
        className="sticky-actions"
        data-ui-zone={UI_ZONES.bottomActions}
        data-coach-id={cell != null ? 'build-confirm' : undefined}
        style={{ zIndex: 15 }}
      >
        {/* Mint/green, not amber: the Earth Base flow carries no amber (see
            landnam-earth-base-v2.html, whose confirm sheet is --ln-ok), and
            amber is reserved for payout emphasis, never a primary button. */}
        <PrimaryBtn kind="green" disabled={cell == null} onClick={() => cell != null && onPlaced(picked, cell)}>
          Confirm · Build Here →
        </PrimaryBtn>
      </div>
    </div>
  )
}
