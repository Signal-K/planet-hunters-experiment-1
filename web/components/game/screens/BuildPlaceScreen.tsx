'use client'

import React, { useEffect, useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import { PrimaryBtn } from '@/components/ui/Button'
import { canAffordStructure, STRUCTURES, structureUnlocked } from '@/lib/data'
import type { StructureBlueprint } from '@/lib/data'
import type { EntityData } from '@/lib/engine/types'
import { buildPlotEntities } from '@/lib/engine/prefabs'
import { readComponentNumber } from '@/lib/engine/registry'
import { UI_ZONES } from '@/lib/ui-zones'
import { EarthBaseModules } from '@/components/game/hub/EarthBaseModules'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import type { HubBuildingDef } from '@/components/game/hub/EarthBaseModules'
import { formatCurrency } from '@/lib/format'
import { FEATURE_FLAGS } from '@/lib/featureFlags'

// Instantiated from the build-plot prefab rather than written out by hand.
// This same list previously existed in four places (both hub scene files and
// both screens); the prefab is the one definition and a test asserts it still
// reproduces hub.scene.json exactly.
const DEFAULT_PLOTS: EntityData[] = buildPlotEntities()

const STRUCTURE_COLORS: Record<string, string> = {
  launchpad: 'var(--ln-info)',
  refinery: 'var(--ln-amber)', // structure identity exception
  'scan-station': 'var(--ln-ok)',
  'deep-space-telescope': 'var(--ln-crit-soft)', // purple identity
  'astronaut-academy': 'var(--ln-cyan-bright)',
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
    transitSatelliteLevel?: number
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
  // Build plots are authored from the shared prefab. Reloading the identical
  // hub scene on every entry delayed Build and Back without changing any
  // placement coordinates, so use the prefab directly.
  const plotEntities = DEFAULT_PLOTS

  const catalog = STRUCTURES.filter(s =>
    s.id !== 'garage'
    // KES-283: Refinery was previously excluded here (KES-286) because it was
    // modeled as an off-world site-commissioned structure with an unlock
    // condition no mission ever satisfied — a permanent dead end. It's now a
    // normal Earth Base plot purchase (same unlock shape as Surface Silo), so
    // it belongs in this strip.
    // Academy/crew progression is deferred with the retired affinity ladder.
    // Existing placed academies remain readable, but no new Base plot offers
    // this unrelated progression branch in the simplified launch loop.
    && s.id !== 'astronaut-academy'
    && (FEATURE_FLAGS.scanStation || s.id !== 'scan-station')
    && !player.placed.includes(s.id)
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
  const effectivePlots: Record<string, number> = {
    ...placementPlots,
    ...(legacyLaunchpadPlot0 ? { launchpad: 0 } : {}),
  }
  const occupiedPlots = new Set<number>(Object.values(effectivePlots))
  const existingBuildings: HubBuildingDef[] = sortedEntities.flatMap(entity => {
    const index = readComponentNumber(entity, 'BuildPlot', 'index', 0)
    const kind = Object.entries(effectivePlots).find(([, plot]) => plot === index)?.[0]
    if (!kind) return []
    return [{
      kind,
      plotX: entity.transform.position.x,
      w: kind === 'launchpad' ? 98 : kind === 'refinery' ? 84 : 80,
      hot: false,
      status: 'ok' as const,
    }]
  })
  const previewBuildings: HubBuildingDef[] = cell == null || !sel
    ? []
    : sortedEntities.flatMap(entity => {
      const idx = readComponentNumber(entity, 'BuildPlot', 'index', 0)
      if (idx !== cell) return []
      return [{
        kind: sel.id,
        plotX: entity.transform.position.x,
        w: sel.id === 'launchpad' ? 98 : sel.id === 'surface-silo' ? 62 : sel.id === 'refinery' ? 84 : 80,
        hot: false,
        status: 'ok' as const,
      }]
    })
  const canSelectStructure = (structure: StructureBlueprint) => {
    const alreadyBuilt = player.placed.includes(structure.id)
    return !alreadyBuilt
      && structureUnlocked(structure, { refineryUnlocked: player.refineryUnlocked, academyResearched: player.academyResearched, placed: player.placed, freeOperations: player.freeOperations, transitSatelliteLevel: player.transitSatelliteLevel, clientMissions: player.clientMissions, deepSpaceTelescopeMissionCompletedAt: player.deepSpaceTelescopeMissionCompletedAt, scanStationMissionCompletedAt: player.scanStationMissionCompletedAt })
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
      data-testid="build-place-screen"
      data-scene-loaded="true"
      className="build-place-screen"
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      {/* Build field — corrected 2026-08-22 (KES-228): this was a flat CSS
          grid over an empty void, no sky, no terrain, reported back as "all
          you've got is this black grid... where's the landscape?" — the
          same complaint the Hub scene got before it grew a real dusk-sky-
          and-hills backdrop. Reuses that exact component here instead of a
          second bespoke background, so Build reads as the same physical
          place as Hub, just in placement mode. Build's plots sit at a
          different ground line than Hub's (`bottom: calc(42% - 20px)` vs
          Hub's 22%), so `--hub-ground` is scoped to 42% for this screen only
          (see globals.css `.build-place-screen`) rather than changing the
          shared token everyone else relies on. */}
      <div className="build-place-field" style={{ position: 'absolute', inset: 0 }}>
        <HubWorldBackground />
        <EarthBaseModules buildings={existingBuildings} />
        <EarthBaseModules buildings={previewBuildings} />
      </div>

      <TopBar eyebrow="BASE · SETUP" title="Build" onBack={onBack} />

      {/* Plot pads */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        {sortedEntities
          .map(entity => {
            const idx = readComponentNumber(entity, 'BuildPlot', 'index', 0)
            const on = cell === idx
            const taken = occupiedPlots.has(idx)
            const color = STRUCTURE_COLORS[sel?.id ?? 'launchpad'] ?? '#3fa9ff'
            if (taken) return null
            return (
              <button
                key={idx}
                className="build-plot-button"
                data-testid={`build-plot-${idx}`}
                onClick={() => sel && setCell(on ? null : idx)}
                disabled={!sel}
                style={{
                  position: 'absolute',
                  left: `calc(${(entity.transform.position.x / 402) * 100}%)`,
                  bottom: 'calc(42% - 20px)',
                  width: 86,
                  transform: 'translateX(-50%)',
                  cursor: sel ? 'pointer' : 'not-allowed',
                  opacity: sel ? 1 : 0.35,
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
                  filter: on ? 'drop-shadow(0 0 12px rgba(245, 166, 35, 0.6))' : 'none',
                }}>
                  {on && sel && <span style={{ color: 'var(--ln-amber)' }}><StructureIcon kind={sel.id} size={44} /></span>}
                </div>
                <div
                  data-coach-id={idx === 0 ? 'build-plot-0' : undefined}
                  style={{
                  width: '100%',
                  height: 30,
                  borderRadius: '50% / 60%',
                  background: on
                    ? `radial-gradient(ellipse at 50% 35%, ${color}88, ${color}15 70%)`
                    : 'radial-gradient(ellipse at 50% 35%, var(--ln-cyan-soft), rgba(112, 217, 234, 0.04) 70%)',
                  border: `2px ${on ? 'solid' : 'dashed'} ${on ? color : 'var(--ln-cyan-border)'}`,
                  boxShadow: on ? `0 0 24px ${color}66` : '0 2px 6px rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 200ms',
                }}>
                  {on
                    ? <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 16, fontWeight: 800, color, marginTop: -1 }}>⌄</span>
                    : <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 20, fontWeight: 800, color: 'var(--ln-cyan)', marginTop: -2 }}>+</span>}
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
          background: 'linear-gradient(180deg, transparent, var(--ln-overlay))',
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
              const on = c.id === sel?.id
              const unlocked = structureUnlocked(c, { refineryUnlocked: player.refineryUnlocked, academyResearched: player.academyResearched, placed: player.placed, freeOperations: player.freeOperations, transitSatelliteLevel: player.transitSatelliteLevel, clientMissions: player.clientMissions, deepSpaceTelescopeMissionCompletedAt: player.deepSpaceTelescopeMissionCompletedAt, scanStationMissionCompletedAt: player.scanStationMissionCompletedAt })
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
                    opacity: canSelect ? 1 : 0.4,
                    textAlign: 'left',
                    minWidth: 108,
                    maxWidth: 152,
                    transition: 'all 150ms',
                    outline: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: on ? color : 'var(--ln-cyan)', flexShrink: 0 }}>
                      <StructureIcon kind={c.id} size={20} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      {/* Names like "Deep Space Telescope" / "Astronaut Academy" got
                          truncated to "Deep Space ..." under a fixed 120px max-width
                          + nowrap ellipsis. Wrapping to 2 lines instead of eliding
                          reads the full name at any card width, current or future. */}
                      <div style={{
                        fontFamily: 'var(--ln-font-display)',
                        fontWeight: 800,
                        fontSize: 10,
                        color: on ? color : 'var(--ln-text-dim)',
                        letterSpacing: '0.01em',
                        lineHeight: 1.25,
                      }}>{c.name}</div>
                      <div style={{
                        fontFamily: 'var(--ln-font-mono)',
                        fontSize: 8,
                        color: on ? color : 'var(--ln-text-muted)',
                        marginTop: 1,
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                      }}>
                        {unlocked ? (c.cost === 0 ? 'FREE' : formatCurrency(c.cost, { compact: true })) : c.unlocksAt}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Status line */}
          {sel ? <div style={{
            pointerEvents: 'none',
            padding: '6px 2px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{ color: STRUCTURE_COLORS[sel.id] ?? '#3fa9ff', flexShrink: 0 }}>
              <StructureIcon kind={sel.id} size={14} />
            </span>
            <span style={{
              fontFamily: 'var(--ln-font-body)',
              fontSize: 11,
              color: 'var(--ln-text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {cell == null
                ? `Select a plot for the ${sel.name} · ${formatStructureCost(sel)}`
                : `Place ${sel.name} here? · ${formatStructureCost(sel)}`}
            </span>
          </div> : <div style={{ padding: '6px 2px 10px', fontFamily: 'var(--ln-font-body)', fontSize: 11, color: 'var(--ln-text-muted)' }}>No structures are available yet. Complete your current mission to unlock the next build.</div>}
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
        <PrimaryBtn kind="green" disabled={cell == null || !sel} onClick={() => cell != null && sel && onPlaced(sel.id, cell)}>
          Confirm · Build Here →
        </PrimaryBtn>
      </div>
    </div>
  )
}
