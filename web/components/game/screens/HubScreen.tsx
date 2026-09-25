'use client'

import React, { useEffect, useState } from 'react'
import type { Player, Screen } from '@/game-context'
import ProgressionCard from '@/components/game/ProgressionCard'
import { Scene } from '@/lib/engine/Scene'
import type { EntityData } from '@/lib/engine/types'
import { buildPlotEntities } from '@/lib/engine/prefabs'
import { readComponentNumber } from '@/lib/engine/registry'
import { AmbientMotes } from '@/components/game/hub/AmbientMotes'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { useTimeOfDay } from '@/lib/hooks/useTimeOfDay'
import { EarthBaseModules, EARTH_BASE_STRUCTURE_SIZES } from '@/components/game/hub/EarthBaseModules'
export { EARTH_BASE_STRUCTURE_SIZES } from '@/components/game/hub/EarthBaseModules'
import { SoilCrossSection } from '@/components/game/hub/SoilCrossSection'
import { RoadRover } from '@/components/game/hub/RoadRover'
import { EARTH_BASE_WIDE } from '@/lib/scene/compositions'
import { HubSubsurfaceView } from '@/components/game/hub/HubSubsurfaceView'
import { Building } from '@/components/game/hub/Building'
import type { BuildingCallout } from '@/components/game/hub/Building'
import { TUTORIAL_CONTENT_TOP } from '@/lib/tutorial-layout'
import type { SubsurfaceRoomId } from '@/lib/data'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import type { HubBuildingDef } from '@/components/game/hub/EarthBaseModules'
import { OrbitalInstrumentNetwork } from '@/components/game/hub/OrbitalInstrumentNetwork'
import { useInstrumentSignals } from '@/lib/hooks/useInstrumentSignals'
import type { HubPromptKey } from '@/lib/hub-prompts'
import layoutStyles from '@/components/game/hub/HubLayout.module.css'
import { sceneXPercent } from '@/lib/scene/terrain-kit'
import { isUnderConstruction } from '@/lib/systems/HubConstructionSystem'
import { missionRunsFor, type MissionRunSummary } from '@/lib/mission-runs'
import { FrameSlot } from '@/components/layout/frame/FrameSlot'
import { HomeBottomBar, HomeSkyRockets, HomeTopBar, type SkyRocket } from '@/components/layout/frame/home/HomeChrome'

// SSL-35: the Home top bar (frame slot) is ~68px tall; the sky rocket row
// sits under it. ProgressionCard starts below whichever is lower.
const HOME_TOP_BAR_CLEARANCE = 80
const HOME_SKY_ROW_HEIGHT = 52

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
  hasCoach?: boolean
  onFocusBuilding: (b: string) => void
  onOpenScene: (s: Screen) => void
  onDismissHubPrompt?: (key: HubPromptKey) => void
  onExcavateSubsurface?: () => void
  onBuildSubsurfaceRoom?: (roomId: SubsurfaceRoomId) => void
  onFocusResources?: (label: string, minerals: Record<string, number>) => void
  subsurface?: boolean
  onSubsurfaceChange?: (v: boolean) => void
  /** Tap a mission run (sky rocket or the bottom-bar chip). */
  onResumeRun?: (run: MissionRunSummary) => void
  /** Rocket waiting on the pad. */
  onOpenPendingLaunch?: () => void
  shell?: {
    marketOpen: boolean
    menuOpen: boolean
    showMarket: boolean
    onMarket: () => void
    onMenu: () => void
  }
}

export default function HubScreen({ player, rocketVariant = 'explorer', hasCoach, onFocusBuilding, onOpenScene, onDismissHubPrompt, onFocusResources, onExcavateSubsurface, onBuildSubsurfaceRoom, subsurface = false, onSubsurfaceChange, onResumeRun, onOpenPendingLaunch, shell }: HubScreenProps) {
  const { phase: skyPhase } = useTimeOfDay()
  const [activeBuilding, setActiveBuilding] = useState<string | null>(null)
  // The terrain baseline is part of the world composition. It must not move
  // when the dock grows or the mobile browser chrome changes height: doing so
  // pulled the launchpad up into the mountain range to make room for UI. The
  // dock is an overlay; the scene keeps its authored `--hub-ground` contact.
  const [plotEntities, setPlotEntities] = useState<EntityData[]>(DEFAULT_PLOTS)
  const setSubsurface = (v: boolean) => onSubsurfaceChange?.(v)
  const missionRuns = missionRunsFor(player)
  const [selectedRunIndex, setSelectedRunIndex] = useState(0)
  const selectedRun = Math.min(selectedRunIndex, Math.max(0, missionRuns.length - 1))
  const skyRockets: SkyRocket[] = [
    ...(player.pendingLaunch && !player.activeMission ? [{ key: 'pending-launch', label: 'Launchpad', attention: 'waiting' as const }] : []),
    ...missionRuns.flatMap(run => run.attention ? [{ key: run.key, label: run.label, attention: run.attention }] : []),
  ]
  const tapSkyRocket = (key: string) => {
    if (key === 'pending-launch') { onOpenPendingLaunch?.(); return }
    const run = missionRuns.find(item => item.key === key)
    if (run) onResumeRun?.(run)
  }
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
  const launchpadPlot = hubBuildings.find(building => building.kind === 'launchpad')
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
        onCta: () => onOpenScene('missions'),
      }

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

      {/* ── Sliding world: surface (top 50%) + subsurface (bottom 50%) ── */}
      <div className="earth-base-campus-transition" style={{
        position: 'absolute', left: 0, right: 0,
        top: subsurface ? '-100%' : '0%',
        height: '200%',
        transition: 'top 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'top',
      }}>

        {/* ─── ABOVE GROUND ─── top half of slider */}
        {/* The scene still runs full-bleed behind the translucent dock — that
            is the point of the glass treatment — but the ground line and
            everything standing on it clear the chrome, so the status pills are
            readable. 22% is the floor, for viewports tall enough not to need
            any lift at all. */}
        <div
          className={layoutStyles.surface}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', overflow: 'hidden' }}
        >
          {/* World background: sky, starfield, ridge parallax, ground, plateau */}
          <HubWorldBackground phase={skyPhase} />
          <RoadRover road={EARTH_BASE_WIDE.roadPaths?.[0]} />

          {/* Drifting ambient motes — replaces the old daylight cloud layer,
              which read as overcast weather against the new deep-blue sky. */}
          <AmbientMotes />

          {(player.transitSatelliteLaunchedAt || player.deepSpaceTelescopeBuilt) && (
            <OrbitalInstrumentNetwork
              transitOnline={!!player.transitSatelliteLaunchedAt}
              deepSpaceOnline={!!player.deepSpaceTelescopeBuilt}
              readyCount={signals.length}
              ping
              onOpen={() => onOpenScene('instrument-hub')}
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
                if (!kind) return null
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
            onFocusResources={onFocusResources}
          />
        </div>

      </div>
      {/* ── End sliding world ── */}

      {/* SSL-35 / SSL-340 Home chrome. The top and bottom bars land in the
          shared frame's slots; rockets that need a tap float in the sky. */}
      <FrameSlot name="top">
        <HomeTopBar
          opsCount={player.missionsDone}
          francs={player.francs}
          subsurface={subsurface}
          signalCount={signals.length}
          devLauncher={isDevLauncherEnabled()}
          onOpenHub={() => onOpenScene('instrument-hub')}
        />
      </FrameSlot>
      {!subsurface && <HomeSkyRockets rockets={skyRockets} onTap={tapSkyRocket} />}

      {/* The progression card is the Hub's single prompt surface. A rocket
          waiting on the pad is already a sky rocket, so the card skips it. */}
      {!player.activeMission && (!hasCoach || !!player.pendingLaunch) && !subsurface && (
        <ProgressionCard
          player={player}
          onOpenScene={onOpenScene}
          onDismissPrompt={onDismissHubPrompt}
          hidePendingLaunch
          top={hasCoach ? TUTORIAL_CONTENT_TOP : HOME_TOP_BAR_CLEARANCE + (skyRockets.length > 0 ? HOME_SKY_ROW_HEIGHT : 0)}
        />
      )}

      <FrameSlot name="bottom">
        <HomeBottomBar
          runs={missionRuns}
          selectedIndex={selectedRun}
          onSelect={setSelectedRunIndex}
          onResume={run => onResumeRun?.(run)}
          subsurface={subsurface}
          onSurface={() => setSubsurface(false)}
          showMarket={shell?.showMarket ?? false}
          marketOpen={shell?.marketOpen ?? false}
          menuOpen={shell?.menuOpen ?? false}
          onMarket={() => shell?.onMarket()}
          onMenu={() => shell?.onMenu()}
        />
      </FrameSlot>
    </div>
  )
}
