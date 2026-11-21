import Foundation
import Testing
@testable import LandnamCore

/// Mission templates come from `shared/missions/mission-templates.json`, the same file web reads, and resolve
/// missions with the same rules as web `templateForMission` (SSL-870).
@Suite struct MissionTemplateTests {
    static let repo = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../")

    @Test func embeddedTemplatesAreTheSharedFile() throws {
        let file = String(decoding: try Data(contentsOf: Self.repo.appendingPathComponent("shared/missions/mission-templates.json").standardized), as: UTF8.self)
        #expect(MissionTemplateDeclarations.json == file.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    @Test func familiesFollowTheSplit() {
        #expect(MissionTemplateCatalog.family(.contract).map(\.id).sorted() == ["contract-construction", "contract-delivery", "contract-exploration", "contract-mining"])
        #expect(MissionTemplateCatalog.family(.program).map(\.id).sorted() == ["program-construction", "program-free-mining", "program-launch", "program-survey", "program-vehicle"])
        #expect(MissionTemplateCatalog.family(.feed).map(\.id) == ["feed-classification"])
    }

    @Test func resolvesLikeWeb() {
        let cases: [(String, String, String)] = [
            ("generated-s1-starter-bulk-1", "STARTER", "contract-mining"),
            ("lnm_m3_relay_itokawa_eros", "TRANSPORT", "contract-delivery"),
            ("program-build-remote-silo", "PROGRAM", "program-construction"),
            ("story-transit-telescope-launch", "STORY", "program-launch"),
            ("freeops-self-directed-mining", "FREE OPS", "program-free-mining"),
            ("self-directed-orionids-night-run", "FREE OPS", "event-meteor-run"),
        ]
        for (id, tag, want) in cases {
            #expect(MissionTemplateCatalog.template(forMissionId: id, tag: tag)?.id == want)
        }
        #expect(MissionTemplateCatalog.template(forMissionId: "x", tag: "FEED") == nil)
    }

    @Test func everyBoardMissionHasATemplate() {
        for mission in AuthoredMissions.all {
            #expect(MissionTemplateCatalog.template(for: mission) != nil, "\(mission.id)")
        }
    }
}
