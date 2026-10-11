import Foundation

/// Release surveys (mirrors web lib/survey-defs.ts). Same keys, PostHog survey ids and questions;
/// answers go to the web app's `/api/surveys`, which forwards them to PostHog.
public struct SurveyQuestion: Equatable, Sendable {
    public enum Kind: Sendable { case rating, choice }
    public let id: String
    public let kind: Kind
    public let text: String
    public let choices: [String]
    public let scale: Int
}

public struct SurveyDef: Equatable, Sendable {
    public let key: String
    public let id: String
    public let name: String
    public let question: SurveyQuestion
}

public enum Surveys {
    public static let citizenTaskDone = "lnm_citizen_task_done"
    public static let badgeEarned = "lnm_badge_earned"
    public static let badgeShared = "lnm_badge_shared"
    public static let freeOpsFirst = "lnm_free_ops_first"

    private static func choice(_ id: String, _ text: String, _ choices: [String]) -> SurveyQuestion {
        SurveyQuestion(id: id, kind: .choice, text: text, choices: choices, scale: 0)
    }

    public static let all: [SurveyDef] = [
        SurveyDef(key: citizenTaskDone, id: "01a11f9f-0f71-0000-c6ad-fc46529f28f1", name: "[Landnam / Citizen Science] Classification Task Clarity",
                  question: choice("f980b310-8a9b-421f-bcf3-6f9e84a39f3d", "How clear was the classification task you just finished?",
                                   ["Very clear", "Mostly clear", "A bit confusing", "I was not sure what to look for"])),
        SurveyDef(key: badgeEarned, id: "01a11f9f-1509-0000-24ee-12791efa81c5", name: "[Landnam / Badges] Sky Event Badge Earned",
                  question: SurveyQuestion(id: "f0598e16-b5a8-42c7-8d40-6883ab24600f", kind: .rating, text: "How good did earning that sky event badge feel?", choices: [], scale: 5)),
        SurveyDef(key: badgeShared, id: "01a11f9f-1bed-0000-2228-3f0e1aeb7110", name: "[Landnam / Sharing] Badge Share Used",
                  question: choice("b7f56a6e-39d1-4312-b580-d04582106fb7", "Why did you share your badge?",
                                   ["To show friends", "To invite someone to play", "To keep a copy for myself", "Just trying it out"])),
        SurveyDef(key: freeOpsFirst, id: "01a11f9f-21df-0000-c2f8-2a865d9e47ad", name: "[Landnam / Free Ops] Free Ops First Run Clarity",
                  question: choice("37052455-2168-4802-9b5f-aa13215923e4", "How clear was it what to do in Free Ops without a contract?",
                                   ["Very clear", "Mostly clear", "A bit confusing", "I did not know what to do"])),
    ]

    public static func def(_ key: String) -> SurveyDef? { all.first { $0.key == key } }

    /// Survey keys a state change should queue (mirrors the web enqueueSurvey call sites). Sharing is
    /// queued by the share action itself.
    public static func triggers(from old: GameState, to new: GameState) -> [String] {
        var keys: [String] = []
        let o = old.player, n = new.player
        if n.tessClassifications.count > o.tessClassifications.count
            || n.asteroidClassifications.count > o.asteroidClassifications.count
            || n.saturnClassifications.count > o.saturnClassifications.count { keys.append(citizenTaskDone) }
        if newTier(o.badges, n.badges) { keys.append(badgeEarned) }
        if n.freeOperations && n.missionsDone > o.missionsDone { keys.append(freeOpsFirst) }
        return keys
    }

    private static func newTier(_ old: [String: PlayerBadge], _ new: [String: PlayerBadge]) -> Bool {
        new.contains { id, b in old[id].map { $0.tier != b.tier } ?? true }
    }

    /// The JSON body web `submitSurveyResponse` posts to `/api/surveys` (PostHog `survey sent` payload).
    public static func submissionBody(_ def: SurveyDef, answer: String, distinctId: String, submissionId: String = UUID().uuidString.lowercased()) throws -> Data {
        let q = def.question
        let response: Any = q.kind == .rating ? (Int(answer) ?? 0) : answer
        let payload: [String: Any] = [
            "$survey_id": def.id,
            "$survey_name": def.name,
            "$survey_completed": true,
            "$survey_submission_id": submissionId,
            "$survey_questions": [["id": q.id, "question": q.text, "response": response]],
            "$survey_response_\(q.id)": response,
            "$survey_response": response,
        ]
        return try JSONSerialization.data(withJSONObject: ["payload": payload, "distinctId": distinctId], options: [.sortedKeys])
    }
}
