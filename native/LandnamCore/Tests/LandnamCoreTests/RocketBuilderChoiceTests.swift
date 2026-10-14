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
}
