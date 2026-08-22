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
 * Docked bottom sheet, rebuilt 2026-08-21 (KES-226) — replaces the
 * floating `flexWrap` pill row (`.hub-action-rail`), which wrapped onto
 * the ground-level building labels/Subsurface pill once Edit Mode expanded
 * past ~3 buttons (KES-222, confirmed pre-existing, present on unmodified
 * code, and the likely cause of live taps mis-firing into Subsurface). A
 * fixed-height docked card with a defined row structure — title/CTA row,
 * then a non-wrapping icon-tab strip — cannot overlap anything below it,
 * by construction, at any button count or viewport width.
 *
 * Framed after tapnine.com's "Black Hole" (com.tapnine.blackhole)
 * reference: a title+status+primary-CTA row, then a row of small square
 * icon buttons — not tapnine's literal upgrade list, adapted to Landnam's
 * actual Hub actions (Build, Hangar, Upgrade, Subsurface, and the desktop-
 * only Market/Atlas/Skills destinations).
 */
function DockIconBtn({ icon, label, onClick, active, accent, pulse, testId }: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
  accent?: boolean
  pulse?: boolean
  testId?: string
}) {
  const on = active || accent
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      title={label}
      aria-label={label}
      style={{
        flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        background: 'transparent', border: 'none', padding: '4px 2px', cursor: 'pointer', width: 58,
      }}
    >
      <span style={{
        width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center',
        background: on ? 'var(--hub-pink-soft)' : 'var(--hub-panel-deep)',
        border: `1.5px solid ${on ? 'var(--hub-pink)' : 'var(--hub-outline)'}`,
        color: on ? 'var(--hub-pink)' : 'var(--hub-cyan)',
        animation: pulse ? 'hub-pad-pulse 2s ease-in-out infinite' : 'none',
      }}>
        {icon}
      </span>
      <span style={{
        fontFamily: 'var(--ln-font-display)', fontWeight: 700, fontSize: 7.5,
        letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.1,
        color: on ? 'var(--hub-pink)' : 'rgba(177,198,229,0.75)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 58,
      }}>
        {label}
      </span>
    </button>
  )
}

function DockPrimaryBtn({ children, onClick, testId, pulse }: { children: React.ReactNode; onClick: () => void; testId?: string; pulse?: boolean }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      style={{
        flexShrink: 0, background: 'linear-gradient(180deg, var(--hub-pink), #c4477f)',
        border: 'none', borderRadius: 10, padding: '10px 16px',
        fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 10.5,
        letterSpacing: '0.08em', textTransform: 'uppercase', color: '#160710',
        cursor: 'pointer', boxShadow: '0 4px 14px rgba(227,95,160,0.35)',
        animation: pulse ? 'hub-pad-pulse 2s ease-in-out infinite' : 'none',
      }}
    >
      {children}
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
    if (!player.freeOperations || !player.transitSatelliteLaunchedAt) {
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
  }, [player.freeOperations, player.transitSatelliteLaunchedAt, player.tessClassifications])

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

  const BUILDING_W: Record<string, number> = { launchpad: 98, refinery: 84, 'scan-station': 80, 'deep-space-telescope': 86, 'astronaut-academy': 88, command: 84 }
  // Post-tutorial Hub prominence pass (STS-631): telescope/satellite
  // buildings recede visually while they're unlocked but still in their
  // early, not-yet-actively-producing state — Transit Telescope
  // before the transit satellite launches, Deep Space Telescope before it's
  // built — so the Launchpad keeps reading as the base's primary structure.
  const isDimmedBuildingKind = (kind: string): boolean => {
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

      {/* Top HUD — always fixed above the slide. Rebuilt 2026-08-21 (KES-226)
          back to a dark scrim (the KES-220 light version was scrapped same
          day) — the persistent stacked HUD rail sits directly beneath the
          title, top-left, matching the reference's fixed left-edge rail
          rather than corner-scattered readouts. Surface and subsurface now
          share the same dark treatment; no more light/dark split. */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 18,
        padding: '16px 14px 22px',
        background: 'linear-gradient(180deg, rgba(0,4,10,0.85) 0%, rgba(0,4,10,0.45) 65%, transparent 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          {/* KES-173: DevShortcuts' fixed DEV toggle (top:8 left:8, dev-only,
              ~120px wide) sits directly over this eyebrow, clipping the
              opening characters ("EARTH BASE" -> "H BASE"). Only reserve
              the clearance when that badge can actually render. */}
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(177,198,229,0.7)', marginLeft: isDevLauncherEnabled() ? 130 : 0 }}>
            {subsurface ? 'EARTH BASE · SUBSURFACE' : `EARTH BASE · OPS ${player.missionsDone}`}
          </div>
          <h1 style={{ margin: '2px 0 0', fontFamily: 'var(--ln-font-display)', fontSize: 23, fontWeight: 800, letterSpacing: '-0.01em', color: '#eaf1f8', lineHeight: 1, textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>
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

      {/* Bottom dock — rebuilt 2026-08-21 (KES-226) as a docked sheet, not a
          floating pill row (see DockIconBtn/DockPrimaryBtn doc comment for
          why). Hidden only during the strict M1 first-run tutorial
          (missionsDone === 0). M2/M3 "guided ops" still set hasCoach true on
          this screen (every tier has a hub coach step nudging toward
          Missions), but that's a lighter nudge, not a full-screen takeover —
          hiding Edit/Build, Subsurface, and Surface Ops for the whole
          guided-ops window meant those buttons stayed unreachable well past
          the tutorial (bug reported 2026-07-31). */}
      {(!hasCoach || player.missionsDone > 0) && (
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 'var(--ln-nav-h, 64px)', zIndex: 20,
          display: 'flex', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div style={{
            pointerEvents: 'auto', width: '100%', maxWidth: 480,
            background: 'var(--hub-panel)', borderTop: '1px solid var(--hub-outline)',
            borderRadius: '16px 16px 0 0', boxShadow: '0 -10px 28px rgba(0,0,0,0.45)',
            padding: '12px 14px 14px',
          }}>
            {subsurface ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <DockPrimaryBtn onClick={() => setSubsurface(false)}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><SurfaceGlyph />Surface</span>
                </DockPrimaryBtn>
              </div>
            ) : (
              <>
                {/* Row 1 — status + primary CTA, the reference's
                    "Facility Tier · status" + primary-action row. */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--hub-cyan)' }}>
                      Launchpad
                    </div>
                    <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800, color: '#eaf1f8', marginTop: 1 }}>
                      {player.activeMission ? 'In Flight' : 'Ready'}
                    </div>
                  </div>
                  <DockPrimaryBtn testId="hub-edit-build-btn" pulse={!editMode && player.placed.length < 4} onClick={() => setEditMode(v => !v)}>
                    {editMode ? 'Done' : 'Edit · Build'}
                  </DockPrimaryBtn>
                </div>

                {/* Row 2 — icon-tab strip. Non-wrapping by construction
                    (fixed-width buttons, horizontal scroll as a safety net
                    rather than flexWrap) so it can never overlap the scene
                    below it, unlike the pill row it replaces. */}
                <div style={{ display: 'flex', gap: 4, marginTop: 10, overflowX: 'auto', paddingBottom: 2 }}>
                  {editMode && (
                    <>
                      <DockIconBtn testId="hub-new-structure-btn" icon={<PlusGlyph />} label="New" onClick={() => onGoBuilding('build')} />
                      {player.placed.includes('launchpad') && (
                        <DockIconBtn icon={<HangarGlyph />} label="Hangar" onClick={() => onGoBuilding('hangar')} />
                      )}
                      {player.placed.includes('launchpad') && !player.launchpadUpgraded && onUpgradeLaunchpad && (
                        <DockIconBtn icon={<UpgradeGlyph />} label={`+${formatCurrency(LAUNCHPAD_UPGRADE_COST, { compact: true })}`} accent onClick={() => setConfirmingLaunchpadUpgrade(true)} />
                      )}
                    </>
                  )}
                  <DockIconBtn icon={<SubsurfaceGlyph />} label="Subsurface" onClick={() => setSubsurface(true)} />

                  {/* Desktop has no nav rail and no bottom bar, so the
                      destinations without a building of their own hang off
                      the dock instead. Mobile reaches these via the bottom
                      tab bar, so `.hub-desktop-nav` keeps them out of the
                      way there. */}
                  {player.freeOperations && (
                    <>
                      {player.hasLanded && (
                        <DockIconBtn icon={<SurfaceGlyph />} label="Surface Ops" accent testId="hub-surface-ops" onClick={() => onNav('surface-ops')} />
                      )}
                      <span className="hub-desktop-nav">
                        <DockIconBtn icon={<MarketGlyph />} label="Market" onClick={() => onNav('market')} />
                      </span>
                      <span className="hub-desktop-nav">
                        <DockIconBtn icon={<AtlasGlyph />} label="Atlas" onClick={() => onNav('galaxy')} />
                      </span>
                      <span className="hub-desktop-nav">
                        <DockIconBtn icon={<SkillsGlyph />} label="Skills" onClick={() => onNav('skills')} />
                      </span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
