import Testing
import Foundation
@testable import LandnamCore

@Suite struct AcademyTests {
    let now: Double = 1_760_000_000_000   // a Sunday UTC
    func built() -> GameState {
        var s = GameState()
        s.player.placed = ["astronaut-academy"]; s.player.academyResearched = true; s.player.academyFunded = true
        s.player.francs = 100_000_000
        s.player.clientMissions = ["a": 5, "b": 10]
        return Academy.migrate(s, now: now)
    }

    @Test func migrationGrantsStartingCrewOnce() {
        let s = built()
        #expect(s.player.crew.count == 3)
        #expect(Academy.migrate(s, now: now) == s)
        #expect(s.player.crew.filter { $0.crewClass == .rover }.first?.name == "Rover 01")
    }

    @Test func namesAreDeterministicAndUnique() {
        let a = Academy.pickName(id: "crew-hire-1", crewClass: .astronaut, taken: [])
        #expect(a == Academy.pickName(id: "crew-hire-1", crewClass: .astronaut, taken: []))
        let taken = [Academy.createMember(id: "x", crewClass: .astronaut, name: a, selfTrained: true, now: now)]
        #expect(Academy.pickName(id: "crew-hire-1", crewClass: .astronaut, taken: taken) != a)
    }

    @Test func hiringChargesEscalatesAndCapsAtTwoAWeek() {
        var s = built()
        s = Academy.applyHire(s, sourceId: "nasa", now: now)
        #expect(s.player.francs == 100_000_000 - 1_500_000)
        #expect(s.player.crew.last?.name != nil && Academy.crewLevel(s.player.crew.last!) == 3)
        #expect(Academy.hireCost(s.player) == 2_400_000)
        s = Academy.applyHire(s, sourceId: "esa", now: now + 1000)
        #expect(Academy.hireBlock(s.player, sourceId: "jaxa", now: now + 2000) == .weeklyCap)
        #expect(Academy.hireBlock(s.player, sourceId: "jaxa", now: now + 8 * Academy.dayMs) == nil)
    }

    @Test func clientSourcesNeedAffinityLevelTwo() {
        var s = built(); s.player.clientMissions = [:]
        #expect(Academy.sources(for: s.player).allSatisfy { $0.isAgency })
        #expect(Academy.affinityUnlocked(built().player))
    }

    @Test func trainingRunsADayThenPromotesACandidate() {
        var s = built()
        s = Academy.applyStartCandidate(s, branch: "mining", now: now)
        let id = s.player.crewTraining[0].id
        #expect(Academy.applyCollectTraining(s, sessionId: id, now: now + 1000) == s)
        let done = Academy.applyCollectTraining(s, sessionId: id, now: now + Academy.dayMs)
        let grad = done.player.crew.last!
        #expect(grad.selfTrained && grad.specialisations == [CrewSpecialisation(branch: "mining", tier: 1)])
        #expect(done.player.academyXP == 250 && done.player.crewTraining.isEmpty)
    }

    @Test func oneBayAtLevelOneAndFundingGatesTraining() {
        var s = built()
        s = Academy.applyStartCandidate(s, branch: "cargo", now: now)
        #expect(!Academy.canStartTraining(s.player, now: now))
        var paused = built(); paused = Academy.applySetFunding(paused, funded: false)
        #expect(!Academy.canStartTraining(paused.player, now: now))
    }

    @Test func staffingNeedsFitCrewAndMovesTheSeat() {
        var s = built()
        let a = "crew-starting-astronaut"
        s = Academy.applyAssign(s, structureId: "refinery", crewId: a)
        #expect(Refinery.isStaffed(s.player))
        s = Academy.applyAssign(s, structureId: "diplomacy", crewId: a)
        #expect(!Refinery.isStaffed(s.player) && Academy.diplomacyActive(s.player))
        s = Academy.applyAssign(s, structureId: "diplomacy", crewId: nil)
        #expect(!Academy.diplomacyActive(s.player))
    }

    @Test func unpaidUpkeepMortgagesHiresButKeepsSelfTrainedCrew() {
        var s = Academy.applyHire(built(), sourceId: "nasa", now: now)
        s.player.crewUpkeepSettledDate = Academy.dateKey(now)
        s.player.francs = 0
        let later = Academy.settleEconomy(s, now: now + 3 * Academy.dayMs)
        #expect(later.player.crew.count == 3)
        #expect(later.player.formerCrew.count == 1 && later.player.formerCrew[0].rehireCost == 750_000)
        #expect(Academy.applyRehire(later, crewId: later.player.formerCrew[0].member.id, now: now + 4 * Academy.dayMs) == later)
    }

    @Test func researchSpendsXPAndSavesRoundTrip() throws {
        var s = GameState(); s.player.clientMissions = ["a": 5, "b": 5]; s.player.researchXP = 150
        let r = Academy.applyResearchAcademy(s)
        #expect(r.player.academyResearched && r.player.academyFunded && r.player.researchXP == 0)
        let b = built()
        let back = try JSONDecoder().decode(GameState.self, from: JSONEncoder().encode(b))
        #expect(back.player.crew == b.player.crew)
    }

    @Test func missionXPFatiguesCrew() {
        let s = Academy.applyMissionXP(built(), awardId: "m1", crewIds: ["crew-starting-astronaut"], now: now)
        let m = s.player.crew.first { $0.id == "crew-starting-astronaut" }!
        #expect(m.condition == .fatigued && m.recoveredAt == now + Academy.fatigueRecoveryMs)
        #expect(Academy.migrate(s, now: now + Academy.fatigueRecoveryMs).player.crew.first { $0.id == m.id }!.condition == .fit)
    }
}

@Suite struct ConstructionTests {
    let now: Double = 1_760_000_000_000
    @Test func siloOpensFreeOpsAndPaysOnce() {
        var s = GameState(); s.player.missionsDone = 2; s.player.placed = ["launchpad"]; s.player.placementPlots = ["launchpad": 0]
        s.player.flightPlan = FlightPlanProgress(); 
        let silo = Construction.byId["surface-silo"]!
        #expect(Construction.unlocked(silo, player: s.player))
        let n = Construction.applyPlace(s, kind: "surface-silo", plot: 1, now: now)
        #expect(n.player.placed.contains("surface-silo") && n.player.francs == s.player.francs - Economy.surfaceSiloPrice)
        #expect(n.player.underConstruction["surface-silo"] == now)
        #expect(Construction.applyPlace(n, kind: "surface-silo", plot: 2, now: now) == n)
    }

    @Test func occupiedPlotsAndOutOfRangeAreRefused() {
        var s = GameState(); s.player.missionsDone = 2; s.player.placed = ["launchpad"]
        #expect(Construction.occupied(s.player)["launchpad"] == 0)
        #expect(Construction.applyPlace(s, kind: "surface-silo", plot: 0, now: now) == s)
        #expect(Construction.applyPlace(s, kind: "surface-silo", plot: 9, now: now) == s)
    }

    @Test func refineryNeedsSiloFreeOpsAndMaterials() {
        var s = GameState(); s.player.freeOperations = true; s.player.placed = ["launchpad", "surface-silo"]; s.player.francs = 20_000_000
        let r = Construction.byId["refinery"]!
        #expect(Construction.gaps(r, player: s.player) == ["20 more aluminium", "10 more copper"])
        s.player.stash = ["aluminium": 20, "copper": 10]
        let n = Construction.applyPlace(s, kind: "refinery", plot: 2, now: now)
        #expect(n.player.refineryBuilt && n.player.stash["aluminium"] == 0 && n.player.francs == 12_000_000)
    }

    @Test func buildProgressRunsTenSeconds() {
        #expect(Construction.progress(now, now: now + 5000) == 0.5)
        #expect(Construction.progress(nil, now: now) == 1)
    }
}

@Suite struct SurfaceOpsTests {
    let now: Double = 1_760_000_000_000
    let moon = "moon-south-pole"
    func ready() -> GameState {
        var s = GameState(); s.player.freeOperations = true; s.player.francs = 50_000_000; s.player.stash = ["aluminium": 4, "silicon": 6]
        return s
    }

    @Test func accessIsMoonOnlyAndPaidOnce() {
        let s = ready()
        #expect(SurfaceOps.applyPurchaseAccess(s, "mars-arcadia", now: now) == s)
        let n = SurfaceOps.applyPurchaseAccess(s, moon, now: now)
        #expect(n.player.francs == 46_000_000 && SurfaceOps.hasSettlement(n.player))
        #expect(SurfaceOps.applyPurchaseAccess(n, moon, now: now) == n)
    }

    @Test func padCostsAndBuildsForTwentyMinutes() {
        var s = SurfaceOps.applyPurchaseAccess(ready(), moon, now: now)
        s = SurfaceOps.applyBuildPad(s, moon, pad: 1, now: now)
        #expect(s.player.stash.isEmpty && s.player.francs == 40_000_000)
        #expect(SurfaceOps.padStatus(s.player, moon, now: now + 1000) == .building)
        #expect(SurfaceOps.padStatus(s.player, moon, now: now + SurfaceOps.padBuildMs) == .ready)
    }

    @Test func bufferCapsAtTwentyAndFerryDeliversToTheStash() {
        var s = SurfaceOps.applyBuildPad(SurfaceOps.applyPurchaseAccess(ready(), moon, now: now), moon, pad: 0, now: now)
        s = SurfaceOps.applyMined(s, moon, mineral: "iron", amount: 25)
        #expect(SurfaceOps.storageTotal(SurfaceOps.progress(s.player, moon)) == 20)
        let later = now + SurfaceOps.padBuildMs
        s = SurfaceOps.applyDispatch(s, moon, now: later)
        #expect(SurfaceOps.progress(s.player, moon).storage.isEmpty)
        #expect(SurfaceOps.applyReconcile(s, moon, now: later + 1000) == s)
        let d = SurfaceOps.applyReconcile(s, moon, now: later + SurfaceOps.ferryMs)
        #expect(d.player.stash["iron"] == 20)
        #expect(SurfaceOps.applyAcknowledge(d, moon).player.surfaceOps.sites[moon]?.ferry == nil)
    }

    @Test func failedFerryRetriesWithTheSameManifest() {
        var s = SurfaceOps.applyBuildPad(SurfaceOps.applyPurchaseAccess(ready(), moon, now: now), moon, pad: 0, now: now)
        s = SurfaceOps.applyMined(s, moon, mineral: "copper", amount: 20)
        s = SurfaceOps.applyDispatch(s, moon, now: now + SurfaceOps.padBuildMs)
        let id = SurfaceOps.progress(s.player, moon).ferry!.id
        s = SurfaceOps.applyFail(s, moon, ferryId: id, reason: "Telemetry fault")
        s = SurfaceOps.applyRetry(s, moon, now: now + 2 * SurfaceOps.padBuildMs)
        let f = SurfaceOps.progress(s.player, moon).ferry!
        #expect(f.status == .inFlight && f.attempts == 2 && f.manifest == ["copper": 20])
    }

    @Test func webSurfaceOpsSaveKeepsItsFieldOperation() throws {
        let json = #"{"player":{"surfaceOps":{"sites":{"moon-south-pole":{"siteAccessPurchasedAt":5,"storage":{"iron":3},"fieldOperation":{"id":"op","seed":7}}}}}}"#
        let state = try JSONDecoder().decode(GameState.self, from: json.data(using: .utf8)!)
        #expect(SurfaceOps.progress(state.player, moon).storage == ["iron": 3])
        let out = try JSONEncoder().encode(state)
        #expect(String(decoding: out, as: UTF8.self).contains("\"fieldOperation\""))
    }
}
