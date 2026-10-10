import Testing
import Foundation
@testable import LandnamCore

@Suite struct RefineryTests {
    func state(copper: Int = 4, francs: Int = 100_000_000) -> GameState {
        var s = GameState(); s.player.stash = ["copper": copper]; s.player.francs = francs; return s
    }
    let day: Double = 1_760_000_000_000

    @Test func recipePricingFollowsTheEconomyConstants() {
        let r = Refinery.byId["refined-copper"]!
        let value = Double(Minerals.byId["copper"]!.price) * 4
        #expect(r.price == Int((value * 1.6).rounded()))
        #expect(r.cost == Int((value * 0.07).rounded()))
    }

    @Test func startConsumesInputAndFeeAndLimitsToOnePerDay() {
        let s = Refinery.applyStart(state(), recipeId: "refined-copper", now: day)
        #expect(s.player.stash["copper"] == 0)
        #expect(s.player.refineryQueue.count == 1)
        #expect(s.player.francs == 100_000_000 - Refinery.byId["refined-copper"]!.cost)
        var again = s; again.player.stash["copper"] = 4
        #expect(Refinery.applyStart(again, recipeId: "refined-copper", now: day + 1000) == again)
    }

    @Test func staffedCrewCutsTheCycleBy25Percent() {
        var s = state(); s.player.structureCrewAssignments["refinery"] = "ada"
        let n = Refinery.applyStart(s, recipeId: "refined-copper", now: day)
        #expect(n.player.refineryQueue[0].durationMs == 2400 * 1000 * 0.75)
    }

    @Test func collectOnlyWhenDoneThenSellPays() {
        let started = Refinery.applyStart(state(), recipeId: "refined-copper", now: day)
        #expect(Refinery.applyCollect(started, recipeId: "refined-copper", now: day + 1000) == started)
        let done = Refinery.applyCollect(started, recipeId: "refined-copper", now: day + 2_400_000)
        #expect(done.player.refineryQueue.isEmpty)
        #expect(done.player.refinedGoods["refined-copper"] == 1)
        let sold = Refinery.applySell(done, recipeId: "refined-copper", amount: 5)
        #expect(sold.player.refinedGoods["refined-copper"] == 0)
        #expect(sold.player.francs == done.player.francs + Refinery.byId["refined-copper"]!.price)
    }

    @Test func jobsRoundTripThroughTheSave() throws {
        let s = Refinery.applyStart(state(), recipeId: "refined-copper", now: day)
        let back = try JSONDecoder().decode(GameState.self, from: JSONEncoder().encode(s))
        #expect(back.player.refineryQueue == s.player.refineryQueue)
        #expect(back.player.refineryLastStartedAt == day)
    }

    @Test func ledgerPortsEveryWebEntry() {
        #expect(NarrativeLedger.entries.count >= 7)
        #expect(Set(NarrativeLedger.entries.map(\.id)).count == NarrativeLedger.entries.count)
    }
}

@Suite struct ProgressionTests {
    @Test func unlockSpendsPointsOnce() {
        var s = GameState(); s.player.skillPoints = 2
        let a = Progression.applyUnlock(s, nodeId: "near-range-1")
        #expect(a.player.skillPoints == 0 && Skills.has(a.player.unlockedSkillNodes, "near-range-1"))
        #expect(Progression.applyUnlock(a, nodeId: "near-range-1") == a)
        #expect(Progression.applyUnlock(a, nodeId: "laser-charge-1") == a)
    }

    @Test func customizerRaisesThePopup() {
        var s = GameState(); s.player.skillPoints = 1
        #expect(Progression.applyUnlock(s, nodeId: "ship-customizer-1").popup == "ship-customizer")
    }

    @Test func licenseNeedsXPAndGoesOneGradeAtATime() {
        var s = GameState(); s.player.researchXP = 149
        #expect(!Progression.canUpgrade(s.player))
        s.player.researchXP = 150
        let two = Progression.applyUpgrade(s, to: .two)
        #expect(two.player.licenseGrade == .two)
        #expect(Progression.applyUpgrade(two, to: .three) == two)
        #expect(Progression.applyUpgrade(s, to: .three) == s)
    }
}
