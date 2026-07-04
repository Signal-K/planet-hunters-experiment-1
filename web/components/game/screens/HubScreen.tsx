'use client'

import React, { useEffect, useState } from 'react'
import type { Player, Screen } from '@/game-context'
import ProgressionCard from '@/components/game/ProgressionCard'
import { ComingSoonSheet, SPRINT_AFTER_NEXT_UTC } from '@/components/game/ComingSoonSheet'
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

const DEFAULT_PLOTS: EntityData[] = [
  { id: 'plot-0', name: 'Plot 0', transform: { position: { x: 22, y: 570 }, rotation: 0, scale: { x: 1, y: 1 } }, components: [{ type: 'BuildPlot', index: 0 }] },
  { id: 'plot-1', name: 'Plot 1', transform: { position: { x: 112, y: 570 }, rotation: 0, scale: { x: 1, y: 1 } }, components: [{ type: 'BuildPlot', index: 1 }] },
  { id: 'plot-2', name: 'Plot 2', transform: { position: { x: 210, y: 570 }, rotation: 0, scale: { x: 1, y: 1 } }, components: [{ type: 'BuildPlot', index: 2 }] },
  { id: 'plot-3', name: 'Plot 3', transform: { position: { x: 300, y: 570 }, rotation: 0, scale: { x: 1, y: 1 } }, components: [{ type: 'BuildPlot', index: 3 }] },
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
  const { show: showTutorialComplete, dismiss: dismissTutorialComplete } = useTutorialCompleteAck(player.missionsDone, FREE_OPS_START_MISSIONS_DONE)
  const placed = player.placed ?? []
  const placementPlots = player.placementPlots ?? {}
  const legacyPlaced = (kind: string) => placed.includes(kind) && placementPlots[kind] == null
  const effectivePlots: Record<string, number> = {
    ...placementPlots,
    ...(legacyPlaced('launchpad') ? { launchpad: 1 } : {}),
  }

  useEffect(() => {
    Scene.load('/game/scenes/hub.scene.json')
      .then(data => { if (data.entities?.length) setPlotEntities(data.entities) })
      .catch(() => {})
  }, [])

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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', background: 'rgba(8,12,22,0.7)', backdropFilter: 'blur(6px)', border: '1px solid rgba(245,166,35,0.5)', borderRadius: 999, fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', color: '#f5a623' }}>
            ▲ {player.francs.toLocaleString()}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(8,12,22,0.7)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,179,71,0.4)', borderRadius: 999, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', color: '#ffb347', textTransform: 'uppercase' }}>
            <span style={{ width: 4, height: 4, borderRadius: 999, background: '#ffb347', boxShadow: '0 0 6px #ffb347' }} />
            {player.missionCount} Jobs
          </span>
          {player.stash && Object.keys(player.stash).length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(8,12,22,0.7)', backdropFilter: 'blur(6px)', border: '1px solid rgba(57,211,106,0.4)', borderRadius: 999, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', color: '#39d36a', textTransform: 'uppercase' }}>
              {Object.keys(player.stash).length} Minerals
            </span>
          )}
        </div>
      </div>

      {/* Progression card — hidden when tutorial coach is active */}
      {!hasCoach && !subsurface && (
        <>
          <ProgressionCard player={player} onGoBuilding={onGoBuilding} onNav={onNav} top={TUTORIAL_CONTENT_TOP}
            onComingSoon={(feature, description, target) => setComingSoon({ feature, description, target })} />
          {comingSoon && (
            <ComingSoonSheet feature={comingSoon.feature} description={comingSoon.description} target={comingSoon.target} onClose={() => setComingSoon(null)} />
          )}
          {showTutorialComplete && !comingSoon && (
            <TutorialCompleteSheet onDone={dismissTutorialComplete} />
          )}
        </>
      )}

      {/* Bottom toolbar — hidden during tutorial */}
      {!hasCoach && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 110, zIndex: 20, display: 'flex', justifyContent: 'center', gap: 8 }}>
          {subsurface ? (
            <button
              onClick={() => setSubsurface(false)}
              style={{ padding: '5px 14px', background: 'rgba(8,16,28,0.75)', backdropFilter: 'blur(6px)', border: '1px solid rgba(122,80,40,0.55)', borderRadius: 999, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: '#9c8d70', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              ↑ Surface
            </button>
          ) : (
            <>
              {editMode && (
                <>
                  <button onClick={() => onGoBuilding('build')} style={{ padding: '5px 14px', background: 'rgba(57,211,106,0.15)', backdropFilter: 'blur(6px)', border: '1px solid rgba(57,211,106,0.5)', borderRadius: 999, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#39d36a', textTransform: 'uppercase', cursor: 'pointer' }}>
                    + New Structure
                  </button>
                  {player.placed.includes('launchpad') && (
                    <button onClick={() => onGoBuilding('hangar')} style={{ padding: '5px 14px', background: 'rgba(135,207,250,0.12)', backdropFilter: 'blur(6px)', border: '1px solid rgba(135,207,250,0.4)', borderRadius: 999, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#9EDCFF', textTransform: 'uppercase', cursor: 'pointer' }}>
                      Hangar
                    </button>
                  )}
                  {player.placed.includes('launchpad') && !player.launchpadUpgraded && onUpgradeLaunchpad && (
                    <button onClick={onUpgradeLaunchpad} style={{ padding: '5px 14px', background: 'rgba(245,166,35,0.15)', backdropFilter: 'blur(6px)', border: '1px solid rgba(245,166,35,0.5)', borderRadius: 999, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#f5a623', textTransform: 'uppercase', cursor: 'pointer' }}>
                      Upgrade Launchpad (₣1B)
                    </button>
                  )}
                </>
              )}
              <button onClick={() => setEditMode(v => !v)} style={{ padding: '5px 14px', background: editMode ? 'rgba(245,166,35,0.25)' : 'rgba(8,16,28,0.75)', backdropFilter: 'blur(6px)', border: editMode ? '1px solid rgba(245,166,35,0.6)' : '1px solid rgba(135,207,250,0.4)', borderRadius: 999, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: editMode ? '#f5a623' : '#9EDCFF', textTransform: 'uppercase', cursor: 'pointer', animation: !editMode && player.placed.length < 4 ? 'pad-pulse 2s ease-in-out infinite' : 'none' }}>
                {editMode ? 'Done' : 'Edit · Build'}
              </button>
              <button
                onClick={() => setComingSoon({ feature: 'Subsurface Operations', description: 'Drill deep into your base planet to mine rare subterranean minerals and build underground structures.', target: SPRINT_AFTER_NEXT_UTC })}
                style={{ padding: '5px 14px', background: 'rgba(8,12,22,0.75)', backdropFilter: 'blur(6px)', border: '1px solid rgba(122,80,40,0.55)', borderRadius: 999, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: '#9c8d70', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                Subsurface ↓
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
