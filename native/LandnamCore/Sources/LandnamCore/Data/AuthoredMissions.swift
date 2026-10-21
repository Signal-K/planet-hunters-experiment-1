import Foundation

/// The hand-authored missions from web `missions.ts` (`AUTHORED_MISSIONS` and the player-programme
/// builds). The generated board lives in `MissionGenerator`; this is everything else the web catalog
/// carries, so the two games offer the same work. The Belt Courier Run and the self-directed mining
/// run are built from the compiled `shared/authoring/missions` declarations, the same ones web reads.
public enum AuthoredMissions {
    public static let transportSequence = MissionGenerator.transportSequence
    public static let selfDirectedMiningId = "freeops-self-directed-mining"
    public static let crewedProspectingId = "freeops-crewed-prospecting"
    public static let academyStoryId = "story-astronaut-academy"
    public static let remoteSiloBuildId = "program-build-remote-silo"
    public static let marsSettlementBuildId = "program-build-mars-mining-settlement"
    public static let buildTimeMs = 45 * 60 * 1000

    private static func floor(_ n: Int) -> Int { MissionGenerator.payoutFloor(sequence: n) }
    private static func materials(_ m: Cargo) -> Cargo { m }

    private static let declarations: [AuthoredMissionDeclaration] = {
        do { return try JSONDecoder().decode(AuthoredMissionFile.self, from: Data(AuthoredMissionDeclarations.json.utf8)).missions }
        catch { preconditionFailure("AuthoredMissionDeclarations.json is not valid: \(error)") }
    }()

    /// One mission from `shared/authoring/missions`, built from the compiled declarations (web `authoredMission`).
    /// Edit the TOML, then `npm run authoring:compile`; the Scene Studio does that on save.
    public static func declared(_ id: String) -> Mission {
        guard let declaration = declarations.first(where: { $0.id == id }) else {
            preconditionFailure("mission \"\(id)\" is not in shared/authoring/missions; run npm run authoring:compile")
        }
        return declaration.mission
    }

    /// Player-programme construction: owned work, no client fee.
    public static let programBuilds: [Mission] = {
        let seq = MissionGenerator.freeOpsMissionSequence
        func build(_ id: String, _ title: String, _ brief: String, _ diff: String, _ unlock: String, target: String?, kind: String,
                   mats: Cargo, maxOrbit: Int, outcome: String) -> Mission {
            Mission(id: id, title: title, brief: brief, client: nil, tag: "PROGRAM", difficulty: diff, locked: false, sequence: seq,
                    unlockAt: unlock, targetId: target, deliveryTargetId: nil,
                    // The kit must fit the biggest vehicle the player can launch (web `materialRequirement`).
                    requires: MissionRequirements(minerals: mats, cargoMin: min(mats.values.reduce(0, +), Rockets.models.filter { !$0.locked }.map(\.cargo).max() ?? 0), drillTier: 1, maxOrbit: maxOrbit),
                    payout: MissionPayout(francs: 0, affinity: 0),
                    construction: MissionConstructionPlan(structureKind: kind, requiredMaterials: mats, buildTimeMs: buildTimeMs),
                    payload: nil, programReward: ProgramReward(researchXP: 0, outcome: outcome))
        }
        return [
            build(marsSettlementBuildId, "Establish Mars Mining Settlement",
                  "Carry a starter settlement kit to the program’s assigned Mars area. The permanent site anchors later extraction and support structures.",
                  "L1", "Reach Free Operations · Mars allocation ready", target: "mars", kind: "mining-settlement",
                  mats: ["aluminium": 12, "iron": 16, "silicon": 8], maxOrbit: 4,
                  outcome: "Mars mining settlement established · permanent program site online"),
            build(remoteSiloBuildId, "Build a Remote Mineral Silo",
                  "Send construction materials to a target with build rights. The sealed silo stores your extracted ore off-world instead of forcing every haul into an Earth sale.",
                  "L2", "Reach Free Operations", target: nil, kind: "mineral-silo",
                  mats: ["aluminium": 18, "iron": 12, "copper": 6], maxOrbit: 5,
                  outcome: "Remote Mineral Silo commissioned · ore can be held at the selected target"),
        ]
    }()

    public static let all: [Mission] = programBuilds + [
        Mission(id: academyStoryId, title: "Train the First Astronaut",
                brief: "Establish the Astronaut Academy at Base, fund its first day-long session, and graduate a named astronaut into your roster.",
                client: nil, tag: "STORY", difficulty: "L1", locked: true, sequence: MissionGenerator.freeOpsMissionSequence,
                unlockAt: "Reach client level 2 with two clients", targetId: nil, deliveryTargetId: nil,
                requires: MissionRequirements(minerals: [:], cargoMin: 0, drillTier: 1, maxOrbit: 0),
                payout: MissionPayout(francs: 0, affinity: 0), construction: nil, payload: nil,
                programReward: ProgramReward(researchXP: 0, outcome: "Astronaut Academy online · crew training unlocked")),
        declared("lnm_m3_relay_bennu_vesta"),
        Mission(id: "lnm_m3_relay_itokawa_eros", title: "Nickel Line Handoff",
                brief: "Helioforge Metals needs nickel pulled from Itokawa, then handed off at Eros before you fly home. You're paid for both jobs: mining the ore and running the relay to Eros.",
                client: "helioforge-metals", tag: "TRANSPORT", difficulty: "L1", locked: false, sequence: transportSequence, unlockAt: "Complete 1 contract",
                targetId: "itokawa", deliveryTargetId: "eros",
                requires: MissionRequirements(minerals: ["nickel": 3], cargoMin: 3, drillTier: 1, maxOrbit: 4),
                payout: MissionPayout(francs: floor(3), affinity: 3), construction: nil, payload: nil, programReward: nil),
        Mission(id: "lnm_relay_psyche_ceres", title: "Deep-Core Relay",
                brief: "Kepler Materials needs nickel and cobalt extracted at 16 Psyche, then ferried onward to their Ceres depot before you fly home. You're paid for both jobs: mining the ore and running the relay to Ceres.",
                client: "kepler-materials", tag: "TRANSPORT", difficulty: "L2", locked: false, sequence: MissionGenerator.freeOpsMissionSequence, unlockAt: "Reach Free Operations",
                targetId: "psyche", deliveryTargetId: "ceres",
                requires: MissionRequirements(minerals: ["nickel": 2, "cobalt": 2], cargoMin: 4, drillTier: 2, maxOrbit: 5),
                payout: MissionPayout(francs: floor(4), affinity: 4), construction: nil, payload: nil, programReward: nil),
        declared(selfDirectedMiningId),
        Mission(id: crewedProspectingId, title: "Crewed Prospecting Flight",
                brief: "Ferrum wants a trained mining specialist aboard to assess a surface before automated construction begins. The first qualified astronaut to reach Eros earns a frontier bonus.",
                client: "ferrum-orbital-construction", tag: "CREW", difficulty: "L2", locked: false, sequence: MissionGenerator.freeOpsMissionSequence,
                unlockAt: "Build the Astronaut Academy and fit Crew Quarters", targetId: "eros", deliveryTargetId: nil,
                requires: MissionRequirements(minerals: ["nickel": 2], cargoMin: 2, drillTier: 1, maxOrbit: 2,
                                              crew: CrewRequirement(branch: "mining", minTier: 1, minLevel: 1)),
                payout: MissionPayout(francs: floor(4), affinity: 4), construction: nil, payload: nil, programReward: nil),
    ]
}

private struct AuthoredMissionFile: Decodable, Sendable {
    let missions: [AuthoredMissionDeclaration]
}

/// A mission as written in `shared/authoring/missions/*.toml` and compiled into `AuthoredMissionDeclarations.json`.
struct AuthoredMissionDeclaration: Decodable, Sendable {
    /// A number, or a name that follows the game's own constants so retuning them retunes the mission.
    enum Sequence: Decodable, Sendable {
        case number(Int), transport, freeOps

        init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            if let number = try? container.decode(Int.self) { self = .number(number); return }
            switch try container.decode(String.self) {
            case "transport": self = .transport
            case "free-ops": self = .freeOps
            case let other: throw DecodingError.dataCorruptedError(in: container, debugDescription: "unknown mission sequence \"\(other)\"")
            }
        }

        var value: Int {
            switch self {
            case .number(let n): n
            case .transport: MissionGenerator.transportSequence
            case .freeOps: MissionGenerator.freeOpsMissionSequence
            }
        }
    }

    struct Requires: Decodable, Sendable {
        let minerals: Cargo
        let cargoMin: Int
        let drillTier: Int
        let maxOrbit: Int
        enum CodingKeys: String, CodingKey { case minerals, cargoMin = "cargo_min", drillTier = "drill_tier", maxOrbit = "max_orbit" }
    }

    struct Payout: Decodable, Sendable {
        let francs: Int?
        let floorSequence: Int?
        let affinity: Int
        enum CodingKeys: String, CodingKey { case francs, floorSequence = "floor_sequence", affinity }
    }

    let id: String
    let title: String
    let brief: String
    let tag: String
    let difficulty: String
    let client: String?
    let locked: Bool
    let sequence: Sequence
    let unlockAt: String?
    let target: String?
    let deliveryTarget: String?
    let requires: Requires
    let payout: Payout

    enum CodingKeys: String, CodingKey {
        case id, title, brief, tag, difficulty, client, locked, sequence, target, requires, payout
        case unlockAt = "unlock_at", deliveryTarget = "delivery_target"
    }

    var mission: Mission {
        Mission(id: id, title: title, brief: brief, client: client, tag: tag, difficulty: difficulty, locked: locked,
                sequence: sequence.value, unlockAt: unlockAt, targetId: target, deliveryTargetId: deliveryTarget,
                requires: MissionRequirements(minerals: requires.minerals, cargoMin: requires.cargoMin, drillTier: requires.drillTier, maxOrbit: requires.maxOrbit),
                payout: MissionPayout(francs: payout.francs ?? MissionGenerator.payoutFloor(sequence: payout.floorSequence ?? 1), affinity: payout.affinity),
                construction: nil, payload: nil, programReward: nil)
    }
}
