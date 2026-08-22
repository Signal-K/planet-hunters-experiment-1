'use client'

import React, { useEffect, useState } from 'react'
import type { Player, Screen } from '@/game-context'
import ProgressionCard from '@/components/game/ProgressionCard'
import ConfirmActionSheet from '@/components/game/ConfirmActionSheet'
import { Scene } from '@/lib/engine/Scene'
import type { EntityData } from '@/lib/engine/types'
import { buildPlotEntities } from '@/lib/engine/prefabs'
import { readComponentNumber } from '@/lib/engine/registry'
import { AmbientMotes } from '@/components/game/hub/AmbientMotes'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { HubStructureArt } from '@/components/game/hub/HubStructureArt'
export { HUB_STRUCTURE_ART } from '@/components/game/hub/HubStructureArt'
import { SoilCrossSection } from '@/components/game/hub/SoilCrossSection'
import { HubSubsurfaceView } from '@/components/game/hub/HubSubsurfaceView'
import { Building, EmptyPlot } from '@/components/game/hub/Building'
import type { BuildingCallout } from '@/components/game/hub/Building'
import { TUTORIAL_CONTENT_TOP, TUTORIAL_RAIL } from '@/lib/tutorial-layout'
import { LAUNCHPAD_UPGRADE_COST, type SubsurfaceRoomId } from '@/lib/data'
import { formatCurrency } from '@/lib/format'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import type { HubBuildingDef } from '@/lib/pixi/hubScene'
import { fetchReviewableTessCandidates } from '@/lib/tess-subjects'
import { fetchReviewableAsteroidCandidates } from '@/lib/asteroid-subjects'
import { instrumentDigestDateKey, unresolvedTransitInstrumentDigest, unresolvedDeepSpaceInstrumentDigest } from '@/lib/systems/InstrumentFeedSystem'
import HUDStrip from '@/components/ui/HUDStrip'

// ── Ref-B bordered-icon-badge glyphs for Hub chrome (bottom tabs) ──
// Simple white-line icons, no fill — matches the mockup's `i-*` <symbol> set.
// (Francs/jobs/mineral-stash glyphs live in HUDStrip, which owns that readout.)
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
function MarketGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 10h16l-2-6H6l-2 6zM5 10v10h14V10M9 20v-6h6v6" /></svg>
  )
}
function AtlasGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 013.5 9 14 14 0 01-3.5 9 14 14 0 01-3.5-9A14 14 0 0112 3z" /></svg>
  )
}
function SkillsGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l2.5 7.5H22l-6 4.6 2.3 7.4L12 17l-6.3 4.5 2.3-7.4-6-4.6h7.5z" /></svg>
  )
}

/**
 * Bottom-toolbar pill — the `.scene-btn` recipe from
 * `landnam-earth-base-v2.html`: black tile, 1.5px white outline, cyan glyph,
 * 9px/0.18em uppercase label. `active` (Edit mode on) fills mint; `accent`
 * outlines mint; `muted` dims the label for secondary actions.
 */
function SceneBtn({ icon, label, onClick, active, accent, muted, pulse, testId }: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
  accent?: boolean
  muted?: boolean
  pulse?: boolean
  testId?: string
}) {
  const mint = 'var(--hub-mint)'
  const glyphColor = active || accent ? mint : 'var(--hub-cyan)'
  const textColor = active || accent ? mint : muted ? 'rgba(15,36,54,0.6)' : 'rgba(15,36,54,0.92)'
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: active ? 'rgba(31,143,87,0.14)' : 'var(--hub-panel)',
        border: `1.5px solid ${active || accent ? mint : 'rgba(15,36,54,0.3)'}`,
        borderRadius: 999, padding: '8px 14px 8px 8px', minHeight: 40,
        fontFamily: 'var(--ln-font-display)', fontWeight: 700, fontSize: 9,
        letterSpacing: '0.18em', textTransform: 'uppercase', color: textColor,
        cursor: 'pointer', transition: 'background 120ms, border-color 120ms',
        boxShadow: '0 2px 8px rgba(15,36,54,0.14)',
        animation: pulse ? 'hub-pad-pulse 2s ease-in-out infinite' : 'none',
      }}
    >
      <span style={{ display: 'grid', placeItems: 'center', color: glyphColor }}>{icon}</span>
      {label}
    </button>
  )
}

// KES-220: the top HUD grew from a single-row bar into a stacked left-edge
// rail (eyebrow/title + two HUDStrip cards), which now reaches to ~148px
// from the screen top at the mobile viewport — well past the old
// TUTORIAL_RAIL.TOP_CHROME_HEIGHT (68px) this offset was tuned against.
// Without this, ProgressionCard's `top` left it starting at y=76, directly
// under the new rail (bug reported 2026-08-21: "Your Program" card text
// clipped behind the Francs/Jobs stack). Measured live at 390px width:
// rail bottom ~148px; this adds headroom on top of the shared constant
// rather than changing TUTORIAL_RAIL itself, which other screens still
// tune the old single-row height against.
const HUB_HUD_RAIL_CLEARANCE = 84

// Instantiated from the build-plot prefab rather than written out by hand.
// This same list previously existed in four places (both hub scene files and
// both screens); the prefab is the one definition and a test asserts it still
// reproduces hub.scene.json exactly.
const DEFAULT_PLOTS: EntityData[] = buildPlotEntities()

interface HubScreenProps {
  player: Player
  rocketVariant?: HubBuildingDef['rocketVariant']
  hasCoach?: boolean
  onGoBuilding: (b: string) => void
  onNav: (s: Screen) => void
  onUpgradeLaunchpad?: () => void
  onExcavateSubsurface?: () => void
  onBuildSubsurfaceRoom?: (roomId: SubsurfaceRoomId) => void
}

export default function HubScreen({ player, rocketVariant = 'explorer', hasCoach, onGoBuilding, onNav, onUpgradeLaunchpad, onExcavateSubsurface, onBuildSubsurfaceRoom }: HubScreenProps) {
  const [editMode, setEditMode] = useState(false)
  const [plotEntities, setPlotEntities] = useState<EntityData[]>(DEFAULT_PLOTS)
  const [subsurface, setSubsurface] = useState(false)
  const [confirmingLaunchpadUpgrade, setConfirmingLaunchpadUpgrade] = useState(false)
  const [tessQueueCount, setTessQueueCount] = useState(0)
  const [asteroidQueueCount, setAsteroidQueueCount] = useState(0)
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
  if (!FEATURE_FLAGS.scanStation) delete effectivePlots['scan-station']

  useEffect(() => {
    Scene.load('/game/scenes/hub.scene.json')
      .then(data => { if (data.entities?.length) setPlotEntities(data.entities) })
      .catch(() => {})
  }, [])

  // SMS badge: unresolved items in today's level-scaled instrument digest.
  // This shares InstrumentFeedSystem with TessDiscoveryScreen so the badge
  // never promises more work than the feed can actually show.
  useEffect(() => {
    if (!player.freeOperations || !player.satelliteMonitoringBuilt || !player.transitSatelliteLaunchedAt) {
      setTessQueueCount(0)
      return
    }
    let cancelled = false
    fetchReviewableTessCandidates()
      .then(candidates => {
        if (cancelled) return
        const unresolved = unresolvedTransitInstrumentDigest(
          candidates,
          player,
          instrumentDigestDateKey()
        )
        setTessQueueCount(unresolved.length)
      })
      .catch(() => { if (!cancelled) setTessQueueCount(0) })
    return () => { cancelled = true }
  }, [player.freeOperations, player.satelliteMonitoringBuilt, player.transitSatelliteLaunchedAt, player.tessClassifications])

  // Deep Space Telescope badge: same InstrumentFeedSystem-shared pattern as
  // the SMS badge above, for the second (asteroid/NEOCP) instrument (STS-622).
  useEffect(() => {
    if (!player.freeOperations || !player.deepSpaceTelescopeBuilt) {
      setAsteroidQueueCount(0)
      return
    }
    let cancelled = false
    fetchReviewableAsteroidCandidates()
      .then(candidates => {
        if (cancelled) return
        const unresolved = unresolvedDeepSpaceInstrumentDigest(
          candidates,
          player,
          instrumentDigestDateKey()
        )
        setAsteroidQueueCount(unresolved.length)
      })
      .catch(() => { if (!cancelled) setAsteroidQueueCount(0) })
    return () => { cancelled = true }
  }, [player.freeOperations, player.deepSpaceTelescopeBuilt, player.asteroidClassifications])

  const sortedEntities = plotEntities.slice().sort((a, b) => {
    const ai = readComponentNumber(a, 'BuildPlot', 'index', 0)
    const bi = readComponentNumber(b, 'BuildPlot', 'index', 0)
    return ai - bi
  })

  const plotStyles: React.CSSProperties[] = sortedEntities
    // SVG grass is at 78% from top = 22% from bottom. calc(22% - 42px) puts the label
    // bottom 42px underground so the visible building base sits at the grass line.
    // left uses scene-proportional % so it matches the CSS-stretched PixiJS canvas (HUB_W=402).
    // translateX(-50%) centers the label stack on the plot the way the PixiJS
    // art does — scene plotX is a building *center*, so left-aligning here put
    // every pill half a building to the right of the structure it names.
    .map(e => ({
      left: `calc(${(e.transform.position.x / 402) * 100}%)`,
      bottom: 'calc(22% - 42px)',
      transform: 'translateX(-50%)',
    } as React.CSSProperties))

  const structureForPlot = (plot: number) => {
    const kind = Object.entries(effectivePlots).find(([, p]) => p === plot)?.[0] ?? null
    return kind
  }

  const BUILDING_W: Record<string, number> = { launchpad: 98, refinery: 84, 'scan-station': 80, 'satellite-monitoring-station': 86, 'deep-space-telescope': 86, 'astronaut-academy': 88, command: 84 }
  // Post-tutorial Hub prominence pass (STS-631): telescope/satellite
  // buildings recede visually while they're unlocked but still in their
  // early, not-yet-actively-producing state — Satellite Monitoring Station
  // before the transit satellite launches, Deep Space Telescope before it's
  // built — so the Launchpad keeps reading as the base's primary structure.
  const isDimmedBuildingKind = (kind: string): boolean => {
    if (kind === 'satellite-monitoring-station') return !player.transitSatelliteLaunchedAt
    if (kind === 'deep-space-telescope') return !player.deepSpaceTelescopeBuilt
    return false
  }
  const hubBuildings: HubBuildingDef[] = sortedEntities.flatMap((e, plot) => {
    const kind = structureForPlot(plot)
    if (!kind) return []
    return [{
      kind,
      plotX: e.transform.position.x,
      w: BUILDING_W[kind] ?? 78,
      hot: kind === 'launchpad' ? !!player.pendingLaunch : kind === 'scan-station' ? (!!player.activeScan && Date.now() >= player.activeScan.completesAt) : false,
      status: 'ok' as const,
      dimmed: isDimmedBuildingKind(kind),
    }]
  })
  // Launchpad speech bubble — the base "speaking up" when it has a prompt and
  // nothing else on screen is already making it.
  //
  // It is deliberately mutually exclusive with ProgressionCard: that stack
  // renders whenever there's an active mission, a pending launch, or any
  // completed mission, and it phrases the very same prompts ("Browse
  // Contracts", "Open Launchpad"). Showing both put two copies of one call to
  // action on screen at once, physically overlapping at portrait width. So the
  // callout is scoped to the one state the card stack stays empty for — a
  // launchpad standing on an Ops 0 base with nothing in flight, which is
  // exactly the state the Open Design mockup depicts.
  const hasProgressionCards = !!player.activeMission || !!player.pendingLaunch || player.missionsDone > 0
  const launchpadCallout: BuildingCallout | undefined =
    hasCoach || hasProgressionCards
      ? undefined
      : {
        title: 'Choose your first contract',
        body: 'A client job is open at the Mission Board. Your launchpad is ready to fly it.',
        cta: 'View Missions',
        onCta: () => onNav('missions'),
      }

  const structureProps = (kind: string) => {
    if (kind === 'launchpad') {
      return {
        kind, label: 'Launchpad',
        sub: player.activeMission ? 'IN FLIGHT' : 'READY',
        status: (player.activeMission ? 'warn' : 'ok') as 'ok' | 'warn',
        hot: !!player.pendingLaunch,
        w: 98,
        callout: launchpadCallout,
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
        dimmed: isDimmedBuildingKind(kind),
        onClick: () => onGoBuilding('satellite-monitoring-station'),
      }
    }
    if (kind === 'deep-space-telescope') {
      return {
        kind, label: 'D.S.T.',
        sub: player.deepSpaceTelescopeBuilt ? 'TELESCOPE LIVE' : 'READY',
        status: (player.deepSpaceTelescopeBuilt ? 'ok' : 'info') as 'ok' | 'info',
        w: 86,
        badge: asteroidQueueCount,
        dimmed: isDimmedBuildingKind(kind),
        onClick: () => onGoBuilding('deep-space-telescope'),
      }
    }
    if (kind === 'astronaut-academy') {
      const activeTraining = player.crewTraining?.length ?? 0
      return {
        kind, label: 'Academy',
        sub: activeTraining > 0 ? `${activeTraining} TRAINING` : player.academyFunded ? 'FUNDED' : 'PAUSED',
        status: (activeTraining > 0 ? 'warn' : player.academyFunded ? 'ok' : 'info') as 'ok' | 'warn' | 'info',
        w: 88,
        onClick: () => onGoBuilding('academy'),
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
          {/* World background: sky, starfield, ridge parallax, ground, plateau */}
          <HubWorldBackground />

          {/* Drifting ambient motes — replaces the old daylight cloud layer,
              which read as overcast weather against the new deep-blue sky. */}
          <AmbientMotes />

          {/* Authored structure sprites. DOM rendering keeps the Hub legible
              in both hardware WebGL and Docker/Electron screenshot runners. */}
          <HubStructureArt buildings={hubBuildings} />

          {/* Surface buildings — hit areas + labels.
              zIndex 10 is load-bearing: every scene layer below is an
              absolutely-positioned sibling with an explicit z-index (sky 1,
              motes 2, Pixi 3, soil 4), and the sky is fully opaque. Without a
              z-index here this layer sits at stacking level 0 and the sky
              paints straight over the pills and callouts. */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
            {/* pointerEvents stays 'none' here. This wrapper is inset:0, so
                giving it 'auto' turned it into a transparent full-screen click
                catcher at zIndex 10 — which sits above ProgressionCard (zIndex
                8) and swallowed every tap on the Skill Tree / Build / Browse
                Contracts buttons. It only showed up after the tutorial, because
                that card stack is hidden while the coach is active. The
                buildings below are absolutely positioned and re-enable pointer
                events on their own roots. */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {plotStyles.map((style, plot) => {
                const kind = structureForPlot(plot)
                if (!kind) {
                  if (!editMode) return null
                  return <EmptyPlot key={plot} plot={plot} w={78} style={style} onClick={() => onGoBuilding('build')} />
                }
                const building = structureProps(kind)
                // Outer plots open their callout inward so a 208px bubble
                // can't run off the edge of the scene.
                const xFrac = (sortedEntities[plot]?.transform.position.x ?? 201) / 402
                const calloutAlign = xFrac < 0.32 ? 'start' : xFrac > 0.68 ? 'end' : 'center'
                return <Building key={kind} {...building} style={style} calloutAlign={calloutAlign} />
              })}
            </div>
          </div>

          {/* Soil cross-section with subsurface button */}
          <SoilCrossSection />
        </div>

        {/* ─── BELOW GROUND ─── bottom half of slider */}
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '50%', overflow: 'hidden' }}>
          <HubSubsurfaceView
            stash={player.stash}
            installedParts={player.shipCustomizerParts}
            trainingEnabled={FEATURE_FLAGS.subsurfaceHabitatTraining}
            francs={player.francs}
            subsurfaceExcavated={player.subsurfaceExcavated}
            subsurfaceBuilt={player.subsurfaceBuilt}
            onExcavate={onExcavateSubsurface}
            onBuildRoom={onBuildSubsurfaceRoom}
          />
        </div>

      </div>
      {/* ── End sliding world ── */}

      {/* Top HUD — always fixed above the slide. Reworked 2026-08-21 (KES-220)
          from a full-width dark scrim bar into a compact top-left cluster: a
          light paper scrim (just enough to keep the title legible over a
          bright sky) plus the persistent stacked HUD rail directly beneath
          the title, per the Space Clicker layout reference (KES-219) — a
          fixed left-edge rail rather than corner-scattered readouts.
          Subsurface keeps its own dark scrim: HubSubsurfaceView underneath
          it hasn't been converted to the light theme yet (out of scope for
          this pass), so a light bar there would sit over dark UI. */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 18,
        padding: '16px 14px 22px',
        background: subsurface
          ? 'linear-gradient(180deg, rgba(6,3,0,0.9) 0%, rgba(6,3,0,0.5) 60%, transparent 100%)'
          : 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.35) 65%, transparent 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, pointerEvents: 'none',
        transition: 'background 0.55s',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          {/* KES-173: DevShortcuts' fixed DEV toggle (top:8 left:8, dev-only,
              ~120px wide) sits directly over this eyebrow, clipping the
              opening characters ("EARTH BASE" -> "H BASE"). Only reserve
              the clearance when that badge can actually render. */}
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: subsurface ? 'rgba(255,255,255,0.55)' : 'rgba(15,36,54,0.55)', marginLeft: isDevLauncherEnabled() ? 130 : 0 }}>
            {subsurface ? 'EARTH BASE · SUBSURFACE' : `EARTH BASE · OPS ${player.missionsDone}`}
          </div>
          <h1 style={{ margin: '2px 0 0', fontFamily: 'var(--ln-font-display)', fontSize: 23, fontWeight: 800, letterSpacing: '-0.01em', color: subsurface ? '#fff' : '#0f2436', lineHeight: 1, textShadow: subsurface ? '0 2px 10px rgba(0,0,0,0.6)' : 'none' }}>
            {subsurface ? 'Subsurface' : 'Earth Base'}
          </h1>
        </div>
        {!subsurface && (
          <div style={{ pointerEvents: 'auto' }}>
            <HUDStrip player={player} onJobsClick={() => onNav('missions')} />
          </div>
        )}
      </div>

      {/* Progression card — hidden when tutorial coach is active */}
      {(!hasCoach || !!player.activeMission || !!player.pendingLaunch) && !subsurface && (
        <>
          <ProgressionCard
            player={player}
            onGoBuilding={onGoBuilding}
            onNav={onNav}
            top={hasCoach ? TUTORIAL_CONTENT_TOP : TUTORIAL_RAIL.TOP_CHROME_HEIGHT + 8 + HUB_HUD_RAIL_CLEARANCE}
          />
        </>
      )}

      {confirmingLaunchpadUpgrade && onUpgradeLaunchpad && (
        <ConfirmActionSheet
          eyebrow="Upgrade"
          title="Upgrade Launchpad"
          description={`Spend ${formatCurrency(LAUNCHPAD_UPGRADE_COST)} to permanently upgrade the launchpad. This can't be undone.`}
          confirmLabel={`Confirm Upgrade (${formatCurrency(LAUNCHPAD_UPGRADE_COST, { compact: true })})`}
          onConfirm={() => { onUpgradeLaunchpad(); setConfirmingLaunchpadUpgrade(false) }}
          onDismiss={() => setConfirmingLaunchpadUpgrade(false)}
        />
      )}

      {/* Bottom toolbar — hidden only during the strict M1 first-run
          tutorial (missionsDone === 0). M2/M3 "guided ops" still set
          hasCoach true on this screen (every tier has a hub coach step
          nudging toward Missions), but that's a lighter nudge, not a
          full-screen takeover — hiding Edit/Build, Subsurface, and Surface
          Ops for the whole guided-ops window meant those buttons stayed
          unreachable well past the tutorial (bug reported 2026-07-31). */}
      {(!hasCoach || player.missionsDone > 0) && (
        <div className={`hub-action-rail${editMode ? ' hub-action-rail--edit' : ''}`} style={{
          position: 'absolute', left: 0, right: 0, zIndex: 20,
          display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap',
          padding: '0 12px',
        }}>
          {subsurface ? (
            <SceneBtn icon={<SurfaceGlyph />} label="Surface" muted onClick={() => setSubsurface(false)} />
          ) : (
            <>
              {editMode && (
                <>
                  <SceneBtn testId="hub-new-structure-btn" icon={<PlusGlyph />} label="New Structure" onClick={() => onGoBuilding('build')} />
                  {player.placed.includes('launchpad') && (
                    <SceneBtn icon={<HangarGlyph />} label="Hangar" onClick={() => onGoBuilding('hangar')} />
                  )}
                  {player.placed.includes('launchpad') && !player.launchpadUpgraded && onUpgradeLaunchpad && (
                    <SceneBtn icon={<UpgradeGlyph />} label={`Upgrade Launchpad (${formatCurrency(LAUNCHPAD_UPGRADE_COST, { compact: true })})`} accent onClick={() => setConfirmingLaunchpadUpgrade(true)} />
                  )}
                </>
              )}
              <SceneBtn
                icon={<BuildGlyph />}
                label={editMode ? 'Done' : 'Edit · Build'}
                testId="hub-edit-build-btn"
                active={editMode}
                pulse={!editMode && player.placed.length < 4}
                onClick={() => setEditMode(v => !v)}
              />
              <SceneBtn
                icon={<SubsurfaceGlyph />}
                label="Subsurface"
                muted
                onClick={() => setSubsurface(true)}
              />

              {/* Desktop has no nav rail and no bottom bar, so the destinations
                  without a building of their own hang off the base's action
                  rail instead. Mobile reaches these via the bottom tab bar, so
                  `.hub-desktop-nav` keeps them out of the way there. */}
              {player.freeOperations && (
                <>
                  {player.hasLanded && (
                    <SceneBtn
                      icon={<SurfaceGlyph />}
                      label="Surface Ops"
                      accent
                      testId="hub-surface-ops"
                      onClick={() => onNav('surface-ops')}
                    />
                  )}
                  <span className="hub-desktop-nav">
                    <SceneBtn icon={<MarketGlyph />} label="Market" onClick={() => onNav('market')} />
                  </span>
                  <span className="hub-desktop-nav">
                    <SceneBtn icon={<AtlasGlyph />} label="Atlas" onClick={() => onNav('galaxy')} />
                  </span>
                  <span className="hub-desktop-nav">
                    <SceneBtn icon={<SkillsGlyph />} label="Skills" onClick={() => onNav('skills')} />
                  </span>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
