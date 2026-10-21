import Foundation
import Testing
@testable import LandnamCore

/// The Belt Courier Run and the self-directed mining run come from the compiled declarations in
/// `shared/missions/authored-missions.json`, the same file web reads. The expected values below are the
/// literals they replaced, so moving them cannot change the game.
@Suite struct AuthoredMissionDeclarationTests {
    static let repo = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../")
    static func shared(_ path: String) throws -> Data { try Data(contentsOf: repo.appendingPathComponent("shared/\(path)").standardized) }

    static let beltCourierRun = Mission(
        id: "lnm_m3_relay_bennu_vesta", title: "Belt Courier Run",
        brief: "Atlas Aggregate needs iron and carbon lifted from Bennu, then dropped at their Vesta depot for off-world construction. Bulk metals like these are too plentiful on Earth to ship home, but Vesta has none. You're paid for both jobs: mining the ore and running the relay to Vesta.",
        client: "atlas-aggregate", tag: "TRANSPORT", difficulty: "L1", locked: false, sequence: MissionGenerator.transportSequence, unlockAt: "Complete 1 contract",
        targetId: "bennu", deliveryTargetId: "vesta",
        requires: MissionRequirements(minerals: ["iron": 3, "carbon": 2], cargoMin: 5, drillTier: 1, maxOrbit: 4),
        payout: MissionPayout(francs: MissionGenerator.payoutFloor(sequence: 3), affinity: 3), construction: nil, payload: nil, programReward: nil)

    static let selfDirectedMiningRun = Mission(
        id: "freeops-self-directed-mining", title: "Self-Directed Mining Run",
        brief: "No client, no daily limit. Pick any reachable target, mine what looks valuable, and sell the haul yourself at market price.",
        client: nil, tag: "FREE OPS", difficulty: "L2", locked: false, sequence: MissionGenerator.freeOpsMissionSequence, unlockAt: "Reach Free Operations",
        targetId: nil, deliveryTargetId: nil,
        requires: MissionRequirements(minerals: ["nickel": 1], cargoMin: 1, drillTier: 1, maxOrbit: 2),
        payout: MissionPayout(francs: 0, affinity: 0), construction: nil, payload: nil, programReward: nil)

    @Test func clientContractIsBuiltExactlyAsTheLiteralWas() {
        #expect(AuthoredMissions.declared("lnm_m3_relay_bennu_vesta") == Self.beltCourierRun)
    }

    @Test func freeMiningRunIsBuiltExactlyAsTheLiteralWas() {
        #expect(AuthoredMissions.declared(AuthoredMissions.selfDirectedMiningId) == Self.selfDirectedMiningRun)
    }

    @Test func boardKeepsItsOriginalOrder() {
        #expect(AuthoredMissions.all.map(\.id) == [
            "program-build-mars-mining-settlement",
            "program-build-remote-silo",
            "story-astronaut-academy",
            "lnm_m3_relay_bennu_vesta",
            "lnm_m3_relay_itokawa_eros",
            "lnm_relay_psyche_ceres",
            "freeops-self-directed-mining",
            "freeops-crewed-prospecting",
        ])
        #expect(AuthoredMissions.all.first { $0.id == "lnm_m3_relay_bennu_vesta" } == Self.beltCourierRun)
        #expect(AuthoredMissions.all.first { $0.id == "freeops-self-directed-mining" } == Self.selfDirectedMiningRun)
    }

    @Test func embeddedDeclarationsAreTheSharedFile() throws {
        let file = String(decoding: try Self.shared("missions/authored-missions.json"), as: UTF8.self)
        #expect(AuthoredMissionDeclarations.json == file.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    @Test func payoutFollowsTheFeeCurveUnlessAFixedFeeIsGiven() throws {
        func payout(_ json: String) throws -> Int {
            let text = """
            {"id":"x","title":"X","brief":"x","tag":"T","difficulty":"L1","locked":false,"sequence":"transport",
             "requires":{"minerals":{"iron":1},"cargo_min":1,"drill_tier":1,"max_orbit":1},"payout":\(json)}
            """
            return try JSONDecoder().decode(AuthoredMissionDeclaration.self, from: Data(text.utf8)).mission.payout.francs
        }
        #expect(try payout(#"{"floor_sequence":4,"affinity":1}"#) == MissionGenerator.payoutFloor(sequence: 4))
        #expect(try payout(#"{"francs":123,"affinity":1}"#) == 123)
    }

    @Test func namedSequencesFollowTheGamesConstantsAndUnknownNamesAreRejected() throws {
        func sequence(_ value: String) throws -> Int {
            let text = """
            {"id":"x","title":"X","brief":"x","tag":"T","difficulty":"L1","locked":false,"sequence":\(value),
             "requires":{"minerals":{"iron":1},"cargo_min":1,"drill_tier":1,"max_orbit":1},"payout":{"francs":0,"affinity":0}}
            """
            return try JSONDecoder().decode(AuthoredMissionDeclaration.self, from: Data(text.utf8)).mission.sequence
        }
        #expect(try sequence(#""transport""#) == MissionGenerator.transportSequence)
        #expect(try sequence(#""free-ops""#) == MissionGenerator.freeOpsMissionSequence)
        #expect(try sequence("7") == 7)
        #expect(throws: DecodingError.self) { try sequence(#""sometime""#) }
    }
}
