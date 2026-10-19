import Testing
@testable import LandnamCore

@MainActor @Suite struct ReturningScreenTests {
    @Test func miningWithoutAMissionLandsOnTheHub() {
        var s = GameState(); s.screen = .mining; s.missionId = nil; s.targetId = nil
        let store = GameStore(state: s)
        #expect(store.leaveOrphanedMissionScreen())
        #expect(store.state.screen == .hub)
    }

    @Test func missionInFlightIsKept() throws {
        let base = GameStore(state: GameState())
        let mission = try #require(base.catalog.missions.first)
        let target = try #require(base.catalog.targets.first)
        var s = GameState(); s.screen = .mining; s.missionId = mission.id; s.targetId = target.id
        let store = GameStore(state: s)
        #expect(!store.leaveOrphanedMissionScreen())
        #expect(store.state.screen == .mining)
    }

    @Test func screensWithoutMissionNeedsAreUntouched() {
        var s = GameState(); s.screen = .market
        let store = GameStore(state: s)
        #expect(!store.leaveOrphanedMissionScreen())
        #expect(store.state.screen == .market)
    }
}
