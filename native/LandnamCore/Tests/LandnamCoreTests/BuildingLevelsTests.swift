import Testing
import Foundation
@testable import LandnamCore

/// Shares `Fixtures/building-levels.json` with `web/lib/systems/BuildingLevels.test.ts`.
@Suite struct BuildingLevelsTests {
    private struct Fixture: Decodable {
        let costs: [String: [Int]]; let effects: [String: [String]]
        let save: JSONValue; let levelsAfterNormalise: [String: Int]
    }
    private func fixture() throws -> Fixture {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("Fixtures/building-levels.json")
        return try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
    }
    private func state(_ placed: [String] = ["launchpad", "surface-silo", "refinery", "astronaut-academy"], francs: Int = 1_000_000_000) -> GameState {
        var s = GameState(); s.player.placed = placed; s.player.francs = francs; return s
    }

    @Test func costsAndEffectsMatchWeb() throws {
        let f = try fixture()
        #expect(BuildingLevels.upgradeCosts == f.costs)
        #expect(BuildingLevels.effects == f.effects)
    }

    @Test func webSaveRoundTripsAndNormalises() throws {
        let f = try fixture()
        let data = try JSONEncoder().encode(f.save)
        let player = try JSONDecoder().decode(Player.self, from: data)
        #expect(player.buildingLevels == f.levelsAfterNormalise)
        #expect(player.placed == ["launchpad", "surface-silo", "refinery"])
        let again = try JSONDecoder().decode(Player.self, from: JSONEncoder().encode(player))
        #expect(again.buildingLevels == player.buildingLevels && again.placed == player.placed)
        let json = try JSONSerialization.jsonObject(with: JSONEncoder().encode(player)) as? [String: Any]
        #expect((json?["buildingLevels"] as? [String: Int]) == f.levelsAfterNormalise)
        #expect(json?["launchpadUpgraded"] as? Bool == true)
    }

    @Test func oldSaveIsLevelOneAndLegacyLaunchpadFlagIsLevelTwo() throws {
        let old = try JSONDecoder().decode(Player.self, from: Data(#"{"placed":["launchpad"]}"#.utf8))
        #expect(old.buildingLevels.isEmpty && BuildingLevels.level(old, "launchpad") == 1)
        let legacy = try JSONDecoder().decode(Player.self, from: Data(#"{"placed":["launchpad"],"launchpadUpgraded":true}"#.utf8))
        #expect(legacy.buildingLevels == ["launchpad": 2])
    }

    @Test func upgradeStepsChargesAndStopsAtLevelThree() {
        var s = state()
        let before = s.player.francs
        s = BuildingLevels.applyUpgrade(s, id: "refinery")
        #expect(s.player.buildingLevels["refinery"] == 2 && s.player.francs == before - Economy.refineryPrice)
        s = BuildingLevels.applyUpgrade(s, id: "refinery")
        #expect(s.player.buildingLevels["refinery"] == 3)
        #expect(BuildingLevels.applyUpgrade(s, id: "refinery") == s)
        #expect(s.player.placed == ["launchpad", "surface-silo", "refinery", "astronaut-academy"])
    }

    @Test func refusesUnaffordableUnplacedAndUnknown() {
        let poor = state(francs: 1)
        #expect(BuildingLevels.applyUpgrade(poor, id: "refinery") == poor)
        let bare = state(["launchpad"])
        #expect(BuildingLevels.applyUpgrade(bare, id: "refinery") == bare)
        #expect(BuildingLevels.applyUpgrade(bare, id: "garage") == bare)
    }

    @Test func launchpadUpgradeIsLevelTwoAndSetsTheLegacyFlag() {
        let s = BuildingLevels.applyUpgrade(state(), id: "launchpad")
        #expect(s.player.buildingLevels["launchpad"] == 2 && s.player.launchpadUpgraded)
    }

    @Test func siloRefineryAndAcademyEffectsScale() {
        var s = state()
        #expect(Market.storageCapacity(s.player) == Economy.surfaceSiloCapacity)
        s = BuildingLevels.applyUpgrade(BuildingLevels.applyUpgrade(s, id: "surface-silo"), id: "surface-silo")
        #expect(Market.storageCapacity(s.player) == Economy.surfaceSiloCapacity * 3)
        #expect(BuildingLevels.timeMultiplier(1) == 1 && BuildingLevels.timeMultiplier(2) == 0.75 && BuildingLevels.timeMultiplier(3) == 0.5)
        var r = state(); r.player.stash = ["copper": 4]; r.player.buildingLevels["refinery"] = 3
        let started = Refinery.applyStart(r, recipeId: "refined-copper", now: 1_760_000_000_000)
        #expect(started.player.refineryQueue.first?.durationMs == Double(Refinery.byId["refined-copper"]!.seconds) * 1000 * 0.5)
        #expect(BuildingLevels.launchpadMissionFloor(3) == 2)
    }
}
