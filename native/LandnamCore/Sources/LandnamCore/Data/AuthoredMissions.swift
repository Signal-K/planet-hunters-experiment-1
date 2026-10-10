import Foundation

/// The hand-authored missions from web `missions.ts` (`AUTHORED_MISSIONS` and the player-programme
/// builds). The generated board lives in `MissionGenerator`; this is everything else the web catalog
/// carries, so the two games offer the same work.
public enum AuthoredMissions {
    public static let transportSequence = MissionGenerator.transportSequence
    public static let selfDirectedMiningId = "freeops-self-directed-mining"
    public static let crewedProspectingId = "freeops-crewed-prospecting"
    public static let academyStoryId = "story-astronaut-academy"
    public static let refineryBuildId = "program-build-refinery"
    public static let remoteSiloBuildId = "program-build-remote-silo"
    public static let marsSettlementBuildId = "program-build-mars-mining-settlement"
    public static let buildTimeMs = 45 * 60 * 1000

    private static func floor(_ n: Int) -> Int { MissionGenerator.payoutFloor(sequence: n) }
    private static func materials(_ m: Cargo) -> Cargo { m }

    /// Player-programme construction: owned work, no client fee.
    public static let programBuilds: [Mission] = {
        let seq = MissionGenerator.freeOpsMissionSequence
        func build(_ id: String, _ title: String, _ brief: String, _ diff: String, _ unlock: String, target: String?, kind: String,
                   mats: Cargo, maxOrbit: Int, outcome: String) -> Mission {
            Mission(id: id, title: title, brief: brief, client: nil, tag: "PROGRAM", difficulty: diff, locked: false, sequence: seq,
                    unlockAt: unlock, targetId: target, deliveryTargetId: nil,
                    requires: MissionRequirements(minerals: mats, cargoMin: mats.values.reduce(0, +), drillTier: 1, maxOrbit: maxOrbit),
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
            build(refineryBuildId, "Commission an Off-world Refinery",
                  "Deliver aluminium and copper to a site you own or lease. Your refinery processes ore close to the source for your own construction and client deliveries.",
                  "L1", "Reach Free Operations and choose a site you own or lease", target: nil, kind: "refinery",
                  mats: Construction.byId["refinery"]?.materials ?? ["aluminium": 20, "copper": 10], maxOrbit: 5,
                  outcome: "Off-world refinery commissioned · process ore at the selected site"),
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
        Mission(id: "lnm_m3_relay_bennu_vesta", title: "Belt Courier Run",
                brief: "Atlas Aggregate needs iron and carbon lifted from Bennu, then dropped at their Vesta depot for off-world construction. Bulk metals like these are too plentiful on Earth to ship home, but Vesta has none. You're paid for both jobs: mining the ore and running the relay to Vesta.",
                client: "atlas-aggregate", tag: "TRANSPORT", difficulty: "L1", locked: false, sequence: transportSequence, unlockAt: "Complete 1 contract",
                targetId: "bennu", deliveryTargetId: "vesta",
                requires: MissionRequirements(minerals: ["iron": 3, "carbon": 2], cargoMin: 5, drillTier: 1, maxOrbit: 4),
                payout: MissionPayout(francs: floor(3), affinity: 3), construction: nil, payload: nil, programReward: nil),
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
        Mission(id: selfDirectedMiningId, title: "Self-Directed Mining Run",
                brief: "No client, no daily limit. Pick any reachable target, mine what looks valuable, and sell the haul yourself at market price.",
                client: nil, tag: "FREE OPS", difficulty: "L2", locked: false, sequence: MissionGenerator.freeOpsMissionSequence, unlockAt: "Reach Free Operations",
                targetId: nil, deliveryTargetId: nil,
                requires: MissionRequirements(minerals: ["nickel": 1], cargoMin: 1, drillTier: 1, maxOrbit: 2),
                payout: MissionPayout(francs: 0, affinity: 0), construction: nil, payload: nil, programReward: nil),
        Mission(id: crewedProspectingId, title: "Crewed Prospecting Flight",
                brief: "Ferrum wants a trained mining specialist aboard to assess a surface before automated construction begins. The first qualified astronaut to reach Eros earns a frontier bonus.",
                client: "ferrum-orbital-construction", tag: "CREW", difficulty: "L2", locked: false, sequence: MissionGenerator.freeOpsMissionSequence,
                unlockAt: "Build the Astronaut Academy and fit Crew Quarters", targetId: "eros", deliveryTargetId: nil,
                requires: MissionRequirements(minerals: ["nickel": 2], cargoMin: 2, drillTier: 1, maxOrbit: 2,
                                              crew: CrewRequirement(branch: "mining", minTier: 1, minLevel: 1)),
                payout: MissionPayout(francs: floor(4), affinity: 4), construction: nil, payload: nil, programReward: nil),
    ]
}
