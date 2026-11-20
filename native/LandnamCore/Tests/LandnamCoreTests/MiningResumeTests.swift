import Foundation
import Testing
@testable import LandnamCore

struct MiningResumeTests {
    @Test func menuNavigationAndReloadKeepTheHoldAndChargeBudget() throws {
        let target = Target(id: "t", name: "T", type: .asteroid, orbit: 2, difficulty: "easy", brief: "", minerals: ["iron"])
        var field = MiningField(target: target, required: ["iron": 2], cargoCapacity: 6, laserTier: 1, chargeCap: 80, seed: 7)
        _ = field.strike(nodeId: field.nodes.first!.id)
        _ = field.strike(nodeId: nil)
        var save = GameState()
        save.player.miningCargoInProgress = field.cargo
        save.player.miningLaserCharges = field.charge
        let loaded = try JSONDecoder().decode(GameState.self, from: JSONEncoder().encode(save))
        var resumed = MiningField(target: target, required: ["iron": 2], cargoCapacity: 6, laserTier: 1, chargeCap: 80, seed: 7)
        resumed.restoreProgress(cargo: loaded.player.miningCargoInProgress ?? [:], charge: loaded.player.miningLaserCharges)
        #expect(resumed.cargo == ["iron": 1])
        #expect(resumed.charge == 78)
        #expect(resumed.nodes.filter(\.isDepleted).count == 1)
    }
    @Test func aLegacySaveStartsWithTheFullBudget() {
        let target = Target(id: "t", name: "T", type: .asteroid, orbit: 2, difficulty: "easy", brief: "", minerals: ["iron"])
        var field = MiningField(target: target, required: [:], cargoCapacity: 6, laserTier: 1, chargeCap: 80, seed: 7)
        field.restoreProgress(cargo: [:], charge: nil)
        #expect(field.charge == 80)
    }
}
