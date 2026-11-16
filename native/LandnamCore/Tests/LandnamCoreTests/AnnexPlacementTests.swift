import Foundation
import Testing
@testable import LandnamCore

/// SSL-844: the native Base reads the same annex slots as web (`shared/layout/base-site.json`, SSL-843) and places an
/// owned ground telescope the same way (web `AnnexPlacement.test.ts`).
@Suite struct AnnexPlacementTests {
    static let repo = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../")
    static func map() throws -> BaseSiteMap {
        try BaseSiteMap.load(Data(contentsOf: repo.appendingPathComponent("shared/layout/base-site.json").standardized))
    }
    static let telescope = ControlStation.groundTelescopeStructureId

    static func owner() -> GameState {
        var s = GameState()
        s.player.placed = ["launchpad", telescope]
        s.player.placementPlots = ["launchpad": 0]
        return s
    }

    @Test func slotsDecodeFromTheSharedMap() throws {
        let map = try Self.map()
        #expect(map.annexSlotList.map(\.id) == ["annex-west", "annex-gate"])
        #expect(map.annexSlotList.allSatisfy { $0.plot >= 10 })
        #expect(map.annexKind(Self.telescope)?.short == "Telescope")
        #expect(!map.isAnnexKind("launchpad"))
    }

    @Test func anOwnedTelescopeWithNoSlotWaitsInTheTray() throws {
        let map = try Self.map()
        let p = Self.owner().player
        #expect(map.unplacedAnnexKinds(placed: p.placed, plots: p.placementPlots) == [Self.telescope])
        #expect(map.placedAnnex(placed: p.placed, plots: p.placementPlots).isEmpty)
    }

    @Test func placingStandsItOnTheSlotForFree() throws {
        let map = try Self.map()
        var s = Self.owner()
        s.player.francs = 1234
        let slot = map.annexSlotList[0]
        let next = Construction.applyPlaceAnnex(s, kind: Self.telescope, plot: slot.plot, map: map)
        #expect(next.player.placementPlots[Self.telescope] == slot.plot)
        #expect(next.player.francs == 1234)
        #expect(map.unplacedAnnexKinds(placed: next.player.placed, plots: next.player.placementPlots).isEmpty)
        #expect(map.placedAnnex(placed: next.player.placed, plots: next.player.placementPlots)[slot.plot] == Self.telescope)
    }

    @Test func refusesTakenSlotsUnownedKindsAndMainPlots() throws {
        let map = try Self.map()
        let s = Self.owner()
        // Not owned.
        var unowned = s; unowned.player.placed = ["launchpad"]
        #expect(Construction.applyPlaceAnnex(unowned, kind: Self.telescope, plot: 10, map: map) == unowned)
        // A main site's plot is not an annex slot.
        #expect(Construction.applyPlaceAnnex(s, kind: Self.telescope, plot: 1, map: map) == s)
        // Not an annex kind.
        #expect(Construction.applyPlaceAnnex(s, kind: "launchpad", plot: 10, map: map) == s)
        // A slot something else already stands on: with only one annex kind, fake a second claimant via the map order.
        let placed = Construction.applyPlaceAnnex(s, kind: Self.telescope, plot: 10, map: map)
        #expect(Construction.applyPlaceAnnex(placed, kind: Self.telescope, plot: 10, map: map) == placed)
    }

    @Test func theHomeFrameIncludesAPlacedAnnex() throws {
        let map = try Self.map()
        let slot = map.annexSlotList[0]
        let without = map.homeCenter(["launchpad"], viewUnits: 600)
        let with = map.homeCenter(["launchpad", Self.telescope], viewUnits: 600, plots: [Self.telescope: slot.plot])
        #expect(with < without, "the west annex pulls the framing west")
    }

    // SSL-802 (Liam, 16.11): one ground telescope per annex slot at ₣2M; a new one observes only once placed.
    @Test func buysASecondTelescopeThatObservesOncePlaced() throws {
        let map = try Self.map()
        var s = GameState()
        s.player.freeOperations = true; s.player.francs = 5_000_000
        s.player.placed = [Self.telescope]; s.player.placementPlots = [Self.telescope: 10]
        let bought = Construction.applyBuildGroundTelescope(s)
        #expect(bought.player.placed.contains("ground-telescope-2"))
        #expect(bought.player.francs == 3_000_000)
        #expect(ControlStation.observingGroundTelescopes(bought.player) == 1)
        #expect(map.unplacedAnnexKinds(placed: bought.player.placed, plots: bought.player.placementPlots) == ["ground-telescope-2"])
        let placed = Construction.applyPlaceAnnex(bought, kind: "ground-telescope-2", plot: 11, map: map)
        #expect(ControlStation.observingGroundTelescopes(placed.player) == 2)
        #expect(Construction.applyBuildGroundTelescope(placed) == placed)
    }

    @Test func theTelescopeOwnedBeforeTheRuleObservesFromTheTray() throws {
        let legacy = try JSONDecoder().decode(Player.self, from: Data(#"{"placed":["ground-telescope"],"placementPlots":{}}"#.utf8))
        #expect(legacy.groundTelescopeGrandfathered)
        #expect(ControlStation.observingGroundTelescopes(legacy) == 1)
        let fresh = try JSONDecoder().decode(Player.self, from: Data(#"{"placed":["ground-telescope"],"placementPlots":{},"groundTelescopeGrandfathered":false}"#.utf8))
        #expect(ControlStation.observingGroundTelescopes(fresh) == 0)
    }
}
