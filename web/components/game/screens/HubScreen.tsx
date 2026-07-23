'use client'

import React, { useEffect, useState } from 'react'
import type { Player, Screen } from '@/game-context'
import ProgressionCard from '@/components/game/ProgressionCard'
import { ComingSoonSheet, SPRINT_AFTER_NEXT_UTC } from '@/components/game/ComingSoonSheet'
import ConfirmActionSheet from '@/components/game/ConfirmActionSheet'
import { TutorialCompleteSheet, useTutorialCompleteAck } from '@/components/game/TutorialCompleteSheet'
import { Scene } from '@/lib/engine/Scene'
import type { EntityData } from '@/lib/engine/types'
import { Cloud } from '@/components/game/hub/Cloud'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { SoilCrossSection } from '@/components/game/hub/SoilCrossSection'
import { HubSubsurfaceView } from '@/components/game/hub/HubSubsurfaceView'
import { Building, EmptyPlot } from '@/components/game/hub/Building'
import HubPixiCanvas from '@/components/game/hub/HubPixiCanvas'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { TUTORIAL_CONTENT_TOP } from '@/lib/tutorial-layout'
import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'
import type { HubBuildingDef } from '@/lib/pixi/hubScene'
import { fetchReviewableTessCandidates } from '@/lib/tess-subjects'
import { formatFrancs } from '@/lib/format'
import { MINERAL_META } from '@/lib/data'
import IconBadge from '@/components/ui/IconBadge'

// ── Ref-B bordered-icon-badge glyphs for Hub chrome (HUD strip + bottom tabs) ──
// Simple white-line icons, no fill — matches the mockup's `i-*` <symbol> set.
function FrancGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9" /><path d="M9 8h5M9 12h4M10 8v9" /></svg>
  )
}
function JobsGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M4 10h16M10 4v16" /></svg>
  )
}
function MineralGlyph({ shape, color }: { shape?: string; color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7">
      {shape === 'circle' && <circle cx="12" cy="12" r="8" />}
      {shape === 'diamond' && <path d="M12 3l9 9-9 9-9-9z" />}
      {shape === 'triangle' && <path d="M12 4l8 16H4z" />}
      {shape === 'rect' && <rect x="4" y="6" width="16" height="12" rx="1.5" />}
    </svg>
  )
}
function BuildGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 21h18M6 21V9l6-5 6 5v12M10 21v-6h4v6" /></svg>
  )
}
function PlusGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
  )
}
function HangarGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="7" width="16" height="13" rx="1.5" /><path d="M4 7l2-4h12l2 4" /></svg>
  )
}
function UpgradeGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 2L4 14h6l-1 8 9-12h-6z" /></svg>
  )
}
function SurfaceGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
  )
}
function SubsurfaceGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
  )
}

const DEFAULT_PLOTS: EntityData[] = [
  { id: 'plot-0', name: 'Plot 0', transform: { position: { x: 60, y: 570 }, rotation: 0, scale: { x: 1, y: 1 } }, components: [{ type: 'BuildPlot', index: 0 }] },
  { id: 'plot-1', name: 'Plot 1', transform: { position: { x: 154, y: 570 }, rotation: 0, scale: { x: 1, y: 1 } }, components: [{ type: 'BuildPlot', index: 1 }] },
  { id: 'plot-2', name: 'Plot 2', transform: { position: { x: 248, y: 570 }, rotation: 0, scale: { x: 1, y: 1 } }, components: [{ type: 'BuildPlot', index: 2 }] },
  { id: 'plot-3', name: 'Plot 3', transform: { position: { x: 342, y: 570 }, rotation: 0, scale: { x: 1, y: 1 } }, components: [{ type: 'BuildPlot', index: 3 }] },
]

interface HubScreenProps {
  player: Player
  hasCoach?: boolean
  onGoBuilding: (b: string) => void
  onNav: (s: Screen) => void
  onUpgradeLaunchpad?: () => void
}

export default function HubScreen({ player, hasCoach, onGoBuilding, onNav, onUpgradeLaunchpad }: HubScreenProps) {
  const [editMode, setEditMode] = useState(false)
  const [plotEntities, setPlotEntities] = useState<EntityData[]>(DEFAULT_PLOTS)
  const [subsurface, setSubsurface] = useState(false)
  const [comingSoon, setComingSoon] = useState<{ feature: string; description: string; target?: Date } | null>(null)
  const [confirmingLaunchpadUpgrade, setConfirmingLaunchpadUpgrade] = useState(false)
  const [tessQueueCount, setTessQueueCount] = useState(0)
  const { show: showTutorialComplete, dismiss: dismissTutorialComplete } = useTutorialCompleteAck(player.missionsDone, FREE_OPS_START_MISSIONS_DONE)
  const placed = player.placed ?? []
  const placementPlots = player.placementPlots ?? {}
  const legacyPlaced = (kind: string) => placed.includes(kind) && placementPlots[kind] == null
  // Pre-placementPlots saves always went through the guided tutorial, which
  // coaches the player to the first build pad (data-coach-id="build-plot-0"
  // in BuildPlaceScreen) — plot 0, not 1.
  const effectivePlots: Record<string, number> = {
    ...placementPlots,
    ...(legacyPlaced('launchpad') ? { launchpad: 0 } : {}),
  }

  useEffect(() => {
    Scene.load('/game/scenes/hub.scene.json')
      .then(data => { if (data.entities?.length) setPlotEntities(data.entities) })
      .catch(() => {})
  }, [])

  // SMS daily-candidate-queue badge (LN-014): count of live TESS subjects
  // still awaiting this player's review, i.e. not yet in tessClassifications.
  // Mirrors TessDiscoveryScreen's own gating (SMS built + telescope launched)
  // so the badge never promises a queue the classify flow can't show yet.
  useEffect(() => {
    if (!player.freeOperations || !player.satelliteMonitoringBuilt || !player.transitSatelliteLaunchedAt) {
      setTessQueueCount(0)
      return
    }
    let cancelled = false
    fetchReviewableTessCandidates()
      .then(candidates => {
        if (cancelled) return
        const classifications = player.tessClassifications ?? {}
        const unresolved = candidates.filter(c => !classifications[c.id])
        setTessQueueCount(unresolved.length)
      })
      .catch(() => { if (!cancelled) setTessQueueCount(0) })
    return () => { cancelled = true }
  }, [player.freeOperations, player.satelliteMonitoringBuilt, player.transitSatelliteLaunchedAt, player.tessClassifications])

  const sortedEntities = plotEntities.slice().sort((a, b) => {
    const ai = (a.components.find(c => c.type === 'BuildPlot')?.index as number) ?? 0
    const bi = (b.components.find(c => c.type === 'BuildPlot')?.index as number) ?? 0
    return ai - bi
  })

  const plotStyles: React.CSSProperties[] = sortedEntities
    // SVG grass is at 78% from top = 22% from bottom. calc(22% - 42px) puts the label
    // bottom 42px underground so the visible building base sits at the grass line.
    // left uses scene-proportional % so it matches the CSS-stretched PixiJS canvas (HUB_W=402).
    .map(e => ({ left: `calc(${(e.transform.position.x / 402) * 100}%)`, bottom: 'calc(22% - 42px)' } as React.CSSProperties))

  const structureForPlot = (plot: number) => {
    const kind = Object.entries(effectivePlots).find(([, p]) => p === plot)?.[0] ?? null
    return kind
  }

  const BUILDING_W: Record<string, number> = { launchpad: 98, refinery: 84, 'scan-station': 80, 'satellite-monitoring-station': 86, command: 84 }
  const hubBuildings: HubBuildingDef[] = sortedEntities.flatMap((e, plot) => {
    const kind = structureForPlot(plot)
    if (!kind) return []
    return [{
      kind,
      plotX: e.transform.position.x,
      w: BUILDING_W[kind] ?? 78,
      hot: kind === 'launchpad' ? !!player.pendingLaunch : kind === 'scan-station' ? (!!player.activeScan && Date.now() >= player.activeScan.completesAt) : false,
      status: 'ok' as const,
    }]
  })
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
    if (kind === 'refinery') {
      return {
        kind, label: 'Refinery',
        sub: 'ORE PROCESSING',
        status: 'ok' as const,
        w: 84,
        onClick: () => onGoBuilding('refinery'),
      }
    }
    if (kind === 'scan-station') {
      const today = new Date().toISOString().slice(0, 10)
      const scanDate = player.scanDate ?? ''
      const scansUsed = scanDate === today ? (player.scansUsedToday ?? 0) : 0
      const hasScan = !!player.activeScan && Date.now() >= player.activeScan.completesAt
      return {
        kind, label: 'Scanner',
        sub: hasScan ? 'DATA READY' : `${5 - scansUsed}/5 SCANS`,
        status: (hasScan ? 'warn' : 'ok') as 'ok' | 'warn',
        hot: hasScan,
        w: 80,
        onClick: () => onGoBuilding('scan-station'),
      }
    }
    if (kind === 'satellite-monitoring-station') {
      return {
        kind, label: 'S.M.S.',
        sub: player.transitSatelliteLaunchedAt ? 'TELESCOPE LIVE' : 'READY',
        status: (player.transitSatelliteLaunchedAt ? 'ok' : 'info') as 'ok' | 'info',
        w: 86,
        badge: tessQueueCount,
        onClick: () => onGoBuilding('satellite-monitoring-station'),
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

      {/* ── Sliding world: surface (top 50%) + subsurface (bottom 50%) ── */}
      <div style={{
        position: 'absolute', left: 0, right: 0,
        top: subsurface ? '-100%' : '0%',
        height: '200%',
        transition: 'top 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'top',
      }}>

        {/* ─── ABOVE GROUND ─── top half of slider */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', overflow: 'hidden' }}>
          {/* World background: CSS sky + SVG terrain */}
          <HubWorldBackground />

          {/* CSS clouds */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '42%', overflow: 'hidden', pointerEvents: 'none', zIndex: 4 }}>
            <Cloud style={{ left: '-30%', top: 40, opacity: 0.55, transform: 'scale(0.8)' }} dur="62s" delay="0s" />
            <Cloud style={{ left: '-30%', top: 96, opacity: 0.38, transform: 'scale(0.55)' }} dur="80s" delay="-30s" />
            <Cloud style={{ left: '-30%', top: 160, opacity: 0.28, transform: 'scale(0.42)' }} dur="100s" delay="-55s" />
          </div>

          {/* PixiJS building sprites */}
          <ErrorBoundary fallback={null}>
            <HubPixiCanvas buildings={hubBuildings} />
          </ErrorBoundary>

          {/* Surface buildings — hit areas + labels */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
              {plotStyles.map((style, plot) => {
                const kind = structureForPlot(plot)
                if (!kind) {
                  if (!editMode) return null
                  return <EmptyPlot key={plot} plot={plot} w={78} style={style} onClick={() => onGoBuilding('build')} />
                }
                const building = structureProps(kind)
                return <Building key={kind} {...building} style={style} />
              })}
            </div>
          </div>

          {/* Soil cross-section with subsurface button */}
          <SoilCrossSection />
        </div>

        {/* ─── BELOW GROUND ─── bottom half of slider */}
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '50%', overflow: 'hidden' }}>
          <HubSubsurfaceView />
        </div>

      </div>
      {/* ── End sliding world ── */}

      {/* Top HUD — always fixed above the slide */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 18,
        padding: '16px 14px 22px',
        background: subsurface
          ? 'linear-gradient(180deg, rgba(6,3,0,0.9) 0%, rgba(6,3,0,0.5) 60%, transparent 100%)'
          : 'linear-gradient(180deg, rgba(6,9,15,0.85) 0%, rgba(6,9,15,0.35) 60%, transparent 100%)',
        display: 'flex', alignItems: 'flex-start', gap: 10, pointerEvents: 'none',
        transition: 'background 0.55s',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
            {subsurface ? 'EARTH BASE · SUBSURFACE' : `EARTH BASE · OPS ${player.missionsDone}`}
          </div>
          <h1 style={{ margin: '2px 0 0', fontFamily: 'var(--ln-font-display)', fontSize: 24, fontWeight: 800, letterSpacing: '-0.01em', color: '#fff', lineHeight: 1, textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>
            {subsurface ? 'Subsurface' : 'Earth Base'}
          </h1>
        </div>
        <span style={{ flex: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', pointerEvents: 'auto' }}>
          {/* Ref-B resource chip row: bordered icon tile + amount, mirrors the mockup's .res-chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px 5px 6px', background: 'rgba(8,12,22,0.7)', backdropFilter: 'blur(6px)', border: '1px solid rgba(245,166,35,0.5)', borderRadius: 8 }}>
            <IconBadge icon={<FrancGlyph />} size={20} tone="amber" active />
            <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', color: '#f5a623' }}>
              {formatFrancs(player.francs)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 5px', background: 'rgba(8,12,22,0.7)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,179,71,0.4)', borderRadius: 7 }}>
            <IconBadge icon={<JobsGlyph />} size={18} tone="amber" active />
            <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', color: '#ffb347', textTransform: 'uppercase' }}>
              {player.missionCount} Jobs
            </span>
          </div>
          {player.stash && Object.keys(player.stash).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 5, maxWidth: 220 }}>
              {Object.entries(player.stash).map(([kind, qty]) => {
                const meta = MINERAL_META[kind]
                if (!meta || !qty) return null
                return (
                  <div key={kind} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px 3px 4px', background: 'rgba(8,12,22,0.7)', backdropFilter: 'blur(6px)', border: `1px solid ${meta.color}66`, borderRadius: 7 }}>
                    <IconBadge icon={<MineralGlyph shape={meta.shape} color={meta.color} />} size={16} tone="ok" style={{ borderColor: `${meta.color}88`, color: meta.color }} />
                    <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: meta.color, textTransform: 'uppercase' }}>
                      {qty}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Progression card — hidden when tutorial coach is active */}
      {!hasCoach && !subsurface && (
        <>
          <ProgressionCard player={player} onGoBuilding={onGoBuilding} onNav={onNav} top={TUTORIAL_CONTENT_TOP} />
          {comingSoon && (
            <ComingSoonSheet feature={comingSoon.feature} description={comingSoon.description} target={comingSoon.target} onClose={() => setComingSoon(null)} />
          )}
          {showTutorialComplete && !comingSoon && (
            <TutorialCompleteSheet onDone={dismissTutorialComplete} />
          )}
        </>
      )}

      {confirmingLaunchpadUpgrade && onUpgradeLaunchpad && (
        <ConfirmActionSheet
          eyebrow="Upgrade"
          title="Upgrade Launchpad"
          description="Spend ₣1,000,000,000 to permanently upgrade the launchpad. This can't be undone."
          confirmLabel="Confirm Upgrade (₣1B)"
          onConfirm={() => { onUpgradeLaunchpad(); setConfirmingLaunchpadUpgrade(false) }}
          onDismiss={() => setConfirmingLaunchpadUpgrade(false)}
        />
      )}

      {/* Bottom toolbar — hidden during tutorial */}
      {!hasCoach && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 110, zIndex: 20, display: 'flex', justifyContent: 'center', gap: 8 }}>
          {subsurface ? (
            <button
              onClick={() => setSubsurface(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px 5px 8px', background: 'rgba(8,16,28,0.75)', backdropFilter: 'blur(6px)', border: '1px solid rgba(122,80,40,0.55)', borderRadius: 999, cursor: 'pointer' }}
            >
              <IconBadge icon={<SurfaceGlyph />} size={18} tone="mute" style={{ borderColor: 'rgba(156,141,112,0.6)', color: '#9c8d70' }} />
              <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: '#9c8d70', textTransform: 'uppercase' }}>Surface</span>
            </button>
          ) : (
            <>
              {editMode && (
                <>
                  <button onClick={() => onGoBuilding('build')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px 5px 8px', background: 'rgba(57,211,106,0.15)', backdropFilter: 'blur(6px)', border: '1px solid rgba(57,211,106,0.5)', borderRadius: 999, cursor: 'pointer' }}>
                    <IconBadge icon={<PlusGlyph />} size={18} tone="ok" active />
                    <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#39d36a', textTransform: 'uppercase' }}>New Structure</span>
                  </button>
                  {player.placed.includes('launchpad') && (
                    <button onClick={() => onGoBuilding('hangar')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px 5px 8px', background: 'rgba(135,207,250,0.12)', backdropFilter: 'blur(6px)', border: '1px solid rgba(135,207,250,0.4)', borderRadius: 999, cursor: 'pointer' }}>
                      <IconBadge icon={<HangarGlyph />} size={18} tone="cyan" active style={{ color: '#9EDCFF', borderColor: 'rgba(158,220,255,0.6)' }} />
                      <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#9EDCFF', textTransform: 'uppercase' }}>Hangar</span>
                    </button>
                  )}
                  {player.placed.includes('launchpad') && !player.launchpadUpgraded && onUpgradeLaunchpad && (
                    <button onClick={() => setConfirmingLaunchpadUpgrade(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px 5px 8px', background: 'rgba(245,166,35,0.15)', backdropFilter: 'blur(6px)', border: '1px solid rgba(245,166,35,0.5)', borderRadius: 999, cursor: 'pointer' }}>
                      <IconBadge icon={<UpgradeGlyph />} size={18} tone="amber" active />
                      <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#f5a623', textTransform: 'uppercase' }}>Upgrade Launchpad (₣1B)</span>
                    </button>
                  )}
                </>
              )}
              <button onClick={() => setEditMode(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px 5px 8px', background: editMode ? 'rgba(245,166,35,0.25)' : 'rgba(8,16,28,0.75)', backdropFilter: 'blur(6px)', border: editMode ? '1px solid rgba(245,166,35,0.6)' : '1px solid rgba(135,207,250,0.4)', borderRadius: 999, cursor: 'pointer', animation: !editMode && player.placed.length < 4 ? 'pad-pulse 2s ease-in-out infinite' : 'none' }}>
                <IconBadge icon={<BuildGlyph />} size={18} tone={editMode ? 'amber' : 'cyan'} active style={editMode ? undefined : { color: '#9EDCFF', borderColor: 'rgba(158,220,255,0.6)' }} />
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: editMode ? '#f5a623' : '#9EDCFF', textTransform: 'uppercase' }}>
                  {editMode ? 'Done' : 'Edit · Build'}
                </span>
              </button>
              <button
                onClick={() => setComingSoon({ feature: 'Subsurface Operations', description: 'Drill deep into your base planet to mine rare subterranean minerals and build underground structures.', target: SPRINT_AFTER_NEXT_UTC })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px 5px 8px', background: 'rgba(8,12,22,0.75)', backdropFilter: 'blur(6px)', border: '1px solid rgba(122,80,40,0.55)', borderRadius: 999, cursor: 'pointer' }}
              >
                <IconBadge icon={<SubsurfaceGlyph />} size={18} tone="mute" style={{ borderColor: 'rgba(156,141,112,0.6)', color: '#9c8d70' }} />
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: '#9c8d70', textTransform: 'uppercase' }}>Subsurface</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
