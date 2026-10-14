import Testing
import Foundation
@testable import LandnamCore

/// SSL-569: legacy saves with either telescope decode to the one launched Space Telescope.
struct TelescopeMergeTests {
    private func decode(_ json: String) throws -> Player {
        try JSONDecoder().decode(Player.self, from: Data(json.utf8))
    }

    @Test func transitOnlyUnlocksBothFeeds() throws {
        let p = try decode(#"{"transitSatelliteLaunchedAt": 1700000000000}"#)
        #expect(p.deepSpaceTelescopeBuilt)
        #expect(p.deepSpaceTelescopeLaunchedAt == 1700000000000)
    }

    @Test func deepSpaceOnlyUnlocksBothFeeds() throws {
        let p = try decode(#"{"deepSpaceTelescopeBuilt": true}"#)
        #expect((p.transitSatelliteLaunchedAt ?? 0) > 0)
        #expect((p.deepSpaceTelescopeLaunchedAt ?? 0) > 0)
    }

    @Test func bothKeepsEachStamp() throws {
        let p = try decode(#"{"transitSatelliteLaunchedAt": 1, "deepSpaceTelescopeBuilt": true, "deepSpaceTelescopeLaunchedAt": 2}"#)
        #expect(p.transitSatelliteLaunchedAt == 1 && p.deepSpaceTelescopeLaunchedAt == 2 && p.deepSpaceTelescopeBuilt)
    }

    @Test func noTelescopeStaysLocked() throws {
        let p = try decode("{}")
        #expect(!p.deepSpaceTelescopeBuilt && p.transitSatelliteLaunchedAt == nil)
    }
}
