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

    @Test func multiFormationSurveyNeedsDrivingToEachOne() {
        var p = Prospecting(goal: 3)
        let early = p.observe("ore-b")
        #expect(!early)   // starts far from every formation
        func driveTo(_ id: String) {
            let o = Prospecting.outcrops.first { $0.id == id }!
            var guardSteps = 0
            while !p.inRange(o) && guardSteps < 100 {
                p.drive(dx: max(-0.06, min(0.06, o.x - p.rover.x)), dy: max(-0.06, min(0.06, o.y - p.rover.y)))
                guardSteps += 1
            }
        }
        for id in ["ore-a", "ore-b", "ore-c"] {
            #expect(!p.canContinue)
            driveTo(id)
            let first = p.observe(id)
            let again = p.observe(id)
            #expect(first)
            #expect(!again)   // never the same formation twice
        }
        #expect(p.canContinue && p.observations.count == 3)
    }
}
