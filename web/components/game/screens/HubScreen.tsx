'use client'

import React, { useCallback, useEffect, useState } from 'react'
import type { Player, Screen } from '@/game-context'
import ActionConfirmBar from '@/components/game/ActionConfirmBar'
import { awaitingStorageSilo } from '@/lib/systems/AgencyOnboardingSystem'
import { Scene } from '@/lib/engine/Scene'
import type { EntityData } from '@/lib/engine/types'
import { buildPlotEntities } from '@/lib/engine/prefabs'
import { readComponentNumber } from '@/lib/engine/registry'
import { BaseLayerScene } from '@/components/game/hub/BaseLayerScene'
import { BaseDock } from '@/components/game/hub/BaseDock'
import { HubClockWidget } from '@/components/game/hub/HubClockWidget'
import { useBaseCamera } from '@/lib/hooks/useBaseCamera'
import { useBaseSeason, useTimeOfDay } from '@/lib/hooks/useTimeOfDay'
import { EarthBaseModules, EARTH_BASE_STRUCTURE_SIZES, structureCenterPercent, structureWidthPct } from '@/components/game/hub/EarthBaseModules'
import { RocketRollout } from '@/components/game/hub/RocketRollout'
import { consumeRocketRolloutPending } from '@/lib/rocket-rollout'
export { EARTH_BASE_STRUCTURE_SIZES } from '@/components/game/hub/EarthBaseModules'
import { HubSubsurfaceView } from '@/components/game/hub/HubSubsurfaceView'
import { Building, EmptyPlot } from '@/components/game/hub/Building'
import type { BuildingCallout } from '@/components/game/hub/Building'
import { BUILDING_LEVEL_EFFECTS, BUILDING_NAMES, MAX_BUILDING_LEVEL, type SubsurfaceRoomId, type UpgradableBuildingId, buildingLevel, isUpgradableBuilding, upgradeCost } from '@/lib/data'
import { formatCurrency } from '@/lib/format'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import type { HubBuildingDef } from '@/components/game/hub/EarthBaseModules'
import { OrbitalInstrumentNetwork } from '@/components/game/hub/OrbitalInstrumentNetwork'
import { useInstrumentSignals } from '@/lib/hooks/useInstrumentSignals'
import { HUB_PROMPT_TRANSIT_TELESCOPE, isHubPromptDismissed, type HubPromptKey } from '@/lib/hub-prompts'
import { openSettings } from '@/lib/mining/openChrome'
import layoutStyles from '@/components/game/hub/HubLayout.module.css'
import { sceneXPercent } from '@/lib/scene/terrain-kit'
import { isUnderConstruction } from '@/lib/systems/HubConstructionSystem'
import { missionResumeScreen } from '@/lib/mission-resume'
import { SCENE_NAMES } from '@/lib/ui-strings'

const BASE_SCENE_KINDS = new Set(['launchpad', 'hangar'])

/**
 * How far a building's status pill hangs below the ground line. `Building`
 * renders [invisible hit spacer, pill] as a bottom-anchored column, so this is
 * the pill's own height plus its gap — set so the visible building base lands
 * on the ground line. The dock-clearance measurement above depends on it.
 */
function dockStops(player: Player): Screen[] {
  const stops: Screen[] = ['missions']
  if (player.freeOperations) stops.push('market')
  if (player.activeMission) {
    const resume = missionResumeScreen(player)
    if (!stops.includes(resume)) stops.push(resume)
  }
  return stops
}

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
  onUpgradeBuilding?: (id: string) => void
  onExcavateSubsurface?: () => void
  onExcavateSubsurfaceUnavailable?: () => void
  onBuildSubsurfaceRoom?: (roomId: SubsurfaceRoomId) => void
  onFocusResources?: (label: string, minerals: Record<string, number>) => void
  onOpenMarket?: () => void
  subsurface?: boolean
  onSubsurfaceChange?: (v: boolean) => void
}

export default function HubScreen({ player, rocketVariant = 'explorer', onboardingActive, onFocusBuilding, onOpenScene, onDismissHubPrompt, onFocusResources, onOpenMarket, onUpgradeBuilding, onExcavateSubsurface, onExcavateSubsurfaceUnavailable, onBuildSubsurfaceRoom, subsurface = false, onSubsurfaceChange }: HubScreenProps) {
  const { phase: skyPhase, grade: skyGrade } = useTimeOfDay()
  const skySeason = useBaseSeason()
  const camera = useBaseCamera()
  const [editMode, setEditMode] = useState(false)
  const [dockStop, setDockStop] = useState(0)
  const [activeBuilding, setActiveBuilding] = useState<string | null>(null)
  const [rollingOut, setRollingOut] = useState(() => consumeRocketRolloutPending())
  const finishRollout = useCallback(() => setRollingOut(false), [])
  // The pad stays empty unless a mission or launch is in progress (docs/STYLE.md rule 6). Rollout draws its own rocket.
  const rocketOnPad = (!!player.activeMission || !!player.pendingLaunch) && !rollingOut
  // The terrain baseline is part of the world composition. It must not move
  // when the dock grows or the mobile browser chrome changes height: doing so
  // pulled the launchpad up into the mountain range to make room for UI. The
  // dock is an overlay; the scene keeps its authored `--hub-ground` contact.
  const [plotEntities, setPlotEntities] = useState<EntityData[]>(DEFAULT_PLOTS)
  const setSubsurface = (v: boolean) => onSubsurfaceChange?.(v)
  const [upgradingBuilding, setUpgradingBuilding] = useState<UpgradableBuildingId | null>(null)
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
      const widthPct = kind ? structureWidthPct(kind, isUpgradableBuilding(kind) ? buildingLevel(player, kind) : 1) : 0
      const center = kind ? structureCenterPercent(kind, e.transform.position.x, widthPct) : sceneXPercent(e.transform.position.x, widthPct)
      return ({
        left: `${center}%`,
        width: kind === 'launchpad' ? 'calc(120 * var(--px, 3px))' : kind === 'hangar' ? 'calc(72 * var(--px, 3px))' : `${widthPct}%`,
        minWidth: 44,
        maxWidth: 'none',
        bottom: 'var(--hub-ground)',
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
  const HIT_H: Record<string, number> = { launchpad: 260, 'surface-silo': 70, refinery: 60, 'deep-space-telescope': 60, 'astronaut-academy': 60, command: 60 }
  // Post-tutorial Hub prominence pass (STS-631): telescope/satellite
  // buildings recede visually while they're unlocked but still in their
  // early, not-yet-actively-producing state — Space Telescope
  // before the transit satellite launches, Space Telescope before it's
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
      level: isUpgradableBuilding(kind) ? buildingLevel(player, kind) : 1,
      hot: kind === 'launchpad' ? !!player.pendingLaunch : false,
      status: isUnderConstruction(startedAt, kind) ? ('building' as const) : ('ok' as const),
      dimmed: isDimmedBuildingKind(kind),
      active: activeBuilding === kind,
      buildStartedAt: startedAt,
    }]
  })
  const scenicHangar = placed.includes('launchpad') && !placed.includes('hangar') && !placed.includes('garage')
  const sceneBuildings: HubBuildingDef[] = [
    ...(scenicHangar ? [{ kind: 'hangar', plotX: 48, w: 72, level: 3, status: 'ok' as const }] : []),
    ...hubBuildings.filter(building => BASE_SCENE_KINDS.has(building.kind)),
  ]
  // The launchpad speaks only while the Base has no live run. Progression is
  // now exposed through contextual buildings and the persistent chrome rather
  // than a generic card laid over the landscape.
  // After the first run the launchpad offers the space telescope, the one
  // prompt that used to live on a Home card. It is dismissible and goes away
  // once the satellite has launched.
  const offersTransitTelescope = !onboardingActive && !player.activeMission && player.missionsDone > 0
    && !!player.freeOperations && !player.transitSatelliteLaunchedAt
    && !isHubPromptDismissed(player, HUB_PROMPT_TRANSIT_TELESCOPE)
  const launchpadCallout: BuildingCallout | undefined = offersTransitTelescope
    ? {
      title: 'Launch a space telescope',
      body: 'Your program can put a telescope in orbit. It sends back planet candidates to review.',
      cta: 'Open the tower',
      onCta: () => onOpenScene('launchpad'),
      onDismiss: onDismissHubPrompt ? () => onDismissHubPrompt(HUB_PROMPT_TRANSIT_TELESCOPE) : undefined,
    }
    : undefined

  // One sky control for the craft: flying, arrived and waiting on the pad.
  const skyCraft: { state: 'mining' | 'arrived' | 'transit' | 'waiting'; label: string; ariaLabel: string; onOpen: () => void } | null = (() => {
    if (player.activeMission) {
      const resume = missionResumeScreen(player)
      const arrived = (player.missionPhase ?? 'transit') === 'transit' && resume !== 'transit'
      const state = player.missionPhase === 'mining' ? 'mining' : (arrived || player.missionPhase === 'survey') ? 'arrived' : 'transit'
      return {
        state,
        label: state === 'mining' ? 'MINING CRAFT' : state === 'arrived' ? 'CRAFT ARRIVED' : 'CRAFT IN TRANSIT',
        ariaLabel: `Resume ${player.activeMission.label}`,
        onOpen: () => onOpenScene(resume),
      }
    }
    if (player.pendingLaunch) {
      return { state: 'waiting', label: 'CRAFT ON PAD', ariaLabel: 'Open the tower: craft waiting on the pad', onOpen: () => onOpenScene('launchpad') }
    }
    return null
  })()
  const showStorageSiloCta = !player.activeMission && awaitingStorageSilo(player) && !subsurface
  const structureProps = (kind: string) => {
    if (kind === 'launchpad') {
      return {
        kind, label: 'Tower',
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
    <div className={`${layoutStyles.root} theme-blueprint`} data-screen="hub" data-time={skyGrade} data-season={skySeason} aria-label={SCENE_NAMES.base} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>

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
          ref={camera.ref}
          data-testid="base-camera"
          data-zoom={camera.cam.zoom.toFixed(2)}
          {...camera.handlers}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', overflow: 'hidden', touchAction: 'none' }}
        >
          <div data-testid="base-camera-world" style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: camera.transform, willChange: 'transform' }}>
          {/* World background: sky, starfield, ridge parallax, ground, plateau */}
          <BaseLayerScene
            phase={skyPhase}
            time={skyGrade}
            season={skySeason}
            biome={player.earthBiome ?? 'mountains'}
            siloBuilt={!!player.subsurfaceExcavated || (player.subsurfaceBuilt ?? []).length > 0}
            onOpenSilo={() => setSubsurface(true)}
          />

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
          <EarthBaseModules buildings={sceneBuildings} parts={player.shipCustomizerParts} padRocket={rocketOnPad} />
          {rollingOut && <RocketRollout onDone={finishRollout} />}

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
                if (kind && !BASE_SCENE_KINDS.has(kind)) return null
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
                const silo = kind === 'surface-silo'
                const editable = editMode && isUpgradableBuilding(kind) && !isUnderConstruction(startedAt, kind)
                  ? { ...building, onClick: () => setUpgradingBuilding(kind) }
                  : silo
                    ? { ...building, onClick: () => setSubsurface(true) }
                    : building
                const siloStyle = silo ? { ...style, left: '50%' } : style
                const aspect = EARTH_BASE_STRUCTURE_SIZES[kind]
                const pad = kind === 'launchpad'
                return <Building key={kind} {...editable} quiet hitAspect={!pad && aspect ? `${aspect.width} / ${aspect.height}` : undefined} hitH={silo ? 72 : pad ? 260 : (HIT_H[kind] ?? 60)} active={activeBuilding === kind} disableHover={pad} onActiveChange={active => setActiveBuilding(active ? kind : null)} style={siloStyle} calloutAlign={calloutAlign} />
              })}
              {scenicHangar && (
                <Building
                  kind="hangar"
                  label="Hangar"
                  sub="READY"
                  status="ok"
                  quiet
                  w={72}
                  hitH={88}
                  onClick={() => onFocusBuilding('hangar')}
                  active={activeBuilding === 'hangar'}
                  onActiveChange={active => setActiveBuilding(active ? 'hangar' : null)}
                  style={{
                    left: '12%',
                    width: 'calc(72 * var(--px, 3px))',
                    minWidth: 44,
                    bottom: 'var(--hub-ground)',
                    transform: 'translateX(-50%)',
                  }}
                />
              )}
            </div>
          </div>
          </div>
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
          {!subsurface && (
            <div className={layoutStyles.leftCluster}>
              <button type="button" className={layoutStyles.cog} data-testid="settings-button" aria-label="Settings" onClick={openSettings}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              </button>
              <HubClockWidget />
            </div>
          )}
          {!subsurface && (
            <div className={layoutStyles.chips}>
              <span className="scene-chip" data-testid="hub-francs-chip">{formatCurrency(player.francs, { compact: true })}</span>
              {onOpenMarket && (
                <button type="button" className="scene-chip" data-testid="hub-exchange" onClick={onOpenMarket} style={{ pointerEvents: 'auto' }}>
                  Exchange
                </button>
              )}
              <span className="scene-chip" data-testid="hub-cargo-chip" aria-label="Cargo">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
                  <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
                </svg>
              </span>
            </div>
          )}
        </div>
      </div>

      {upgradingBuilding && onUpgradeBuilding && (() => {
        const level = buildingLevel(player, upgradingBuilding)
        const cost = upgradeCost(upgradingBuilding, level)
        const name = BUILDING_NAMES[upgradingBuilding]
        const effects = BUILDING_LEVEL_EFFECTS[upgradingBuilding]
        const maxed = cost === null
        return (
          <ActionConfirmBar
            eyebrow={maxed ? `Level ${level} of ${MAX_BUILDING_LEVEL}` : `Level ${level} to ${level + 1}`}
            title={`Upgrade ${name}`}
            description={maxed
              ? `${effects[level - 1]}. Fully upgraded.`
              : `Now: ${effects[level - 1]}. Next: ${effects[level]}. ${player.francs < cost ? `Needs ${formatCurrency(cost - player.francs)} more. ` : ''}Upgrades are permanent.`}
            confirmLabel={maxed ? 'Max level' : `Upgrade (${formatCurrency(cost, { compact: true })})`}
            confirmDisabled={maxed || player.francs < cost}
            onConfirm={() => { onUpgradeBuilding(upgradingBuilding); setUpgradingBuilding(null) }}
            onDismiss={() => setUpgradingBuilding(null)}
          />
        )
      })()}

      {/* The surface dock is reserved for all-scene navigation only. Base-only
          actions remain on their physical buildings or in their own surfaces. */}
      {(
        <div className="hub-bottom-dock" style={{
          position: 'absolute', left: 0, right: 0, bottom: 8, zIndex: subsurface ? 40 : 20,
          display: 'flex', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div style={{ pointerEvents: 'auto' }}>
            <BaseDock
              onPrev={() => {
                const stops = dockStops(player)
                const next = (dockStop - 1 + stops.length) % stops.length
                setDockStop(next)
                onOpenScene(stops[next])
              }}
              onNext={() => {
                const stops = dockStops(player)
                const next = (dockStop + 1) % stops.length
                setDockStop(next)
                onOpenScene(stops[next])
              }}
              onBuild={() => showStorageSiloCta ? onOpenScene('build') : setEditMode(value => !value)}
              onHub={() => onOpenScene('instrument-hub')}
            />
          </div>
        </div>
      )}
    </div>
  )
}
