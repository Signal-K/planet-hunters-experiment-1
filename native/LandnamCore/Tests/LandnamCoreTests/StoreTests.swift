import Testing
import Foundation
@testable import LandnamCore

@MainActor @Suite struct StoreTests {
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

    @Test func siloRoutePersistsAndReturnsToHub() throws {
        let store = GameStore()
        store.go(.hubSubsurface)
        #expect(store.screen == .hubSubsurface)
        store.go(.hub)
        #expect(store.screen == .hub)
    }
}
