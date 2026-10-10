import Testing
@testable import LandnamCore

@Suite struct ProspectingTests {
    @Test func thirdDrillAlwaysOpensTheSite() {
        var p = Prospecting(requirements: ["iron": 2, "copper": 1])
        #expect(!p.canDrill && p.drillsToSite == 3)
        p.select("ore-a"); #expect(!p.canDrill)          // not in range yet
        p.driveToSelected(); #expect(p.canDrill)
        #expect(p.drill()?.kind == .trace)
        #expect(p.drill()?.kind == .vein)
        #expect(p.mineSite == nil && p.drillsToSite == 1)
        #expect(p.drill()?.kind == .mineSite)
        #expect(p.mineSite == "ore-a" && p.drillsToSite == 0 && !p.canDrill)
        #expect(p.drill() == nil)
    }

    @Test func cargoStopsAtTheOrderAndSkipsUnorderedOre() {
        var p = Prospecting(requirements: ["iron": 2])
        p.select("ore-a"); p.driveToSelected()
        _ = p.drill(); _ = p.drill()
        #expect(p.cargo == ["iron": 2])
        var q = Prospecting(requirements: ["iron": 2])
        q.select("ore-b"); q.driveToSelected(); _ = q.drill()
        #expect(q.cargo.isEmpty)
    }

    @Test func tappingAnOutcropRoutesAndDrillsOnArrival() {
        var p = Prospecting(requirements: ["iron": 3])
        #expect(p.tapOutcrop("ore-a")?.kind == .trace)
        #expect(p.inRange && p.drillings.count == 1)
        #expect(p.tapOutcrop("ore-b")?.kind == .vein)
        #expect(p.tapOutcrop("ore-c")?.kind == .mineSite)
        #expect(p.mineSite == "ore-c")
        #expect(p.tapOutcrop("ore-a") == nil)           // site open: further taps only drive
        #expect(p.drillings.count == 3)
    }

    @Test func returnOpensAfterDrillThreeWithoutTheRig() {
        var p = Prospecting(requirements: ["iron": 5])
        #expect(!p.canReturn)
        _ = p.tapOutcrop("ore-b"); _ = p.tapOutcrop("ore-b"); #expect(!p.canReturn)
        _ = p.tapOutcrop("ore-b"); #expect(p.canReturn && !p.constructionStarted)
    }

    @Test func returnOpensOnceTheOrderIsMetEvenBeforeDrillThree() {
        var p = Prospecting(requirements: ["iron": 2])
        _ = p.tapOutcrop("ore-a"); #expect(!p.canReturn)
        _ = p.tapOutcrop("ore-a"); #expect(p.cargoMet && p.canReturn && p.drillings.count == 2)
    }

    @Test func noRequirementsNeverCountsAsMet() {
        #expect(!Prospecting(requirements: [:]).canReturn)
    }

    @Test func drivePadClampsToTheField() {
        var p = Prospecting(requirements: [:])
        for _ in 0..<40 { p.drive(dx: 0.2, dy: -0.2) }
        #expect(p.rover.x == 0.96 && p.rover.y == 0.3)
        p.select("ore-b"); p.drive(dx: -0.5, dy: 0); #expect(!p.inRange)
    }
}
