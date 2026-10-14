import Testing
@testable import LandnamCore

@MainActor
struct FlightPlanTests {
    @Test func scanClassificationCompletesScanTry() {
        var gs = GameState(); gs.player.flightPlan.complete("mining")
        let store = GameStore(state: gs)
        store.classifyTess("training-tess-1", verdict: .planet, ranges: [TransitRange(x1: 1, x2: 1.2)], candidate: Tess.trainingCandidate)
        #expect(store.player.flightPlan.completed["scan"] == true)
        #expect(store.player.discoveredExoplanetTargets.isEmpty)
        #expect(!store.player.freeOperations)
    }

    @Test func hangarFitCompletesPartAndOpensFreeOpsOnlyWhenAllTriesDone() {
        var gs = GameState(); gs.player.flightPlan.complete("mining"); gs.player.flightPlan.complete("scan")
        let store = GameStore(state: gs)
        store.fitHangarModules(["engine": "ion-thruster-t1"])
        #expect(store.player.flightPlan.completed["part"] != true, "every stage must be fitted")
        store.fitHangarModules(["engine": "ion-thruster-t1", "booster": "strap-booster-t1", "cockpit": "cockpit-command-t1", "payload": "cargo-payload-t1"])
        #expect(store.player.flightPlan.completed["part"] == true)
        #expect(store.player.freeOperations && !store.state.tutorial)
    }

    @Test func threeContractsAloneDoNotOpenFreeOps() {
        var p = Player(); p.missionsDone = 3
        #expect(!Transitions.freeOperationsUnlocked(p))
    }

    @Test func coachNamesLaunchpadPlacementFirst() {
        let p = Player()
        let c = FlightPlan.coach(p, screen: .hub)
        #expect(c?.kicker == "MINING OPS · STEP 1/6" && c?.objective == "Place the launchpad" && c?.go?.screen == .build)
        var placed = p; placed.placed = ["launchpad"]
        #expect(FlightPlan.coach(placed, screen: .launchpad)?.objective == "Open client contracts")
        placed.flightPlan.complete("mining")
        #expect(FlightPlan.coach(placed, screen: .hub)?.kicker == "SCAN OPS · STEP 2/3")
        #expect(FlightPlan.coach(placed, screen: .mining)?.objective == "Fire the laser on a seam")
        #expect(FlightPlan.coach(p, screen: .mining)?.kicker == "MINING OPS · STEP 5/6")
    }

    @Test func patchShelfTracksPlayableMilestones() {
        let p = Player()
        #expect(FlightPlan.patchProgress(p, screen: .mining, tryId: "mining") == .init(stitched: 4, total: 6))
        #expect(FlightPlan.patchProgress(p, screen: .delivery, tryId: "mining") == .init(stitched: 5, total: 6))
        #expect(FlightPlan.patchProgress(p, screen: .hub, tryId: "scan") == .init(stitched: 0, total: 2))
        var scanned = p; scanned.flightPlan.complete("mining")
        #expect(FlightPlan.patchProgress(scanned, screen: .galaxy, tryId: "scan") == .init(stitched: 1, total: 2))
        scanned.flightPlan.complete("scan")
        scanned.flightPlan.complete("part")
        #expect(FlightPlan.patchProgress(scanned, screen: .hangar, tryId: "part") == .init(stitched: 2, total: 2))
    }

    @Test func transitEntryKind() {
        var p = Player()
        p.tessClassifications["s1"] = TessClassification(subjectId: "s1", verdict: .planet, ranges: [], submittedAt: 5)
        #expect(MissionLog.entries(p).first?.kind == .transit)
    }

    /// SSL-576: storage lesson mirrors web STORAGE_STEPS and never gates Free Ops.
    @Test func storageLessonGuidesSiloThenStoreThenSellLater() {
        var gs = GameState()
        gs.player.placed = ["launchpad"]; gs.player.missionsDone = 1; gs.player.freeOperations = true
        #expect(FlightPlan.storageCoach(gs, screen: .hub) == nil)
        gs.player.missionsDone = 2
        #expect(FlightPlan.coach(gs, screen: .hub)?.kicker == "STORAGE OPS · STEP 1/4")
        #expect(FlightPlan.coach(gs, screen: .build)?.kicker == "STORAGE OPS · STEP 2/4")
        #expect(FlightPlan.awaitingStorageSilo(gs))
        gs.player.placed.append("surface-silo")
        #expect(!FlightPlan.awaitingStorageSilo(gs))
        let store = GameStore(state: gs)
        #expect(FlightPlan.coach(store.state, screen: .hub)?.go?.completesStep == 42)
        store.completeStep(42)
        let sell = FlightPlan.coach(store.state, screen: .hub)
        #expect(sell?.kicker == "STORAGE OPS · STEP 4/4")
        #expect(sell?.radio.contains("Exchange") == true)
        store.completeStep(43)
        #expect(FlightPlan.coach(store.state, screen: .hub) == nil)
    }
}
