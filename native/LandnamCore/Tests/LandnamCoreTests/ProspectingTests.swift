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

    @Test func returnWaitsForTheFirstRig() {
        var p = Prospecting(requirements: ["iron": 1])
        p.startConstruction(); #expect(!p.canReturn)
        p.select("ore-c"); p.driveToSelected()
        for _ in 0..<3 { _ = p.drill() }
        p.startConstruction(); #expect(p.canReturn)
    }

    @Test func drivePadClampsToTheField() {
        var p = Prospecting(requirements: [:])
        for _ in 0..<40 { p.drive(dx: 0.2, dy: -0.2) }
        #expect(p.rover.x == 0.96 && p.rover.y == 0.3)
        p.select("ore-b"); p.drive(dx: -0.5, dy: 0); #expect(!p.inRange)
    }
}
