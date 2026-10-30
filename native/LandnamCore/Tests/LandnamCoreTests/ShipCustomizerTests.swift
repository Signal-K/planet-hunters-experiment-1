import Testing
import Foundation
@testable import LandnamCore

/// SSL-667: the native Hangar fits the same rooms, parts and prices as web, so the Lander Module is reachable.
@MainActor @Suite struct ShipCustomizerTests {
    private let starter = ["engine": "ion-thruster-t1", "booster": "strap-booster-t1", "cockpit": "cockpit-command-t1", "payload": "cargo-payload-t1"]

    @Test func theHullGrowsRoomsWithMissionsAndResearch() {
        #expect(ShipCustomizer.sequence(missionsDone: 0, landingResearched: true).count == 4)
        #expect(ShipCustomizer.sequence(missionsDone: 2, landingResearched: true).count == 6)
        #expect(!ShipCustomizer.sequence(missionsDone: 3, landingResearched: true).contains("lander"))
        let four = ShipCustomizer.sequence(missionsDone: 4, landingResearched: true)
        #expect(four.count == 8 && four.last == "lander")
        #expect(ShipCustomizer.sequence(missionsDone: 6, landingResearched: true).suffix(3) == ["docking-port", "heat-shield", "lander"])
    }

    @Test func partTiersUnlockByMissionsDone() {
        #expect(ShipCustomizer.parts(for: "engine", missionsDone: 0).map(\.id) == ["ion-thruster-t1", "pulse-thruster-t1"])
        #expect(ShipCustomizer.parts(for: "engine", missionsDone: 4).count == 4)
        #expect(ShipCustomizer.parts(for: "lander", missionsDone: 3).isEmpty)
        #expect(ShipCustomizer.parts(for: "lander", missionsDone: 4).map(\.price) == [5_500_000])
        // Every room a hull can have has at least one part once it appears.
        for kind in ShipCustomizer.sequence(missionsDone: 6, landingResearched: true) {
            #expect(!ShipCustomizer.parts(for: kind, missionsDone: 6).isEmpty, "\(kind) has no parts at 6 missions")
        }
    }

    @Test func fittingChargesTheNetChangeLikeWeb() {
        var gs = GameState(); gs.player.francs = 9_000_000
        let store = GameStore(state: gs)
        store.fitHangarModules(starter)
        #expect(store.player.francs == 9_000_000 - 6_000_000)
        // Swapping one room pays only the difference.
        var swap = starter; swap["engine"] = "pulse-thruster-t1"
        store.fitHangarModules(swap)
        #expect(store.player.francs == 3_000_000 - 400_000)
        #expect(store.player.shipCustomizerParts["engine"] == "pulse-thruster-t1")
    }

    @Test func aFitTheBudgetCannotCoverIsRefused() {
        var gs = GameState(); gs.player.francs = 1_000_000
        let store = GameStore(state: gs)
        store.fitHangarModules(starter)
        #expect(store.player.shipCustomizerParts.isEmpty && store.player.francs == 1_000_000)
    }

    @Test func researchedLandingPutsTheLanderInTheHangarAtFourMissions() {
        var gs = GameState(); gs.player.missionsDone = 4; gs.player.researchXP = 150; gs.player.francs = 200_000_000
        let store = GameStore(state: gs)
        store.researchLanding()
        #expect(store.player.landingResearched && store.player.researchXP == 50)
        var fit: [String: String] = [:]
        for kind in ShipCustomizer.sequence(for: store.player) { fit[kind] = ShipCustomizer.parts(for: kind, missionsDone: 4).first?.id }
        // Without the lander room the fit is incomplete.
        var short = fit; short["lander"] = nil
        store.fitHangarModules(short)
        #expect(store.player.shipCustomizerParts["lander"] == nil && store.player.francs == 200_000_000)
        store.fitHangarModules(fit)
        #expect(Landing.hasLander(store.player))
    }
}
