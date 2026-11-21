import Foundation

/// Mission templates (SSL-870), compiled from `shared/authoring/templates/*.toml` into
/// `MissionTemplateDeclarations.json`, the same file web reads as `web/lib/data/mission-templates.json`.
/// Every mission plays one template. Authored missions name theirs; runtime missions resolve by the
/// template's match rules: an exact id beats the longest id prefix, which beats the board tag.
public struct MissionTemplate: Decodable, Equatable, Sendable {
    public enum Family: String, Decodable, Sendable { case contract, program, feed, event }

    public struct Beat: Decodable, Equatable, Sendable {
        public let id: String
        public let label: String
        public let view: String
        public let goal: String
        public let controls: [String]
        public let `repeat`: Bool
    }

    public struct Match: Decodable, Equatable, Sendable {
        public let ids: [String]
        public let idPrefixes: [String]
        public let tags: [String]
        enum CodingKeys: String, CodingKey { case ids, idPrefixes = "id_prefixes", tags }
    }

    public struct Outcome: Decodable, Equatable, Sendable {
        public let success: String
        public let fail: String?
        public let unlocks: String?
    }

    public let id: String
    public let title: String
    public let family: Family
    public let forkOf: String?
    public let window: String?
    public let summary: String
    public let vehicle: String
    public let sources: [String]?
    public let match: Match
    public let beats: [Beat]
    public let controls: [String]
    public let outcome: Outcome

    enum CodingKeys: String, CodingKey {
        case id, title, family, forkOf = "fork_of", window, summary, vehicle, sources, match, beats, controls, outcome
    }
}

public enum MissionTemplateCatalog {
    private struct File: Decodable { let templates: [MissionTemplate] }

    public static let all: [MissionTemplate] = {
        do { return try JSONDecoder().decode(File.self, from: Data(MissionTemplateDeclarations.json.utf8)).templates }
        catch { preconditionFailure("MissionTemplateDeclarations.json is not valid: \(error)") }
    }()

    public static func template(_ id: String) -> MissionTemplate? { all.first { $0.id == id } }

    public static func family(_ family: MissionTemplate.Family) -> [MissionTemplate] { all.filter { $0.family == family } }

    /// The template a mission plays. Feeds never resolve for missions: classification comes from probes.
    public static func template(forMissionId id: String, tag: String?, named: String? = nil) -> MissionTemplate? {
        if let named { return template(named) }
        let playable = all.filter { $0.family != .feed }
        if let exact = playable.first(where: { $0.match.ids.contains(id) }) { return exact }
        var best: MissionTemplate?
        var bestLength = 0
        for candidate in playable {
            for prefix in candidate.match.idPrefixes where id.hasPrefix(prefix) && prefix.count > bestLength {
                best = candidate
                bestLength = prefix.count
            }
        }
        if let best { return best }
        guard let tag = tag?.uppercased() else { return nil }
        return playable.first { $0.match.tags.contains(tag) }
    }

    public static func template(for mission: Mission) -> MissionTemplate? {
        template(forMissionId: mission.id, tag: mission.tag)
    }
}
