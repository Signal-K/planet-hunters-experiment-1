'use client'

import { firedAlertCount } from '@/lib/systems/MarketplaceSystem'
import { captureGameEvent } from '@/lib/posthog'
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Player, Screen } from '@/game-context'
import ActionConfirmBar from '@/components/game/ActionConfirmBar'
import { awaitingStorageSilo } from '@/lib/systems/AgencyOnboardingSystem'
import { Scene } from '@/lib/engine/Scene'
import type { EntityData } from '@/lib/engine/types'
import { buildPlotEntities } from '@/lib/engine/prefabs'
import { readComponentNumber } from '@/lib/engine/registry'
import { BaseLayerScene } from '@/components/game/hub/BaseLayerScene'
import { BaseWorldCanvas } from '@/components/game/hub/BaseWorldCanvas'
import { sanitizeEarthBiome } from '@/lib/scene/base-world'
import { BaseDock } from '@/components/game/hub/BaseDock'
import { liveEventWeek } from '@/lib/research/event-week'
import { BaseMenuSheet, type BaseMenuItem } from '@/components/game/hub/BaseMenuSheet'
import { HubClockWidget } from '@/components/game/hub/HubClockWidget'
import { useBaseCamera } from '@/lib/hooks/useBaseCamera'
import { useBaseSeason, useTimeOfDay } from '@/lib/hooks/useTimeOfDay'
import { EarthBaseModules, EARTH_BASE_STRUCTURE_SIZES, structureCenterPercent, structureWidthPct } from '@/components/game/hub/EarthBaseModules'
import { RocketRollout } from '@/components/game/hub/RocketRollout'
import { consumeRocketRolloutPending } from '@/lib/rocket-rollout'
export { EARTH_BASE_STRUCTURE_SIZES } from '@/components/game/hub/EarthBaseModules'
import { HubSubsurfaceView } from '@/components/game/hub/HubSubsurfaceView'
import { Building } from '@/components/game/hub/Building'
import { SiteMarker } from '@/components/game/hub/SiteMarker'
import { STRIP_W, displaySite, homeCenter, homeSite, kitScale, siteById, structureSprite, units } from '@/lib/scene/base-site'
import type { BuildingCallout } from '@/components/game/hub/Building'
import { BUILDING_LEVEL_EFFECTS, BUILDING_NAMES, MAX_BUILDING_LEVEL, type SubsurfaceRoomId, type UpgradableBuildingId, buildingLevel, isUpgradableBuilding, upgradeCost } from '@/lib/data'
import { formatCurrency } from '@/lib/format'
import { StashChip } from '@/components/game/hub/StashChip'
import type { HubBuildingDef } from '@/components/game/hub/EarthBaseModules'
import { OrbitalInstrumentNetwork } from '@/components/game/hub/OrbitalInstrumentNetwork'
import { useInstrumentSignals } from '@/lib/hooks/useInstrumentSignals'
import { economyArrivalSummary } from '@/lib/systems/EconomyArrival'
import { HUB_PROMPT_TRANSIT_TELESCOPE, isHubPromptDismissed, type HubPromptKey } from '@/lib/hub-prompts'
import { openFriends, openSettings } from '@/lib/mining/openChrome'
import layoutStyles from '@/components/game/hub/HubLayout.module.css'
import { sceneXPercent } from '@/lib/scene/terrain-kit'
import { isUnderConstruction } from '@/lib/systems/HubConstructionSystem'
import { missionResumeScreen } from '@/lib/mission-resume'
import { SCENE_NAMES } from '@/lib/ui-strings'
import SkyEventChip from '@/components/game/SkyEventChip'
import { BaseConstellations } from '@/components/game/hub/BaseConstellations'

function hubQuery(): URLSearchParams {
  return new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
}

const BASE_SCENE_KINDS = new Set(['launchpad', 'hangar', 'market', 'control-station'])

/**
 * How far a building's status pill hangs below the ground line. `Building`
 * renders [invisible hit spacer, pill] as a bottom-anchored column, so this is
 * the pill's own height plus its gap — set so the visible building base lands
 * on the ground line. The dock-clearance measurement above depends on it.
 */
// Instantiated from the build-plot prefab rather than written out by hand.
// This same list previously existed in four places (both hub scene files and
// both screens); the prefab is the one definition and a test asserts it still
// reproduces hub.scene.json exactly.
const DEFAULT_PLOTS: EntityData[] = buildPlotEntities()

export interface HubBuildOption {
  id: string
  name: string
  cost: string
  affordable: boolean
  /** Why it cannot be placed right now, when it cannot. */
  reason?: string
}

interface HubScreenProps {
  player: Player
  onBuild?: () => void
  /** Open straight into placement (the Build screen is this scene in placement mode). */
  placementMode?: boolean
  /** Unlocked, not yet placed structures offered while placing. */
  buildOptions?: HubBuildOption[]
  /** Places a structure on a plot. Returns false when it could not be placed. */
  onPlaceStructure?: (id: string, plot: number) => boolean
  rocketVariant?: HubBuildingDef['rocketVariant']
  onboardingActive?: boolean
  coachVisible?: boolean
  onFocusBuilding: (b: string) => void
  onOpenScene: (s: Screen) => void
  onDismissHubPrompt?: (key: HubPromptKey) => void
  onUpgradeBuilding?: (id: string) => void
  onExcavateSubsurface?: () => void
  onExcavateSubsurfaceUnavailable?: () => void
  onBuildSubsurfaceRoom?: (roomId: SubsurfaceRoomId) => void
  onFocusResources?: (label: string, minerals: Record<string, number>) => void
  onOpenMarket?: () => void
  /** Clears the welcome-back market note once read. */
  onDismissEconomyArrival?: () => void
  onOpenEvents?: () => void
  subsurface?: boolean
  /** SSL-553: the rocket is touching down on the pad after the trip home. */
  padLanding?: boolean
  /** SSL-553: back from a run: core stage on the pad, no craft chip. */
  homecoming?: boolean
  onSubsurfaceChange?: (v: boolean) => void
}

export default function HubScreen({ player, onBuild, placementMode = false, buildOptions = [], onPlaceStructure, rocketVariant = 'explorer', onboardingActive, coachVisible, onFocusBuilding, onOpenScene, onDismissHubPrompt, onFocusResources, onOpenMarket, onDismissEconomyArrival, onOpenEvents, onUpgradeBuilding, onExcavateSubsurface, onExcavateSubsurfaceUnavailable, onBuildSubsurfaceRoom, subsurface = false, onSubsurfaceChange, padLanding = false, homecoming = false }: HubScreenProps) {
  const { phase: skyPhase, grade: skyGrade } = useTimeOfDay()
  const skySeason = useBaseSeason()
  // Kit scale and strip width from the shared site map: the world is the 520-unit strip, the camera pans along it
  // and starts centred on the pad site, which is where a fresh base asks for its first structure.
  const [viewSize, setViewSize] = useState(() => (typeof window === 'undefined' ? { w: 1440, h: 900 } : { w: window.innerWidth, h: window.innerHeight }))
  const px = kitScale(viewSize)
  const worldW = STRIP_W * px
  const builtKinds = player.placed ?? []
  const camera = useBaseCamera({ worldWidth: worldW, homeX: homeCenter(builtKinds, viewSize.w / px) * px })
  const cameraTravel = Math.max(0, worldW * camera.cam.zoom - viewSize.w)
  const overviewPosition = cameraTravel === 0 ? 0 : Math.max(0, Math.min(1, -camera.cam.x / cameraTravel))
  const moveBase = (delta: number) => camera.setPosition(overviewPosition + delta)
  const [editMode, setEditMode] = useState(placementMode)
  const [pickedBuild, setPickedBuild] = useState<string | null>(null)
  const [placeNote, setPlaceNote] = useState<string | null>(null)
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  // Hub-only UI state is addressable by URL (`/game/hub?menu=1`, `?building=hangar`) so tooling can
  // deep-link to it. Client-only screen, so reading location during init is safe.
  const [menuOpen, setMenuOpen] = useState(() => hubQuery().has('menu'))
  const [activeBuilding, setActiveBuilding] = useState<string | null>(() => hubQuery().get('building'))
  const [rollingOut, setRollingOut] = useState(() => consumeRocketRolloutPending())
  const finishRollout = useCallback(() => setRollingOut(false), [])
  const selectedStagedRocket = player.stagedRockets?.find(rocket => rocket.id === player.selectedStagedRocketId)
  const stagedRocketOnPad = selectedStagedRocket?.location === 'launchpad'
  const stagedRocketInHangar = selectedStagedRocket?.location === 'hangar'
  // Pending launch only says a vehicle has been assigned. Its physical location decides whether the pad is occupied.
  // Rollout draws its own rocket while it is moving from the hangar.
  // An active mission is not a physical vehicle. The pad is occupied only by
  // an explicitly staged rocket (or by the short landing/homecoming scene).
  const rocketOnPad = padLanding || (stagedRocketOnPad && !rollingOut)
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

  // Each placed structure stands on its home site; the plot index only records the save slot.
  const plotStyles: React.CSSProperties[] = sortedEntities
    .map(e => {
      const plot = readComponentNumber(e, 'BuildPlot', 'index', 0)
      const kind = Object.entries(effectivePlots).find(([, index]) => index === plot)?.[0]
      const authoredSite = kind ? homeSite(kind) : null
      const site = authoredSite ? displaySite(authoredSite) : null
      const sprite = kind ? structureSprite(kind) : null
      if (!site) {
        const widthPct = kind ? structureWidthPct(kind, isUpgradableBuilding(kind) ? buildingLevel(player, kind) : 1) : 0
        const center = kind ? structureCenterPercent(kind, e.transform.position.x, widthPct) : sceneXPercent(e.transform.position.x, widthPct)
        return { left: `${center}%`, width: `${widthPct}%`, minWidth: 44, bottom: 'var(--hub-ground)', transform: 'translateX(-50%)' } as React.CSSProperties
      }
      return ({
        left: units(site.x),
        width: units(sprite?.body ?? site.half * 2),
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

  const BUILDING_W: Record<string, number> = { launchpad: 84, market: 92, 'control-station': 52, 'surface-silo': 52, refinery: 70, 'deep-space-telescope': 72, 'astronaut-academy': 74, command: 72 }
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
  const HIT_H: Record<string, number> = { launchpad: 260, 'control-station': 100, 'surface-silo': 70, refinery: 60, 'deep-space-telescope': 60, 'astronaut-academy': 60, command: 60 }
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
  const sceneBuildings: HubBuildingDef[] = hubBuildings.filter(building => BASE_SCENE_KINDS.has(building.kind))
  // The launchpad speaks only while the Base has no live run. Progression is
  // now exposed through contextual buildings and the persistent chrome rather
  // than a generic card laid over the landscape.
  // After the first run the launchpad offers the space telescope, the one
  // prompt that used to live on a Home card. It is dismissible and goes away
  // once the satellite has launched.
  const hasControlStation = placed.includes('control-station')
  const offersTransitTelescope = !onboardingActive && !coachVisible && !player.activeMission && player.missionsDone > 0
    && !!player.freeOperations && !player.transitSatelliteLaunchedAt
    && !isHubPromptDismissed(player, HUB_PROMPT_TRANSIT_TELESCOPE)
  const launchpadCallout: BuildingCallout | undefined = offersTransitTelescope && !hasControlStation
    ? {
      title: 'Build a control station',
      body: 'Satellites and telescopes are run from a control station. Build one before you launch.',
      cta: 'Build',
      placement: 'viewport-clear',
      onCta: () => onBuild?.(),
      onDismiss: onDismissHubPrompt ? () => onDismissHubPrompt(HUB_PROMPT_TRANSIT_TELESCOPE) : undefined,
    }
    : offersTransitTelescope
    ? {
      title: 'Launch a space telescope',
      body: 'Your program can put a telescope in orbit. It sends back planet candidates to review.',
      cta: 'Open the tower',
      // The pad is tall: a bubble anchored to it ran off the top of the screen. Sit it in open sky instead.
      placement: 'viewport-clear',
      onCta: () => onOpenScene('launchpad'),
      onDismiss: onDismissHubPrompt ? () => onDismissHubPrompt(HUB_PROMPT_TRANSIT_TELESCOPE) : undefined,
    }
    : undefined

  // Welcome back: the daily board moved while the player was away. It speaks
  // from the Exchange when there is one, otherwise from a quiet launchpad.
  const arrival = player.economyArrival
  const economyCallout: BuildingCallout | undefined = arrival && !onboardingActive && !coachVisible && onDismissEconomyArrival
    ? {
      title: 'Welcome back',
      body: economyArrivalSummary(arrival),
      cta: 'Open Market',
      placement: 'viewport-clear',
      onCta: () => { onDismissEconomyArrival(); onOpenMarket?.() },
      onDismiss: onDismissEconomyArrival,
    }
    : undefined
  const economyCalloutAt = !economyCallout ? null : placed.includes('market') ? 'market' : launchpadCallout ? null : 'launchpad'

  // One sky control for the craft: flying, arrived and waiting on the pad.
  const skyCraft: { state: 'mining' | 'arrived' | 'transit' | 'waiting'; label: string; ariaLabel: string; onOpen: () => void } | null = (() => {
    if (padLanding || homecoming) return null
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
    if (stagedRocketOnPad) {
      return { state: 'waiting', label: 'CRAFT ON PAD', ariaLabel: 'Open the tower: craft waiting on the pad', onOpen: () => onOpenScene('launchpad') }
    }
    if (stagedRocketInHangar) {
      return { state: 'waiting', label: 'CRAFT IN HANGAR', ariaLabel: 'Open Hangar: vehicle assigned to the mission', onOpen: () => onOpenScene('hangar') }
    }
    return null
  })()
  const showStorageSiloCta = !player.activeMission && awaitingStorageSilo(player) && !subsurface
  const structureProps = (kind: string) => {
    if (kind === 'launchpad') {
      return {
        kind, label: 'Launchpad',
        sub: player.activeMission ? 'IN FLIGHT' : stagedRocketInHangar ? 'VEHICLE IN HANGAR' : stagedRocketOnPad ? 'CRAFT ON PAD' : 'READY',
        status: (player.activeMission || stagedRocketInHangar ? 'warn' : 'ok') as 'ok' | 'warn',
        hot: stagedRocketOnPad,
        // Match the rendered mobile footprint of the authored sprite. The
        // taller hit area below covers the gantry without creating an
        // oversized box that shifts the building label away from the structure.
        w: BUILDING_W.launchpad,
        callout: menuOpen || editMode ? undefined : launchpadCallout ?? (economyCalloutAt === 'launchpad' ? economyCallout : undefined),
        onClick: () => onFocusBuilding('launchpad'),
      }
    }
    if (kind === 'control-station') {
      return {
        kind, label: 'Control station',
        sub: 'TELESCOPES',
        status: 'ok' as const,
        w: 60,
        onClick: () => onFocusBuilding('control-station'),
      }
    }
    if (kind === 'market') {
      return {
        kind, label: 'Exchange',
        sub: 'SELL ORE',
        status: 'ok' as const,
        w: 150,
        callout: menuOpen || editMode || economyCalloutAt !== 'market' ? undefined : economyCallout,
        onClick: () => onFocusBuilding('market'),
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
    return {
      kind, label: kind,
      sub: 'BUILT',
      status: 'info' as const,
      w: 78,
      onClick: () => onFocusBuilding(kind),
    }
  }

  // The surface tracks its own size so the kit scale follows the real viewport (rotation, split view).
  useEffect(() => {
    const el = surfaceRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setViewSize(prev => (prev.w === width && prev.h === height ? prev : { w: width, h: height }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!editMode) return
    if (!pickedBuild || !buildOptions.some(o => o.id === pickedBuild)) setPickedBuild(buildOptions.find(o => o.affordable)?.id ?? buildOptions[0]?.id ?? null)
  }, [editMode, buildOptions, pickedBuild])

  const underground = pickedBuild === 'surface-silo'
  // The one site the picked build may stand on, offered only while it is free.
  const authoredPickedSite = editMode && pickedBuild ? homeSite(pickedBuild) : null
  const pickedSite = authoredPickedSite ? displaySite(authoredPickedSite) : null
  const pickedOption = buildOptions.find(o => o.id === pickedBuild)
  const pickedSiteFree = !!pickedSite && pickedSite.plot != null && !placed.includes(pickedBuild ?? '') && !Object.values(effectivePlots).includes(pickedSite.plot)
  const placeOnPlot = (plot: number) => {
    const option = buildOptions.find(o => o.id === pickedBuild)
    if (!option || !onPlaceStructure) return
    if (!option.affordable) {
      setPlaceNote(`${option.name} · ${option.reason ?? 'Not enough resources'}`)
      captureGameEvent('structure_placement_blocked', { structure_kind: option.id, reason: 'unaffordable', detail: option.reason ?? null })
      return
    }
    if (onPlaceStructure(option.id, plot)) { setPlaceNote(null); setEditMode(placementMode) } else {
      setPlaceNote('That slot is taken or locked. Try another slot.')
      captureGameEvent('structure_placement_blocked', { structure_kind: option.id, reason: 'slot_unavailable', plot })
    }
  }


  // The three things a player does from the base come first (build, fly, sell), then the places to look things up.
  const ownsOrbitalInstrument = !!player.transitSatelliteLaunchedAt
    || player.deepSpaceTelescopeBuilt
    || !!player.deepSpaceTelescopeLaunchedAt
    || !!player.saturnImagerLaunchedAt
  const liveSkyEvent = liveEventWeek(Date.now())
  const menuItems: BaseMenuItem[] = [
    { id: 'build', icon: 'build', primary: true, label: 'Build', detail: 'New structures, a control station, satellites', onSelect: () => { setPlaceNote(null); setEditMode(true) } },
    { id: 'contracts', icon: 'mission', primary: true, label: 'New mission', detail: 'Client contracts and free runs', onSelect: () => onOpenScene('missions') },
    { id: 'market', icon: 'market', primary: true, label: 'Marketplace', detail: firedAlertCount(player) > 0 ? `${firedAlertCount(player)} price alert${firedAlertCount(player) === 1 ? '' : 's'} hit` : player.placed.includes('market') ? 'Spot prices, sell, buy and alerts' : 'Spot prices and selling', onSelect: () => { if (onOpenMarket) onOpenMarket() } },
    { id: 'subsurface', icon: 'subsurface', label: 'Subsurface', detail: 'Excavate below the base and build underground rooms', onSelect: () => setSubsurface(true) },
    ...(
      hasControlStation || ownsOrbitalInstrument
        ? [{ id: 'control-station', icon: 'station' as const, label: hasControlStation ? 'Control station' : 'Instruments', detail: 'Satellites, telescopes and their feeds', onSelect: () => onOpenScene('instrument-hub') }]
        : []
    ),
    { id: 'community-research', icon: 'research', label: 'Community research', detail: liveSkyEvent ? `${liveSkyEvent.name} week, shared with every player` : 'Daily stamps and the shared monthly goal', onSelect: () => onOpenScene('community-research') },
    { id: 'mission-log', icon: 'log', label: 'Mission log', detail: 'Past runs and what they paid', onSelect: () => onOpenScene('mission-history') },
    { id: 'ledger', icon: 'log', label: 'Narrative ledger', detail: 'What is live, adapting and planned', onSelect: () => onOpenScene('narrative-ledger') },
    { id: 'friends', icon: 'friends', label: 'Friends', detail: 'Callsign, requests, gifts and visits', onSelect: openFriends },
    { id: 'settings', icon: 'settings', label: 'Settings', detail: 'Sound, display and account', onSelect: openSettings },
  ]

  return (
    <div className={`${layoutStyles.root} theme-blueprint`} data-screen="hub" data-pad-landing={padLanding ? 'true' : undefined} data-time={skyGrade} data-season={skySeason} data-kit-scale={px} aria-label={SCENE_NAMES.base} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', '--px': `${px}px` } as React.CSSProperties}>

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
          inert={subsurface ? true : undefined}
          aria-hidden={subsurface ? true : undefined}
          ref={node => { camera.ref.current = node; surfaceRef.current = node }}
          data-testid="base-camera"
          data-zoom={camera.cam.zoom.toFixed(2)}
          {...camera.handlers}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', overflow: 'hidden', touchAction: 'none' }}
        >
          {/* The world itself: sky, steppe, paved ground, weather and sky events as game objects, behind the camera's DOM layer. */}
          <div data-testid="base-camera-world" data-world-width={worldW} style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: worldW, transformOrigin: '0 0', transform: camera.transform, willChange: 'transform' }}>
          <BaseWorldCanvas px={px} camera={{ x: 0, y: 0, zoom: 1 }} time={skyGrade} biome={sanitizeEarthBiome(player.earthBiome)} />
          <BaseConstellations player={player} visible={skyGrade === 'night' || skyGrade === 'dusk' || skyGrade === 'dawn'} />
          {/* Silo surface pieces on the strip. */}
          <BaseLayerScene
            siloBuilt={!!player.subsurfaceExcavated || (player.subsurfaceBuilt ?? []).length > 0}
            operationsOnline={(player.placed ?? []).includes('launchpad')}
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
          <EarthBaseModules buildings={sceneBuildings} parts={player.shipCustomizerParts} padRocket={padLanding || homecoming ? 'core' : rocketOnPad} />
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
                if (!kind) return null
                const startedAt = player.underConstruction?.[kind]
                const building = isUnderConstruction(startedAt, kind)
                  ? { ...structureProps(kind), status: 'building' as const, buildStartedAt: startedAt }
                  : structureProps(kind)
                // Outer plots open their callout inward so a 208px bubble
                // can't run off the edge of the scene.
                const authoredSite = homeSite(kind)
                const xFrac = (authoredSite ? displaySite(authoredSite).x : STRIP_W / 2) / STRIP_W
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
              {pickedSite && pickedSiteFree && !underground && onPlaceStructure && (
                <SiteMarker site={pickedSite} label={pickedOption?.name ?? pickedSite.label} onPlace={() => placeOnPlot(pickedSite.plot ?? 0)} />
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

      {!subsurface && <SkyEventChip surface="base" badgeTier={player.badges?.['orionids-2026']?.tier ?? null} orionidsRead={Boolean(player.fireballSpotter?.passedAt)} onParticipate={onOpenEvents} playerLocation={player.skyEventLocation} />}

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
              <HubClockWidget />
            </div>
          )}
          {!subsurface && (
            <div className={layoutStyles.chips}>
              <span className="scene-chip" data-testid="hub-francs-chip">{formatCurrency(player.francs, { compact: true })}</span>
              <StashChip testId="hub-cargo-chip" />
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

      {editMode && onPlaceStructure && (
        <div className={layoutStyles.buildPicker} data-testid="build-picker">
          {placeNote && <span data-testid="hub-place-note" style={{ pointerEvents: 'auto', padding: '6px 12px', borderRadius: 999, border: '2px solid var(--ln-world-outline)', background: 'var(--ln-world-hull-lit)', color: 'var(--ln-world-outline)', font: '700 14px/1.2 var(--ln-font-display)' }}>{placeNote}</span>}
          {underground && pickedSiteFree && (
            <button type="button" data-testid="build-place-underground" onClick={() => placeOnPlot(siteById('shaft').plot ?? 2)}
              style={{ pointerEvents: 'auto', minHeight: 44, padding: '0 18px', borderRadius: 999, cursor: 'pointer', border: '2px solid var(--ln-world-outline)', background: 'var(--ln-world-hull-lit)', color: 'var(--ln-world-outline)', font: '700 14px/1 var(--ln-font-display)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Place silo
            </button>
          )}
          {buildOptions.length === 1 && pickedSiteFree && !underground && !placeNote
            ? null
            : buildOptions.length === 0
            ? <span style={{ pointerEvents: 'auto', padding: '8px 14px', borderRadius: 999, border: '2px solid var(--ln-world-outline)', background: 'var(--ln-world-hull-lit)', color: 'var(--ln-world-outline)', font: '700 14px/1.2 var(--ln-font-display)' }}>Nothing to build yet</span>
            : (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', maxWidth: '100%', pointerEvents: 'auto' }}>
                {buildOptions.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    data-testid={`build-option-${option.id}`}
                    aria-pressed={pickedBuild === option.id}
                    onClick={() => { setPickedBuild(option.id); setPlaceNote(option.affordable ? null : `${option.name} · ${option.reason ?? 'Not enough resources'}`) }}
                    style={{
                      minHeight: 44, padding: '0 16px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
                      border: '2px solid var(--ln-world-outline)',
                      background: pickedBuild === option.id ? 'var(--ln-world-outline)' : 'var(--ln-world-hull-lit)',
                      color: pickedBuild === option.id ? 'var(--ln-world-hull-lit)' : 'var(--ln-world-outline)',
                      opacity: option.affordable ? 1 : 0.7,
                      font: '700 14px/1 var(--ln-font-display)', letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}
                  >
                    {option.name} · {option.cost}
                  </button>
                ))}
              </div>
            )}
        </div>
      )}

      {/* The surface dock is reserved for all-scene navigation only. Base-only
          actions remain on their physical buildings or in their own surfaces. */}
      {/* The delivery sheet of a homecoming covers the dock, so it is not drawn under it (it would only be an inert, overlapped control). */}
      {!homecoming && (
        <div className="hub-bottom-dock" style={{
          position: 'absolute', left: 0, right: 0, bottom: 8, zIndex: subsurface ? 40 : 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none',
        }}>
          <div style={{ pointerEvents: 'auto' }}>
            <BaseDock
              onPrev={() => moveBase(-0.22)}
              onNext={() => moveBase(0.22)}
              onBuild={() => { setPlaceNote(null); setEditMode(value => !value) }}
              onMission={!subsurface && !editMode && !player.activeMission && !player.pendingLaunch ? () => onOpenScene('missions') : undefined}
              onSubsurface={() => setSubsurface(!subsurface)}
              subsurface={subsurface}
              onHub={() => setMenuOpen(true)}
              locationLabel="Earth"
              locationNavigationDisabled={false}
              showLocationBuild={buildOptions.length > 0}
              buildLabel={editMode ? 'Done' : 'Build'}
              buildTestId={editMode ? 'hub-build-done-btn' : 'hub-build-btn'}
            />
          </div>
        </div>
      )}
      {menuOpen && (
        <BaseMenuSheet onClose={() => setMenuOpen(false)} items={menuItems} />
      )}
    </div>
  )
}
