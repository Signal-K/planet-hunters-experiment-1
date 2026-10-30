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

    @Test func replayedTrainingTryPaysAfterItsRealCompletion() {
        var gs = GameState()
        gs.player.flightPlan.completed = ["mining": true, "scan": true, "part": true]
        gs.player.francs = 500
        gs.player.researchXP = 20
        gs.player.stash = ["iron": 1]
        let store = GameStore(state: gs)

        store.replayTry("scan")
        store.classifyTess("training-tess-1", verdict: .planet, ranges: [TransitRange(x1: 1, x2: 1.2)], candidate: Tess.trainingCandidate)

        #expect(store.player.francs == 500 + FlightPlan.replayFrancs)
        #expect(store.player.researchXP == 20 + FlightPlan.replayResearchXP)
        #expect(store.player.stash["iron"] == 1 + FlightPlan.replayIron)
        #expect(store.player.flightPlan.replayTry == nil)
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

    @Test func guideStaysOfferedInFreeOpsUntilTheTriesAreDone() {
        var p = Player(); p.placed = ["launchpad"]; p.freeOperations = true
        #expect(FlightPlan.coach(p, screen: .hub)?.kicker == "MINING OPS · STEP 2/5")
        for id in FlightPlanProgress.tryIds { p.flightPlan.complete(id) }
        #expect(FlightPlan.coach(p, screen: .hub, includeHidden: true) == nil)
    }

    @Test func coachNamesLaunchpadPlacementFirst() {
        let p = Player()
        let c = FlightPlan.coach(p, screen: .hub)
        #expect(c?.kicker == "MINING OPS · STEP 1/5" && c?.objective == "Place the launchpad" && c?.go?.screen == .build)
        let intro = FlightPlan.coach(p, screen: .intro)
        #expect(intro?.objective == "Choose where to build" && intro?.go == nil)
        var placed = p; placed.placed = ["launchpad"]
        let padded = placed
        #expect(FlightPlan.coach(placed, screen: .launchpad)?.objective == "Open client contracts")
        placed.flightPlan.complete("mining")
        #expect(FlightPlan.coach(placed, screen: .hub)?.kicker == "SCAN OPS · STEP 2/3")
        placed.flightPlan.hidden = true
        #expect(FlightPlan.coach(placed, screen: .hub) == nil)
        #expect(FlightPlan.coach(placed, screen: .hub, includeHidden: true)?.kicker == "SCAN OPS · STEP 2/3")
        placed.flightPlan.hidden = false
        #expect(FlightPlan.coach(placed, screen: .mining)?.objective == "Fire the laser on a seam")
        #expect(FlightPlan.coach(padded, screen: .mining)?.kicker == "MINING OPS · STEP 4/5")
        #expect(FlightPlan.coach(padded, screen: .targets)?.objective == "Prepare the vehicle and launch")
        #expect(FlightPlan.coach(padded, screen: .roverSurvey)?.objective == "Prepare the vehicle and launch")
        for screen in [Screen.transit, .landing, .delivery] { #expect(FlightPlan.coach(padded, screen: screen) == nil) }
    }

    @Test func patchShelfTracksPlayableMilestones() {
        var p = Player(); p.placed = ["launchpad"]
        #expect(FlightPlan.patchProgress(p, screen: .mining, tryId: "mining") == .init(stitched: 3, total: 5))
        #expect(FlightPlan.patchProgress(p, screen: .debrief, tryId: "mining") == .init(stitched: 4, total: 5))
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
}

@Suite struct CoachPathTests {
    @Test func coachStepsAsideOffItsPath() {
        var p = Player(); p.placed = ["launchpad"]
        #expect(FlightPlan.onPath(p, screen: .hub))
        #expect(FlightPlan.onPath(p, screen: .missions))
        #expect(FlightPlan.onPath(p, screen: .mining))
        #expect(!FlightPlan.onPath(p, screen: .missionHistory))
        #expect(!FlightPlan.onPath(p, screen: .market))
        p.flightPlan.completed["mining"] = true
        #expect(FlightPlan.onPath(p, screen: .galaxy))
        #expect(!FlightPlan.onPath(p, screen: .hangar))
        p.flightPlan.completed["scan"] = true
        #expect(FlightPlan.onPath(p, screen: .hangar))
    }
}
