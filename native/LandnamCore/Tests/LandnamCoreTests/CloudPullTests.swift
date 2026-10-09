import Testing
import Foundation
@testable import LandnamCore

@MainActor @Suite struct CloudPullTests {
    private func webSave(missions: Int = 4, placed: [String] = ["launchpad", "refinery"], francs: Int = 12_345_000) -> GameState {
        var s = GameState()
        s.screen = .missions; s.missionId = "m1"; s.tutorial = false
        s.player.missionsDone = missions; s.player.placed = placed; s.player.francs = francs
        s.extras["webOnlyField"] = .string("keep me")
        return s
    }

    @Test func decodesWebRecordAndKeepsMoneyStructuresMissions() throws {
        let state = try JSONEncoder().encode(webSave())
        let body = #"{"page":1,"items":[{"id":"u1","user":"u1","state":"#.data(using: .utf8)! + state + "}]}".data(using: .utf8)!
        guard case .found(let s) = CloudPull.decode(body) else { Issue.record("not found"); return }
        #expect(s.player.francs == 12_345_000)
        #expect(s.player.placed == ["launchpad", "refinery"])
        #expect(s.player.missionsDone == 4)
        #expect(s.extras["webOnlyField"] == .string("keep me"))
    }

    @Test func emptyListMeansNoCloudSaveAndGarbageMeansUnavailable() {
        #expect(CloudPull.decode(#"{"items":[]}"#.data(using: .utf8)!) == .none)
        #expect(CloudPull.decode("<html>".data(using: .utf8)!) == .unavailable)
    }

    @Test func freshNativeAdoptsWebProgressAndQueuesWelcome() {
        let store = GameStore(state: GameState())
        #expect(store.adoptRemote(webSave()))
        #expect(store.player.francs == 12_345_000)
        #expect(store.screen == .hub)
        #expect(store.welcomePending)
        store.finishWelcome()
        #expect(!store.welcomePending)
    }

    @Test func staleOrEmptyRemoteNeverClobbersLocalProgress() {
        var local = GameState(); local.player.missionsDone = 9; local.player.placed = ["launchpad"]
        let store = GameStore(state: local)
        #expect(!store.adoptRemote(webSave(missions: 4)))
        #expect(!store.adoptRemote(GameState()))
        #expect(store.player.missionsDone == 9)
        #expect(!store.welcomePending)
    }
}
