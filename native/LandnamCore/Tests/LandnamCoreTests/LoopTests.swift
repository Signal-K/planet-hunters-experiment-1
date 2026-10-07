import Testing
import Foundation
@testable import LandnamCore

@Suite struct DataTests {
    @Test func missionBoardIsDeterministicAndPaysTheFloor() {
        let a = MissionGenerator.fullBoard(), b = MissionGenerator.fullBoard()
        #expect(a == b)
        let first = a.first { $0.id == "generated-s1-starter-bulk-1" }
        #expect(first != nil)
        #expect(first?.title == "Baseline Extraction")
        // Contract fee floor (15M) plus a capped cargo bonus (<= 18%).
        #expect((first?.payout.francs ?? 0) >= 15_000_000)
        #expect((first?.payout.francs ?? .max) <= Int(15_000_000 * 1.18) + 1)
    }

    @Test func onboardingIsAsteroidOnlyAndMineralMatched() {
        let m = MissionGenerator.generate().first { $0.sequence == 1 }!
        let targets = Targets.compatible(with: m)
        #expect(!targets.isEmpty)
        #expect(targets.allSatisfy { $0.type == .asteroid && $0.orbit <= m.requires.maxOrbit })
        #expect(targets.allSatisfy { t in m.requires.minerals.keys.allSatisfy(t.minerals.contains) })
    }

    @Test func archetypeTiersUnlockWithOrbit() {
        #expect(!Archetypes.minerals(for: .M, orbit: 1).contains("platinum"))
        #expect(Archetypes.minerals(for: .M, orbit: 2).contains("platinum"))
        #expect(Archetypes.minerals(for: .M, orbit: 4).contains("rhodium"))
    }

    @Test func freeOpsDrillTierCoversLaserAccess() {
        for m in MissionGenerator.fullBoard() {
            for id in m.requires.minerals.keys { #expect(m.requires.drillTier >= Minerals.byId[id]!.laserAccess) }
        }
    }

    @Test func sellingDipsThePriceAndHeals() {
        var s = GameState(); s.player.stash = ["platinum": 10]
        let fresh = Market.unitPrice("platinum", player: s.player, clientId: nil, now: 0).price
        let sold = Market.applySell(s, mineralId: "platinum", amount: 10, now: 0, clientId: .some(nil))
        #expect(sold.player.stash["platinum"] == nil)
        #expect(sold.player.francs > s.player.francs)
        #expect(Market.unitPrice("platinum", player: sold.player, clientId: nil, now: 0).price < fresh)
        let healed = Market.unitPrice("platinum", player: sold.player, clientId: nil, now: 3 * 60 * 60 * 1000).price
        #expect(healed == fresh)
    }

    @Test func clientPremiumOnlyOnPreferredMinerals() {
        let p = Player()
        #expect(Market.unitPrice("platinum", player: p, clientId: "helios-propulsion-depot", now: 0).premiumApplied)
        #expect(!Market.unitPrice("iron", player: p, clientId: "helios-propulsion-depot", now: 0).premiumApplied)
    }
}

@Suite struct SaveTests {
    @Test func webSaveRoundTripsAndKeepsUnportedFields() throws {
        let json = """
        {"screen":"hub","player":{"francs":1234,"missionsDone":2,"seen_planets":["eros"],
         "stash":{"iron":3},"crew":[{"id":"c1"}],"licenseGrade":"Grade II"},
         "rocket":{"chassis":"hull-mk2","propulsion":"fusion-b2","drill":"laser-t2"},
         "tutorial":false,"doneSteps":{"2":true},"futureField":{"a":[1,2]}}
        """.data(using: .utf8)!
        let state = try JSONDecoder().decode(GameState.self, from: json)
        #expect(state.screen == .hub)
        #expect(state.player.francs == 1234)
        #expect(state.player.seenPlanets == ["eros"])
        #expect(state.player.licenseGrade == .two)
        #expect(state.player.extras["crew"] != nil)
        let out = try JSONEncoder().encode(state)
        let back = try JSONDecoder().decode(GameState.self, from: out)
        #expect(back == state)
        let raw = try JSONSerialization.jsonObject(with: out) as! [String: Any]
        #expect(raw["futureField"] != nil)
        #expect((raw["player"] as! [String: Any])["seen_planets"] != nil)
        #expect((raw["player"] as! [String: Any])["crew"] != nil)
    }

    @Test func emptyAndMalformedPlayerFieldsFallBackToDefaults() throws {
        let state = try JSONDecoder().decode(GameState.self, from: #"{"player":{"francs":"oops"}}"#.data(using: .utf8)!)
        #expect(state.player.francs == Economy.startingFrancs)
        #expect(state.screen == .intro)
    }
}

@Suite struct LoopTests {
    let catalog = Catalog()
    let t0 = 1_700_000_000_000.0

    /// Plays Baseline Extraction start to finish and checks the ledger.
    @Test func firstContractFromBoardToDebrief() {
        var s = GameState()
        s.screen = .missions
        let mission = catalog.missions.first { $0.sequence == 1 }!

        s = Loop.pickMission(s, id: mission.id, catalog: catalog)
        // Explorer is free, so quick setup builds it and rolls it out to the pad.
        #expect(s.screen == .fab)
        #expect(s.player.stagedRockets.count == 1)
        #expect(s.player.stagedRockets[0].location == .launchpad)
        #expect(s.targetId != nil)

        s = Loop.launch(s, catalog: catalog, now: t0)
        #expect(s.screen == .transit)
        #expect(s.player.activeMission?.id == mission.id)
        #expect(s.player.stagedRockets.isEmpty)

        s = Loop.transitArrived(s, catalog: catalog, now: t0 + 10)
        #expect(s.screen == .mining)

        let cargo = mission.requires.minerals
        s = Loop.miningDone(s, cargo: cargo, catalog: catalog, now: t0 + 20)
        #expect(s.screen == .transit)
        #expect(s.player.returningToEarth)

        s = Loop.transitArrived(s, catalog: catalog, now: t0 + 30)
        #expect(s.screen == .debrief)
        #expect(s.player.stash == cargo)

        let payout = MissionGenerator.calibrateOnboardingPayout(raw: mission.payout.francs, missionsDone: 0)
        let before = s.player.francs
        s = Loop.debriefDone(s, payout: payout, affinity: mission.payout.affinity, consumed: cargo, catalog: catalog, now: t0 + 40)
        #expect(s.player.francs == before + payout)
        #expect(s.player.missionsDone == 1)
        #expect(s.player.stash.isEmpty)
        #expect(s.player.activeMission == nil)
        #expect(s.player.clientMissions[mission.client!] == mission.payout.affinity)
        #expect(s.player.completedMissions.count == 1)
        #expect(s.missionId == nil)
        #expect(s.screen == .hub)
        // The first payout has to be able to buy a Prospector.
        #expect(s.player.francs >= Economy.prospectorPrice)
    }

    @Test func launchRefusedWhileRocketIsStillInHangar() {
        var s = GameState(); s.screen = .missions
        s = Loop.pickMission(s, id: catalog.missions.first { $0.sequence == 1 }!.id, catalog: catalog)
        s.player.stagedRockets[0].location = .hangar
        #expect(Loop.launch(s, catalog: catalog, now: t0).screen == .fab)
    }

    @Test func quickSetupNeverSpendsFrancs() {
        var s = GameState(); s.screen = .missions
        s.player.missionsDone = 1
        let before = s.player.francs
        s = Loop.pickMission(s, id: catalog.missions.first { $0.sequence == 1 }!.id, catalog: catalog)
        #expect(s.player.francs == before)
    }

    @Test func purchaseIsRefusedWhenBroke() {
        var s = GameState(); s.screen = .rocketBuy; s.missionId = "m"; s.targetId = "eros"
        s.player.francs = 100
        let prospector = Rockets.model(id: "prospector")!
        #expect(Market.purchaseRefusal(s, rocket: prospector) != nil)
        #expect(Market.applyPurchaseRocket(s, rocket: prospector) == s)
    }

    @Test func deliveryLegHandsOffToUnloadAndHome() {
        var s = GameState()
        s.screen = .mining; s.missionId = "m"; s.targetId = "eros"; s.deliveryTargetId = "mars"
        s = Loop.miningDone(s, cargo: ["iron": 4], catalog: catalog, now: t0)
        #expect(s.player.headingToDelivery)
        s = Loop.transitArrived(s, catalog: catalog, now: t0 + 1)
        #expect(s.screen == .delivery)
        s = Loop.deliveryUnloadComplete(s, catalog: catalog, now: t0 + 2)
        #expect(s.deliveredCargo == ["iron": 4])
        #expect(s.lastCargo == [:])
        #expect(s.player.returningToEarth)
        s = Loop.transitArrived(s, catalog: catalog, now: t0 + 3)
        #expect(s.screen == .debrief)
        // Cargo was unloaded at the depot, so nothing reaches Earth storage.
        #expect(s.player.stash.isEmpty)
        #expect(s.deliveredCargo == ["iron": 4])
    }

    @Test func abandonClearsTheRun() {
        var s = GameState(); s.screen = .transit; s.missionId = "m"; s.targetId = "eros"
        s.player.activeMission = ActiveMission(id: "m", label: "x")
        s = Loop.abandonMission(s)
        #expect(s.player.activeMission == nil && s.missionId == nil && s.screen == .hub)
    }
}


@Suite struct LaserCapacitorTests {
    @Test func spendsLargestPilesAndGuardsDoubleTapAndReserve() {
        var s = GameState()
        s.player.stash = ["iron": 4, "nickel": 3, "platinum": 1]
        // Short once the owed ore is reserved: 8 held, 3 reserved, cost 6.
        #expect(LaserCapacitor.applyBuy(s, expectedLevel: 0, reservedUnits: 3).player.laserCapacitorLevel == 0)
        let bought = LaserCapacitor.applyBuy(s, expectedLevel: 0)
        #expect(bought.player.laserCapacitorLevel == 1)
        #expect(LaserCapacitor.units(bought.player.stash) == 2)
        #expect(LaserCapacitor.applyBuy(bought, expectedLevel: 0).player.laserCapacitorLevel == 1)
        #expect(LaserCapacitor.bonus(1) == 4 && LaserCapacitor.bonus(3) == 12 && LaserCapacitor.bonus(0) == 0)
    }
}

@Suite struct HelpTests {
    @Test func topicsHaveBoundedCardsAndResolvableAnchors() {
        for (_, t) in Help.topics {
            #expect((Help.minCards...Help.maxCards).contains(t.cards.count))
            for s in t.coach { #expect(s.targets.contains(s.anchor)) }
        }
        #expect(Help.topic(for: .hub) == nil)
    }

    @Test func coachRunAdvancesOnlyOnItsAction() {
        var run = CoachRun(topic: Help.topic(for: .galaxy))
        #expect(!run.isActive)
        run.complete(action: "mark"); #expect(!run.isActive)
        run.start(); #expect(run.current?.id == "mark")
        run.complete(action: "verdict"); #expect(run.current?.id == "mark")
        run.complete(action: "mark"); #expect(run.current?.id == "verdict")
        run.complete(action: "mark"); #expect(run.current?.id == "verdict")
        run.advance(); #expect(!run.isActive)
    }
}
