import Foundation
import Testing
@testable import LandnamCore

/// SSL-840: a construction goal bigger than the hold is collected over several trips (web `runtimeCatalog.test.ts`
/// "keeps a construction focus available across partial hauls and separate mineral sources").
@Suite struct ResourceFocusRunTests {
    static func player(stash: Cargo = [:]) -> Player {
        var p = Player()
        p.freeOperations = true
        p.missionsDone = 5
        p.resourceFocus = ResourceFocus(label: "Vault", minerals: ["aluminium": 12, "copper": 2])
        p.stash = stash
        return p
    }

    static func mission(_ p: Player, active: String? = nil) -> Mission? {
        Instruments.runtime(Catalog(), player: p, missionId: active, targetId: nil).mission(ResourceFocusRun.missionId)
    }

    @Test func twelveAluminiumFitsASixUnitHold() throws {
        let m = try #require(Self.mission(Self.player()))
        #expect(m.requires.minerals == ["aluminium": 12, "copper": 2])
        #expect(m.requires.cargoMin == 1)
        #expect(m.isOwnProgram && m.construction == nil && m.deliveryTargetId == nil)
        let itokawa = try #require(Targets.byId["itokawa"])
        let problems = PartCatalog.standard.validate(mission: m, target: itokawa,
                                                     rocket: RocketConfig(chassis: "hull-mk1", propulsion: "ion-a1", drill: "hand-drill")).problems
        #expect(!problems.contains { $0.contains("cargo") })
    }

    @Test func aSourceOfAnyNeededMineralIsCompatible() throws {
        let m = try #require(Self.mission(Self.player()))
        let aluminiumOnly = Target(id: "al-only", name: "Al", type: .asteroid, orbit: 1, difficulty: "L1", brief: "", minerals: ["aluminium"])
        let neither = Target(id: "none", name: "None", type: .asteroid, orbit: 1, difficulty: "L1", brief: "", minerals: ["iron"])
        #expect(Targets.compatible(with: m, targets: [aluminiumOnly, neither]).map(\.id) == ["al-only"])
    }

    @Test func aPartialHaulLeavesOnlyTheRest() throws {
        let second = try #require(Self.mission(Self.player(stash: ["aluminium": 6])))
        #expect(second.requires.minerals == ["aluminium": 6, "copper": 2])
        #expect(second.requires.cargoMin == 1)
        let copperDone = try #require(Self.mission(Self.player(stash: ["aluminium": 6, "copper": 2])))
        #expect(copperDone.requires.minerals == ["aluminium": 6])
    }

    @Test func aMetGoalDropsTheRunUnlessOneIsInFlight() {
        let met = Self.player(stash: ["aluminium": 12, "copper": 2])
        #expect(Self.mission(met) == nil)
        #expect(Self.mission(met, active: ResourceFocusRun.missionId) != nil)
        #expect(Self.mission(Player()) == nil)
    }

    @Test func focusingSetsTheGoalOnlyWhenSomethingIsShort() {
        var p = Self.player(stash: ["aluminium": 20, "copper": 10])
        p.resourceFocus = nil
        #expect(!ResourceFocusRun.focus(&p, label: "Mineral Vault", materials: ["aluminium": 15, "copper": 8]))
        #expect(p.resourceFocus == nil)
        p.stash = ["aluminium": 6]
        #expect(ResourceFocusRun.focus(&p, label: "Mineral Vault", materials: ["aluminium": 15, "copper": 8]))
        #expect(p.resourceFocus == ResourceFocus(label: "Mineral Vault", minerals: ["aluminium": 15, "copper": 8]))
    }

    @MainActor @Test func theStoreFocusesAndTheRunCanBeStartedFromTheBoard() throws {
        var s = GameState()
        s.player = Self.player(stash: ["aluminium": 6])
        s.player.resourceFocus = nil
        s.player.placed = ["launchpad", "surface-silo"]
        s.player.subsurfaceExcavated = true
        s.screen = .hub
        let store = GameStore(state: s)
        #expect(!store.buildSubsurfaceSilo())
        #expect(store.focusResources(label: "Mineral Vault", materials: GameStore.subsurfaceSiloMaterials(deep: false)))
        #expect(store.screen == .missions)
        #expect(store.requestedMissionBoardTab == ResourceFocusRun.boardTab)
        let m = try #require(store.catalog.mission(ResourceFocusRun.missionId))
        #expect(m.requires.minerals == ["aluminium": 9, "copper": 8])
        store.pickMission(m.id)
        #expect(store.state.missionId == ResourceFocusRun.missionId)
    }

    @Test func theFocusRoundTripsThroughTheWebSave() throws {
        let p = Self.player()
        let json = try JSONEncoder().encode(p)
        let obj = try #require(try JSONSerialization.jsonObject(with: json) as? [String: Any])
        let focus = try #require(obj["resourceFocus"] as? [String: Any])
        #expect(focus["label"] as? String == "Vault")
        #expect(try JSONDecoder().decode(Player.self, from: json).resourceFocus == p.resourceFocus)
    }
}
