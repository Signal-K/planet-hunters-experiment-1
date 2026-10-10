import Foundation

/// Deep Space Telescope NEOCP feed (mirrors web lib/data/asteroid-candidates.ts, STS-622).
/// Classification only: no target payoff yet.
public enum AsteroidVerdict: String, Codable, CaseIterable, Sendable {
    case likelyReal = "likely_real", likelyArtifact = "likely_artifact", unsure
}

public struct AsteroidCandidate: Equatable, Identifiable, Sendable {
    public let id: String
    public let tempDesig: String
    public let score: Double
    public let ra: Double
    public let decl: Double
    public let vMag: Double
    public let arcDays: Double
    public let lastSeenDays: Double
    public let resolved: Bool

    public init(id: String, tempDesig: String, score: Double = 0, ra: Double, decl: Double, vMag: Double,
                arcDays: Double = 0, lastSeenDays: Double = 0, resolved: Bool = false) {
        self.id = id; self.tempDesig = tempDesig; self.score = score; self.ra = ra; self.decl = decl
        self.vMag = vMag; self.arcDays = arcDays; self.lastSeenDays = lastSeenDays; self.resolved = resolved
    }

    /// Shared `asteroid_candidates` record.
    public init(record r: [String: JSONValue]) {
        let id = r.string("id") ?? r.string("temp_desig") ?? "candidate"
        self.init(id: id, tempDesig: r.string("temp_desig") ?? id, score: r.number("score") ?? 0,
                  ra: r.number("ra") ?? 0, decl: r.number("decl") ?? 0, vMag: r.number("v_mag") ?? 0,
                  arcDays: r.number("arc_days") ?? 0, lastSeenDays: r.number("last_seen_days") ?? 0,
                  resolved: r.bool("resolved") ?? false)
    }
}

/// Same wire shape as the web `AsteroidClassification`.
public struct AsteroidClassification: Codable, Equatable, Sendable {
    public var candidateId: String
    public var verdict: AsteroidVerdict
    public var submittedAt: Double
    public init(candidateId: String, verdict: AsteroidVerdict, submittedAt: Double) {
        self.candidateId = candidateId; self.verdict = verdict; self.submittedAt = submittedAt
    }
}

public enum Asteroid {
    /// RA/Dec plot position, 0...1 each (mirrors AsteroidSkyPlot).
    public static func plot(_ c: AsteroidCandidate) -> (x: Double, y: Double) {
        (min(1, max(0, c.ra / 24)), min(1, max(0, (90 - c.decl) / 180)))
    }

    /// Deterministic UTC-daily pick from the still-unclassified pool (same FNV-1a convention as web).
    public static func today(candidates: [AsteroidCandidate], player: Player, dateKey: String, inspect: String? = nil) -> AsteroidCandidate? {
        let open = candidates.filter { player.asteroidClassifications[$0.id] == nil && !$0.resolved }
        guard !open.isEmpty else { return nil }
        if let inspect, let focused = open.first(where: { $0.id == inspect }) { return focused }
        return open[Int(Saturn.hash(dateKey)) % open.count]
    }
}

extension Dictionary where Key == String, Value == JSONValue {
    func string(_ k: String) -> String? {
        switch self[k] { case .string(let s)?: s; case .number(let n)?: n == n.rounded() ? String(Int(n)) : String(n); default: nil }
    }
    func number(_ k: String) -> Double? {
        switch self[k] { case .number(let n)?: n; case .string(let s)?: Double(s); default: nil }
    }
    func bool(_ k: String) -> Bool? { if case .bool(let b)? = self[k] { b } else { nil } }
}
