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

    @Test func hubSkyCraftPhone() throws {
        var gs = GameState()
        gs.player.activeMission = ActiveMission(id: "m", label: "Ceres run")
        gs.player.missionPhase = .mining
        try render(HubScreen().environment(GameStore(state: gs)), size: CGSize(width: 402, height: 874), name: "hub-skycraft-phone")
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
