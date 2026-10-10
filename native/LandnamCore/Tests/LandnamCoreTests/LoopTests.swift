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
         "stash":{"iron":3},"roverDeployments":[{"roverId":"r1"}],"licenseGrade":"Grade II"},
         "rocket":{"chassis":"hull-mk2","propulsion":"fusion-b2","drill":"laser-t2"},
         "tutorial":false,"doneSteps":{"2":true},"futureField":{"a":[1,2]}}
        """.data(using: .utf8)!
        let state = try JSONDecoder().decode(GameState.self, from: json)
        #expect(state.screen == .hub)
        #expect(state.player.francs == 1234)
        #expect(state.player.seenPlanets == ["eros"])
        #expect(state.player.licenseGrade == .two)
        #expect(state.player.extras["roverDeployments"] != nil)
        let out = try JSONEncoder().encode(state)
        let back = try JSONDecoder().decode(GameState.self, from: out)
        #expect(back == state)
        let raw = try JSONSerialization.jsonObject(with: out) as! [String: Any]
        #expect(raw["futureField"] != nil)
        #expect((raw["player"] as! [String: Any])["seen_planets"] != nil)
        #expect((raw["player"] as! [String: Any])["roverDeployments"] != nil)
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

    @Test func roverFieldFinishesTheSurfaceContract() {
        var s = GameState()
        s.screen = .roverMining; s.missionId = "m"; s.targetId = "eros"
        let done = Loop.roverMiningDone(s, cargo: ["iron": 2], catalog: catalog, now: t0)
        #expect(done.screen == .transit && done.player.returningToEarth && done.lastCargo == ["iron": 2])
        // The laser field entry point must still refuse a rover run.
        #expect(Loop.miningDone(s, cargo: ["iron": 2], catalog: catalog, now: t0) == s)
    }

    @Test func roverCargoMeetingTheOrderReachesDebrief() {
        let order: Cargo = ["iron": 2]
        var p = Prospecting(requirements: order)
        _ = p.tapOutcrop("ore-a"); _ = p.tapOutcrop("ore-a")
        #expect(p.canReturn && p.cargo == order)
        var s = GameState()
        s.screen = .roverMining; s.missionId = "m"; s.targetId = "eros"
        let transit = Loop.roverMiningDone(s, cargo: p.cargo, catalog: catalog, now: t0)
        let debrief = Transitions.applyReturnArrived(transit)
        #expect(debrief.screen == .debrief)
        #expect(order.allSatisfy { (debrief.lastCargo?[$0.key] ?? 0) >= $0.value })
        #expect(debrief.player.stash["iron"] == 2)
    }

    @Test func shortRoverCargoIsKeptNotDropped() {
        var s = GameState()
        s.screen = .roverMining; s.missionId = "m"; s.targetId = "eros"
        let debrief = Transitions.applyReturnArrived(Loop.roverMiningDone(s, cargo: ["iron": 1], catalog: catalog, now: t0))
        #expect(debrief.screen == .debrief && debrief.lastCargo == ["iron": 1])
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

@Suite struct ControlStationTests {
    @Test func listsNothingBeforeFreeOperations() {
        let m = ControlStation.build(player: Player(), signals: [], bodyId: "all")
        #expect(m.groups.isEmpty && m.emptyLabel == "Equipment links once Free Operations is open.")
    }
    @Test func aBuiltGroundTelescopeReadsTheDeepSpaceFeed() {
        var p = Player(); p.freeOperations = true; p.placed = ["ground-telescope"]
        let sig = InstrumentSignal(id: "a", kind: .deepSpace, title: "NEOCP")
        var m = ControlStation.build(player: p, signals: [sig], bodyId: "all")
        #expect(m.groups.count == 1 && m.groups[0].rows[0].status == "Standing by" && m.groups[0].rows[0].open == nil && !m.groups[0].rows[0].buildPrompt)
        #expect(m.markers.map(\.equipmentId) == ["ground-telescopes"])
        p.deepSpaceTelescopeBuilt = true
        m = ControlStation.build(player: p, signals: [sig], bodyId: "all")
        #expect(m.groups.flatMap(\.rows).filter { $0.open != nil }.count == 2)
        #expect(m.filters.map(\.id) == ["all", "earth"])
    }
    @Test func groundTelescopesAreABuildPromptUntilBuilt() {
        var p = Player(); p.freeOperations = true
        let m = ControlStation.build(player: p, signals: [InstrumentSignal(id: "a", kind: .deepSpace, title: "NEOCP")], bodyId: "all")
        let rows = m.groups.flatMap(\.rows)
        #expect(rows.count == 1)
        #expect(rows[0].equipmentId == "ground-telescopes" && rows[0].status == "None built" && rows[0].buildPrompt)
        #expect(!rows[0].live && rows[0].readyCount == 0 && rows[0].open == nil)
        #expect(!rows.contains { $0.status == "Standing by" })
        #expect(m.markers.isEmpty && m.emptyLabel == nil)
    }
    @Test func worldSpaceWeekBadgesAreFlaggedOnTheInstrumentsThatServeThem() {
        var p = Player(); p.freeOperations = true; p.placed = ["ground-telescope"]; p.saturnImagerLaunchedAt = 5
        let oct8 = SkyEvents.utc(2026, 10, 8) + 43_200_000
        p.badges["saturn-night-2026"] = PlayerBadge(eventId: "saturn-night-2026", tier: .gold, earnedAt: oct8)
        let m = ControlStation.build(player: p, signals: [], bodyId: "all", now: oct8)
        let saturn = m.groups.flatMap(\.rows).first { $0.equipmentId == "saturn-imager" }
        #expect(saturn?.wsw.map(\.label) == ["Saturn Gold earned"])
        #expect(m.skyBadges.map(\.category) == ["Launch", "Saturn", "Meteor"])
        let oct10 = SkyEvents.utc(2026, 10, 10) + 43_200_000
        #expect(ControlStation.build(player: p, signals: [], bodyId: "all", now: oct10).skyBadges.map(\.label)
                == ["Launch Gold open", "Saturn Gold earned", "Meteor Gold open", "New Moon Gold open"])
    }
    @Test func saturnAppearsAfterLaunchAndFilters() {
        var p = Player(); p.freeOperations = true; p.saturnImagerLaunchedAt = 5
        let m = ControlStation.build(player: p, signals: [InstrumentSignal(id: "s", kind: .saturn, title: "Frame")], bodyId: "saturn")
        #expect(m.groups.count == 1 && m.groups[0].rows[0].status == "Frame ready" && m.groups[0].rows[0].readyCount == 1)
        #expect(ControlStation.build(player: p, signals: [], bodyId: "mars").activeBodyId == "all")
    }
}

@Suite struct SkyCraftTests {
    @Test func noCraftWhenIdle() {
        #expect(SkyCraft.current(for: Player(), now: 0) == nil)
    }
    @Test func waitingOnPadOpensLaunchpad() {
        var p = Player(); p.pendingLaunch = true
        let c = SkyCraft.current(for: p, now: 0)
        #expect(c?.state == .waiting && c?.opens == .launchpad)
    }
    @Test func flyingThenArrivedThenMining() {
        var p = Player(); p.activeMission = ActiveMission(id: "m", label: "Job"); p.missionPhase = .transit; p.arrivalAt = 100
        #expect(SkyCraft.current(for: p, now: 50)?.state == .transit)
        #expect(SkyCraft.current(for: p, now: 150)?.state == .arrived)
        p.missionPhase = .mining
        let m = SkyCraft.current(for: p, now: 150)
        #expect(m?.state == .mining && m?.opens == .mining)
    }
}

@Suite struct WorldSpaceWeekTests {
    let oct8 = SkyEvents.utc(2026, 10, 8) + 43_200_000, oct12 = SkyEvents.utc(2026, 10, 12) + 43_200_000

    @Test func isLiveFromFourOctUntilTheEndOfTenOct() {
        #expect(!WorldSpaceWeek.isLive(SkyEvents.utc(2026, 10, 3) + 82_800_000))
        #expect(WorldSpaceWeek.isLive(SkyEvents.utc(2026, 10, 4)))
        #expect(WorldSpaceWeek.isLive(SkyEvents.utc(2026, 10, 10) + 86_340_000))
        #expect(!WorldSpaceWeek.isLive(SkyEvents.utc(2026, 10, 11)))
        #expect(WorldSpaceWeek.chip("orionids-2026", badges: [:], now: oct8) == nil)
    }
    @Test func everyMissionCarriesLaunchAndAddsTheCategoryItsTypeServes() throws {
        let board = MissionGenerator.fullBoard()
        var mining = try #require(board.first { $0.payload == nil && $0.construction == nil })
        #expect(WorldSpaceWeek.eventIds(for: mining) == ["rocket-revolution-2026", "draconids-2026"])
        mining.payload = MissionPayload(type: .satellite, name: "Saturn", cargoCost: 1, instrumentId: "saturn-imager")
        #expect(WorldSpaceWeek.eventIds(for: mining) == ["rocket-revolution-2026", "saturn-night-2026"])
        mining.payload = MissionPayload(type: .deepSpaceSurvey, name: "DST", cargoCost: 1, instrumentId: "deep-space-telescope")
        #expect(WorldSpaceWeek.eventIds(for: mining) == ["rocket-revolution-2026", "new-moon-hunt-2026-10"])
        mining.payload = MissionPayload(type: .rover, name: "Rover", cargoCost: 1, instrumentId: nil)
        #expect(WorldSpaceWeek.eventIds(for: mining) == ["rocket-revolution-2026"])
    }
    @Test func chipsShowGoldOpenThenSilverOpenThenTheEarnedTier() throws {
        let m = try #require(MissionGenerator.fullBoard().first { $0.payload == nil && $0.construction == nil })
        #expect(WorldSpaceWeek.chips(for: m, badges: [:], now: oct8).map(\.label) == ["Launch Gold open", "Meteor Gold open"])
        #expect(WorldSpaceWeek.chips(for: m, badges: [:], now: oct12).map(\.label) == ["Launch Silver open", "Meteor Silver open"])
        let silver = ["rocket-revolution-2026": PlayerBadge(eventId: "rocket-revolution-2026", tier: .silver, earnedAt: oct12)]
        #expect(WorldSpaceWeek.chip("rocket-revolution-2026", badges: silver, now: oct8)?.state == .silverEarned)
        #expect(WorldSpaceWeek.chip("new-moon-hunt-2026-10", badges: [:], now: oct8) == nil)
    }
    @Test func bannerSummarisesTheWeekAndAfter() {
        let gold = ["saturn-night-2026": PlayerBadge(eventId: "saturn-night-2026", tier: .gold, earnedAt: oct8)]
        #expect(WorldSpaceWeek.banner(badges: gold, now: oct8) == .init(live: true, title: "World Space Week 4-10 OCT", detail: "Gold badges while it runs. Silver after.", earned: 1, total: 4))
        #expect(WorldSpaceWeek.banner(badges: gold, now: oct12).title == "World Space Week ended")
    }
}

@Suite struct MissionLogTests {
    @Test func aClassifiedTransitIsLoggedWithItsVerdictAndTime() {
        var p = Player()
        p.completedMissions = [CompletedMissionRecord(id: "m", title: "Iron Run", clientName: "Meridian", completedAt: 100, runId: "r", kind: .client)]
        p.tessClassifications = [
            "toi-1": TessClassification(subjectId: "toi-1", verdict: .planet, ranges: [], submittedAt: 200),
            "training-tess-toi-7001": TessClassification(subjectId: "training-tess-toi-7001", verdict: .planet, ranges: [], submittedAt: 300),
        ]
        let entries = MissionLog.entries(p)
        #expect(entries.map(\.title) == ["Transit classified", "Iron Run"])
        #expect(entries[0].meta == "TRANSIT TELESCOPE · Planet candidate" && entries[0].isTransit)
        #expect(entries[1].meta == "Meridian" && !entries[1].isTransit)
    }
}

@Suite struct CloudReconcileTests {
    @Test func aStaleRemoteDoesNotEraseLocalInstrumentWork() {
        var local = GameState(); local.player.missionsDone = 4
        local.player.transitSatelliteLaunchedAt = 1_000
        local.player.tessClassifications = ["toi-1": TessClassification(subjectId: "toi-1", verdict: .planet, ranges: [], submittedAt: 2_000)]
        local.player.badges = ["rocket-revolution-2026": PlayerBadge(eventId: "rocket-revolution-2026", tier: .gold, earnedAt: 3_000)]
        var remote = GameState(); remote.player.missionsDone = 6
        remote.player.badges = ["rocket-revolution-2026": PlayerBadge(eventId: "rocket-revolution-2026", tier: .silver, earnedAt: 9_000)]
        let n = CloudPull.reconcile(remote: remote, keeping: local)
        #expect(n.player.missionsDone == 6)
        #expect(n.player.transitSatelliteLaunchedAt == 1_000)
        #expect(n.player.tessClassifications.keys.sorted() == ["toi-1"])
        #expect(n.player.badges["rocket-revolution-2026"]?.tier == .gold)
    }
    @Test func remoteInstrumentWorkSurvivesToo() {
        var local = GameState(); local.player.missionsDone = 4
        var remote = GameState(); remote.player.missionsDone = 6
        remote.player.saturnImagerLaunchedAt = 700
        remote.player.tessClassifications = ["toi-7": TessClassification(subjectId: "toi-7", verdict: .unsure, ranges: [], submittedAt: 600)]
        let n = CloudPull.reconcile(remote: remote, keeping: local)
        #expect(n.player.saturnImagerLaunchedAt == 700 && n.player.tessClassifications.keys.sorted() == ["toi-7"])
    }
}
