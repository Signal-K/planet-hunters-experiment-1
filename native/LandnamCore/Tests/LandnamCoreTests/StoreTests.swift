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
}

@MainActor @Suite struct IntroOnceTests {
    private func defaults() -> UserDefaults {
        let d = UserDefaults(suiteName: "landnam-intro-\(UUID().uuidString)")!
        return d
    }

    @Test func introShowsUntilBegun() {
        let d = defaults()
        let first = GameStore(introDefaults: d)
        #expect(first.screen == .intro)
        first.markIntroSeen()
        first.go(.build)

        let relaunch = GameStore(introDefaults: d)
        #expect(relaunch.screen == .build)
        #expect(relaunch.introSeen)
    }

    @Test func resetAfterBeginningSkipsIntro() {
        let d = defaults()
        let store = GameStore(introDefaults: d)
        store.markIntroSeen()
        store.reset()
        #expect(store.screen == .build)
    }

    @Test func progressMeansTheIntroIsDone() {
        let d = defaults()
        var state = GameState()
        state.player.placed = ["launchpad"]
        let store = GameStore(state: state, introDefaults: d)
        #expect(store.screen == .hub)
        #expect(store.introSeen)
    }
}
