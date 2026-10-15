import Testing
import Foundation
@testable import LandnamCore

@MainActor @Suite struct StoreTests {
    @Test func exchangeScreenOpensAndStaysOpen() {
        var state = GameState()
        state.screen = .market

        let store = GameStore(state: state)
        #expect(store.screen == .market)

        store.go(.hub)
        store.go(.market)
        #expect(store.screen == .market)
    }

    @Test func loopPersistsAndReloads() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("landnam-\(UUID().uuidString).json")
        defer { try? FileManager.default.removeItem(at: url) }
        let store = GameStore(saveURL: url)
        store.go(.missions)
        let m = store.catalog.missions.first { $0.sequence == 1 }!
        store.pickMission(m.id)
        store.launch()
        #expect(store.screen == .transit)

        let reloaded = GameStore(saveURL: url)
        #expect(reloaded.screen == .transit)
        #expect(reloaded.player.activeMission?.id == m.id)
    }
    @Test func catalogRefreshesAfterCloudAdoptionAndReset() {
        let store = GameStore()
        var remote = GameState()
        remote.player.missionsDone = 8
        remote.player.freeOperations = true
        remote.player.saturnImagerLaunchedAt = 1
        #expect(store.adoptRemote(remote))
        #expect(store.catalog.mission(Instruments.transitMissionId) != nil)
        #expect(store.catalog.mission(Instruments.saturnMissionId) == nil)
        store.reset()
        #expect(store.catalog.mission(Instruments.transitMissionId) == nil)
    }
}
