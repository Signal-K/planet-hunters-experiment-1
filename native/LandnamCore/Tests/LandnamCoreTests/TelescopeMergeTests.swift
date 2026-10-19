import Testing
import Foundation
@testable import LandnamCore

/// SSL-569: legacy saves with either historical telescope decode to the one launched instrument.
struct TelescopeMergeTests {
    private func decode(_ json: String) throws -> Player {
        try JSONDecoder().decode(Player.self, from: Data(json.utf8))
    }

    @Test func transitOnlyUnlocksBothFeeds() throws {
        let player = try decode(#"{"transitSatelliteLaunchedAt": 1700000000000}"#)
        #expect(player.deepSpaceTelescopeBuilt)
        #expect(player.deepSpaceTelescopeLaunchedAt == 1700000000000)
    }

    @Test func deepSpaceOnlyUnlocksBothFeeds() throws {
        let player = try decode(#"{"deepSpaceTelescopeBuilt": true}"#)
        #expect((player.transitSatelliteLaunchedAt ?? 0) > 0)
        #expect((player.deepSpaceTelescopeLaunchedAt ?? 0) > 0)
    }

    @Test func bothKeepsEachStamp() throws {
        let player = try decode(#"{"transitSatelliteLaunchedAt": 1, "deepSpaceTelescopeBuilt": true, "deepSpaceTelescopeLaunchedAt": 2}"#)
        #expect(player.transitSatelliteLaunchedAt == 1)
        #expect(player.deepSpaceTelescopeLaunchedAt == 2)
        #expect(player.deepSpaceTelescopeBuilt)
    }

    @Test func noTelescopeStaysLocked() throws {
        let player = try decode("{}")
        #expect(!player.deepSpaceTelescopeBuilt)
        #expect(player.transitSatelliteLaunchedAt == nil)
    }
}
