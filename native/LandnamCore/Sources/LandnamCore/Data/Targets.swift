import Foundation

public enum Archetypes {
    private struct Pool { let common, uncommon, rare, exotic: [String] }
    private static let pools: [TargetArchetype: Pool] = [
        .M: Pool(common: ["iron", "nickel"], uncommon: ["cobalt", "copper"], rare: ["gold", "platinum"],
                 exotic: ["palladium", "rhodium", "iridium", "rare"]),
        .S: Pool(common: ["iron", "silicon"], uncommon: ["aluminium", "nickel"], rare: ["platinum"], exotic: ["uranium"]),
        .C: Pool(common: ["carbon", "ice"], uncommon: ["hydrogen"], rare: ["palladium"], exotic: ["iridium", "rhodium"]),
        .icy: Pool(common: ["ice"], uncommon: ["silicon", "hydrogen"], rare: [], exotic: ["rare"]),
        .gasGiant: Pool(common: ["ice", "silicon"], uncommon: ["hydrogen"], rare: ["uranium"], exotic: ["rare"]),
    ]
    public static let rareTierMinOrbit = 2
    public static let exoticTierMinOrbit = 4

    public static func minerals(for archetype: TargetArchetype, orbit: Int) -> [String] {
        let pool = pools[archetype]!
        var out = pool.common + pool.uncommon
        if orbit >= rareTierMinOrbit { out += pool.rare }
        if orbit >= exoticTierMinOrbit { out += pool.exotic }
        var seen = Set<String>()
        return out.filter { seen.insert($0).inserted }
    }

    public static func orbitBandLabel(_ orbit: Int) -> String {
        if orbit >= exoticTierMinOrbit { return "Deep belt · exotic minerals" }
        if orbit >= rareTierMinOrbit { return "Mid belt · rare minerals" }
        return "Near-Earth · common minerals"
    }
}

public enum Targets {
    private static func landmark(_ id: String, _ name: String, _ type: TargetType, _ orbit: Int, _ difficulty: String,
                                 _ brief: String, _ archetype: TargetArchetype, recommended: Bool? = nil) -> Target {
        Target(id: id, name: name, type: type, orbit: orbit, difficulty: difficulty, brief: brief,
               minerals: Archetypes.minerals(for: archetype, orbit: orbit), archetype: archetype, recommended: recommended)
    }

    public static let all: [Target] = [
        landmark("mercury", "Mercury", .planet, 1, "L2", "Scorched inner planet, rich in iron and trace silicates.", .S),
        landmark("venus", "Venus", .planet, 2, "L3", "High-pressure surface. The assigned program site remains unavailable until pressure-rated construction equipment is fitted.", .S),
        landmark("mars", "Mars", .planet, 4, "L1", "Iron-rich rusty plains, well-mapped, starter-friendly.", .S, recommended: true),
        landmark("eros", "433 Eros", .asteroid, 2, "L1", "Elongated near-Earth rock with dense iron-nickel core. First commercial prospect on file.", .S, recommended: true),
        landmark("vesta", "4 Vesta", .asteroid, 3, "L1", "Differentiated protoplanet. Basaltic crust over a heavy iron mantle.", .S),
        landmark("itokawa", "25143 Itokawa", .asteroid, 2, "L1", "Stony near-Earth rubble pile with accessible nickel-iron traces.", .S),
        landmark("ryugu", "162173 Ryugu", .asteroid, 3, "L1", "Carbonaceous near-Earth asteroid with hydrated minerals and dark regolith.", .C),
        landmark("psyche", "16 Psyche", .asteroid, 4, "L2", "Exposed metallic core of an ancient body. Extremely high iron and nickel grades, the richest known prospecting site on file.", .M),
        landmark("bennu", "101955 Bennu", .asteroid, 2, "L1", "Carbon-rich near-Earth asteroid. Loose rubble pile, low gravity, easy approach.", .C),
        landmark("ceres", "1 Ceres", .asteroid, 5, "L2", "Dwarf planet at the belt's inner edge. Ice-rich mantle beneath a carbon-dark crust.", .C),
        landmark("lutetia", "21 Lutetia", .asteroid, 6, "L2", "A large carbonaceous asteroid in the outer belt. Hydrated minerals under a dark regolith crust.", .C, recommended: false),
        landmark("jupiter", "Jupiter", .planet, 6, "L3", "Gas giant with hydrogen, helium, and a high gravity penalty. Jupiter itself is not a conventional mining site.", .gasGiant),
    ]

    public static let byId: [String: Target] = Dictionary(uniqueKeysWithValues: all.map { ($0.id, $0) })

    public struct Star: Equatable, Sendable { public let id, name, kind, dist: String; public let x, y: Double }
    public static let stars: [Star] = [
        Star(id: "sol", name: "Sol", kind: "sol", dist: "0 ly", x: 48, y: 55),
        Star(id: "proxima", name: "Proxima", kind: "red", dist: "4.2 ly", x: 22, y: 30),
        Star(id: "alpha", name: "Alpha Cen", kind: "warm", dist: "4.4 ly", x: 28, y: 42),
        Star(id: "barnard", name: "Barnard's", kind: "red", dist: "5.9 ly", x: 38, y: 22),
        Star(id: "sirius", name: "Sirius", kind: "pale", dist: "8.6 ly", x: 62, y: 20),
        Star(id: "tau", name: "Tau Ceti", kind: "cool", dist: "11.9 ly", x: 72, y: 38),
        Star(id: "epsilon", name: "Eps Eri", kind: "warm", dist: "10.5 ly", x: 80, y: 62),
        Star(id: "vega", name: "Vega", kind: "pale", dist: "25.0 ly", x: 58, y: 76),
    ]
    public static let starLinks: [(String, String)] = [
        ("sol", "proxima"), ("sol", "alpha"), ("sol", "barnard"), ("proxima", "alpha"), ("alpha", "barnard"),
        ("barnard", "sirius"), ("sol", "tau"), ("tau", "epsilon"), ("epsilon", "vega"), ("sol", "vega"),
    ]

    /// Targets a mission can be flown to (port of `compatibleTargetsFor`).
    public static func compatible(with mission: Mission, targets: [Target] = all) -> [Target] {
        if let fixed = mission.targetId { return targets.filter { $0.id == fixed } }
        let required = Array(mission.requires.minerals.keys)
        let onboarding = mission.sequence <= MissionGenerator.onboardingSequenceCount
        return targets.filter { t in
            t.orbit <= mission.requires.maxOrbit
                && (!onboarding || t.type == .asteroid)
                && required.allSatisfy { t.minerals.contains($0) }
        }
    }

    /// Compatible targets the player's unlocked parts can actually reach, carry and mine.
    public static func feasible(for mission: Mission, parts: PartCatalog = .standard, missionsDone: Int,
                                launchpadUpgraded: Bool = false, launchpadLevel: Int = 1, skills: [String] = []) -> [Target] {
        let delivery = mission.deliveryTargetId.flatMap { byId[$0] }
        return compatible(with: mission).filter { target in
            let rocket = parts.suggestBuild(mission: mission, target: target, deliveryTarget: delivery,
                                            missionsDone: missionsDone, launchpadUpgraded: launchpadUpgraded, launchpadLevel: launchpadLevel, skills: skills)
            return parts.validate(mission: mission, target: target, rocket: rocket, skills: skills).ok
        }
    }
}
