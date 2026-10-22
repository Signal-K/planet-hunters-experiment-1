import SwiftUI
import LandnamCore

/// Every screen/component that can be shown on its own from fixture state, with
/// no loop, no save file and no network. One catalog feeds both:
///   - the simulator:  `xcrun simctl launch booted com.atlasskyventures.sslandnam -scene hub-phone`
///     (SceneHost replaces RootView; `-scene list` shows the index)
///   - the snapshot test: `SCENE=hub-phone,debrief-phone xcodebuild test ...` renders only those.
/// To add a scene, add one `Scene(...)` line here. `qa/scenes.json` names them under `native`.
struct CatalogScene: Identifiable {
    let id: String
    let size: CGSize
    let make: @MainActor () -> AnyView
}

/// 8 Oct 2026, 12:00 UTC: inside World Space Week.
private let wswNoon: Double = 1791460800000

@MainActor
enum SceneCatalog {
    static let phone = CGFloat(402)
    static let t0: Double = 1_760_000_000_000

    static func scene<V: View>(_ id: String, _ h: CGFloat, w: CGFloat = phone, _ build: @escaping @MainActor () -> V) -> CatalogScene {
        CatalogScene(id: id, size: CGSize(width: w, height: h), make: { AnyView(build()) })
    }

    private static func settingsOverlay(focusBaseMove: Bool = false) -> some View {
        HubScreen(safeAreaOverride: EdgeInsets())
            .overlay { SettingsSheet(onClose: {}, initialScrollTarget: focusBaseMove ? "base-landscape-move" : nil) }
            .environment(GameStore(state: starterState()))
            .environment(AuthModel(api: .fromEnvironment(), store: KeychainSessionStore()))
    }

    static var offlineFeed: FeedModel { FeedModel(feed: SharedFeed(baseURL: URL(string: "http://127.0.0.1:1")!)) }

    /// Same state as the web `m1-hub` stage preset: the pad built, F150M, nothing else.
    static func webHubState() -> GameState {
        var gs = GameState()
        gs.player.francs = 150_000_000
        gs.player.placed = ["launchpad"]
        gs.player.placementPlots = ["launchpad": 0]
        return gs
    }

    static func basePlayer() -> GameState {
        var gs = GameState()
        gs.player.freeOperations = true; gs.player.missionsDone = 4; gs.player.francs = 60_000_000
        gs.player.placed = ["launchpad", "surface-silo", "astronaut-academy"]
        gs.player.placementPlots = ["launchpad": 0, "surface-silo": 1, "astronaut-academy": 2]
        gs.player.stash = ["copper": 6, "gold": 3, "aluminium": 30, "silicon": 12]
        gs.player.clientMissions = ["vulcan": 6, "helios": 11]
        gs.player.academyResearched = true; gs.player.academyFunded = true; gs.player.researchXP = 180; gs.player.skillPoints = 2
        return gs
    }

    /// Training fixtures: the compact floating coach HUD, matching RootView without reserving playfield height.
    static func coached<V: View>(_ view: V, _ gs: GameState, screen: Screen) -> some View { coached(view, GameStore(state: gs), screen: screen) }
    static func coached<V: View>(_ view: V, _ store: GameStore, screen: Screen) -> some View {
        view.environment(store).environment(offlineFeed)
            .overlay(alignment: .top) {
                if let c = FlightPlan.coach(store.player, screen: screen, includeHidden: true) {
                    CoachStrip(coach: c, screen: screen, summoned: .constant(false)).environment(store)
                        .frame(maxWidth: 560)
                        .padding(.horizontal, 8)
                        .padding(.top, 68)
                }
            }
    }

    static func scanState() -> GameState {
        var gs = GameState(); gs.player.placed = ["launchpad"]; gs.player.flightPlan.complete("mining"); gs.screen = .galaxy
        return gs
    }

    static func exchangeState() -> GameState {
        var gs = starterState(); gs.player.francs = 12500
        gs.player.stash = ["iron": 14, "silicon": 6, "carbon": 3]; gs.screen = .market
        gs.player.placed = ["launchpad", "market", "surface-silo"]
        return gs
    }

    static func exchangeAlertState() -> GameState {
        var gs = exchangeState()
        let spot = Marketplace.spot("iron", player: gs.player, now: Date().timeIntervalSince1970 * 1000)
        gs.player.priceAlerts = [PriceAlert(id: "alert-iron", mineralId: "iron", target: spot + 40),
                                 PriceAlert(id: "alert-silicon", mineralId: "silicon", target: 1, firedAt: 1)]
        return gs
    }

    static func exchangeLockedState() -> GameState {
        var gs = exchangeState(); gs.player.placed = ["launchpad"]
        return gs
    }

    static func partState() -> GameState {
        var gs = scanState(); gs.player.flightPlan.complete("scan"); gs.screen = .hangar
        return gs
    }

    /// Six missions done with funds in hand: the tier 3 Surveyor is open in the hangar (web `ui-hangar-surveyor`).
    static func surveyorState() -> GameState {
        var gs = partState()
        gs.player.missionsDone = 6
        gs.player.francs = 1_000_000_000
        return gs
    }

    /// The starter base owns only its launchpad. Other structures appear only once
    /// their fixture or saved world state explicitly places them.
    static func starterState() -> GameState {
        var gs = GameState()
        gs.player.placed = ["launchpad"]
        return gs
    }

    /// Starter base with the silo built and `ore` units stored, for the cutaway.
    static func siloState(ore: Int) -> GameState {
        var gs = starterState()
        gs.player.placed = ["launchpad", "surface-silo"]
        gs.player.placementPlots = ["launchpad": 0, "surface-silo": 1]
        if ore > 0 { gs.player.stash = ["copper": ore] }
        return gs
    }

    /// Base player who owns one settlement, so the « » dock tile shows enabled.
    static func landscapeBase() -> GameState {
        var gs = basePlayer()
        var site = SurfaceSiteProgress(); site.siteAccessPurchasedAt = t0
        gs.player.surfaceOps.sites["moon-south-pole"] = site
        return gs
    }


    /// A real catalog contract with the ship in flight toward its target (no timer, so the arrival button is live).
    static func transitState(returning: Bool) -> GameState {
        var gs = basePlayer()
        let cat = Catalog()
        let m = cat.missions.first { !$0.locked && ($0.requires.drillTier ?? 1) > 0 } ?? cat.missions[0]
        gs.missionId = m.id; gs.targetId = m.targetId ?? cat.targets.first?.id
        gs.player.activeMission = ActiveMission(id: m.id, label: m.title)
        gs.player.missionPhase = .transit
        gs.player.returningToEarth = returning
        gs.screen = .transit
        return gs
    }

    /// Transit roughly 45% of the way through, for flight screenshots.
    static func flightState() -> GameState {
        var gs = transitState(returning: false)
        let nowMs = Date().timeIntervalSince1970 * 1000
        gs.player.transitStartedAt = nowMs - 450_000; gs.player.arrivalAt = nowMs + 550_000
        return gs
    }

    /// Web `cp-early` / `cp-mid` / `cp-late`: roughly minute 15, 35 and 55 of the hour.
    static func checkpointState(_ stage: Int) -> GameState {
        var gs = GameState()
        gs.player.freeOperations = true
        switch stage {
        case 0:
            gs.player.missionsDone = 4; gs.player.francs = 40_000_000
            gs.player.placed = ["launchpad", "hangar", "surface-silo"]
            gs.player.placementPlots = ["launchpad": 0, "surface-silo": 1]
            gs.rocket = RocketConfig(chassis: "hull-mk2", propulsion: "fusion-b2", drill: "laser-t2")
        case 1:
            gs = basePlayer(); gs.player.missionsDone = 8; gs.player.francs = 150_000_000
            gs.player.refineryBuilt = true; gs.player.refineryUnlocked = true
            gs.rocket = RocketConfig(chassis: "hull-cargo", propulsion: "fusion-b2", drill: "laser-t2")
        default:
            gs = basePlayer(); gs.player.missionsDone = 20; gs.player.francs = 600_000_000
            gs.player.placed = ["launchpad", "deep-space-telescope", "surface-silo", "astronaut-academy", "market"]
            gs.player.placementPlots = ["launchpad": 0, "deep-space-telescope": 2, "surface-silo": 3, "astronaut-academy": 4, "market": 5]
            gs.player.deepSpaceTelescopeBuilt = true
            gs.player.refineryBuilt = true; gs.player.refineryUnlocked = true; gs.player.launchpadUpgraded = true
            gs.player.stash = ["iron": 120, "nickel": 60, "silicon": 40, "copper": 30, "gold": 6]
            gs.rocket = RocketConfig(chassis: "hull-mk3", propulsion: "ion-a3", drill: "plasma-t3")
        }
        gs.screen = .hub
        return gs
    }

    /// A mission and target picked, parked on `screen` (web `m1-fab`, `ui-rocket-buy`, `ui-landing`, `transport-*`).
    static func pickedState(_ screen: Screen, mission: String? = nil, missionsDone: Int = 0, phase: MissionPhase? = nil) -> GameState {
        var gs = transitState(returning: false)
        let cat = Catalog()
        if let id = mission, let m = cat.mission(id) {
            gs.missionId = m.id; gs.targetId = m.targetId
            gs.player.activeMission = ActiveMission(id: m.id, label: m.title)
        }
        gs.player.missionsDone = missionsDone
        if let phase { gs.player.missionPhase = phase }
        gs.screen = screen
        return gs
    }

    /// SSL-553: untimed trip home.
    static func returnState() -> GameState { var gs = transitState(returning: true); gs.player.arrivalAt = nil; return gs }
    /// SSL-553: landed back on the pad with the haul to settle (surface silo built).
    static func homeState() -> GameState {
        var gs = transitState(returning: true)
        let cat = Catalog()
        let need = cat.mission(gs.missionId)?.requires.minerals ?? [:]
        var haul = need; if let first = need.keys.sorted().first { haul[first, default: 0] += 3 }; haul["nickel", default: 0] += 2
        gs.player.placed = ["launchpad", "hangar", "surface-silo"]
        gs.player.placementPlots = ["launchpad": 0, "surface-silo": 1]
        gs.player.stash = haul.merging(["cobalt": 3]) { $0 + $1 }
        gs.lastCargo = haul
        gs.player.homeDeliveryPending = true
        gs.player.returningToEarth = false
        gs.screen = .debrief
        return gs
    }

    static func miningState(rover: Bool, target: String? = nil) -> GameState {
        var gs = transitState(returning: false)
        if let target { gs.targetId = target }
        gs.player.missionPhase = rover ? .survey : .mining
        gs.screen = rover ? .roverSurvey : .mining
        return gs
    }

    static func shipMiningState(_ chassis: String, _ propulsion: String, _ drill: String) -> GameState {
        var gs = miningState(rover: false)
        gs.rocket = RocketConfig(chassis: chassis, propulsion: propulsion, drill: drill)
        return gs
    }

    static let tess = TessCandidate(id: "tess-demo", ticId: "TIC 260004324", toi: "TOI 700.01", sector: "Sectors 1-3", periodDays: 3.4, transitEpoch: 1.1, depthPpm: 9000, signalToNoise: 14)

    static var all: [CatalogScene] { [
        scene("intro-phone", 700) { IntroScreen().environment(GameStore(state: GameState())) },
        scene("intro-biome-phone", 874) { IntroScreen().environment(GameStore(state: GameState())) },
        scene("intro-biome-landscape", 402, w: 874) { IntroScreen().environment(GameStore(state: GameState())) },
        scene("intro-biome-desktop", 900, w: 1440) { IntroScreen().environment(GameStore(state: GameState())) },
        scene("takeon-live", 874) { TakeonSceneScreen(onExit: {}).environment(GameStore()) },
        scene("hub-phone", 874) { HubScreen(safeAreaOverride: EdgeInsets(top: 62, leading: 0, bottom: 34, trailing: 0)).environment(GameStore(state: webHubState())) },
        scene("hub-phone-landscape", 402, w: 874) { HubScreen(safeAreaOverride: EdgeInsets(top: 0, leading: 62, bottom: 21, trailing: 62)).environment(GameStore(state: landscapeBase())) },
        scene("hub-desktop", 680, w: 1000) { HubScreen().environment(GameStore()) },
        scene("hub-biome-mountains-phone", 874) { HubScreen(safeAreaOverride: EdgeInsets(top: 62, leading: 0, bottom: 34, trailing: 0), biome: .mountains).environment(GameStore()) },
        scene("hub-biome-desert-phone", 874) { HubScreen(safeAreaOverride: EdgeInsets(top: 62, leading: 0, bottom: 34, trailing: 0), biome: .desert).environment(GameStore()) },
        scene("hub-biome-tundra-phone", 874) { HubScreen(safeAreaOverride: EdgeInsets(top: 62, leading: 0, bottom: 34, trailing: 0), biome: .tundra).environment(GameStore()) },
        scene("hub-biome-coast-phone", 874) { HubScreen(safeAreaOverride: EdgeInsets(top: 62, leading: 0, bottom: 34, trailing: 0), biome: .coast).environment(GameStore()) },
        scene("hub-biome-mountains-desktop", 900, w: 1440) { HubScreen(biome: .mountains).environment(GameStore()) },
        scene("hub-biome-desert-desktop", 900, w: 1440) { HubScreen(biome: .desert).environment(GameStore()) },
        scene("hub-biome-tundra-desktop", 900, w: 1440) { HubScreen(biome: .tundra).environment(GameStore()) },
        scene("hub-biome-coast-desktop", 900, w: 1440) { HubScreen(biome: .coast).environment(GameStore()) },
        scene("hub-live", 874) { HubScreen().environment(GameStore()) },
        scene("hub-live-built", 874) {
            var gs = GameState()
            gs.player.placed = ["launchpad", "hangar", "surface-silo", "astronaut-academy"]
            gs.player.placementPlots = ["launchpad": 0, "surface-silo": 1, "astronaut-academy": 2]
            return HubScreen().environment(GameStore(state: gs))
        },
        scene("hub-pan-right-phone", 874) {
            let world = BaseWorld(w: phone, h: 874)
            return HubScreen(safeAreaOverride: EdgeInsets(top: 62, leading: 0, bottom: 34, trailing: 0), startX: world.maxX / 2).environment(GameStore(state: starterState()))
        },
        scene("hub-pan-mid-phone", 874) {
            let world = BaseWorld(w: phone, h: 874)
            return HubScreen(safeAreaOverride: EdgeInsets(top: 62, leading: 0, bottom: 34, trailing: 0), startX: world.shaftFocusX / 2, startDepth: 0.5).environment(GameStore(state: siloState(ore: 0)))
        },
        scene("hub-ug-empty-phone", 874) {
            let world = BaseWorld(w: phone, h: 874)
            return HubScreen(safeAreaOverride: EdgeInsets(top: 62, leading: 0, bottom: 34, trailing: 0), startX: world.shaftFocusX, startDepth: 1).environment(GameStore(state: starterState()))
        },
        scene("hub-ug-built-phone", 874) {
            let world = BaseWorld(w: phone, h: 874)
            return HubScreen(safeAreaOverride: EdgeInsets(top: 62, leading: 0, bottom: 34, trailing: 0), startX: world.shaftFocusX, startDepth: 1).environment(GameStore(state: siloState(ore: 24)))
        },
        scene("hub-pan-mid-landscape", 402, w: 874) {
            let world = BaseWorld(w: 874, h: 402)
            return HubScreen(safeAreaOverride: EdgeInsets(top: 0, leading: 62, bottom: 21, trailing: 62), startX: world.shaftFocusX / 2, startDepth: 0.5).environment(GameStore(state: siloState(ore: 0)))
        },
        scene("hub-ug-empty-landscape", 402, w: 874) {
            let world = BaseWorld(w: 874, h: 402)
            return HubScreen(safeAreaOverride: EdgeInsets(top: 0, leading: 62, bottom: 21, trailing: 62), startX: world.shaftFocusX, startDepth: 1).environment(GameStore(state: starterState()))
        },
        scene("hub-ug-built-landscape", 402, w: 874) {
            let world = BaseWorld(w: 874, h: 402)
            return HubScreen(safeAreaOverride: EdgeInsets(top: 0, leading: 62, bottom: 21, trailing: 62), startX: world.shaftFocusX, startDepth: 1).environment(GameStore(state: siloState(ore: 24)))
        },
        scene("hub-biome-mountains-landscape", 402, w: 874) { HubScreen(safeAreaOverride: EdgeInsets(top: 0, leading: 62, bottom: 21, trailing: 62), biome: .mountains).environment(GameStore(state: landscapeBase())) },
        scene("hub-biome-desert-landscape", 402, w: 874) { HubScreen(safeAreaOverride: EdgeInsets(top: 0, leading: 62, bottom: 21, trailing: 62), biome: .desert).environment(GameStore(state: landscapeBase())) },
        scene("hub-biome-tundra-landscape", 402, w: 874) { HubScreen(safeAreaOverride: EdgeInsets(top: 0, leading: 62, bottom: 21, trailing: 62), biome: .tundra).environment(GameStore(state: landscapeBase())) },
        scene("hub-biome-coast-landscape", 402, w: 874) { HubScreen(safeAreaOverride: EdgeInsets(top: 0, leading: 62, bottom: 21, trailing: 62), biome: .coast).environment(GameStore(state: landscapeBase())) },
        scene("hub-structures-phone", 874) {
            var gs = GameState()
            gs.player.placed = ["launchpad", "surface-silo", "astronaut-academy"]
            gs.player.placementPlots = ["surface-silo": 0, "astronaut-academy": 2]
            return HubScreen().environment(GameStore(state: gs))
        },
        scene("hub-skycraft-phone", 874) {
            var gs = GameState()
            gs.player.activeMission = ActiveMission(id: "m", label: "Ceres run")
            gs.player.missionPhase = .mining
            return HubScreen().environment(GameStore(state: gs))
        },
        scene("launch-review-phone", 874) {
            let st = GameStore()
            st.go(.missions)
            if let id = st.catalog.missions.first(where: { !$0.locked })?.id { st.pickMission(id) }
            return LaunchReviewScreen().environment(st).environment(\.flatLayout, true)
        },
        scene("launchpad-ops-phone", 1300) {
            var gs = basePlayer(); gs.screen = .launchpad; gs.player.missionsDone = 3
            return LaunchReviewScreen().environment(GameStore(state: gs)).environment(\.flatLayout, true)
        },
        scene("debrief-phone", 874) {
            var gs = GameState()
            let cat = Catalog()
            let m = cat.missions.first { $0.client != nil && !$0.requires.minerals.isEmpty } ?? cat.missions[0]
            gs.missionId = m.id; gs.targetId = m.targetId ?? cat.targets.first?.id
            gs.lastCargo = m.requires.minerals
            gs.screen = .debrief
            return DebriefScreen().environment(GameStore(state: gs, catalog: cat)).environment(\.flatLayout, true)
        },
        // SSL-651: a filled Orionids shower run at debrief (web ui/orionids-shower-debrief).
        scene("debrief-shower-run-phone", 874) {
            var gs = GameState()
            let cat = Catalog()
            gs.player.freeOperations = true; gs.player.missionsDone = 5
            gs.player.orionidsFragments = OrionidsFragments(caught: 25, redeemed: 0)
            gs.player.orionidsRunBaseline = 5
            gs.missionId = OrionidsRun.missionId; gs.targetId = "eros"
            gs.lastCargo = ["orionid_debris": 6, "iron": 2]
            gs.screen = .debrief
            return DebriefScreen().environment(GameStore(state: gs, catalog: cat)).environment(\.flatLayout, true)
        },
        scene("debrief-capacitor-phone", 300) {
            let st = GameStore()
            st.go(.missions)
            if let id = st.catalog.missions.first(where: { !$0.locked && !$0.isOwnProgram })?.id { st.pickMission(id) }
            return LaserCapacitorPanel(level: 0, stashUnits: 9, reservedUnits: 0) {}.padding(16).environment(st)
        },
        scene("mining-actionrow-phone", 110) {
            let t = Targets.all.first { $0.type == .asteroid }!
            var f = MiningField(target: t, required: ["iron": 2, "silicon": 1], cargoCapacity: 6, laserTier: 1, seed: 3)
            for n in f.nodes.prefix(3) { for _ in 0..<4 { _ = f.strike(nodeId: n.id) } }
            return MiningActionRow(field: f, onReturn: {}, onScrub: {}).padding(16).background(Theme.bg)
        },
        scene("help-sheet-phone", 640) {
            HelpSheet(topic: Help.topic(for: .galaxy)!, onShowMe: {}, onClose: {})
        },
        scene("coach-marks-phone", 640) {
            let topic = Help.topic(for: .galaxy)!
            let chart = CGRect(x: 16, y: 150, width: 370, height: 220)
            return ZStack(alignment: .topLeading) {
                Theme.bg
                RoundedRectangle(cornerRadius: 8).fill(Theme.paper).frame(width: chart.width, height: chart.height).offset(x: chart.minX, y: chart.minY)
                CoachMarks(step: topic.coach[0], index: 0, total: 2, rects: [chart], size: CGSize(width: phone, height: 640), onNext: {}, onStop: {})
            }
        },
        scene("control-station-phone", 874) {
            var gs = GameState()
            gs.player.freeOperations = true; gs.player.deepSpaceTelescopeBuilt = true; gs.player.saturnImagerLaunchedAt = 1
            let sigs = [InstrumentSignal(id: "n", kind: .deepSpace, title: "NEOCP"), InstrumentSignal(id: "s", kind: .saturn, title: "Frame")]
            return ControlStationScreen(signals: sigs).environment(GameStore(state: gs, clock: { wswNoon })).environment(\.flatLayout, true).environment(\.coach, CoachController(topic: nil))
        },
        scene("control-station-built-phone", 874) {
            var gs = GameState()
            gs.player.freeOperations = true; gs.player.placed = ["ground-telescope"]; gs.player.deepSpaceTelescopeBuilt = true; gs.player.saturnImagerLaunchedAt = 1
            gs.player.badges = ["rocket-revolution-2026": PlayerBadge(eventId: "rocket-revolution-2026", tier: .gold, earnedAt: wswNoon)]
            let sigs = [InstrumentSignal(id: "n", kind: .deepSpace, title: "NEOCP"), InstrumentSignal(id: "s", kind: .saturn, title: "Frame")]
            return ControlStationScreen(signals: sigs).environment(GameStore(state: gs, clock: { wswNoon })).environment(\.flatLayout, true).environment(\.coach, CoachController(topic: nil))
        },
        // Daily research plate (SSL-664): half a month of stamps up to the snapshot clock, with a survey and a catch today.
        scene("research-calendar-phone", 800) {
            var p = Player()
            let todayKey = ResearchStampRules.dayKey(wswNoon)
            let today = Int(todayKey.suffix(2))!, prefix = todayKey.prefix(8)
            for day in 1...today where day % 3 != 0 {
                p.researchStamps.days["\(prefix)\(String(format: "%02d", day))"] = day % 4 == 0 ? [.classification, .event] : [.survey]
            }
            return ResearchCalendarPanel(stamps: p.researchStamps, now: wswNoon).padding(12).background(Theme.hex(0x1A2744))
        },
        scene("mission-board-wsw-phone", 874) {
            MissionsScreen().environment(GameStore(state: basePlayer(), clock: { wswNoon })).environment(\.flatLayout, true)
        },
        // The board as a player sees it: full screen over the live base (SSL-423).
        scene("mission-board-live", 874) {
            MissionsScreen().environment(GameStore(state: basePlayer(), clock: { wswNoon }))
        },
        // SSL-570 / SSL-571: daily client contracts, the same board a day later, and a client build job.
        scene("mission-board-daily-phone", 874) {
            MissionsScreen().environment(GameStore(state: basePlayer(), clock: { wswNoon })).environment(\.flatLayout, true)
        },
        scene("mission-board-next-day-phone", 874) {
            MissionsScreen().environment(GameStore(state: basePlayer(), clock: { wswNoon + 86_400_000 })).environment(\.flatLayout, true)
        },
        scene("mission-board-daily-landscape", 402, w: 874) {
            MissionsScreen().environment(GameStore(state: basePlayer(), clock: { wswNoon })).environment(\.flatLayout, true)
        },
        scene("mission-board-daily-desktop", 900, w: 1440) {
            MissionsScreen().environment(GameStore(state: basePlayer(), clock: { wswNoon })).environment(\.flatLayout, true)
        },
        scene("mission-board-build-desktop", 900, w: 1440) {
            var gs = basePlayer(); gs.player.missionsDone = 12
            return MissionsScreen(startTitle: "Build a Fuel Depot").environment(GameStore(state: gs, clock: { wswNoon })).environment(\.flatLayout, true)
        },
        scene("mission-board-build-phone", 874) {
            var gs = basePlayer(); gs.player.missionsDone = 12
            return MissionsScreen(startTitle: "Build a Fuel Depot").environment(GameStore(state: gs, clock: { wswNoon })).environment(\.flatLayout, true)
        },
        scene("mission-program-phone", 1400) {
            MissionsScreen(startTab: 1).environment(GameStore(state: basePlayer(), clock: { wswNoon })).environment(\.flatLayout, true)
        },
        scene("mission-events-phone", 874) {
            MissionsScreen(startTab: 2).environment(GameStore(state: basePlayer(), clock: { wswNoon })).environment(\.flatLayout, true)
        },
        scene("mission-free-run-phone", 874) {
            var gs = basePlayer(); gs.player.freeOperations = true
            return MissionsScreen(startTab: 3).environment(GameStore(state: gs, clock: { wswNoon })).environment(\.flatLayout, true)
        },
        scene("mission-events-live", 874) {
            MissionsScreen(startTab: 2).environment(GameStore(state: basePlayer(), clock: { wswNoon }))
        },
        scene("sky-badges-phone", 1000) {
            var gs = GameState()
            gs.player.freeOperations = true; gs.player.deepSpaceTelescopeBuilt = true
            gs.player.badges = ["saturn-night-2026": PlayerBadge(eventId: "saturn-night-2026", tier: .gold, earnedAt: 1),
                                "rocket-revolution-2026": PlayerBadge(eventId: "rocket-revolution-2026", tier: .silver, earnedAt: 2)]
            return ControlStationScreen().environment(GameStore(state: gs)).environment(\.flatLayout, true).environment(\.coach, CoachController(topic: nil))
        },
        scene("saturn-imager-phone", 1020) {
            var gs = GameState()
            gs.player.freeOperations = true; gs.player.saturnImagerLaunchedAt = 1
            return SaturnStormSearchScreen(candidate: Saturn.fallback[19]).environment(GameStore(state: gs)).environment(offlineFeed).environment(\.flatLayout, true)
        },
        scene("asteroid-discovery-phone", 1020) {
            var gs = GameState()
            gs.player.freeOperations = true; gs.player.deepSpaceTelescopeBuilt = true
            let c = AsteroidCandidate(id: "a1", tempDesig: "P22Xk4Q", score: 87, ra: 14.3562, decl: -21.8044, vMag: 21.4, arcDays: 1.8, lastSeenDays: 0.4)
            return AsteroidDiscoveryScreen(candidate: c).environment(GameStore(state: gs)).environment(offlineFeed).environment(\.flatLayout, true)
        },
        scene("tess-discovery-phone", 1080) {
            var gs = GameState()
            gs.player.freeOperations = true; gs.player.transitSatelliteLaunchedAt = 1
            let marks = [TransitRange(x1: 0.95, x2: 1.25), TransitRange(x1: 4.35, x2: 4.65)]
            return TessDiscoveryScreen(candidate: tess, marks: marks).environment(GameStore(state: gs)).environment(offlineFeed).environment(\.flatLayout, true)
        },
        scene("tess-pointing-phone", 1300) {
            var gs = GameState()
            gs.player.freeOperations = true; gs.player.transitSatelliteLaunchedAt = 1
            gs.player.tessClassifications = [tess.id: TessClassification(subjectId: tess.id, verdict: .planet, ranges: [TransitRange(x1: 0.95, x2: 1.25)], submittedAt: 1)]
            gs.player.satelliteTargetId = "toi-2"
            let feed = offlineFeed
            feed.tess = (1...9).map { TessCandidate(id: "toi-\($0)", toi: "TOI \(100 + $0).01") }
            return TessDiscoveryScreen(candidate: tess).environment(GameStore(state: gs)).environment(feed).environment(\.flatLayout, true)
        },
        scene("coach-launchpad-phone", 874) { coached(BuildScreen(), GameState(), screen: .build) },
        scene("coach-launchpad-landscape", 402, w: 874) { coached(BuildScreen(), GameState(), screen: .build) },
        scene("coach-launchpad-desktop", 900, w: 1440) { coached(BuildScreen(), GameState(), screen: .build) },
        scene("coach-mining-phone", 874) {
            var gs = GameState(); gs.player.placed = ["launchpad", "hangar"]; gs.player.placementPlots = ["launchpad": 0, "hangar": 1]
            return coached(HubScreen(safeAreaOverride: EdgeInsets(top: 62, leading: 0, bottom: 0, trailing: 0)), gs, screen: .hub)
        },
        scene("coach-mining-laser-phone", 874) {
            var gs = miningState(rover: false); gs.player.freeOperations = false; gs.player.missionsDone = 0
            gs.player.placed = ["launchpad"]
            return coached(MiningScreen(), gs, screen: .mining)
        },
        scene("coach-mining-laser-landscape", 402, w: 874) {
            var gs = miningState(rover: false); gs.player.freeOperations = false; gs.player.missionsDone = 0
            gs.player.placed = ["launchpad"]
            return coached(MiningScreen(), gs, screen: .mining)
        },
        scene("coach-mining-laser-desktop", 900, w: 1440) {
            var gs = miningState(rover: false); gs.player.freeOperations = false; gs.player.missionsDone = 0
            gs.player.placed = ["launchpad"]
            return coached(MiningScreen(), gs, screen: .mining)
        },
        scene("try-scan-before-phone", 874) { coached(TessDiscoveryScreen(), scanState(), screen: .galaxy) },
        scene("try-scan-done-phone", 874) {
            let store = GameStore(state: scanState())
            store.classifyTess("training-tess-1", verdict: .planet, ranges: [TransitRange(x1: 0.95, x2: 1.25)], candidate: Tess.trainingCandidate)
            return coached(TessDiscoveryScreen(), store, screen: .galaxy)
        },
        scene("try-part-before-phone", 874) { coached(LaunchScreen(), partState(), screen: .hangar) },
        scene("try-part-done-phone", 874) {
            let store = GameStore(state: partState())
            store.fitHangarModules(["engine": "ion-thruster-t1", "booster": "strap-booster-t1", "cockpit": "cockpit-command-t1", "payload": "cargo-payload-t1"])
            return coached(LaunchScreen(), store, screen: .hangar)
        },
        scene("cp-early", 874) { HubScreen().environment(GameStore(state: checkpointState(0))) },
        scene("cp-mid", 874) { HubScreen().environment(GameStore(state: checkpointState(1))) },
        scene("cp-late", 874) { HubScreen().environment(GameStore(state: checkpointState(2))) },
        scene("landing-live", 874) { MiningScreen().environment(GameStore(state: pickedState(.landing, phase: .landing))) },
        scene("rocket-buy-live", 874) { LaunchReviewScreen().environment(GameStore(state: pickedState(.rocketBuy))).environment(\.flatLayout, true) },
        scene("first-fab-live", 874) { LaunchReviewScreen().environment(GameStore(state: pickedState(.fab))).environment(\.flatLayout, true) },
        scene("storage-build-live", 874) { var gs = basePlayer(); gs.player.missionsDone = 2; gs.screen = .build; return BuildScreen().environment(GameStore(state: gs)) },
        scene("transport-hub-live", 874) { var gs = basePlayer(); gs.player.missionsDone = 1; return HubScreen().environment(GameStore(state: gs)) },
        scene("transport-fab-live", 874) { LaunchReviewScreen().environment(GameStore(state: pickedState(.fab, mission: "lnm_m3_relay_bennu_vesta", missionsDone: 1))).environment(\.flatLayout, true) },
        scene("transport-mining-live", 874) { MiningScreen().environment(GameStore(state: pickedState(.mining, mission: "lnm_m3_relay_bennu_vesta", missionsDone: 1, phase: .mining))) },
        scene("transport-delivery-live", 874) { DeliveryScreen().environment(GameStore(state: pickedState(.delivery, mission: "lnm_m3_relay_bennu_vesta", missionsDone: 1))) },
        scene("transport-debrief-live", 874) { DebriefScreen().environment(GameStore(state: pickedState(.debrief, mission: "lnm_m3_relay_bennu_vesta", missionsDone: 1))) },
        scene("telescope-hub-live", 874) { var gs = basePlayer(); gs.player.deepSpaceTelescopeBuilt = true; return HubScreen().environment(GameStore(state: gs)) },
        scene("telescope-fab-live", 874) { LaunchReviewScreen().environment(GameStore(state: pickedState(.fab, mission: Instruments.transitMissionId, missionsDone: 5))).environment(\.flatLayout, true) },
        scene("telescope-debrief-live", 874) { DebriefScreen().environment(GameStore(state: pickedState(.debrief, mission: Instruments.transitMissionId, missionsDone: 5))) },
        scene("flight-live", 874) { TransitScreen().environment(GameStore(state: flightState())) },
        scene("flight-live-landscape", 402, w: 874) { TransitScreen().environment(GameStore(state: flightState())) },
        scene("return-live", 874) { TransitScreen().environment(GameStore(state: returnState())) },
        scene("return-live-landscape", 402, w: 874) { TransitScreen().environment(GameStore(state: returnState())) },
        scene("home-live", 874) { HomecomingScreen().environment(GameStore(state: homeState())) },
        scene("home-settle-live", 874) { HomecomingScreen(autoSettle: true).environment(GameStore(state: homeState())) },
        scene("launch-no-silo-phone", 874) {
            var gs = basePlayer(); gs.player.freeOperations = true; gs.player.missionsDone = 6; gs.player.placed = ["launchpad"]
            let st = GameStore(state: gs)
            st.go(.launchpad)
            if let id = st.catalog.missions.first(where: { $0.isOwnProgram && $0.construction == nil })?.id { st.pickMission(id) }
            return RocketBuilderScreen(launchEnabled: false, onLaunch: {}, onChooseMission: {}).environment(st).environment(\.flatLayout, true)
        },
        scene("pad-design-phone", 874) {
            var gs = basePlayer(); gs.player.freeOperations = true; gs.player.missionsDone = 6; gs.player.placed = ["launchpad"]
            let st = GameStore(state: gs)
            st.go(.launchpad)
            if let id = st.catalog.missions.first(where: { $0.isOwnProgram && $0.construction == nil })?.id { st.pickMission(id) }
            return RocketBuilderScreen(launchEnabled: true, onLaunch: {}, onChooseMission: {}, assembly: .design).environment(st).environment(\.flatLayout, true)
        },
        scene("pad-design-landscape", 402, w: 874) {
            var gs = basePlayer(); gs.player.freeOperations = true; gs.player.missionsDone = 6; gs.player.placed = ["launchpad"]
            let st = GameStore(state: gs)
            st.go(.launchpad)
            if let id = st.catalog.missions.first(where: { $0.isOwnProgram && $0.construction == nil })?.id { st.pickMission(id) }
            return RocketBuilderScreen(launchEnabled: true, onLaunch: {}, onChooseMission: {}, assembly: .design).environment(st).environment(\.flatLayout, true)
        },
        scene("pad-building-phone", 874) {
            var gs = basePlayer(); gs.player.freeOperations = true; gs.player.missionsDone = 6; gs.player.placed = ["launchpad"]
            let st = GameStore(state: gs)
            st.go(.launchpad)
            if let id = st.catalog.missions.first(where: { $0.isOwnProgram && $0.construction == nil })?.id { st.pickMission(id) }
            return RocketBuilderScreen(launchEnabled: true, onLaunch: {}, onChooseMission: {}, assembly: .building, previewProgress: 0.55).environment(st).environment(\.flatLayout, true)
        },
        scene("pad-building-landscape", 402, w: 874) {
            var gs = basePlayer(); gs.player.freeOperations = true; gs.player.missionsDone = 6; gs.player.placed = ["launchpad"]
            let st = GameStore(state: gs)
            st.go(.launchpad)
            if let id = st.catalog.missions.first(where: { $0.isOwnProgram && $0.construction == nil })?.id { st.pickMission(id) }
            return RocketBuilderScreen(launchEnabled: true, onLaunch: {}, onChooseMission: {}, assembly: .building, previewProgress: 0.55).environment(st).environment(\.flatLayout, true)
        },
        scene("pad-ready-phone", 874) {
            var gs = basePlayer(); gs.player.freeOperations = true; gs.player.missionsDone = 6; gs.player.placed = ["launchpad"]
            let st = GameStore(state: gs)
            st.go(.launchpad)
            if let id = st.catalog.missions.first(where: { $0.isOwnProgram && $0.construction == nil })?.id { st.pickMission(id) }
            return RocketBuilderScreen(launchEnabled: true, onLaunch: {}, onChooseMission: {}, assembly: .ready).environment(st).environment(\.flatLayout, true)
        },
        scene("pad-ready-landscape", 402, w: 874) {
            var gs = basePlayer(); gs.player.freeOperations = true; gs.player.missionsDone = 6; gs.player.placed = ["launchpad"]
            let st = GameStore(state: gs)
            st.go(.launchpad)
            if let id = st.catalog.missions.first(where: { $0.isOwnProgram && $0.construction == nil })?.id { st.pickMission(id) }
            return RocketBuilderScreen(launchEnabled: true, onLaunch: {}, onChooseMission: {}, assembly: .ready).environment(st).environment(\.flatLayout, true)
        },
        scene("guide-free-ops-hub", 874) {
            var gs = GameState(); gs.player.freeOperations = true; gs.player.placed = ["launchpad"]; gs.player.placementPlots = ["launchpad": 0]
            return coached(HubScreen(), gs, screen: .hub)
        },
        scene("home-live-landscape", 402, w: 874) { HomecomingScreen().environment(GameStore(state: homeState())) },
        scene("transit-live", 874) {
            let st = GameStore(state: transitState(returning: false))
            return TransitScreen().environment(st)
        },
        scene("transit-live-landscape", 402, w: 874) {
            TransitScreen().environment(GameStore(state: transitState(returning: false)))
        },
        scene("mining-laser-live", 874) {
            MiningScreen().environment(GameStore(state: miningState(rover: false)))
        },
        scene("mining-laser-live-landscape", 402, w: 874) {
            MiningScreen().environment(GameStore(state: miningState(rover: false)))
        },
        scene("mining-laser-explorer-live", 874) { MiningScreen().environment(GameStore(state: shipMiningState("hull-mk1", "ion-a1", "hand-drill"))) },
        scene("mining-laser-prospector-live", 874) { MiningScreen().environment(GameStore(state: shipMiningState("hull-mk2", "fusion-b2", "laser-t2"))) },
        scene("mining-laser-surveyor-live", 874) { MiningScreen().environment(GameStore(state: shipMiningState("hull-mk3", "ion-a3", "plasma-t3"))) },
        scene("mining-laser-bennu-live", 874) { MiningScreen().environment(GameStore(state: miningState(rover: false, target: "bennu"))) },
        scene("mining-laser-mars-live", 874) { MiningScreen().environment(GameStore(state: miningState(rover: false, target: "mars"))) },
        scene("mining-laser-icy-live", 874) { MiningScreen().environment(GameStore(state: miningState(rover: false, target: "jupiter"))) },
        scene("hub-empty-live", 874) { HubScreen().environment(GameStore(state: GameState())) },
        scene("hub-empty-live-landscape", 402, w: 874) { HubScreen().environment(GameStore(state: GameState())) },
        scene("hub-starter-live", 874) { HubScreen().environment(GameStore(state: starterState())) },
        scene("hub-starter-live-landscape", 402, w: 874) { HubScreen().environment(GameStore(state: starterState())) },
        scene("settings-live", 844, w: 390) { settingsOverlay() },
        scene("settings-live-landscape", 428, w: 926) { settingsOverlay() },
        scene("settings-live-desktop", 900, w: 1440) { settingsOverlay() },
        scene("settings-base-move-live", 844, w: 390) { settingsOverlay(focusBaseMove: true) },
        scene("settings-base-move-landscape", 428, w: 926) { settingsOverlay(focusBaseMove: true) },
        scene("settings-base-move-desktop", 900, w: 1440) { settingsOverlay(focusBaseMove: true) },
        scene("mining-guide-phone", 1250) { MiningGuide(onRecharge: {}, onScrub: {}, onClose: {}).environment(\.flatLayout, true) },
        scene("mining-guide-landscape", 402, w: 874) { MiningGuide(onRecharge: {}, onScrub: {}, onClose: {}).environment(\.flatLayout, true) },
        scene("exchange-phone", 874) { MarketScreen().environment(GameStore(state: exchangeState())).environment(\.flatLayout, true) },
        scene("exchange-landscape", 402, w: 874) { MarketScreen().environment(GameStore(state: exchangeState())).environment(\.flatLayout, true) },
        scene("exchange-desktop", 900, w: 1440) { MarketScreen().environment(GameStore(state: exchangeState())).environment(\.flatLayout, true) },
        scene("exchange-buy-phone", 844, w: 390) { MarketScreen(tab: .buy).environment(GameStore(state: exchangeState())).environment(\.flatLayout, true) },
        scene("exchange-alerts-phone", 844, w: 390) { MarketScreen(tab: .alerts).environment(GameStore(state: exchangeAlertState())).environment(\.flatLayout, true) },
        scene("exchange-locked-phone", 844, w: 390) { MarketScreen(tab: .buy).environment(GameStore(state: exchangeLockedState())).environment(\.flatLayout, true) },
        scene("coach-chip-phone", 844, w: 390) {
            var gs = exchangeState(); gs.player.flightPlan.complete("mining")
            return coached(MarketScreen(), gs, screen: .market).environment(\.flatLayout, true)
        },
        scene("coach-exchange-landscape", 428, w: 926) {
            var gs = exchangeState(); gs.player.flightPlan.complete("mining")
            return coached(MarketScreen(), gs, screen: .market).environment(\.flatLayout, true)
        },
        scene("hangar-workshop-phone", 844, w: 390) { HangarScreen().environment(GameStore(state: partState())) },
        scene("hangar-workshop-phone-live", 844, w: 390) { HangarScreen().environment(GameStore(state: partState())) },
        scene("hangar-workshop-landscape", 428, w: 926) { HangarScreen().environment(GameStore(state: partState())) },
        scene("hangar-workshop-desktop", 900, w: 1440) { HangarScreen().environment(GameStore(state: partState())) },
        scene("hangar-surveyor-phone", 844, w: 390) { HangarScreen().environment(GameStore(state: surveyorState())) },
        scene("hangar-surveyor-landscape", 428, w: 926) { HangarScreen().environment(GameStore(state: surveyorState())) },
        scene("hangar-surveyor-desktop", 900, w: 1440) { HangarScreen().environment(GameStore(state: surveyorState())) },
        scene("hangar-sealed-phone", 844, w: 390) { HangarScreen().environment(GameStore(state: partState())) },
        scene("hangar-config-phone", 874) { HangarModulesPanel().environment(GameStore(state: partState())) },
        scene("hangar-config-landscape", 402, w: 874) { HangarModulesPanel().environment(GameStore(state: partState())) },
        scene("rover-field-phone", 874) {
            var p = Prospecting(); p.observe("ore-a")
            return RoverFieldScreen(initial: p, deployed: true).environment(GameStore(state: GameState()))
        },
        scene("rover-field-landscape", 402, w: 874) {
            var p = Prospecting(); p.observe("ore-b")
            return RoverFieldScreen(initial: p, deployed: true).environment(GameStore(state: GameState()))
        },
        scene("rover-touchdown-phone", 874) {
            RoverFieldScreen(initial: Prospecting()).environment(GameStore(state: GameState()))
        },
        scene("skill-tree-phone", 1300) {
            var gs = basePlayer(); gs.player.unlockedSkillNodes = ["laser-charge-1"]
            gs.player.tessClassifications = ["t": TessClassification(subjectId: "t", verdict: .planet, ranges: [], submittedAt: 1)]
            return SkillTreeScreen().environment(GameStore(state: gs)).environment(\.flatLayout, true)
        },
        scene("academy-phone", 1000) {
            let gs = Academy.migrate(basePlayer(), now: t0)
            let st = GameStore(state: Academy.applyHire(gs, sourceId: "nasa", now: t0), clock: { 1_760_000_000_000 })
            return AcademyScreen(at: t0).environment(st).environment(\.flatLayout, true)
        },
        scene("launchpad-phone", 874) {
            var gs = basePlayer(); gs.player.placed = ["launchpad"]; gs.player.missionsDone = 3
            return RocketBuilderScreen(launchEnabled: false, onLaunch: {}, onChooseMission: {}).environment(GameStore(state: gs)).environment(\.flatLayout, true)
        },
        scene("launchpad-landscape", 402, w: 874) {
            var gs = basePlayer(); gs.player.placed = ["launchpad"]; gs.player.missionsDone = 3
            return RocketBuilderScreen(launchEnabled: false, onLaunch: {}, onChooseMission: {}).environment(GameStore(state: gs)).environment(\.flatLayout, true)
        },
        scene("build-phone", 874) {
            var gs = basePlayer(); gs.player.placed = ["launchpad"]; gs.player.placementPlots = ["launchpad": 0]
            return BuildScreen().environment(GameStore(state: gs))
        },
        scene("surface-ops-phone", 1400) {
            var gs = basePlayer(); gs.player.stash = ["aluminium": 4, "silicon": 6]
            gs = SurfaceOps.applyPurchaseAccess(gs, "moon-south-pole", now: t0 - 3_000_000)
            gs = SurfaceOps.applyBuildPad(gs, "moon-south-pole", pad: 1, now: t0 - 2_000_000)
            gs = SurfaceOps.applyMined(gs, "moon-south-pole", mineral: "iron", amount: 12)
            return SurfaceOpsScreen(at: t0).environment(GameStore(state: gs, clock: { 1_760_000_000_000 })).environment(\.flatLayout, true)
        },
        scene("mission-log-phone", 1400) {
            var gs = basePlayer()
            gs.player.completedMissions = [CompletedMissionRecord(id: "m1", title: "Iron for the pad", targetId: "ceres", clientName: "Vulcan", targetName: "Ceres", completedAt: t0, runId: "r1", kind: .client),
                                           CompletedMissionRecord(id: "m2", title: "Own survey run", targetId: "eros", clientName: nil, targetName: "Eros", completedAt: t0 - 86_400_000, runId: "r2", kind: .program)]
            gs.player.transitSatelliteLaunchedAt = t0 - 200_000_000
            gs.player.tessClassifications = ["toi-4": TessClassification(subjectId: "toi-4", verdict: .planet, ranges: [], submittedAt: t0 - 3_600_000)]
            return MissionHistoryScreen().environment(GameStore(state: gs)).environment(\.flatLayout, true)
        },
        scene("mission-log-landscape", 402, w: 874) {
            var gs = basePlayer()
            gs.player.completedMissions = [CompletedMissionRecord(id: "m1", title: "Iron for the pad", targetId: "ceres", clientName: "Vulcan", targetName: "Ceres", completedAt: t0, runId: "r1", kind: .client),
                                           CompletedMissionRecord(id: "m2", title: "Own survey run", targetId: "eros", clientName: nil, targetName: "Eros", completedAt: t0 - 86_400_000, runId: "r2", kind: .program)]
            gs.player.transitSatelliteLaunchedAt = t0 - 200_000_000
            gs.player.tessClassifications = ["toi-4": TessClassification(subjectId: "toi-4", verdict: .planet, ranges: [], submittedAt: t0 - 3_600_000)]
            return MissionHistoryScreen().environment(GameStore(state: gs)).environment(\.flatLayout, true)
        },
        scene("mission-log-desktop", 900, w: 1440) {
            var gs = basePlayer()
            gs.player.completedMissions = [CompletedMissionRecord(id: "m1", title: "Iron for the pad", targetId: "ceres", clientName: "Vulcan", targetName: "Ceres", completedAt: t0, runId: "r1", kind: .client),
                                           CompletedMissionRecord(id: "m2", title: "Own survey run", targetId: "eros", clientName: nil, targetName: "Eros", completedAt: t0 - 86_400_000, runId: "r2", kind: .program)]
            gs.player.transitSatelliteLaunchedAt = t0 - 200_000_000
            gs.player.tessClassifications = ["toi-4": TessClassification(subjectId: "toi-4", verdict: .planet, ranges: [], submittedAt: t0 - 3_600_000)]
            return MissionHistoryScreen().environment(GameStore(state: gs)).environment(\.flatLayout, true)
        },
        scene("base-menu-phone", 874) { BaseMenu(onClose: {}, onBuild: {}).environment(GameStore(state: siloState(ore: 24))) },
        scene("base-menu-desktop", 900, w: 1440) { BaseMenu(onClose: {}, onBuild: {}).environment(GameStore(state: siloState(ore: 24))) },
        scene("hub-silo-surface-phone", 874) {
            let world = BaseWorld(w: phone, h: 874)
            return HubScreen(safeAreaOverride: EdgeInsets(top: 62, leading: 0, bottom: 34, trailing: 0), startX: world.shaftFocusX, startDepth: 0).environment(GameStore(state: siloState(ore: 24)))
        },
        scene("ledger-phone", 1900) { NarrativeLedgerScreen().environment(GameStore(state: GameState())).environment(\.flatLayout, true) },
    ] + baseWorldScenes }

    static func find(_ id: String) -> CatalogScene? { all.first { $0.id == id } }
}

/// Shown instead of RootView when the app is launched with `-scene <id>`.
/// `-scene list` prints the index on screen. DEBUG builds only.
struct SceneHost: View {
    let id: String
    var body: some View {
        if let s = SceneCatalog.find(id), id.contains("-live") || id.hasPrefix("coach-") || id.hasPrefix("try-") {
            // Full-screen, real safe areas: what a player sees, without the fixed fixture frame.
            s.make().frame(maxWidth: .infinity, maxHeight: .infinity).background(Theme.bg)
                #if os(iOS)
                .onAppear { OrientationPreference.current.apply() }
                #endif
        } else if let s = SceneCatalog.find(id) {
            ScrollView { s.make().frame(width: s.size.width, height: s.size.height) }.background(Theme.bg)
        } else {
            ScrollView { VStack(alignment: .leading, spacing: 8) {
                Text(id == "list" ? "Scenes" : "No scene \"\(id)\"").font(.headline)
                ForEach(SceneCatalog.all) { Text($0.id).font(.system(size: 15, design: .monospaced)) }
            }.padding(16) }
        }
    }

    /// The `-scene` launch argument, if present.
    static var requested: String? {
        #if DEBUG
        let a = ProcessInfo.processInfo.arguments
        if let i = a.firstIndex(of: "-scene"), a.indices.contains(i + 1) { return a[i + 1] }
        #endif
        return nil
    }
}
