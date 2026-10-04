'use client'

import React, { useEffect, useState } from 'react'
import type { Player, Screen } from '@/game-context'
import ActionConfirmBar from '@/components/game/ActionConfirmBar'
import { awaitingStorageSilo } from '@/lib/systems/AgencyOnboardingSystem'
import { Scene } from '@/lib/engine/Scene'
import type { EntityData } from '@/lib/engine/types'
import { buildPlotEntities } from '@/lib/engine/prefabs'
import { readComponentNumber } from '@/lib/engine/registry'
import { AmbientMotes } from '@/components/game/hub/AmbientMotes'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { HubClockWidget } from '@/components/game/hub/HubClockWidget'
import { useTimeOfDay } from '@/lib/hooks/useTimeOfDay'
import { EarthBaseModules, EARTH_BASE_STRUCTURE_SIZES } from '@/components/game/hub/EarthBaseModules'
export { EARTH_BASE_STRUCTURE_SIZES } from '@/components/game/hub/EarthBaseModules'
import { SoilCrossSection } from '@/components/game/hub/SoilCrossSection'
import { RoadRover } from '@/components/game/hub/RoadRover'
import { EARTH_BASE_WIDE } from '@/lib/scene/compositions'
import { HubSubsurfaceView } from '@/components/game/hub/HubSubsurfaceView'
import { Building, EmptyPlot } from '@/components/game/hub/Building'
import type { BuildingCallout } from '@/components/game/hub/Building'
import { LAUNCHPAD_UPGRADE_COST, MISSIONS, missionTypePrimer, type SubsurfaceRoomId } from '@/lib/data'
import { formatCurrency } from '@/lib/format'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import type { HubBuildingDef } from '@/components/game/hub/EarthBaseModules'
import { OrbitalInstrumentNetwork } from '@/components/game/hub/OrbitalInstrumentNetwork'
import { useInstrumentSignals } from '@/lib/hooks/useInstrumentSignals'
import { HUB_PROMPT_TRANSIT_TELESCOPE, isHubPromptDismissed, type HubPromptKey } from '@/lib/hub-prompts'
import HUDStrip from '@/components/ui/HUDStrip'
import layoutStyles from '@/components/game/hub/HubLayout.module.css'
import { sceneXPercent } from '@/lib/scene/terrain-kit'
import { isUnderConstruction } from '@/lib/systems/HubConstructionSystem'
import { missionResumeScreen } from '@/lib/mission-resume'

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
function HistoryGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h6M8 17h4" /></svg>
  )
}
function MarketGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 9h16v11H4z" /><path d="M3 9l2-5h14l2 5M8 13h8M8 17h5" /></svg>
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
// Restyled 2026-08-23 from a vertical icon-over-label tile to a horizontal
// icon-plate + label pill, taking layout cues from Out There: Ω Edition's
// in-scene action buttons (a small dark icon plate beside an uppercase
// label, inside a thin-outlined rounded rect) rather than a bare square tile.
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
        flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6,
        background: on ? 'var(--hub-chalk-soft)' : 'color-mix(in srgb, var(--ln-text) 10%, transparent)',
        border: `4px solid ${on ? 'var(--hub-chalk)' : 'color-mix(in srgb, var(--ln-text) 32%, transparent)'}`,
        borderRadius: 14, padding: '4px 8px 4px 4px', cursor: 'pointer',
      }}
    >
      <span style={{
        width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', flexShrink: 0,
        background: 'color-mix(in srgb, var(--ln-void) 55%, transparent)',
        border: `4px solid ${on ? 'var(--hub-chalk)' : 'color-mix(in srgb, var(--ln-text) 28%, transparent)'}`,
        color: on ? 'var(--hub-chalk)' : 'var(--hub-cyan)',
        animation: pulse ? 'hub-pad-pulse 2s ease-in-out infinite' : 'none',
      }}>
        {icon}
      </span>
      <span style={{
        fontFamily: 'var(--ln-font-display)', fontWeight: 700, fontSize: 8,
        letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.1,
        color: on ? 'var(--hub-chalk)' : 'color-mix(in srgb, var(--ln-text) 92%, transparent)',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    </button>
  )
}

function DockPrimaryBtn({ children, onClick, testId, coachId, pulse }: { children: React.ReactNode; onClick: () => void; testId?: string; coachId?: string; pulse?: boolean }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      data-beacon={coachId}
      style={{
        flexShrink: 0, background: 'var(--hub-chalk-soft)',
        border: '4px solid var(--hub-chalk)', borderRadius: 14, padding: '8px 16px',
        fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 10.5,
        letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--hub-chalk)',
        cursor: 'pointer', boxShadow: '0 4px 16px color-mix(in srgb, var(--hub-chalk) 25%, transparent)',
        animation: pulse ? 'hub-pad-pulse 2s ease-in-out infinite' : 'none',
      }}
    >
      {children}
    </button>
  )
}

/**
 * How far a building's status pill hangs below the ground line. `Building`
 * renders [invisible hit spacer, pill] as a bottom-anchored column, so this is
 * the pill's own height plus its gap — set so the visible building base lands
 * on the ground line. The dock-clearance measurement above depends on it.
 */
const PLOT_LABEL_DROP = 42

// Instantiated from the build-plot prefab rather than written out by hand.
// This same list previously existed in four places (both hub scene files and
// both screens); the prefab is the one definition and a test asserts it still
// reproduces hub.scene.json exactly.
const DEFAULT_PLOTS: EntityData[] = buildPlotEntities()

interface HubScreenProps {
  player: Player
  rocketVariant?: HubBuildingDef['rocketVariant']
  onboardingActive?: boolean
  onFocusBuilding: (b: string) => void
  onOpenScene: (s: Screen) => void
  onDismissHubPrompt?: (key: HubPromptKey) => void
  onUpgradeLaunchpad?: () => void
  onExcavateSubsurface?: () => void
  onExcavateSubsurfaceUnavailable?: () => void
  onBuildSubsurfaceRoom?: (roomId: SubsurfaceRoomId) => void
  onFocusResources?: (label: string, minerals: Record<string, number>) => void
  onOpenMarket?: () => void
  subsurface?: boolean
  onSubsurfaceChange?: (v: boolean) => void
}

export default function HubScreen({ player, rocketVariant = 'explorer', onboardingActive, onFocusBuilding, onOpenScene, onDismissHubPrompt, onFocusResources, onOpenMarket, onUpgradeLaunchpad, onExcavateSubsurface, onExcavateSubsurfaceUnavailable, onBuildSubsurfaceRoom, subsurface = false, onSubsurfaceChange }: HubScreenProps) {
  const { phase: skyPhase } = useTimeOfDay()
  const [editMode, setEditMode] = useState(false)
  const [activeBuilding, setActiveBuilding] = useState<string | null>(null)
  // The terrain baseline is part of the world composition. It must not move
  // when the dock grows or the mobile browser chrome changes height: doing so
  // pulled the launchpad up into the mountain range to make room for UI. The
  // dock is an overlay; the scene keeps its authored `--hub-ground` contact.
  const [plotEntities, setPlotEntities] = useState<EntityData[]>(DEFAULT_PLOTS)
  const setSubsurface = (v: boolean) => onSubsurfaceChange?.(v)
  const activeMissionDisplayLabel = (activeMission: NonNullable<Player['activeMission']>): string => {
    const mission = MISSIONS.find(item => item.id === activeMission.id)
    if (!mission) return activeMission.label
    const target = activeMission.label.split('→').slice(1).join('→').trim()
    const operation = missionTypePrimer(mission).label
    return target ? `${operation} → ${target}` : operation
  }
  const [confirmingLaunchpadUpgrade, setConfirmingLaunchpadUpgrade] = useState(false)
  const { signals } = useInstrumentSignals(player)
  const asteroidQueueCount = signals.filter(signal => signal.kind === 'deep-space').length
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

  const sortedEntities = plotEntities.slice().sort((a, b) => {
    const ai = readComponentNumber(a, 'BuildPlot', 'index', 0)
    const bi = readComponentNumber(b, 'BuildPlot', 'index', 0)
    return ai - bi
  })

  const plotStyles: React.CSSProperties[] = sortedEntities
    // SVG grass is at 78% from top = 22% from bottom. calc(22% - 42px) puts the label
    // bottom 42px underground so the visible building base sits at the grass line.
    // left uses scene-proportional % so it matches the CSS-stretched PixiJS canvas (HUB_W=402).
    // `sceneXPercent` returns the structure centre, so the DOM wrapper uses
    // the same translate as the sprite layer below.
    .map(e => {
      const plot = readComponentNumber(e, 'BuildPlot', 'index', 0)
      const kind = Object.entries(effectivePlots).find(([, index]) => index === plot)?.[0]
      const widthPct = kind ? (EARTH_BASE_STRUCTURE_SIZES[kind]?.width ?? 0) / 6.4 : 0
      return ({
        // The authored outer plots sit close to the scene edge. Clamp the DOM
        // hit target (which is wider than the sprite) so its entire button and
        // status remain reachable even on a 320px viewport.
        left: `clamp(62px, ${sceneXPercent(e.transform.position.x, widthPct)}%, calc(100% - 62px))`,
        bottom: `calc(var(--hub-ground) - ${PLOT_LABEL_DROP}px)`,
        transform: 'translateX(-50%)',
      } as React.CSSProperties)
    })

  const structureForPlot = (plot: number) => {
    const kind = Object.entries(effectivePlots).find(([, p]) => p === plot)?.[0] ?? null
    return kind
  }

  const BUILDING_W: Record<string, number> = { launchpad: 105, 'surface-silo': 62, refinery: 84, 'deep-space-telescope': 86, 'astronaut-academy': 88, command: 84 }
  // Invisible click-target height for each building's spacer (Building.tsx),
  // reported unclickable 2026-08-23. EarthBaseModules renders each building's
  // modular art at a per-kind width/footprint with its
  // OWN aspect ratio — the launchpad's gantry PNG (84x288px) renders far
  // taller than its footprint, reaching ~220px above the ground line, while
  // the invisible hit spacer this map used to feed (a flat `w * 0.6`, ~59px)
  // only covered the bottom sliver near the status pill. Clicking the tall
  // gantry tower itself (the obvious thing to tap) missed the hit area
  // entirely. Values below are sized to each building's actual rendered
  // silhouette (width x pixelHeight/pixelWidth of its PNG) plus headroom;
  // buildings whose art is short/squat keep the old w*0.6-ish default.
  const HIT_H: Record<string, number> = { launchpad: 140, 'surface-silo': 70, refinery: 60, 'deep-space-telescope': 60, 'astronaut-academy': 60, command: 60 }
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
    const startedAt = player.underConstruction?.[kind]
    return [{
      kind,
      plotX: e.transform.position.x,
      w: BUILDING_W[kind] ?? 78,
      hot: kind === 'launchpad' ? !!player.pendingLaunch : false,
      status: isUnderConstruction(startedAt, kind) ? ('building' as const) : ('ok' as const),
      dimmed: isDimmedBuildingKind(kind),
      active: activeBuilding === kind,
      buildStartedAt: startedAt,
    }]
  })
  // The exchange is a permanent Earth Base facility, not a menu destination.
  // It deliberately has its own scene object even before the player has ore.
  hubBuildings.push({ kind: 'market', plotX: 338, w: 84, status: 'ok' })
  const launchpadPlot = hubBuildings.find(building => building.kind === 'launchpad')
  // The launchpad speaks only while the Base has no live run. Progression is
  // now exposed through contextual buildings and the persistent chrome rather
  // than a generic card laid over the landscape.
  const hasProgressionCards = !!player.activeMission || !!player.pendingLaunch || player.missionsDone > 0
  // After the first run the launchpad offers the transit telescope, the one
  // prompt that used to live on a Home card. It is dismissible and goes away
  // once the satellite has launched.
  const offersTransitTelescope = !onboardingActive && !player.activeMission && player.missionsDone > 0
    && !!player.freeOperations && !player.transitSatelliteLaunchedAt
    && !isHubPromptDismissed(player, HUB_PROMPT_TRANSIT_TELESCOPE)
  const launchpadCallout: BuildingCallout | undefined =
    offersTransitTelescope
      ? {
        title: 'Launch a transit telescope',
        body: 'Your program can put a telescope in orbit. It sends back planet candidates to review.',
        cta: 'Open Launchpad',
        onCta: () => onOpenScene('launchpad'),
        onDismiss: onDismissHubPrompt ? () => onDismissHubPrompt(HUB_PROMPT_TRANSIT_TELESCOPE) : undefined,
      }
      : onboardingActive || hasProgressionCards
        ? undefined
        : {
          title: 'Choose your first contract',
          body: 'A client job is open at the Mission Board. Your launchpad is ready to fly it.',
          cta: 'View Missions',
          onCta: () => onOpenScene('missions'),
        }

  // One sky control for the craft: flying, arrived and waiting on the pad.
  const skyCraft: { state: 'mining' | 'arrived' | 'transit' | 'waiting'; label: string; ariaLabel: string; onOpen: () => void } | null = (() => {
    if (player.activeMission) {
      const resume = missionResumeScreen(player)
      const arrived = (player.missionPhase ?? 'transit') === 'transit' && resume !== 'transit'
      const state = player.missionPhase === 'mining' ? 'mining' : arrived ? 'arrived' : 'transit'
      return {
        state,
        label: state === 'mining' ? 'MINING CRAFT' : state === 'arrived' ? 'CRAFT ARRIVED' : 'CRAFT IN TRANSIT',
        ariaLabel: `Resume ${player.activeMission.label}`,
        onOpen: () => onOpenScene(resume),
      }
    }
    if (player.pendingLaunch) {
      return { state: 'waiting', label: 'CRAFT ON PAD', ariaLabel: 'Open Launchpad: craft waiting on the pad', onOpen: () => onOpenScene('launchpad') }
    }
    return null
  })()
  const showStorageSiloCta = !player.activeMission && awaitingStorageSilo(player) && !subsurface

  const structureProps = (kind: string) => {
    if (kind === 'launchpad') {
      return {
        kind, label: 'Launchpad',
        sub: player.activeMission ? 'IN FLIGHT' : 'READY',
        status: (player.activeMission ? 'warn' : 'ok') as 'ok' | 'warn',
        hot: !!player.pendingLaunch,
        // Match the rendered mobile footprint of the authored sprite. The
        // taller hit area below covers the gantry without creating an
        // oversized box that shifts the building label away from the structure.
        w: BUILDING_W.launchpad,
        callout: launchpadCallout,
        onClick: () => onFocusBuilding('launchpad'),
      }
    }
    if (kind === 'refinery') {
      return {
        kind, label: 'Refinery',
        sub: 'ORE PROCESSING',
        status: 'ok' as const,
        w: 84,
        onClick: () => onFocusBuilding('refinery'),
      }
    }
    if (kind === 'surface-silo') {
      const used = Object.values(player.stash ?? {}).reduce((sum, amount) => sum + Math.max(0, amount), 0)
      return {
        kind, label: 'Surface Silo',
        sub: `${Math.min(used, 40)} / 40 U`,
        status: 'ok' as const,
        w: 62,
        onClick: () => onFocusBuilding('build'),
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
        onClick: () => onFocusBuilding('deep-space-telescope'),
      }
    }
    if (kind === 'astronaut-academy') {
      const activeTraining = player.crewTraining?.length ?? 0
      return {
        kind, label: 'Academy',
        sub: activeTraining > 0 ? `${activeTraining} TRAINING` : player.academyFunded ? 'FUNDED' : 'PAUSED',
        status: (activeTraining > 0 ? 'warn' : player.academyFunded ? 'ok' : 'info') as 'ok' | 'warn' | 'info',
        w: 88,
        onClick: () => onFocusBuilding('academy'),
      }
    }
    return {
      kind, label: kind,
      sub: 'BUILT',
      status: 'info' as const,
      w: 78,
      onClick: () => onFocusBuilding(kind),
    }
  }

  return (
    <div className={layoutStyles.root} data-screen="hub" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>

      {/* Base stays mounted at its authored camera frame while a tray is open.
          The former 200%-tall slider moved the whole world before revealing
          Subsurface, which made close feel like a navigation reset. */}
      <div style={{ position: 'absolute', inset: 0 }}>

        {/* ─── ABOVE GROUND ─── top half of slider */}
        {/* The scene still runs full-bleed behind the translucent dock — that
            is the point of the glass treatment — but the ground line and
            everything standing on it clear the chrome, so the status pills are
            readable. 22% is the floor, for viewports tall enough not to need
            any lift at all. */}
        <div
          className={layoutStyles.surface}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', overflow: 'hidden' }}
        >
          {/* World background: sky, starfield, ridge parallax, ground, plateau */}
          <HubWorldBackground phase={skyPhase} />
          <RoadRover road={EARTH_BASE_WIDE.roadPaths?.[0]} />

          {/* Drifting ambient motes — replaces the old daylight cloud layer,
              which read as overcast weather against the new deep-blue sky. */}
          <AmbientMotes />

          {skyCraft && (
            <button
              type="button"
              className="hub-sky-craft-control"
              data-testid="hub-sky-craft"
              data-craft-state={skyCraft.state}
              aria-label={skyCraft.ariaLabel}
              onClick={skyCraft.onOpen}
            >
              <span aria-hidden="true">◇</span>
              <span>{skyCraft.label}</span>
            </button>
          )}

          {(player.transitSatelliteLaunchedAt || player.deepSpaceTelescopeBuilt) && (
            <OrbitalInstrumentNetwork
              transitOnline={!!player.transitSatelliteLaunchedAt}
              deepSpaceOnline={!!player.deepSpaceTelescopeBuilt}
              readyCount={signals.length}
              ping
              onOpen={() => onOpenScene('instrument-hub')}
              onOpenTransit={() => onOpenScene('instrument-hub')}
              onOpenDeepSpace={() => onOpenScene('asteroid-discovery')}
            />
          )}

          {/* Authored structure sprites. DOM rendering keeps the Hub legible
              in both hardware WebGL and Docker/Electron screenshot runners. */}
          <EarthBaseModules buildings={hubBuildings} />

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
                  return <EmptyPlot key={plot} plot={plot} w={78} style={style} onClick={() => onFocusBuilding('build')} />
                }
                const startedAt = player.underConstruction?.[kind]
                const building = isUnderConstruction(startedAt, kind)
                  ? { ...structureProps(kind), status: 'building' as const, buildStartedAt: startedAt }
                  : structureProps(kind)
                // Outer plots open their callout inward so a 208px bubble
                // can't run off the edge of the scene.
                const xFrac = (sortedEntities[plot]?.transform.position.x ?? 201) / 402
                const calloutAlign = xFrac < 0.32 ? 'start' : xFrac > 0.68 ? 'end' : 'center'
                return <Building key={kind} {...building} hitH={HIT_H[kind] ?? 60} active={activeBuilding === kind} disableHover={kind === 'launchpad'} onActiveChange={active => setActiveBuilding(active ? kind : null)} style={style} calloutAlign={calloutAlign} />
              })}
              <Building
                kind="market"
                label="Commodity Exchange"
                sub="SELL CARGO"
                status="ok"
                w={84}
                hitH={72}
                active={activeBuilding === 'market'}
                onActiveChange={active => setActiveBuilding(active ? 'market' : null)}
                onClick={() => onFocusBuilding('market')}
                style={{ left: `clamp(62px, ${sceneXPercent(338, EARTH_BASE_STRUCTURE_SIZES.market.width / 6.4)}%, calc(100% - 62px))`, bottom: `calc(var(--hub-ground) - ${PLOT_LABEL_DROP}px)`, transform: 'translateX(-50%)' }}
              />
            </div>
          </div>

          {/* Soil cross-section with subsurface button */}
          <SoilCrossSection />
        </div>

        {/* Subsurface is a tray over the still-mounted Base, never a camera slide. */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 30, overflow: 'auto', display: subsurface ? 'block' : 'none', background: 'var(--ln-void)' }}>
          <HubSubsurfaceView
            stash={player.stash}
            installedParts={player.shipCustomizerParts}
            trainingEnabled={FEATURE_FLAGS.subsurfaceHabitatTraining}
            francs={player.francs}
            subsurfaceExcavated={player.subsurfaceExcavated}
            subsurfaceBuilt={player.subsurfaceBuilt}
            onExcavate={onExcavateSubsurface}
            onExcavateUnavailable={onExcavateSubsurfaceUnavailable}
            onBuildRoom={onBuildSubsurfaceRoom}
            onFocusResources={onFocusResources}
            onOpenMarket={onOpenMarket}
          />
        </div>

      </div>
      {/* ── End persistent Base world ── */}

      {/* Top HUD — always fixed above the slide. Rebuilt 2026-08-21 (KES-226)
          back to a dark scrim (the KES-220 light version was scrapped same
          day) — the persistent stacked HUD rail sits directly beneath the
          title, top-left, matching the reference's fixed left-edge rail
          rather than corner-scattered readouts. Surface and subsurface now
          share the same dark treatment; no more light/dark split. */}
      <div className={layoutStyles.topHud}>
        <div className={layoutStyles.topRow}>
          <div className={layoutStyles.titleBlock}>
            {/* KES-173: DevShortcuts' fixed DEV toggle (top:8 left:8, dev-only,
                roughly 120 pixels wide) sits directly over this eyebrow, clipping the
                opening characters ("EARTH BASE" -> "H BASE"). Only reserve
                the clearance when that badge can actually render. */}
            <div className={layoutStyles.eyebrow} data-dev-launcher={isDevLauncherEnabled()}>
              {subsurface ? 'BASE · SUBSURFACE' : `BASE · OPS ${player.missionsDone}`}
            </div>
            <h1 className={layoutStyles.titleText}>
              {subsurface ? 'Subsurface' : 'Base'}
            </h1>
          </div>
          {!subsurface && <HubClockWidget />}
        </div>
        {!subsurface && (
          <div className={layoutStyles.balance}>
            <HUDStrip player={player} />
          </div>
        )}
      </div>

      {confirmingLaunchpadUpgrade && onUpgradeLaunchpad && (
        <ActionConfirmBar
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
          why). It remains available during onboarding so the tutorial can
          point at Missions without taking away the rest of the base controls. */}
      {/* Navigation is part of the base, not a tutorial reward. Keeping this
          dock mounted during M1 means the coach can point at Missions without
          removing the rest of the player's controls. */}
      {(
        <div className="hub-bottom-dock" style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20,
          display: 'flex', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div className="hub-bottom-dock-inner" style={{
            pointerEvents: 'auto', width: '100%', maxWidth: 480,
            // A translucent command rail, deliberately without backdrop blur:
            // blurring the terrain under a fixed dock created the frosted band
            // reported in visual review and broke the scene's ground plane.
            background: 'linear-gradient(180deg, color-mix(in srgb, var(--ln-void) 72%, transparent) 0%, color-mix(in srgb, var(--ln-void) 88%, transparent) 100%)',
            borderTop: '4px solid color-mix(in srgb, var(--hub-outline) 60%, transparent)',
            borderRadius: '16px 16px 0 0', boxShadow: '0 -8px 24px color-mix(in srgb, var(--ln-void) 28%, transparent)',
            padding: '12px 16px 16px',
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
                <div className="hub-bottom-dock-main" data-testid={player.activeMission ? 'hub-resume-mission-banner' : undefined} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--hub-cyan)' }}>
                      {player.activeMission ? 'Mission in progress' : 'Launchpad'}
                    </div>
                    <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: player.activeMission ? 11 : 14, fontWeight: 800, color: 'var(--ln-text)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {player.activeMission ? activeMissionDisplayLabel(player.activeMission) : 'Ready'}
                    </div>
                  </div>
                  {showStorageSiloCta ? (
                    // SSL-332: the last training step. The Build screen is only
                    // otherwise reachable from Edit, so the dock offers it.
                    <DockPrimaryBtn testId="hub-build-storage-silo" coachId="hub-build-storage-silo" onClick={() => onOpenScene('build')} pulse>
                      Build Silo
                    </DockPrimaryBtn>
                  ) : player.activeMission ? (
                    <DockIconBtn testId="hub-resume-mission-btn" icon={<HistoryGlyph />} label="Resume" onClick={() => onOpenScene(missionResumeScreen(player))} accent />
                  ) : (
                    <DockPrimaryBtn testId="hub-edit-build-btn" onClick={() => setEditMode(v => !v)}>
                      {editMode ? 'Done' : 'Edit · Build'}
                    </DockPrimaryBtn>
                  )}
                </div>

                {/* Row 2 — icon-tab strip. Non-wrapping by construction
                    (fixed-width buttons, horizontal scroll as a safety net
                    rather than flexWrap) so it can never overlap the scene
                    below it, unlike the pill row it replaces. */}
                <div className="hub-bottom-dock-actions" style={{ display: 'flex', gap: 4, marginTop: 10, overflowX: 'auto', paddingBottom: 2 }}>
                  {editMode && (
                    <>
                      <DockIconBtn testId="hub-new-structure-btn" icon={<PlusGlyph />} label="New" onClick={() => onFocusBuilding('build')} />
                      {player.placed.includes('launchpad') && (
                        <DockIconBtn icon={<HangarGlyph />} label="Hangar" onClick={() => onFocusBuilding('hangar')} />
                      )}
                      {player.placed.includes('launchpad') && !player.launchpadUpgraded && onUpgradeLaunchpad && (
                        <DockIconBtn icon={<UpgradeGlyph />} label="UPGRADE" accent onClick={() => setConfirmingLaunchpadUpgrade(true)} />
                      )}
                    </>
                  )}
                  <DockIconBtn testId="hub-subsurface-btn" icon={<SubsurfaceGlyph />} label="Subsurface" onClick={() => setSubsurface(true)} />
                  <DockIconBtn testId="hub-mission-log-btn" icon={<HistoryGlyph />} label="Mission Log" onClick={() => onOpenScene('mission-history')} />
                  <DockIconBtn testId="hub-market-btn" icon={<MarketGlyph />} label="Market" onClick={() => onOpenMarket?.()} />
                  {player.freeOperations && (
                    <DockIconBtn testId="hub-surface-ops" icon={<SurfaceGlyph />} label="Sites" onClick={() => onOpenScene('surface-ops')} />
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
