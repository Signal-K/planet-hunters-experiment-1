import Foundation

public typealias Cargo = [String: Int]

public struct RocketConfig: Codable, Equatable, Hashable, Sendable {
    public var chassis: String
    public var propulsion: String
    public var drill: String
    public init(chassis: String, propulsion: String, drill: String) {
        self.chassis = chassis; self.propulsion = propulsion; self.drill = drill
    }
    public static let starter = RocketConfig(chassis: "hull-mk1", propulsion: "ion-a1", drill: "hand-drill")
}

public enum MineralRarity: String, Codable, Sendable { case common, uncommon, rare, exotic }
public enum OreShape: String, Codable, Sendable { case circle, diamond, rect, triangle }

public struct MineralMeta: Equatable, Sendable {
    public let id: String
    public let name: String
    public let symbol: String
    public let colorHex: String
    public let rarity: MineralRarity
    public let constructionUse: String
    public let laserAccess: Int
    public let earthAbundant: Bool
    public let shape: OreShape
    public var price: Int { Economy.mineralValue[rarity]! }
}

public struct Part: Equatable, Sendable {
    public let id: String
    public let name: String
    public let tier: Int
    public let locked: Bool
    public var mass: Int?
    public var cargo: Int?
    public var maxOrbit: Int?
    public var rate: Int?
    public var missionsRequired: Int?
}

public struct RocketModel: Equatable, Sendable {
    public let id: String
    public let name: String
    public let tier: Int
    public let costFrancs: Int
    public let missionsRequired: Int
    public let locked: Bool
    public let cargo: Int
    public let maxOrbit: Int
    public let drillTier: Int
    public let unlockHint: String
}

public enum TargetType: String, Codable, Sendable { case planet, asteroid, exoplanet }
public enum TargetArchetype: String, Codable, Sendable { case C, S, M, icy, gasGiant = "gas-giant" }

public struct Target: Codable, Equatable, Identifiable, Sendable {
    public var id: String
    public var name: String
    public var type: TargetType
    public var orbit: Int
    public var difficulty: String
    public var brief: String
    public var minerals: [String]
    public var archetype: TargetArchetype?
    public var recommended: Bool?
}

public struct Client: Equatable, Identifiable, Sendable {
    public enum UIRole: String, Sendable { case starter, prospect, bulk, command }
    public let id: String
    public let name: String
    public let colorHex: String
    public let initial: String
    public let unlockTier: Int
    public let projectType: String
    public let mineralPreferences: [String]
    public let payoutPremium: Double
    public let affinityBonusPerMission: Double
    public let uiRole: UIRole
    public let suppliesCrew: Bool
}

public struct MissionRequirements: Codable, Equatable, Sendable {
    public var minerals: Cargo
    public var cargoMin: Int
    public var drillTier: Int
    public var maxOrbit: Int
    enum CodingKeys: String, CodingKey {
        case minerals, cargoMin = "cargo_min", drillTier = "drill_tier", maxOrbit = "max_orbit"
    }
}

public struct MissionPayout: Codable, Equatable, Sendable {
    public var francs: Int
    public var affinity: Int
}

public struct MissionConstructionPlan: Codable, Equatable, Sendable {
    public var structureKind: String
    public var requiredMaterials: Cargo
    public var buildTimeMs: Int
}

public struct Mission: Codable, Equatable, Identifiable, Sendable {
    public var id: String
    public var title: String
    public var brief: String
    public var client: String?
    public var tag: String
    public var difficulty: String
    public var locked: Bool
    public var sequence: Int
    public var unlockAt: String?
    public var targetId: String?
    public var deliveryTargetId: String?
    public var requires: MissionRequirements
    public var payout: MissionPayout
    public var construction: MissionConstructionPlan?
    /// Player-owned operations pay no francs or affinity (no client).
    public var isOwnProgram: Bool { client == nil }
}

public struct BuildCheck: Sendable {
    public let ok: Bool
    public let problems: [String]
}

public struct StagedRocket: Codable, Equatable, Identifiable, Sendable {
    public enum Location: String, Codable, Sendable { case hangar, launchpad }
    public enum Source: String, Codable, Sendable { case company, fabricated }
    public var id: String
    public var rocketId: String
    public var rocket: RocketConfig
    public var location: Location
    public var source: Source
    public var missionId: String
    public var targetId: String
    public var deliveryTargetId: String?
}

public struct CompletedMissionRecord: Codable, Equatable, Sendable {
    public enum Kind: String, Codable, Sendable { case client, program }
    public var id: String
    public var title: String
    public var targetId: String?
    public var clientName: String?
    public var targetName: String?
    public var completedAt: Double
    public var runId: String?
    public var kind: Kind?
    public init(id: String, title: String, targetId: String? = nil, clientName: String? = nil, targetName: String? = nil, completedAt: Double, runId: String? = nil, kind: Kind? = nil) {
        self.id = id; self.title = title; self.targetId = targetId; self.clientName = clientName; self.targetName = targetName
        self.completedAt = completedAt; self.runId = runId; self.kind = kind
    }
}

public struct ActiveMission: Codable, Equatable, Sendable {
    public var id: String
    public var label: String
    public init(id: String, label: String) { self.id = id; self.label = label }
}

public enum MissionPhase: String, Codable, Sendable { case transit, landing, mining, delivery, debrief }
