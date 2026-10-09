import XCTest
@testable import LandnamCore

final class SurveyTests: XCTestCase {
    func testDefinitionsMatchWebAndAreUnique() {
        XCTAssertEqual(Surveys.all.map(\.key), ["lnm_citizen_task_done", "lnm_badge_earned", "lnm_badge_shared", "lnm_free_ops_first"])
        XCTAssertEqual(Set(Surveys.all.map(\.id)).count, 4)
        XCTAssertEqual(Set(Surveys.all.map(\.question.id)).count, 4)
        XCTAssertEqual(Surveys.def("lnm_badge_earned")?.id, "01a11f9f-1509-0000-24ee-12791efa81c5")
    }

    func testTriggersFollowStateChanges() {
        let old = GameState()
        var n = old
        XCTAssertEqual(Surveys.triggers(from: old, to: n), [])
        n.player.badges["orionids"] = PlayerBadge(eventId: "orionids", tier: .silver, earnedAt: 1)
        XCTAssertEqual(Surveys.triggers(from: old, to: n), [Surveys.badgeEarned])
        var up = n
        up.player.badges["orionids"] = PlayerBadge(eventId: "orionids", tier: .gold, earnedAt: 2)
        XCTAssertEqual(Surveys.triggers(from: n, to: up), [Surveys.badgeEarned])
        var t = old
        t.player.tessClassifications["s"] = TessClassification(subjectId: "s", verdict: .planet, ranges: [], submittedAt: 1)
        XCTAssertEqual(Surveys.triggers(from: old, to: t), [Surveys.citizenTaskDone])
        var f = old
        f.player.freeOperations = true; f.player.missionsDone = 1
        XCTAssertEqual(Surveys.triggers(from: old, to: f), [Surveys.freeOpsFirst])
    }

    func testSubmissionBodyMatchesWebPayload() throws {
        let def = try XCTUnwrap(Surveys.def(Surveys.badgeEarned))
        let data = try Surveys.submissionBody(def, answer: "4", distinctId: "d1", submissionId: "sub")
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertEqual(json["distinctId"] as? String, "d1")
        let payload = try XCTUnwrap(json["payload"] as? [String: Any])
        XCTAssertEqual(payload["$survey_id"] as? String, def.id)
        XCTAssertEqual(payload["$survey_completed"] as? Bool, true)
        XCTAssertEqual(payload["$survey_response"] as? Int, 4)
        XCTAssertEqual(payload["$survey_response_\(def.question.id)"] as? Int, 4)
    }
}
