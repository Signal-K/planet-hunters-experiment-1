import Testing
@testable import LandnamCore

@Suite struct BaseNextFlightTests {
    let catalog = Catalog()
    let now = 1_791_000_000_000.0

    private func base() -> GameState {
        var s = GameState()
        s.screen = .hub
        s.player.placed = ["launchpad"]
        return s
    }

    @Test func preparesEligibleFirstContractWithoutSpendingOrLaunching() {
        let s = base()
        let action = BaseNextFlight.current(s, catalog: catalog, now: now)
        #expect(action.missionId != nil)
        let n = BaseNextFlight.open(s, catalog: catalog, now: now)
        #expect(n.missionId == action.missionId)
        #expect(n.targetId == action.targetId)
        #expect(n.player.francs == s.player.francs)
        #expect(n.player.activeMission == nil)
        #expect(!Loop.mustChooseDestination(n))
        #expect(n.screen == .fab || n.screen == .rocketBuy)
    }

    @Test func activeFlightKeepsItsCargoAndObjective() {
        var s = base()
        s.player.activeMission = ActiveMission(id: "running", label: "Keep this run")
        s.player.missionPhase = .mining
        s.player.miningCargoInProgress = ["iron": 2]
        let n = BaseNextFlight.open(s, catalog: catalog, now: now)
        #expect(n.screen == .mining)
        #expect(n.player == s.player)
        #expect(n.missionId == s.missionId)
    }

    @Test func setupIsContinuedAndActionsOutsideBaseAreIgnored() {
        let prepared = BaseNextFlight.open(base(), catalog: catalog, now: now)
        var returned = prepared
        returned.screen = .hub
        #expect(BaseNextFlight.current(returned, catalog: catalog, now: now).cta == "Continue setup")
        #expect(BaseNextFlight.open(prepared, catalog: catalog, now: now) == prepared)
    }
}
