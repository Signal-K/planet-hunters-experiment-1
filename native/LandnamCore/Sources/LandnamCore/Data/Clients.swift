import Foundation

public enum Clients {
    public static let cooldownMs = 30 * 60 * 1000
    public static let streakLimit = 2
    public static let maxAffinityBonus = 0.15
    public static let affinityMissionThreshold = 5

    private static func c(_ id: String, _ name: String, _ hex: String, _ initial: String, _ tier: Int, _ project: String,
                          _ prefs: [String], _ premium: Double, _ affinity: Double, _ role: Client.UIRole, crew: Bool) -> Client {
        Client(id: id, name: name, colorHex: hex, initial: initial, unlockTier: tier, projectType: project,
               mineralPreferences: prefs, payoutPremium: premium, affinityBonusPerMission: affinity, uiRole: role, suppliesCrew: crew)
    }

    public static let all: [Client] = [
        c("helios-propulsion-depot", "Helios Propulsion Depot", "#36c6e2", "HP", 1, "Catalytic thruster components and drive system supply", ["platinum", "palladium"], 0.20, 0.025, .starter, crew: false),
        c("arcturus-battery-systems", "Arcturus Battery Systems", "#4f9cf7", "AB", 1, "Hydrogen fuel-cell manufacturing and catalyst supply", ["palladium", "iridium"], 0.22, 0.025, .prospect, crew: false),
        c("ferrum-orbital-construction", "Ferrum Orbital Construction", "#c7d0dc", "FO", 1, "High-temperature alloy supply for orbital structure assemblies", ["platinum", "iridium"], 0.18, 0.02, .bulk, crew: true),
        c("atlas-aggregate", "Atlas Aggregate", "#a8d8ea", "AA", 2, "Bulk construction feedstock and orbital ballast", ["iron", "silicon"], 0.18, 0.02, .bulk, crew: false),
        c("ceres-volatiles-collective", "Ceres Volatiles Collective", "#5ee6c0", "CV", 2, "Volatile extraction and carbonaceous feedstock reserves", ["carbon", "ice", "hydrogen"], 0.20, 0.025, .prospect, crew: false),
        c("helioforge-metals", "Helioforge Metals", "#79d1ec", "HF", 2, "Nickel, cobalt, and precious-metal assay", ["nickel", "cobalt", "gold"], 0.24, 0.03, .prospect, crew: false),
        c("kepler-materials", "Kepler Materials", "#70e070", "KM", 3, "Deep-core sampling and battery material reserves", ["nickel", "cobalt"], 0.22, 0.03, .prospect, crew: false),
        c("nightjar-systems", "Nightjar Systems", "#93cef0", "NS", 3, "Rare gas capture and ion drive reserves", ["rare", "hydrogen"], 0.28, 0.035, .command, crew: true),
        c("vulcan-core-metallurgy", "Vulcan Core Metallurgy", "#e85d5d", "VC", 4, "Deep metallic-core assay and platinum-group refinement", ["platinum", "rhodium"], 0.26, 0.03, .prospect, crew: false),
        c("solgrid-dynamics", "Solgrid Dynamics", "#5ae7de", "SD", 4, "Solar-grid expansion and high-purity silicon", ["silicon", "ice"], 0.24, 0.025, .command, crew: true),
    ]

    public static let byId: [String: Client] = Dictionary(uniqueKeysWithValues: all.map { ($0.id, $0) })

    /// Affinity bonus a player has earned with a client, capped at `maxAffinityBonus`.
    public static func affinityBonus(for client: Client, completed: Int) -> Double {
        min(maxAffinityBonus, Double(completed) * client.affinityBonusPerMission)
    }
}
