'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { Player, Screen } from '@/game-context'
import ActionConfirmBar from '@/components/game/ActionConfirmBar'
import { Scene } from '@/lib/engine/Scene'
import type { EntityData } from '@/lib/engine/types'
import { buildPlotEntities } from '@/lib/engine/prefabs'
import { readComponentNumber } from '@/lib/engine/registry'
import { BaseLayerScene } from '@/components/game/hub/BaseLayerScene'
import { BaseWorldCanvas } from '@/components/game/hub/BaseWorldCanvas'
import { sanitizeEarthBiome } from '@/lib/scene/base-world'
import { BaseDock, } from '@/components/game/hub/BaseDock'
import { liveEventWeek } from '@/lib/research/event-week'
import { BaseMenuSheet, type BaseMenuItem } from '@/components/game/hub/BaseMenuSheet'
import { HubClockWidget } from '@/components/game/hub/HubClockWidget'
import { useBaseCamera } from '@/lib/hooks/useBaseCamera'
import { useBaseSeason, useTimeOfDay } from '@/lib/hooks/useTimeOfDay'
import { EarthBaseModules, EARTH_BASE_STRUCTURE_SIZES, structureCenterPercent, structureWidthPct } from '@/components/game/hub/EarthBaseModules'
import { RocketRollout } from '@/components/game/hub/RocketRollout'
import { consumeRocketRolloutPending } from '@/lib/rocket-rollout'
export { EARTH_BASE_STRUCTURE_SIZES } from '@/components/game/hub/EarthBaseModules'
import { surfaceSiloCapacity } from '@/components/game/hub/SurfaceSiloPanel'
import { Building } from '@/components/game/hub/Building'
import { isGroundTelescopeId } from '@/lib/systems/InstrumentFeedSystem'
import { AnnexStructures } from '@/components/game/hub/AnnexStructures'
import { GROUND, STRIP_W, displaySite, homeCenter, placedAnnex, homeSite, kitScale, structureSprite, units } from '@/lib/scene/base-site'
import type { BuildingCallout } from '@/components/game/hub/Building'
import { buildingLevel, isUpgradableBuilding, } from '@/lib/data'
import { PAD_LAUNCHES_BETWEEN_SERVICE, PAD_SERVICE_COST, padNeedsService } from '@/lib/data/building-levels'
import { formatCurrency } from '@/lib/format'
import type { HubBuildingDef } from '@/components/game/hub/EarthBaseModules'
import { SkyCraft, type SkyCraftItem } from '@/components/game/hub/SkyCraft'
import { onlineTelescopes, pointedThisWeek, telescopesNeedingPointing, type InstrumentPointing } from '@/lib/research/paths'
import { useInstrumentSignals } from '@/lib/hooks/useInstrumentSignals'
import { HUB_PROMPT_POINT_TELESCOPE, HUB_PROMPT_TRANSIT_TELESCOPE, isHubPromptDismissed, signalPromptKey, type HubPromptKey } from '@/lib/hub-prompts'
import { openFriends, openSettings } from '@/lib/mining/openChrome'
import layoutStyles from '@/components/game/hub/HubLayout.module.css'
import { sceneXPercent } from '@/lib/scene/terrain-kit'
import { isUnderConstruction } from '@/lib/systems/HubConstructionSystem'
import { currentTrainingTry } from '@/lib/systems/FlightPlanSystem'
import { missionResumeScreen } from '@/lib/mission-resume'
import { SCENE_NAMES } from '@/lib/ui-strings'
import SkyEventChip from '@/components/game/SkyEventChip'
import DataReadyChip from '../DataReadyChip'
import PanHint from '../PanHint'
import CommunityGoalChip from '@/components/game/CommunityGoalChip'
import type { CommunityResearch } from '@/lib/research/stamps'
import { orionidsSkyOn } from '@/lib/orionids/access'
import { BaseConstellations } from '@/components/game/hub/BaseConstellations'

function hubQuery(): URLSearchParams {
  return new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
}

const BASE_SCENE_KINDS = new Set(['launchpad', 'hangar', 'control-station', 'surface-silo'])

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

const TELESCOPE_NAMES: Record<InstrumentPointing, string> = { transit: 'space telescope', 'deep-space': 'ground telescope', saturn: 'Saturn orbiter' }

interface HubScreenProps {
  nextFlight?: (onService: () => void) => React.ReactNode
  player: Player
  rocketVariant?: HubBuildingDef['rocketVariant']
  onboardingActive?: boolean
  coachVisible?: boolean
  onFocusBuilding: (b: string) => void
  onOpenScene: (s: Screen) => void
  /** Opens the whole-sky pointing view on one telescope. */
  onPointTelescope?: (instrument: InstrumentPointing) => void
  onDismissHubPrompt?: (key: HubPromptKey) => void
  onServiceLaunchpad?: () => void
  onOpenEvents?: (eventId?: string) => void
  communityResearch?: CommunityResearch | null
  onOpenCommunity?: () => void
  /** SSL-553: the rocket is touching down on the pad after the trip home. */
  padLanding?: boolean
  /** SSL-553: back from a run: core stage on the pad, no craft chip. */
  homecoming?: boolean
}

export default function HubScreen({ nextFlight, player, rocketVariant = 'explorer', onboardingActive, coachVisible, onFocusBuilding, onOpenScene, onPointTelescope, onDismissHubPrompt, onOpenEvents, communityResearch, onOpenCommunity, onServiceLaunchpad, padLanding = false, homecoming = false }: HubScreenProps) {
  const { grade: skyGrade } = useTimeOfDay()
  const skySeason = useBaseSeason()
  // Kit scale and strip width from the shared site map: the world is the 520-unit strip, the camera pans along it
  // and starts centred on the pad site, which is where a fresh base asks for its first structure.
  const [viewSize, setViewSize] = useState(() => (typeof window === 'undefined' ? { w: 1440, h: 900 } : { w: window.innerWidth, h: window.innerHeight }))
  // Phones keep the Base still (SSL-787): no pan, pinch or overview slider. Portrait picks the kit scale (1 to 2) that
  // fills the width with everything built; landscape already fits (kitScale caps it at width / 460).
  const phoneView = viewSize.w < 600 || viewSize.h < 500
  const arrangement = null
  const standingKinds = (player.placed ?? []).includes('launchpad') && !(player.placed ?? []).includes('control-station')
    ? [...(player.placed ?? []), 'control-station']
    : (player.placed ?? [])
  const fullPx = kitScale(viewSize)
  const portraitPhone = phoneView && viewSize.w < 600 && viewSize.h > viewSize.w
  // Portrait phones draw the Base at the full phone kit scale (2), so the structures stand tall, and the camera pans
  // along the strip (drag), starting on the pad. Four structures no longer fit across 390pt at that size.
  const px = portraitPhone ? 2 : fullPx
  // Portrait phones are tall: the sky would take 70% of the screen, so the ground line (and everything standing on it) rises.
  // SSL-834 (Liam, 13.11): the row of structures stands nearer the middle of the screen, not along the bottom. The
  // painted ground line and the DOM structures' --hub-ground rise by the same share so the buildings stay on the apron.
  const BASE_ROW_LIFT = 0.12
  const groundLine = portraitPhone ? 0.46 : GROUND.lineFromBottom + BASE_ROW_LIFT
  const worldW = STRIP_W * px
  const camera = useBaseCamera({ worldWidth: worldW, homeX: homeCenter(standingKinds, viewSize.w / px, arrangement, player.placementPlots) * px, locked: phoneView && !portraitPhone, portraitZoom: !portraitPhone })
  const cameraTravel = Math.max(0, worldW * camera.cam.zoom - viewSize.w)
  const overviewPosition = cameraTravel === 0 ? 0 : Math.max(0, Math.min(1, -camera.cam.x / cameraTravel))
  const moveBase = (delta: number) => camera.setPosition(overviewPosition + delta)
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
  const [servicingPad, setServicingPad] = useState(false)
  const { signals } = useInstrumentSignals(player)
  const asteroidQueueCount = signals.filter(signal => signal.kind === 'deep-space').length
  const placed = player.placed ?? []
  const placementPlots = player.placementPlots ?? {}
  const legacyPlaced = (kind: string) => placed.includes(kind) && placementPlots[kind] == null
  // Pre-placementPlots saves always went through the guided tutorial, which
  // coaches the player to the first build pad (data-coach-id="build-plot-0"
  // in BuildPlaceScreen) — plot 0, not 1.
  // A kind with a home site always stands on that site's plot, whatever slot
  // an older save recorded: skipping the tutorial stored the Launchpad on
  // plot 1, the Exchange's site, which hid the Exchange's place marker.
  const agencyLandmark = placed.includes('launchpad') && !placed.includes('control-station')
  const effectivePlots: Record<string, number> = Object.fromEntries(
    Object.entries({
      ...placementPlots,
      ...(legacyPlaced('launchpad') ? { launchpad: 0 } : {}),
      // SSL-675: the agency's control station stands on the Base from the first launchpad as a landmark, so the
      // Base is not an empty plain. It is display-only: nothing is placed or unlocked until the player builds
      // their own on this same site. Drawn as the line-art agency building (SSL-785).
      ...(agencyLandmark ? { 'control-station': homeSite('control-station')?.plot ?? 3 } : {}),
    })
      .map(([kind, plot]): [string, number] => [kind, homeSite(kind)?.plot ?? plot])
      // Kinds on their own site come first, so they win a plot an older off-site kind still claims.
      .sort(([a], [b]) => Number(homeSite(b)?.plot != null) - Number(homeSite(a)?.plot != null)),
  )
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
      const authoredSite = kind ? homeSite(kind, arrangement) : null
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
  const padLevel = buildingLevel(player, 'launchpad')
  const padWorn = padNeedsService(player)
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
      status: isUnderConstruction(startedAt, kind, undefined, padLevel) ? ('building' as const) : ('ok' as const),
      padLevel,
      dimmed: isDimmedBuildingKind(kind),
      landmark: kind === 'control-station' && agencyLandmark,
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
  const launchpadCallout: BuildingCallout | undefined = offersTransitTelescope
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

  // The sky speaks for the citizen science tools: a telescope that needs positioning, or one with data ready to
  // classify. It opens the tool. Pointing comes first because a pointed telescope is what brings the data.
  const needsPointing = telescopesNeedingPointing(player, Date.now())
  const alreadyPointed = pointedThisWeek(player.telescopeAim, Date.now())
  const pointedNames = alreadyPointed.map(id => TELESCOPE_NAMES[id])
  const stationQuiet = !onboardingActive && !coachVisible && !player.activeMission
  const stationCallout: BuildingCallout | undefined = !stationQuiet ? undefined
    : needsPointing.length > 0 && onPointTelescope && !isHubPromptDismissed(player, HUB_PROMPT_POINT_TELESCOPE)
    ? {
      title: `Point the ${TELESCOPE_NAMES[needsPointing[0]]}`,
      body: pointedNames.length
        ? `Your ${pointedNames.join(' and ')} ${pointedNames.length === 1 ? 'is' : 'are'} pointed. This one has no target this week yet.`
        : 'It has no target this week. Aim it at any part of the sky and map it.',
      cta: 'Point',
      placement: 'viewport-clear',
      onCta: () => onPointTelescope(needsPointing[0]),
      onDismiss: onDismissHubPrompt ? () => onDismissHubPrompt(HUB_PROMPT_POINT_TELESCOPE) : undefined,
    }
    : signals.some(signal => !isHubPromptDismissed(player, signalPromptKey(signal)))
    ? {
      id: signals.map(signalPromptKey).sort().join('|'),
      title: signals.length === 1 ? '1 signal ready' : `${signals.length} signals ready`,
      body: 'Your telescopes found something. Classify it and the research moves forward.',
      cta: 'Classify',
      placement: 'viewport-clear',
      onCta: () => onOpenScene('instrument-hub'),
      onDismiss: onDismissHubPrompt ? () => signals.forEach(signal => onDismissHubPrompt(signalPromptKey(signal))) : undefined,
    }
    : undefined

  // One sky control for the craft: flying, arrived and waiting on the pad.
  const skyCraft: { state: 'mining' | 'arrived' | 'transit' | 'waiting'; label: string; ariaLabel: string; onOpen: () => void } | null = (() => {
    if (padLanding || homecoming) return null
    if (player.activeMission) {
      const resume = missionResumeScreen(player)
      const arrived = (player.missionPhase ?? 'transit') === 'transit' && resume !== 'flight'
      const state = player.missionPhase === 'mining' ? 'mining' : arrived ? 'arrived' : 'transit'
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
  const structureProps = (kind: string) => {
    if (kind === 'launchpad') {
      return {
        kind, label: 'Launchpad',
        sub: padWorn ? 'NEEDS SERVICE' : player.activeMission ? 'IN FLIGHT' : stagedRocketInHangar ? 'VEHICLE IN HANGAR' : stagedRocketOnPad ? 'CRAFT ON PAD' : 'READY',
        status: (padWorn || player.activeMission || stagedRocketInHangar ? 'warn' : 'ok') as 'ok' | 'warn',
        hot: stagedRocketOnPad,
        // Match the rendered mobile footprint of the authored sprite. The
        // taller hit area below covers the gantry without creating an
        // oversized box that shifts the building label away from the structure.
        w: BUILDING_W.launchpad,
        callout: menuOpen ? undefined : launchpadCallout,
        onClick: () => padWorn && onServiceLaunchpad ? setServicingPad(true) : onFocusBuilding('launchpad'),
      }
    }
    if (kind === 'control-station') {
      return {
        // SSL-834 (Liam, 13.11): this building is the Agency Hub. The Data hub is a panel, never a building.
        kind, label: 'Agency hub',
        sub: 'YOUR PROGRAM',
        status: 'ok' as const,
        w: 60,
        // Sky prompts share one spot in open sky, so only one speaks at a time: the pad goes first.
        callout: menuOpen || agencyLandmark || launchpadCallout ? undefined : stationCallout,
        onClick: () => onOpenScene('mission-history'),
      }
    }
    if (kind === 'surface-silo') {
      const used = Object.values(player.stash ?? {}).reduce((sum, amount) => sum + Math.max(0, amount), 0)
      return {
        kind, label: 'Surface Silo',
        sub: `${Math.min(used, surfaceSiloCapacity(player.buildingLevels))} / ${surfaceSiloCapacity(player.buildingLevels)} U`,
        status: 'ok' as const,
        w: 62,
        // The Surface Silo stands above ground: it opens its own contents
        // here. The Mineral Vault underground is a separate building.
        onClick: () => onOpenScene('surface-silo'),
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

  // The three things a player does from the base come first (build, fly, sell), then the places to look things up.
  const ownsOrbitalInstrument = !!player.transitSatelliteLaunchedAt
    || player.deepSpaceTelescopeBuilt
    || !!player.deepSpaceTelescopeLaunchedAt
    || !!player.saturnImagerLaunchedAt
  const liveSkyEvent = liveEventWeek(Date.now())
  const menuItems: BaseMenuItem[] = [
    ...(
      hasControlStation || ownsOrbitalInstrument
        ? [{ id: 'instruments', icon: 'station' as const, label: 'Data hub', detail: 'Satellites, telescopes and their feeds', onSelect: () => onOpenScene('instrument-hub') }]
        : []
    ),
    { id: 'community-research', icon: 'research', label: 'Community research', detail: liveSkyEvent ? `${liveSkyEvent.name} week, shared with every player` : 'Daily stamps and the shared monthly goal', onSelect: () => onOpenScene('community-research') },
    { id: 'ledger', icon: 'log', label: 'Narrative ledger', detail: 'What is live, adapting and planned', onSelect: () => onOpenScene('narrative-ledger') },
    { id: 'friends', icon: 'friends', label: 'Friends', detail: 'Callsign, requests, gifts and visits', onSelect: openFriends },
    { id: 'settings', icon: 'settings', label: 'Settings', detail: 'Sound, display and account', onSelect: openSettings },
  ]

  const annexStanding = placedAnnex(player)
  const dataChipShown = hasControlStation && !agencyLandmark && !onboardingActive && !player.activeMission && signals.length > 0
  // SSL-827: the Point prompt, the data-ready chip and the craft in the sky all open the same pointing screen, on the
  // telescope that still needs a target (or the one tapped). Without a pointable telescope they fall back to the Data hub.
  const pointable = onlineTelescopes(player)
  const openPointing = (preferred?: InstrumentPointing) => {
    const next = preferred && pointable.includes(preferred) ? preferred : needsPointing[0] ?? pointable[0]
    if (next && onPointTelescope) onPointTelescope(next)
    else onOpenScene('instrument-hub')
  }
  const skyCraftBase: SkyCraftItem[] = [
    ...(player.transitSatelliteLaunchedAt ? [{ id: 'transit' as const, name: 'Space telescope', needsPointing: needsPointing.includes('transit') }] : []),
    ...(player.deepSpaceTelescopeBuilt ? [{ id: 'deep-space' as const, name: 'Deep space telescope', needsPointing: needsPointing.includes('deep-space') }] : []),
  ]
  // SSL-834 (Liam, 13.11): "data ready" rides on the craft in the sky, not in a HUD pill. Each craft carries its own
  // signals; signals from an instrument with no craft overhead (the Saturn imager) ride on the first craft.
  const readyByCraft = (id: SkyCraftItem['id'], index: number) => !dataChipShown ? 0
    : signals.filter(signal => signal.kind === id || (index === 0 && !skyCraftBase.some(c => c.id === signal.kind))).length
  const skyCraftItems = skyCraftBase.map((item, index) => ({ ...item, ready: readyByCraft(item.id, index) }))
  // With no craft in the sky to carry it, the pill is the only place the data can show.
  const dataPillShown = dataChipShown && skyCraftItems.length === 0
  const orbitalNetwork = <SkyCraft craft={skyCraftItems} onPoint={openPointing} onOpenData={() => onOpenScene('instrument-hub')} />

  return (
    <div className={`${layoutStyles.root} theme-blueprint`} data-screen="hub" data-pad-landing={padLanding ? 'true' : undefined} data-time={skyGrade} data-season={skySeason} data-kit-scale={px} aria-label={SCENE_NAMES.base} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'clip', '--px': `${px}px`, ...(portraitPhone ? { '--hub-ground': '26%' } : { '--hub-ground': `${Math.round((0.2 + BASE_ROW_LIFT) * 100)}%` }) } as React.CSSProperties}>

      {/* One continuous vertical world: surface above, soil and bedrock below.
          Subsurface moves this canvas down instead of replacing the Hub with
          an overlay, so the player is travelling below the same base. */}
      <div className={layoutStyles.worldSlide}>

        {/* ─── ABOVE GROUND ─── top half of slider */}
        {/* The scene still runs full-bleed behind the translucent dock — that
            is the point of the glass treatment — but the ground line and
            everything standing on it clear the chrome, so the status pills are
            readable. 22% is the floor, for viewports tall enough not to need
            any lift at all. */}
        <div
          className={layoutStyles.surface}
          ref={node => { camera.ref.current = node; surfaceRef.current = node }}
          data-testid="base-camera"
          data-zoom={camera.cam.zoom.toFixed(2)}
          {...camera.handlers}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', overflow: 'clip', touchAction: 'none' }}
        >
          {/* The world itself: sky, steppe, paved ground, weather and sky events as game objects, behind the camera's DOM layer. */}
          <div data-testid="base-camera-world" data-world-width={worldW} style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: worldW, transformOrigin: '0 0', transform: camera.transform, willChange: 'transform' }}>
          <BaseWorldCanvas px={px} groundLine={groundLine} camera={{ x: 0, y: 0, zoom: 1 }} time={skyGrade} biome={sanitizeEarthBiome(player.earthBiome)} launchTags extraSky={orionidsSkyOn(player) ? ['meteors'] : undefined} />
          <BaseConstellations player={player} visible={skyGrade === 'night' || skyGrade === 'dusk' || skyGrade === 'dawn'} />
          {/* Silo surface pieces on the strip. */}
          <BaseLayerScene
            siloBuilt
            operationsOnline={(player.placed ?? []).includes('launchpad')}
            onOpenSilo={() => onOpenScene('surface-silo')}
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


          {/* Authored structure sprites. DOM rendering keeps the Hub legible
              in both hardware WebGL and Docker/Electron screenshot runners. */}
          <EarthBaseModules arrangement={arrangement} buildings={sceneBuildings} parts={player.shipCustomizerParts} padRocket={padLanding || homecoming ? 'core' : rocketOnPad} />
          {rollingOut && <RocketRollout onDone={finishRollout} />}
          <AnnexStructures standing={annexStanding} quiet={agencyLandmark} onOpen={kind => { if (isGroundTelescopeId(kind)) onOpenScene('instrument-hub') }} />

          {/* Surface buildings — hit areas + labels.
              zIndex 10 is load-bearing: every scene layer below is an
              absolutely-positioned sibling with an explicit z-index (sky 1,
              motes 2, Pixi 3, soil 4), and the sky is fully opaque. Without a
              z-index here this layer sits at stacking level 0 and the sky
              paints straight over the pills and callouts. It also sits above the
              structure sprites (14), or a bell or a site label slides under the art. */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 }}>
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
                const building = isUnderConstruction(startedAt, kind, undefined, padLevel)
                  ? { ...structureProps(kind), status: 'building' as const, buildStartedAt: startedAt, padLevel }
                  : structureProps(kind)
                // Outer plots open their callout inward so a 208px bubble
                // can't run off the edge of the scene.
                const authoredSite = homeSite(kind, arrangement)
                const xFrac = (authoredSite ? displaySite(authoredSite).x : STRIP_W / 2) / STRIP_W
                const calloutAlign = xFrac < 0.32 ? 'start' : xFrac > 0.68 ? 'end' : 'center'
                const silo = kind === 'surface-silo'
                // SSL-834: in Build, tapping a standing structure selects it for moving or upgrading.
                const aspect = EARTH_BASE_STRUCTURE_SIZES[kind]
                const pad = kind === 'launchpad'
                return <Building key={kind} {...building} quiet hitAspect={!pad && aspect ? `${aspect.width} / ${aspect.height}` : undefined} hitH={silo ? 72 : pad ? 260 : (HIT_H[kind] ?? 60)} active={activeBuilding === kind} disableHover={pad} onActiveChange={active => setActiveBuilding(active ? kind : null)} style={style} calloutAlign={calloutAlign} />
              })}
            </div>
          </div>
          </div>
          {/* The craft fly across the view, not the pannable world, so they cross the screen on every layout. */}
          {orbitalNetwork}
          {portraitPhone && cameraTravel > 0 && (
            <PanHint canLeft={camera.cam.x < -8} canRight={camera.cam.x > -cameraTravel + 8} onLeft={() => moveBase(-0.4)} onRight={() => moveBase(0.4)} />
          )}
        </div>

      </div>
      {/* ── End persistent Base world ── */}

      {<SkyEventChip surface="base" badgeTier={player.badges?.['orionids-2026']?.tier ?? null} orionidsRead={Boolean(player.fireballSpotter?.passedAt)} onParticipate={onOpenEvents} playerLocation={player.skyEventLocation} />}
      {dataPillShown && (
        <DataReadyChip count={signals.length} onOpen={() => openPointing()} />
      )}
      {onOpenCommunity && <CommunityGoalChip stamps={player.researchStamps} community={communityResearch} onOpen={onOpenCommunity} />}

      {/* Top HUD — always fixed above the slide. Rebuilt 2026-08-21 (KES-226)
          back to a dark scrim (the KES-220 light version was scrapped same
          day) — the persistent stacked HUD rail sits directly beneath the
        title, top-left, matching the reference's fixed left-edge rail
          rather than corner-scattered readouts. Surface and subsurface now
          share the same dark treatment; no more light/dark split. */}
      {/* SSL-834: Build hides every piece of HUD. The row stays mounted (the sync chip and inbox bell live in it), only unseen. */}
      <div className={layoutStyles.topHud}>
        <div className={layoutStyles.topRow}>
          {(
            <div className={layoutStyles.leftCluster}>
              <HubClockWidget />
            </div>
          )}
          {(
            <div className={layoutStyles.chips}>
              <span className="scene-chip" data-testid="hub-francs-chip">{formatCurrency(player.francs, { compact: true })}</span>
            </div>
          )}
          {/* The signed-in inbox bell portals here so it shares the row's padding at every breakpoint (SSL-740). */}
          {<div id="hub-top-right" className={layoutStyles.topRight} />}
        </div>
      </div>

      {servicingPad && onServiceLaunchpad && (
        <ActionConfirmBar
          eyebrow={`Level ${padLevel} launchpad`}
          title="Service the launchpad"
          description={`It has flown ${PAD_LAUNCHES_BETWEEN_SERVICE[padLevel - 1]} launches since its last service and holds new ones until it is serviced. ${player.francs < PAD_SERVICE_COST ? `Needs ${formatCurrency(PAD_SERVICE_COST - player.francs)} more. ` : ''}A bigger pad wears less: ${PAD_LAUNCHES_BETWEEN_SERVICE.join(', ')} launches at levels 1 to 3.`}
          confirmLabel={`Service (${formatCurrency(PAD_SERVICE_COST, { compact: true })})`}
          confirmDisabled={player.francs < PAD_SERVICE_COST}
          onConfirm={() => { onServiceLaunchpad(); setServicingPad(false) }}
          onDismiss={() => setServicingPad(false)}
        />
      )}

      {!homecoming && !menuOpen && !servicingPad && (!coachVisible || currentTrainingTry(player.flightPlan) === 'mining')
        && !(launchpadCallout || (!agencyLandmark && stationCallout)) && (
        <div className={layoutStyles.nextFlightSlot}>{nextFlight?.(() => setServicingPad(true))}</div>
      )}

      {/* The surface dock is reserved for all-scene navigation only. Base-only
          actions remain on their physical buildings or in their own surfaces. */}
      {/* The delivery sheet of a homecoming covers the dock, so it is not drawn under it (it would only be an inert, overlapped control). */}
      {!homecoming && (
        <div className="hub-bottom-dock" style={{
          position: 'absolute', left: 0, right: 0, bottom: 8, zIndex: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none',
        }}>
          <div style={{ pointerEvents: 'auto' }}>
            <BaseDock
              onPrev={() => moveBase(-0.22)}
              onNext={() => moveBase(0.22)}
              onMission={!player.activeMission && !player.pendingLaunch ? () => onOpenScene('missions') : undefined}
              onHub={() => setMenuOpen(true)}
              locationLabel="Earth"
              locationNavigationDisabled={false}
              hideLocationArrows={phoneView}
              showLocationBuild={false}
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
