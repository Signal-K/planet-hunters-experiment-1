import Foundation

public enum Minerals {
    private static func m(_ id: String, _ name: String, _ sym: String, _ hex: String, _ rarity: MineralRarity,
                          _ use: String, laser: Int, abundant: Bool = false, shape: OreShape) -> MineralMeta {
        MineralMeta(id: id, name: name, symbol: sym, colorHex: hex, rarity: rarity, constructionUse: use,
                    laserAccess: laser, earthAbundant: abundant, shape: shape)
    }

    public static let all: [MineralMeta] = [
        m("platinum", "Platinum", "Pt", "#e8e4d8", .rare, "Catalytic nozzle coatings, fuel cells", laser: 1, shape: .diamond),
        m("palladium", "Palladium", "Pd", "#d4cce8", .rare, "Hydrogen fuel cells, electronics", laser: 1, shape: .circle),
        m("iridium", "Iridium", "Ir", "#b8b4cc", .rare, "High-temp alloys, ignition components", laser: 2, shape: .triangle),
        m("rhodium", "Rhodium", "Rh", "#f0e8d4", .exotic, "Thruster lining, radiation-hard optics", laser: 2, shape: .rect),
        m("gold", "Gold", "Au", "#ffd166", .rare, "Circuitry, radiation shielding", laser: 2, shape: .circle),
        m("rare", "Xenon", "Xe", "#c084ff", .exotic, "Quantum sensors, ion propellant", laser: 3, shape: .diamond),
        m("iron", "Iron", "Fe", "#d97150", .common, "Structural frames, smelting feedstock", laser: 1, abundant: true, shape: .circle),
        m("silicon", "Silicon", "Si", "#b9d8ff", .common, "Electronics, solar panels", laser: 1, abundant: true, shape: .diamond),
        m("ice", "Ice", "H2O", "#9becff", .uncommon, "Propellant, life support", laser: 1, shape: .circle),
        m("carbon", "Carbon", "C", "#6a7280", .common, "Composites, fuel", laser: 1, abundant: true, shape: .rect),
        m("nickel", "Nickel", "Ni", "#b0b8c4", .uncommon, "Alloys, battery production", laser: 1, shape: .diamond),
        m("cobalt", "Cobalt", "Co", "#4f9cf7", .uncommon, "Battery cathodes, superalloys", laser: 2, shape: .triangle),
        m("copper", "Copper", "Cu", "#c9824b", .common, "Conductors, heat exchangers, wiring", laser: 1, abundant: true, shape: .rect),
        m("aluminium", "Aluminium", "Al", "#c7d0dc", .common, "Lightweight frames, tanks, trusses", laser: 1, abundant: true, shape: .rect),
        m("hydrogen", "Hydrogen", "H", "#9becff", .uncommon, "Propellant, reactor feedstock", laser: 1, shape: .triangle),
        m("uranium", "Uranium", "U", "#8fd16a", .rare, "Compact power systems, shielding", laser: 2, shape: .triangle),
    ]

    public static let byId: [String: MineralMeta] = Dictionary(uniqueKeysWithValues: all.map { ($0.id, $0) })

    /// Book value of a haul at plain (un-premiumed) mineral prices.
    public static func value(of cargo: Cargo) -> Int {
        cargo.reduce(0) { $0 + (byId[$1.key]?.price ?? 0) * $1.value }
    }
}
