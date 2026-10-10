import Foundation

/// One line of the Mission Log: a completed mission, or a transit the player classified.
public struct MissionLogEntry: Equatable, Sendable {
    public let title: String
    public let meta: String
    public let completedAt: Double
    public let isTransit: Bool
}

/// Mission Log contents (mirrors web lib/mission-log.ts). The log only ever held completed
/// missions, so transit work from the player's own telescope never appeared in it even though it is
/// saved on the player. Flight Plan training verdicts are left out: they are not real subjects.
public enum MissionLog {
    static let trainingPrefix = "training-"

    static func verdictLabel(_ v: TessVerdict) -> String {
        switch v {
        case .planet: "Planet candidate"
        case .notPlanet: "No planet signal"
        case .unsure: "Unsure"
        }
    }

    public static func transitEntries(_ p: Player) -> [MissionLogEntry] {
        p.tessClassifications.values
            .filter { !$0.subjectId.hasPrefix(trainingPrefix) && $0.submittedAt.isFinite }
            .map { MissionLogEntry(title: "Transit classified", meta: "TRANSIT TELESCOPE · \(verdictLabel($0.verdict))", completedAt: $0.submittedAt, isTransit: true) }
    }

    /// Newest first. Missions and transits share one list.
    public static func entries(_ p: Player) -> [MissionLogEntry] {
        let missions = p.completedMissions.map { r in
            MissionLogEntry(title: r.title,
                            meta: (r.kind == .program ? "OWN PROGRAM" : (r.clientName ?? "CLIENT OPERATION")) + (r.targetName.map { " · \($0)" } ?? ""),
                            completedAt: r.completedAt, isTransit: false)
        }
        return (missions + transitEntries(p)).sorted { $0.completedAt > $1.completedAt }
    }
}
