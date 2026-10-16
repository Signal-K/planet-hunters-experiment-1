import Testing
@testable import LandnamCore

@Suite struct ProspectingTests {
    @Test func observingAnOutcropParksTheRoverAndLogsIt() {
        var p = Prospecting()
        #expect(!p.canContinue)
        p.observe("ore-b")
        #expect(p.logged == "ore-b" && p.loggedOutcrop?.mineral == "copper" && p.canContinue)
        #expect(p.rover.x == 0.30)
    }

    @Test func unknownOutcropIsIgnored() {
        var p = Prospecting()
        p.observe("nope")
        #expect(p.logged == nil && !p.canContinue)
    }

    @Test func drivePadClampsToTheField() {
        var p = Prospecting()
        for _ in 0..<40 { p.drive(dx: 0.2, dy: -0.2) }
        #expect(p.rover.x == 0.96 && p.rover.y == 0.3)
    }
}
