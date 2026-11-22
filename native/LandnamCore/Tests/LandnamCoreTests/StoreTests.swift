import Testing
import Foundation
@testable import LandnamCore

@MainActor @Suite struct StoreTests {
    @Test func nextActivitySettlesTheSameRewardOnce() {
        let catalog = Catalog()
        let mission = catalog.missions.first { $0.sequence == 1 && $0.client != nil }!
        var s = GameState()
        s.screen = .debrief
        s.missionId = mission.id
        s.targetId = mission.targetId ?? "eros"
        s.lastCargo = mission.requires.minerals
        s.player.missionRunId = "guidance-settlement"
        let baseline = Loop.debriefDone(s, payout: mission.payout.francs, affinity: mission.payout.affinity,
            consumed: mission.requires.minerals, catalog: catalog, now: 1_791_000_000_000)
        for destination in [Screen.hub, .missions, .instrumentHub] {
            let done = Loop.debriefDone(s, payout: mission.payout.francs, affinity: mission.payout.affinity,
                consumed: mission.requires.minerals, next: destination, catalog: catalog, now: 1_791_000_000_000)
            #expect(done.screen == destination)
            #expect(done.player == baseline.player)
            #expect(done.missionId == nil && done.lastCargo == nil)
            #expect(Loop.debriefDone(done, payout: mission.payout.francs, affinity: mission.payout.affinity,
                next: .hub, catalog: catalog, now: 1_791_000_000_000) == done)
        }
    }

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
        remote.player.placed = ["control-station"]
        #expect(store.adoptRemote(remote))
        #expect(store.catalog.mission(Instruments.transitMissionId) != nil)
        #expect(store.catalog.mission(Instruments.saturnMissionId) == nil)
        store.reset()
        #expect(store.catalog.mission(Instruments.transitMissionId) == nil)
    }
}
