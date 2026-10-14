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

/// A throwaway defaults domain, so first-run flags never leak between tests or into the app's real defaults.
func withScratchDefaults(_ body: (UserDefaults) -> Void) {
    let name = "landnam-tests-\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: name)!
    defer { defaults.removePersistentDomain(forName: name) }
    body(defaults)
}

@MainActor @Suite struct IntroOnceTests {
    @Test func introShowsOnFirstLaunchAndNeverAgainOnceBegun() {
        withScratchDefaults { defaults in
            let first = GameStore(defaults: defaults)
            #expect(first.screen == .intro)
            #expect(!first.introSeen)
            first.markIntroSeen()
            first.go(.build)

            let relaunch = GameStore(defaults: defaults)
            #expect(relaunch.introSeen)
            #expect(relaunch.screen == .build)
        }
    }

    @Test func aSeenIntroIsSkippedEvenWhenTheSaveStillPointsAtIt() {
        withScratchDefaults { defaults in
            defaults.set(true, forKey: GameStore.introSeenKey)
            #expect(GameStore(defaults: defaults).screen == .build)

            var built = GameState(); built.player.placed = ["launchpad"]
            #expect(GameStore(state: built, defaults: defaults).screen == .hub)
        }
    }

    @Test func progressMeansTheIntroIsDoneWithoutAnyFlag() {
        withScratchDefaults { defaults in
            var played = GameState(); played.player.missionsDone = 2; played.player.placed = ["launchpad"]
            let store = GameStore(state: played, defaults: defaults)
            #expect(store.screen == .hub)
            #expect(!store.introSeen)   // reading never writes the flag: only the player beginning does
        }
    }

    @Test func resetAfterBeginningSkipsTheIntro() {
        withScratchDefaults { defaults in
            let store = GameStore(defaults: defaults)
            store.markIntroSeen()
            store.reset()
            #expect(store.screen == .build)
        }
    }

    @Test func aSaveInsideTheGameIsNeverRerouted() {
        withScratchDefaults { defaults in
            defaults.set(true, forKey: GameStore.introSeenKey)
            var state = GameState(); state.screen = .missions
            #expect(GameStore(state: state, defaults: defaults).screen == .missions)
        }
    }
}
