import Foundation

public enum Rockets {
    /// Training is over once the onboarding mission is flown, or any mission for older saves (web `pastRocketTraining`).
    public static func pastTraining(_ p: Player) -> Bool { p.flightPlan.onboardingMissionDone || p.missionsDone > 0 }
    /// What a rocket costs this player now (web `rocketPrice`): a no-cost model is charged once training is over.
    public static func price(_ m: RocketModel, for p: Player) -> Int {
        m.costFrancs > 0 ? m.costFrancs : (pastTraining(p) ? Economy.explorerAfterTrainingPrice : 0)
    }
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

    /// What one rocket is to one job (web `rocketJobRoles`). Bigger rockets never earn more; they are needed for
    /// more cargo or a farther orbit. The cheapest that fits flies the job, a bigger one is not needed and says what
    /// it is for, and one that cannot fly it says which limit it misses.
    public enum JobRole: Equatable, Sendable {
        case use
        case notNeeded(String)
        case tooSmall(String)
        public var note: String? {
            switch self { case .use: return nil; case .notNeeded(let n), .tooSmall(let n): return n }
        }
    }

    /// `fits` is the caller's full check (mission plus destination); rockets it rejects are told why from the mission's needs.
    public static func jobRoles(_ rockets: [RocketModel], mission: Mission, fits: (RocketModel) -> Bool) -> [String: JobRole] {
        let fitting = rockets.filter(fits)
        let use = fitting.min { ($0.costFrancs, $0.tier) < ($1.costFrancs, $1.tier) }
        let cargoNeed = mission.requires.cargoMin + (mission.payload?.cargoCost ?? 0)
        var roles: [String: JobRole] = [:]
        for rocket in rockets {
            if !fitting.contains(where: { $0.id == rocket.id }) {
                if rocket.cargo < cargoNeed { roles[rocket.id] = .tooSmall("Too small: this job carries \(cargoNeed)U") }
                else if rocket.maxOrbit < mission.requires.maxOrbit { roles[rocket.id] = .tooSmall("Cannot reach ORB \(mission.requires.maxOrbit)") }
                else if rocket.drillTier < mission.requires.drillTier { roles[rocket.id] = .tooSmall("Laser too weak: needs T\(mission.requires.drillTier)") }
                else { roles[rocket.id] = .tooSmall("Cannot reach this destination") }
            } else if rocket.id == use?.id {
                roles[rocket.id] = .use
            } else {
                let base = use ?? rocket
                roles[rocket.id] = .notNeeded("Not needed: for more than \(base.cargo)U or past ORB \(base.maxOrbit)")
            }
        }
        return roles
    }
}
