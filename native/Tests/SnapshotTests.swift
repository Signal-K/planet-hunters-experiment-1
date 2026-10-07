import Testing
import SwiftUI
import SpriteKit
import LandnamCore
@testable import Landnam

/// Headless render check: writes PNGs of the real screens so layout can be
/// reviewed without launching the app on anyone's desktop.
@MainActor
struct SnapshotTests {
    private func render<V: View>(_ view: V, size: CGSize, name: String) throws {
        AppFont.register()
        let renderer = ImageRenderer(content: view.frame(width: size.width, height: size.height))
        renderer.scale = 2
        #if canImport(UIKit)
        let data = renderer.uiImage?.pngData()
        #else
        let data = renderer.nsImage.flatMap { $0.tiffRepresentation }.flatMap { NSBitmapImageRep(data: $0)?.representation(using: .png, properties: [:]) }
        #endif
        let dir = ProcessInfo.processInfo.environment["SNAPSHOT_DIR"] ?? NSTemporaryDirectory()
        try #require(data).write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).png"))
    }

    private func store() -> GameStore {
        GameStore()
    }

    @Test func hubPhone() throws {
        try render(HubScreen().environment(store()), size: CGSize(width: 402, height: 874), name: "hub-phone")
    }

    @Test func launchReviewPhone() throws {
        let st = store()
        st.go(.missions)
        let id = try #require(st.catalog.missions.first { !$0.locked }?.id)
        st.pickMission(id)
        try render(LaunchReviewScreen().environment(st).environment(\.flatLayout, true), size: CGSize(width: 402, height: 874), name: "launch-review-phone")
        #expect(st.mission != nil && st.target != nil)
    }

    @Test func debriefCapacitorPhone() throws {
        let st = store()
        st.go(.missions)
        let id = try #require(st.catalog.missions.first { !$0.locked && !$0.isOwnProgram }?.id)
        st.pickMission(id)
        try render(LaserCapacitorPanel(level: 0, haulUnits: 9, stashUnits: 9, reservedUnits: 0) {}.padding(16).environment(st),
                   size: CGSize(width: 402, height: 300), name: "debrief-capacitor-phone")
    }

    @Test func miningActionRowPhone() throws {
        let t = Targets.all.first { $0.type == .asteroid }!
        var f = MiningField(target: t, required: ["iron": 2, "silicon": 1], cargoCapacity: 6, laserTier: 1, seed: 3)
        for n in f.nodes.prefix(3) { for _ in 0..<4 { _ = f.strike(nodeId: n.id) } }
        try render(MiningActionRow(field: f, onReturn: {}, onScrub: {}).padding(16).background(Theme.bg),
                   size: CGSize(width: 402, height: 110), name: "mining-actionrow-phone")
    }

    @Test func helpSheetPhone() throws {
        let topic = try #require(Help.topic(for: .galaxy))
        try render(HelpSheet(topic: topic, onShowMe: {}, onClose: {}), size: CGSize(width: 402, height: 640), name: "help-sheet-phone")
    }

    @Test func coachMarksPhone() throws {
        let topic = try #require(Help.topic(for: .galaxy))
        let chart = CGRect(x: 16, y: 150, width: 370, height: 220)
        let view = ZStack(alignment: .topLeading) {
            Theme.bg
            RoundedRectangle(cornerRadius: 8).fill(Theme.paper).frame(width: chart.width, height: chart.height).offset(x: chart.minX, y: chart.minY)
            CoachMarks(step: topic.coach[0], index: 0, total: 2, rects: [chart], size: CGSize(width: 402, height: 640), onNext: {}, onStop: {})
        }
        try render(view, size: CGSize(width: 402, height: 640), name: "coach-marks-phone")
    }

    @Test func controlStationPhone() throws {
        var gs = GameState()
        gs.player.freeOperations = true; gs.player.deepSpaceTelescopeBuilt = true; gs.player.saturnImagerLaunchedAt = 1
        let st = GameStore(state: gs)
        let sigs = [InstrumentSignal(id: "n", kind: .deepSpace, title: "NEOCP"), InstrumentSignal(id: "s", kind: .saturn, title: "Frame")]
        try render(ControlStationScreen(signals: sigs).environment(st).environment(\.flatLayout, true).environment(\.coach, CoachController(topic: nil)),
                   size: CGSize(width: 402, height: 874), name: "control-station-phone")
    }

    @Test func saturnImagerPhone() throws {
        var gs = GameState()
        gs.player.freeOperations = true; gs.player.saturnImagerLaunchedAt = 1
        let c = Saturn.fallback[19]
        try render(SaturnStormSearchScreen(candidate: c).environment(GameStore(state: gs)).environment(offlineFeed).environment(\.flatLayout, true),
                   size: CGSize(width: 402, height: 1020), name: "saturn-imager-phone")
    }

    private var offlineFeed: FeedModel { FeedModel(feed: SharedFeed(baseURL: URL(string: "http://127.0.0.1:1")!)) }

    @Test func asteroidDiscoveryPhone() throws {
        var gs = GameState()
        gs.player.freeOperations = true; gs.player.deepSpaceTelescopeBuilt = true
        let c = AsteroidCandidate(id: "a1", tempDesig: "P22Xk4Q", score: 87, ra: 14.3562, decl: -21.8044, vMag: 21.4, arcDays: 1.8, lastSeenDays: 0.4)
        try render(AsteroidDiscoveryScreen(candidate: c).environment(GameStore(state: gs)).environment(offlineFeed).environment(\.flatLayout, true),
                   size: CGSize(width: 402, height: 1020), name: "asteroid-discovery-phone")
    }

    @Test func tessDiscoveryPhone() throws {
        var gs = GameState()
        gs.player.freeOperations = true; gs.player.transitSatelliteLaunchedAt = 1
        let c = TessCandidate(id: "tess-demo", ticId: "TIC 260004324", toi: "TOI 700.01", sector: "Sectors 1-3", periodDays: 3.4, transitEpoch: 1.1, depthPpm: 9000, signalToNoise: 14)
        let marks = [TransitRange(x1: 0.95, x2: 1.25), TransitRange(x1: 4.35, x2: 4.65)]
        try render(TessDiscoveryScreen(candidate: c, marks: marks).environment(GameStore(state: gs)).environment(offlineFeed).environment(\.flatLayout, true),
                   size: CGSize(width: 402, height: 1080), name: "tess-discovery-phone")
    }

    @Test func skyBadgesPhone() throws {
        var gs = GameState()
        gs.player.freeOperations = true; gs.player.deepSpaceTelescopeBuilt = true
        gs.player.badges = ["saturn-night-2026": PlayerBadge(eventId: "saturn-night-2026", tier: .gold, earnedAt: 1),
                            "rocket-revolution-2026": PlayerBadge(eventId: "rocket-revolution-2026", tier: .silver, earnedAt: 2)]
        try render(ControlStationScreen().environment(GameStore(state: gs)).environment(\.flatLayout, true).environment(\.coach, CoachController(topic: nil)),
                   size: CGSize(width: 402, height: 1000), name: "sky-badges-phone")
    }

    @Test func roverFieldPhone() throws {
        var p = Prospecting(requirements: ["iron": 2, "copper": 1])
        p.select("ore-a"); p.driveToSelected(); _ = p.drill(); _ = p.drill(); _ = p.drill(); p.startConstruction()
        try render(RoverFieldScreen(initial: p, deployed: true).environment(GameStore(state: GameState())), size: CGSize(width: 402, height: 874), name: "rover-field-phone")
    }

    @Test func roverTouchdownPhone() throws {
        try render(RoverFieldScreen(initial: Prospecting(requirements: ["iron": 2])).environment(GameStore(state: GameState())), size: CGSize(width: 402, height: 874), name: "rover-touchdown-phone")
    }

    @Test func hubStructuresPhone() throws {
        var gs = GameState()
        gs.player.placed = ["launchpad", "surface-silo", "refinery", "astronaut-academy"]
        gs.player.placementPlots = ["surface-silo": 0, "refinery": 1, "astronaut-academy": 3]
        try render(HubScreen().environment(GameStore(state: gs)), size: CGSize(width: 402, height: 874), name: "hub-structures-phone")
    }

    @Test func hubSkyCraftPhone() throws {
        var gs = GameState()
        gs.player.activeMission = ActiveMission(id: "m", label: "Ceres run")
        gs.player.missionPhase = .mining
        try render(HubScreen().environment(GameStore(state: gs)), size: CGSize(width: 402, height: 874), name: "hub-skycraft-phone")
    }

    // MARK: base screens (refinery, skills, academy, build, surface ops, logs)

    private func basePlayer() -> GameState {
        var gs = GameState()
        gs.player.freeOperations = true; gs.player.missionsDone = 4; gs.player.francs = 60_000_000
        gs.player.placed = ["launchpad", "surface-silo", "refinery", "astronaut-academy"]
        gs.player.placementPlots = ["launchpad": 0, "surface-silo": 1, "refinery": 2, "astronaut-academy": 3]
        gs.player.stash = ["copper": 6, "gold": 3, "aluminium": 30, "silicon": 12]
        gs.player.clientMissions = ["vulcan": 6, "helios": 11]
        gs.player.academyResearched = true; gs.player.academyFunded = true; gs.player.researchXP = 180; gs.player.skillPoints = 2
        return gs
    }
    private let t0: Double = 1_760_000_000_000

    @Test func refineryPhone() throws {
        var gs = basePlayer()
        gs = Refinery.applyStart(gs, recipeId: "refined-gold", now: t0 - 400_000)
        gs.player.refinedGoods = ["refined-copper": 2]
        try render(RefineryScreen(at: t0).environment(GameStore(state: gs, clock: { 1_760_000_000_000 })).environment(\.flatLayout, true),
                   size: CGSize(width: 402, height: 1100), name: "refinery-phone")
    }

    @Test func skillTreePhone() throws {
        var gs = basePlayer(); gs.player.unlockedSkillNodes = ["laser-charge-1"]; gs.player.tessClassifications = ["t": TessClassification(subjectId: "t", verdict: .planet, ranges: [], submittedAt: 1)]
        try render(SkillTreeScreen().environment(GameStore(state: gs)).environment(\.flatLayout, true), size: CGSize(width: 402, height: 1300), name: "skill-tree-phone")
    }

    @Test func academyPhone() throws {
        let gs = Academy.migrate(basePlayer(), now: t0)
        let st = GameStore(state: Academy.applyHire(gs, sourceId: "nasa", now: t0), clock: { 1_760_000_000_000 })
        try render(AcademyScreen(at: t0).environment(st).environment(\.flatLayout, true), size: CGSize(width: 402, height: 1000), name: "academy-phone")
    }

    @Test func buildPhone() throws {
        var gs = basePlayer(); gs.player.placed = ["launchpad"]; gs.player.placementPlots = ["launchpad": 0]
        try render(BuildScreen().environment(GameStore(state: gs)).environment(\.flatLayout, true), size: CGSize(width: 402, height: 900), name: "build-phone")
    }

    @Test func surfaceOpsPhone() throws {
        var gs = basePlayer(); gs.player.stash = ["aluminium": 4, "silicon": 6]
        gs = SurfaceOps.applyPurchaseAccess(gs, "moon-south-pole", now: t0 - 3_000_000)
        gs = SurfaceOps.applyBuildPad(gs, "moon-south-pole", pad: 1, now: t0 - 2_000_000)
        gs = SurfaceOps.applyMined(gs, "moon-south-pole", mineral: "iron", amount: 12)
        try render(SurfaceOpsScreen(at: t0).environment(GameStore(state: gs, clock: { 1_760_000_000_000 })).environment(\.flatLayout, true), size: CGSize(width: 402, height: 1400), name: "surface-ops-phone")
    }

    @Test func missionLogPhone() throws {
        var gs = basePlayer()
        gs.player.completedMissions = [CompletedMissionRecord(id: "m1", title: "Iron for the pad", targetId: "ceres", clientName: "Vulcan", targetName: "Ceres", completedAt: t0, runId: "r1", kind: .client),
                                       CompletedMissionRecord(id: "m2", title: "Own survey run", targetId: "eros", clientName: nil, targetName: "Eros", completedAt: t0 - 86_400_000, runId: "r2", kind: .program)]
        try render(MissionHistoryScreen().environment(GameStore(state: gs)).environment(\.flatLayout, true), size: CGSize(width: 402, height: 640), name: "mission-log-phone")
    }

    @Test func ledgerPhone() throws {
        try render(NarrativeLedgerScreen().environment(GameStore(state: GameState())).environment(\.flatLayout, true), size: CGSize(width: 402, height: 1900), name: "ledger-phone")
    }

    @Test func introPhone() throws {
        try render(IntroScreen().environment(GameStore(state: GameState())), size: CGSize(width: 402, height: 700), name: "intro-phone")
    }

    @Test func launchpadOperationsPhone() throws {
        var gs = basePlayer(); gs.screen = .launchpad; gs.player.missionsDone = 3
        try render(LaunchReviewScreen().environment(GameStore(state: gs)).environment(\.flatLayout, true), size: CGSize(width: 402, height: 1300), name: "launchpad-ops-phone")
    }

    @Test func tessPointingPhone() throws {
        var gs = GameState()
        gs.player.freeOperations = true; gs.player.transitSatelliteLaunchedAt = 1
        let c = TessCandidate(id: "tess-demo", ticId: "TIC 260004324", toi: "TOI 700.01", sector: "Sectors 1-3", periodDays: 3.4, transitEpoch: 1.1, depthPpm: 9000, signalToNoise: 14)
        gs.player.tessClassifications = [c.id: TessClassification(subjectId: c.id, verdict: .planet, ranges: [TransitRange(x1: 0.95, x2: 1.25)], submittedAt: 1)]
        gs.player.satelliteTargetId = "toi-2"
        let feed = offlineFeed
        feed.tess = (1...9).map { TessCandidate(id: "toi-\($0)", toi: "TOI \(100 + $0).01") }
        try render(TessDiscoveryScreen(candidate: c).environment(GameStore(state: gs)).environment(feed).environment(\.flatLayout, true),
                   size: CGSize(width: 402, height: 1300), name: "tess-pointing-phone")
    }

    @Test func hubDesktop() throws {
        try render(HubScreen().environment(store()), size: CGSize(width: 1000, height: 680), name: "hub-desktop")
    }
}

@MainActor
struct SceneSnapshotTests {
    private func write(_ scene: SKScene, name: String) throws {
        let view = SKView(frame: CGRect(origin: .zero, size: scene.size))
        view.presentScene(scene)
        let tex = try #require(view.texture(from: scene))
        let cg = tex.cgImage()
        #if canImport(UIKit)
        let data = UIImage(cgImage: cg).pngData()
        #else
        let data = NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:])
        #endif
        let dir = ProcessInfo.processInfo.environment["SNAPSHOT_DIR"] ?? NSTemporaryDirectory()
        try #require(data).write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).png"))
    }

    @Test func miningScene() throws {
        AppFont.register()
        let t = Targets.all.first { $0.type == .asteroid }!
        let f = MiningField(target: t, required: ["iron": 2, "silicon": 1], cargoCapacity: 6, laserTier: 1, seed: 3)
        let scene = MiningScene(field: f, size: CGSize(width: 402, height: 780))
        let view = SKView(frame: CGRect(origin: .zero, size: scene.size))
        view.presentScene(scene)
        scene.fire(at: CGPoint(x: 5, y: 5))
        try write(scene, name: "mining-phone")
    }

    @Test func flightScene() throws {
        AppFont.register()
        let scene = FlightScene(size: CGSize(width: 402, height: 780), returning: false, targetName: "Ceres")
        let view = SKView(frame: CGRect(origin: .zero, size: scene.size))
        view.presentScene(scene)
        scene.progress = 0.45
        try write(scene, name: "flight-phone")
    }
}

@MainActor
struct LaunchSnapshotTests {
    @Test func launchBeats() throws {
        AppFont.register()
        for (name, t) in [("launch-ignition", 3.2), ("launch-liftoff", 5.5), ("launch-separation", 7.0), ("launch-space", 11.5)] {
            let scene = LaunchScene(size: CGSize(width: 402, height: 780))
            let view = SKView(frame: CGRect(origin: .zero, size: scene.size))
            view.presentScene(scene)
            scene.seek(to: t)
            let tex = try #require(view.texture(from: scene))
            let cg = tex.cgImage()
            #if canImport(UIKit)
            let data = UIImage(cgImage: cg).pngData()
            #else
            let data = NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:])
            #endif
            let dir = ProcessInfo.processInfo.environment["SNAPSHOT_DIR"] ?? NSTemporaryDirectory()
            try #require(data).write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name)-phone.png"))
        }
    }
}
