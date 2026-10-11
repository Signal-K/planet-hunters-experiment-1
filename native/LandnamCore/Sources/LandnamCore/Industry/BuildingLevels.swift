import Foundation

/// Upgradable Earth Base buildings, levels 1 to 3. Port of `web/lib/data/building-levels.ts`
/// and `applyUpgradeBuilding`; the save key is `buildingLevels` on both platforms.
public enum BuildingLevels {
    public static let ids = ["launchpad", "surface-silo", "refinery", "astronaut-academy"]
    public static let maxLevel = 3

    /// Francs to reach level 2 and level 3.
    public static let upgradeCosts: [String: [Int]] = [
        "launchpad": [Economy.launchpadUpgradePrice, Economy.launchpadUpgradePrice * 2],
        "surface-silo": [Economy.surfaceSiloPrice * 2, Economy.surfaceSiloPrice * 4],
        "refinery": [Economy.refineryPrice, Economy.refineryPrice * 2],
        "astronaut-academy": [Economy.academyPrice, Economy.academyPrice * 2],
    ]

    /// One concrete effect per building and level.
    public static let effects: [String: [String]] = [
        "launchpad": ["Base parts and targets", "Unlocks the parts and targets of a flown mission", "Unlocks the parts and targets of two flown missions"],
        "surface-silo": ["Holds 40 units of ore", "Holds 80 units of ore", "Holds 120 units of ore"],
        "refinery": ["Standard refining time", "Refining takes 25% less time", "Refining takes 50% less time"],
        "astronaut-academy": ["Day-long training sessions", "Training takes 25% less time", "Training takes 50% less time"],
    ]

    public static let names: [String: String] = ["launchpad": "Launchpad", "surface-silo": "Surface Silo", "refinery": "Refinery", "astronaut-academy": "Academy"]

    private static let siloMultiplier = [1, 2, 3]
    private static let timeMultiplier = [1.0, 0.75, 0.5]
    private static let launchpadFloor = [0, 1, 2]

    static func clamp(_ level: Int?) -> Int { min(maxLevel, max(1, level ?? 1)) }

    /// Absent or malformed means level 1; the legacy `launchpadUpgraded` flag is launchpad level 2.
    public static func level(_ p: Player, _ id: String) -> Int {
        let l = clamp(p.buildingLevels[id])
        return id == "launchpad" && p.launchpadUpgraded ? max(l, 2) : l
    }

    /// Price of the upgrade from `level` to `level + 1`, nil at max level.
    public static func cost(_ id: String, level: Int) -> Int? {
        level >= maxLevel ? nil : upgradeCosts[id]?[level - 1]
    }

    /// Drops unknown ids, clamps to 1...3 and keeps only levels above 1.
    public static func sanitize(_ raw: [String: Int], launchpadUpgraded: Bool) -> [String: Int] {
        var out: [String: Int] = [:]
        for id in ids {
            var l = clamp(raw[id])
            if id == "launchpad" && launchpadUpgraded { l = max(l, 2) }
            if l > 1 { out[id] = l }
        }
        return out
    }

    public static func siloCapacityMultiplier(_ level: Int) -> Int { siloMultiplier[clamp(level) - 1] }
    public static func timeMultiplier(_ level: Int) -> Double { timeMultiplier[clamp(level) - 1] }
    public static func launchpadMissionFloor(_ level: Int) -> Int { launchpadFloor[clamp(level) - 1] }

    /// Raise a placed building one level. No-op if not placed, maxed or unaffordable; never touches `placed`.
    public static func applyUpgrade(_ s: GameState, id: String) -> GameState {
        guard ids.contains(id), s.player.placed.contains(id) else { return s }
        let current = level(s.player, id)
        guard let price = cost(id, level: current), s.player.francs >= price else { return s }
        var n = s
        n.player.francs -= price
        n.player.buildingLevels[id] = current + 1
        if id == "launchpad" { n.player.launchpadUpgraded = true }
        return n
    }
}
