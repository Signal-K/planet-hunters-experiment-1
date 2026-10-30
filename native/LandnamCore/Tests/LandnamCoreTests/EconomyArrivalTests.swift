import Testing
@testable import LandnamCore

@Suite struct EconomyArrivalTests {
    @Test func readsTheWebNoteAndClearsIt() {
        var s = GameState()
        #expect(EconomyArrival.summary(s.player) == nil)
        s.player.extras["economyArrival"] = .object([
            "moves": .array([
                .object(["materialName": .string("Nickel"), "changePct": .number(11)]),
                .object(["materialName": .string("Copper"), "changePct": .number(-6)]),
            ]),
            "levelUps": .array([.object(["clientName": .string("Atlas Aggregate"), "levelAfter": .number(3)])]),
        ])
        #expect(EconomyArrival.summary(s.player) == "Nickel +11%, Copper -6%. Atlas Aggregate reached level 3.")
        #expect(EconomyArrival.summary(EconomyArrival.applyDismiss(s).player) == nil)
    }
}
