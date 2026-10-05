import Foundation

/// Deterministic SplitMix64 so a field is reproducible from its seed (tests, replays).
public struct SeededRandom: RandomNumberGenerator, Sendable {
    private var s: UInt64
    public init(seed: UInt64) { s = seed &+ 0x9E37_79B9_7F4A_7C15 }
    public mutating func next() -> UInt64 {
        s &+= 0x9E37_79B9_7F4A_7C15
        var z = s
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }
}

public struct OreNode: Equatable, Identifiable, Sendable {
    public let id: Int
    public let mineralId: String
    /// Normalised position in the field, 0...1 on both axes (y = 0 is the top).
    public var x: Double
    public var y: Double
    public var hp: Int
    public let maxHp: Int
    public var isDepleted: Bool { hp <= 0 }
}

/// Pure mining rules: which nodes exist, what a laser hit does, and what lands in cargo.
/// The SpriteKit scene only renders this and forwards taps.
public struct MiningField: Equatable, Sendable {
    public private(set) var nodes: [OreNode]
    public private(set) var cargo: Cargo = [:]
    public private(set) var charge: Int
    public let chargeCap: Int
    public let cargoCapacity: Int
    public let laserTier: Int
    public let required: Cargo
    /// How far (normalised x) the rover's laser reaches either side of it; driving closer is the point.
    public static let reach = 0.34

    public var cargoUnits: Int { cargo.values.reduce(0, +) }
    public var isFull: Bool { cargoUnits >= cargoCapacity }
    public var isComplete: Bool { required.allSatisfy { cargo[$0.key, default: 0] >= $0.value } }

    public enum Outcome: Equatable, Sendable {
        case noCharge, miss, tooHard(minTier: Int), cargoFull, outOfRange
        case hit(nodeId: Int, remaining: Int)
        case mined(nodeId: Int, mineralId: String)
    }

    /// Builds a field of ore nodes weighted toward the mission's required minerals so a
    /// contract is always completable, then sprinkled with the target's other minerals.
    public init(target: Target, required: Cargo, cargoCapacity: Int, laserTier: Int, chargeCap: Int = 30, seed: UInt64) {
        var rng = SeededRandom(seed: seed)
        var nodes: [OreNode] = []
        var nextId = 0
        func place(_ mineral: String) {
            let tier = Minerals.byId[mineral]?.laserAccess ?? 1
            let maxHp = 2 + tier
            // Rejection-sample so nodes never overlap (taps must be unambiguous); fall back to the last try if packed.
            var x = 0.5, y = 0.3
            for _ in 0..<40 {
                x = Double.random(in: 0.08...0.92, using: &rng); y = Double.random(in: 0.12...0.62, using: &rng)
                if !nodes.contains(where: { abs($0.x - x) < 0.16 && abs($0.y - y) < 0.09 }) { break }
            }
            nodes.append(OreNode(id: nextId, mineralId: mineral, x: x, y: y, hp: maxHp, maxHp: maxHp))
            nextId += 1
        }
        for (mineral, need) in required.sorted(by: { $0.key < $1.key }) {
            for _ in 0..<(need + 2) { place(mineral) }   // two spare nodes per required mineral
        }
        let extras = target.minerals.filter { required[$0] == nil }
        for mineral in extras { for _ in 0..<2 { place(mineral) } }
        self.nodes = nodes
        self.charge = chargeCap; self.chargeCap = chargeCap
        self.cargoCapacity = cargoCapacity; self.laserTier = laserTier; self.required = required
    }

    /// One laser strike on a node. Costs one charge; progress is hp damage equal to laser tier.
    public mutating func strike(nodeId: Int?, roverX: Double? = nil) -> Outcome {
        guard charge > 0 else { return .noCharge }
        guard let id = nodeId, let i = nodes.firstIndex(where: { $0.id == id && !$0.isDepleted }) else {
            charge -= 1
            return .miss
        }
        if let roverX, abs(nodes[i].x - roverX) > Self.reach { return .outOfRange }   // refused hits cost nothing
        let tierNeeded = Minerals.byId[nodes[i].mineralId]?.laserAccess ?? 1
        if laserTier < tierNeeded { return .tooHard(minTier: tierNeeded) }
        if isFull { return .cargoFull }
        charge -= 1
        nodes[i].hp -= laserTier
        if nodes[i].hp <= 0 {
            cargo[nodes[i].mineralId, default: 0] += 1
            return .mined(nodeId: id, mineralId: nodes[i].mineralId)
        }
        return .hit(nodeId: id, remaining: nodes[i].hp)
    }

    public mutating func recharge(_ amount: Int = 1) { charge = min(chargeCap, charge + amount) }
}
