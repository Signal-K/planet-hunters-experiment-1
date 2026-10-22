import Testing
@testable import LandnamCore

@Suite struct RocketBuilderChoiceTests {
    @Test func listsEveryPartAndLabelsEffects() {
        for slot in RocketBuilder.slots {
            let parts = RocketBuilder.allOptions(slot.id)
            #expect(!parts.isEmpty)
            for part in parts { #expect(part.effect.contains("range") || part.effect.contains("capacity") || part.effect.contains("Laser")) }
        }
        #expect(RocketBuilder.parts.first { $0.id == "ion-thruster-t1" }?.name == "Ion Thruster T1")
    }

    @Test func fitsAChosenPartAndRefusesLockedOnes() {
        var s = GameState(); s.player.francs = 100_000_000; s.player.missionsDone = 0
        let fitted = RocketBuilder.install(s, slot: "engine", partId: "pulse-thruster-t1")
        #expect(fitted.player.shipCustomizerParts["engine"] == "pulse-thruster-t1")
        #expect(RocketBuilder.install(s, slot: "engine", partId: "fusion-thruster-t2") == s)
    }

    @Test func launchReviewCountsWhatTheCapacityChipShows() {
        var s = GameState()
        let best = RocketBuilder.allOptions("cargo-hold").last!
        s.player.shipCustomizerParts = ["payload": best.id]
        let bonus = RocketBuilder.loadoutBonus(s.player.shipCustomizerParts)
        let chassis = Catalog().parts.chassis.first { $0.id == s.rocket.chassis } ?? Catalog().parts.chassis[0]
        let bare = Catalog().parts.effectiveCargo(chassis, skills: [])
        #expect(RocketBuilder.stats(s, catalog: Catalog()).capacity == bare + bonus.capacity)
        #expect(bonus.capacity > 0)
    }
}
