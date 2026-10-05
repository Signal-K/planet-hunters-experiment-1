import Foundation

/// The Landnam economy in one place. Mirrors `web/lib/data/economy.ts` (the
/// single source of truth for scale: a contract fee is roughly 15 to 25 million francs).
public enum Economy {
    public static let contractFees: [Int: Int] = [1: 15_000_000, 2: 18_000_000, 3: 22_000_000, 4: 24_000_000]
    public static let contractFeeStep = 2_500_000
    public static let cargoBonusCap = 0.18
    public static let cargoBonusRate = 0.4

    public static let mineralValue: [MineralRarity: Int] = [
        .common: 250_000, .uncommon: 420_000, .rare: 700_000, .exotic: 1_100_000,
    ]
    public static let refiningValueMultiplier = 1.6
    public static let refiningCostRate = 0.07

    public static let prospectorPrice = 13_000_000
    public static let unannounced3Price = 40_000_000
    public static let refineryPrice = 8_000_000
    public static let garagePrice = 6_000_000
    public static let academyPrice = 12_000_000
    public static let launchpadUpgradePrice = 10_000_000
    public static let deepSpaceTelescopePrice = 15_000_000

    public static let startingFrancs = 9_000_000
    public static let loanPrincipal = 5_000_000
    public static let bankruptcyThreshold = 2_000_000
    public static let openMarketSellRate = 0.8
    public static let surfaceSiloCapacity = 40
    public static let surfaceSiloPrice = 2_000_000
    public static let mineralSiloCapacity = 120
    public static let deepMineralSiloCapacity = 300
    public static let remoteMineralSiloCapacity = 180

    // Pacing
    public static let orbitMsPerUnit = 42_000.0
    public static let travelTimeScale = 0.25
    public static let deliveryUnloadMs = 8_000.0
    public static let landingDescendMs = 8_000.0
    public static let landingAscendMs = 8_000.0

    public static func format(francs: Int) -> String {
        let value = Double(francs)
        if abs(value) >= 1_000_000_000 { return String(format: "₣%.1fB", value / 1_000_000_000) }
        if abs(value) >= 1_000_000 { return String(format: "₣%.1fM", value / 1_000_000) }
        if abs(value) >= 1_000 { return String(format: "₣%.1fK", value / 1_000) }
        return "₣\(francs)"
    }
}
