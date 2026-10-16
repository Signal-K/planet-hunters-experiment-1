import Foundation

public enum Rockets {
    public static let explorer = "explorer"
    public static let prospector = "prospector"

    public static let models: [RocketModel] = [
        RocketModel(id: "explorer", name: "Explorer", tier: 1, costFrancs: 0, missionsRequired: 0, locked: false,
                    cargo: 6, maxOrbit: 5, drillTier: 1, unlockHint: "Available from the start"),
        RocketModel(id: "prospector", name: "Prospector", tier: 2, costFrancs: Economy.prospectorPrice, missionsRequired: 1,
                    locked: false, cargo: 10, maxOrbit: 7, drillTier: 2, unlockHint: "Unlocks after M1"),
        RocketModel(id: "surveyor", name: "Surveyor", tier: 3, costFrancs: Economy.surveyorPrice,
                    missionsRequired: 6, locked: false, cargo: 18, maxOrbit: 9, drillTier: 3, unlockHint: "Unlocks after 6 missions"),
        RocketModel(id: "unannounced-4", name: "Unannounced", tier: 4, costFrancs: 0, missionsRequired: 999, locked: true,
                    cargo: 0, maxOrbit: 0, drillTier: 0, unlockHint: "Coming soon"),
        RocketModel(id: "unannounced-5", name: "Unannounced", tier: 5, costFrancs: 0, missionsRequired: 999, locked: true,
                    cargo: 0, maxOrbit: 0, drillTier: 0, unlockHint: "Coming soon"),
    ]

    private static let legacyIds = ["sr1": "explorer", "sr2": "prospector", "sr3": "surveyor", "unannounced-3": "surveyor",
                                    "sr4": "unannounced-4", "sr5": "unannounced-5"]

    public static func canonicalId(_ id: String) -> String { legacyIds[id] ?? id }

    public static func model(id: String) -> RocketModel? { models.first { $0.id == id } }

    public static func config(for model: RocketModel?) -> RocketConfig {
        switch model?.id {
        case "prospector": return RocketConfig(chassis: "hull-mk2", propulsion: "fusion-b2", drill: "laser-t2")
        case "surveyor": return RocketConfig(chassis: "hull-mk3", propulsion: "ion-a3", drill: "plasma-t3")
        default: return .starter
        }
    }

    public static func model(for config: RocketConfig?) -> RocketModel {
        let id: String
        switch config?.chassis {
        case "hull-mk2": id = "prospector"
        case "hull-mk3": id = "surveyor"
        default: id = "explorer"
        }
        return model(id: id) ?? models[0]
    }

    /// A rocket is compatible with a mission when it can carry the contract cargo
    /// and its drill tier meets the requirement.
    public static func compatible(_ rocket: RocketModel, with mission: Mission) -> Bool {
        !rocket.locked
            && rocket.cargo >= mission.requires.cargoMin
            && rocket.drillTier >= mission.requires.drillTier
    }
}
