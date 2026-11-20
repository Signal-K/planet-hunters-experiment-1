import Foundation
import Testing
@testable import LandnamCore

@Suite struct GroundTelescopeUpgradeTests {
    private let id = "ground-telescope"

    @Test func upgradesAnUnplacedScopeWithOneThenTwoIron() throws {
        var s = GameState()
        s.player.placed = [id, "ground-telescope-2"]
        s.player.stash = ["iron": 3, "nickel": 4]
        let francs = s.player.francs
        s = GroundTelescopeUpgrades.applyUpgrade(s, id: id)
        #expect(s.player.stash["iron"] == 2)
        #expect(s.player.stash["nickel"] == 4)
        #expect(s.player.francs == francs)
        #expect(GroundTelescopeUpgrades.level(s.player, id) == 2)
        #expect(GroundTelescopeUpgrades.level(s.player, "ground-telescope-2") == 1)
        s = GroundTelescopeUpgrades.applyUpgrade(s, id: id)
        #expect(s.player.stash["iron"] == 0)
        #expect(GroundTelescopeUpgrades.level(s.player, id) == 3)
        #expect(GroundTelescopeUpgrades.applyUpgrade(s, id: id) == s)
        #expect(GroundTelescopeUpgrades.reason(s.player, id) == "Fully upgraded.")
        let restored = try JSONDecoder().decode(GameState.self, from: JSONEncoder().encode(s))
        #expect(restored.player.groundTelescopeLevels[id] == 3)
        #expect(GroundTelescopeUpgrades.dailyCandidates(s.player) == 0)
        s.player.placementPlots[id] = 10
        #expect(GroundTelescopeUpgrades.dailyCandidates(s.player) == 3)
    }

    @Test func rejectsLockedPoorAndUnknownScopes() {
        var s = GameState()
        s.player.stash = ["iron": 3]
        #expect(GroundTelescopeUpgrades.applyUpgrade(s, id: id) == s)
        s.player.placed = [id]
        s.player.stash = [:]
        #expect(GroundTelescopeUpgrades.applyUpgrade(s, id: id) == s)
        #expect(GroundTelescopeUpgrades.reason(s.player, id)?.contains("Needs 1 more iron") == true)
        #expect(GroundTelescopeUpgrades.applyUpgrade(s, id: "launchpad") == s)
    }
}
