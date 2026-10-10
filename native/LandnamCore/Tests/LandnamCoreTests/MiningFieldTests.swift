import Testing
@testable import LandnamCore

struct MiningFieldTests {
    private func field(tier: Int = 1, cap: Int = 6, required: Cargo = ["iron": 2]) -> MiningField {
        let target = Target(id: "t", name: "T", type: .asteroid, orbit: 2, difficulty: "easy", brief: "", minerals: ["iron", "silicon"])
        return MiningField(target: target, required: required, cargoCapacity: cap, laserTier: tier, seed: 7)
    }

    @Test func fieldAlwaysHasEnoughOreForTheContract() {
        let f = field()
        #expect(f.nodes.filter { $0.mineralId == "iron" }.count >= 2)
        #expect(f.nodes.contains { $0.mineralId == "silicon" })
    }

    @Test func sameSeedSameField() {
        #expect(field() == field())
    }

    @Test func miningDepletesNodeAndFillsCargo() {
        var f = field()
        let node = f.nodes.first { $0.mineralId == "iron" }!
        var last: MiningField.Outcome = .miss
        for _ in 0..<node.maxHp { last = f.strike(nodeId: node.id) }
        #expect(last == .mined(nodeId: node.id, mineralId: "iron"))
        #expect(f.cargo["iron"] == 1)
        #expect(f.strike(nodeId: node.id) == .miss)   // depleted nodes can't be hit again
    }

    @Test func weakLaserCannotCutHardOre() {
        let target = Target(id: "t", name: "T", type: .asteroid, orbit: 2, difficulty: "easy", brief: "", minerals: ["rhodium"])
        var f = MiningField(target: target, required: ["rhodium": 1], cargoCapacity: 6, laserTier: 1, seed: 1)
        let id = f.nodes[0].id
        #expect(f.strike(nodeId: id) == .tooHard(minTier: 2))
        #expect(f.charge == f.chargeCap)   // refused hits cost nothing
    }

    @Test func chargeRunsOutAndRecharges() {
        var f = field()
        for _ in 0..<f.chargeCap { _ = f.strike(nodeId: nil) }
        #expect(f.strike(nodeId: nil) == .noCharge)
        f.recharge(3)
        #expect(f.charge == 3)
    }

    @Test func cargoCapStopsMining() {
        var f = field(tier: 4, cap: 1, required: ["iron": 1])
        let ids = f.nodes.filter { $0.mineralId == "iron" }.map(\.id)
        _ = f.strike(nodeId: ids[0])
        #expect(f.isFull && f.isComplete)
        #expect(f.strike(nodeId: ids[1]) == .cargoFull)
    }

    @Test func nodesDoNotOverlap() {
        let f = field(required: ["iron": 3, "silicon": 2])
        for a in f.nodes { for b in f.nodes where a.id < b.id {
            #expect(abs(a.x - b.x) >= 0.16 || abs(a.y - b.y) >= 0.09)
        } }
    }
}
