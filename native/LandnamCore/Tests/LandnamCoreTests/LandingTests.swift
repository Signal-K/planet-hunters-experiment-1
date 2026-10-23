import Testing
import Foundation
@testable import LandnamCore

/// SSL-666: the lander leg runs on native the way web runs it (arrival descends, mining ascends, redock flies home).
@Suite struct LandingTests {
    let catalog = Catalog()
    let t0 = 1_700_000_000_000.0

    private var laserMission: Mission {
        catalog.missions.first { $0.onWorldVehicle == nil && $0.construction == nil && $0.payload == nil && $0.deliveryTargetId == nil }!
    }

    private func arrival(lander: Bool = true) -> GameState {
        var s = GameState()
        s.screen = .transit; s.missionId = laserMission.id; s.targetId = "eros"
        s.player.missionsDone = 4
        s.player.missionPhase = .transit
        if lander { s.player.shipCustomizerParts["lander"] = "lander-module-t1" }
        return s
    }

    @Test func arrivalWithALanderDescendsOnTheClock() {
        let s = Loop.transitArrived(arrival(), catalog: catalog, now: t0)
        #expect(s.screen == .landing && s.player.missionPhase == .landing)
        #expect(s.player.landingStartedAt == t0)
        #expect(Landing.mode(s.player) == .descend)
        #expect(Landing.progress(s.player, now: t0 + 4_000) == 0.5)
        #expect(Landing.remainingMs(s.player, now: t0 + 4_000) == 4_000)
        #expect(Loop.transitArrived(arrival(lander: false), catalog: catalog, now: t0).screen == .mining)
    }

    @Test func theStarterRoverDrivesOffInsteadOfLanding() {
        var s = arrival()
        s.missionId = catalog.missions.first { $0.id.contains("freeops-rover-landing") }!.id
        #expect(Loop.transitArrived(s, catalog: catalog, now: t0).screen == .roverSurvey)
    }

    @Test func touchdownHandsOverToTheShipLaser() {
        let s = Loop.landingComplete(Loop.transitArrived(arrival(), catalog: catalog, now: t0), catalog: catalog, now: t0 + 8_000)
        #expect(s.screen == .mining && s.player.missionPhase == .mining)
        #expect(s.player.hasLanded == true && s.player.landingStartedAt == nil)
    }

    @Test func miningWithALanderAscendsThenFliesHome() {
        var s = Loop.landingComplete(Loop.transitArrived(arrival(), catalog: catalog, now: t0), catalog: catalog, now: t0 + 8_000)
        s = Loop.miningDone(s, cargo: ["iron": 3], catalog: catalog, now: t0 + 60_000)
        #expect(s.screen == .landing && Landing.mode(s.player) == .ascend)
        #expect(s.player.landingReturnStartedAt == t0 + 60_000)
        #expect(s.player.miningCargoInProgress == ["iron": 3])
        s = Loop.landingComplete(s, catalog: catalog, now: t0 + 68_000)
        #expect(s.screen == .transit && s.player.returningToEarth)
        #expect(s.lastCargo == ["iron": 3] && s.player.miningCargoInProgress == nil && s.player.landingReturnStartedAt == nil)
        // The trip home is the short playable flight (SSL-553), not a clock.
        #expect(s.player.arrivalAt == nil)
        s = Loop.transitArrived(s, catalog: catalog, now: t0 + 72_000)
        #expect(s.screen == .debrief && s.player.stash["iron"] == 3)
    }

    @Test func redockWithADeliveryLegRunsTheDeliveryClock() {
        var s = arrival()
        s.deliveryTargetId = "mars"; s.player.freeOperations = true
        s = Loop.landingComplete(Loop.transitArrived(s, catalog: catalog, now: t0), catalog: catalog, now: t0 + 8_000)
        s = Loop.miningDone(s, cargo: ["iron": 4], catalog: catalog, now: t0 + 20_000)
        s = Loop.landingComplete(s, catalog: catalog, now: t0 + 28_000)
        #expect(s.screen == .transit && s.player.headingToDelivery)
        #expect(s.player.transitStartedAt == t0 + 28_000)
        #expect((s.player.arrivalAt ?? 0) > t0 + 28_000)
    }

    @Test func aWebSaveSyncedMidAscentRedocksInsteadOfMiningAgain() throws {
        let json = """
        {"screen":"landing","missionId":"\(laserMission.id)","targetId":"eros",
         "player":{"missionsDone":4,"missionPhase":"landing","landingReturnStartedAt":\(t0),
          "shipCustomizerParts":{"lander":"lander-module-t1"},"miningCargoInProgress":{"iron":2}}}
        """.data(using: .utf8)!
        let s = try JSONDecoder().decode(GameState.self, from: json)
        #expect(Landing.mode(s.player) == .ascend && Landing.progress(s.player, now: t0 + 2_000) == 0.25)
        let out = Loop.landingComplete(s, catalog: catalog, now: t0 + 8_000)
        #expect(out.screen == .transit && out.lastCargo == ["iron": 2])
    }

    @Test func aDescentSavedWithoutAClockIsAlreadyDue() throws {
        let json = """
        {"screen":"landing","missionId":"\(laserMission.id)","targetId":"eros",
         "player":{"missionsDone":4,"missionPhase":"landing","shipCustomizerParts":{"lander":"lander-module-t1"}}}
        """.data(using: .utf8)!
        let s = try JSONDecoder().decode(GameState.self, from: json)
        #expect(Landing.progress(s.player, now: t0) == 1 && Landing.remainingMs(s.player, now: t0) == 0)
        #expect(Loop.landingComplete(s, catalog: catalog, now: t0).screen == .mining)
    }

    @Test func landingCompleteOnlyActsOnTheLandingScreen() {
        let s = arrival()
        #expect(Loop.landingComplete(s, catalog: catalog, now: t0) == s)
    }
}
