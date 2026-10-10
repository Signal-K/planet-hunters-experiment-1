import Foundation

/// Saturn imager (mirrors web lib/data/saturn-candidates.ts, SSL-492): Cassini ISS frames
/// from the Zooniverse "Saturn Thunderstorm Search" project, one frame per day.
public enum SaturnVerdict: String, Codable, CaseIterable, Sendable { case yes, no, maybe }

public struct SaturnCandidate: Equatable, Identifiable, Sendable {
    public let id: String
    public let subjectId: String
    public let opusId: String
    public let imageURL: URL?
}

/// Same wire shape as the web `SaturnClassification`, so saves written by either client decode.
public struct SaturnClassification: Codable, Equatable, Sendable {
    public var candidateId: String
    public var verdict: SaturnVerdict
    public var submittedAt: Double
    public var badgeTier: String?
    public init(candidateId: String, verdict: SaturnVerdict, submittedAt: Double, badgeTier: String? = nil) {
        self.candidateId = candidateId; self.verdict = verdict; self.submittedAt = submittedAt; self.badgeTier = badgeTier
    }
}

public enum Saturn {
    public static let question = "Is there a storm cloud in the image?"
    public static let gridCells = 9

    /// Offline seed of real subjects (same list as the web fallback).
    public static let fallback: [SaturnCandidate] = [
        ("104549055", "co-iss-n1473456649", "https://panoptes-uploads.zooniverse.org/subject_location/c28ee649-e98b-4330-8286-de0dd88cc9d0.png"),
        ("104549056", "co-iss-n1473457312", "https://panoptes-uploads.zooniverse.org/subject_location/a081e2de-2d0b-4025-a69a-299b57257bd0.png"),
        ("104549057", "co-iss-n1473457958", "https://panoptes-uploads.zooniverse.org/subject_location/6452d1ef-da0e-4c9b-b47b-9e2186584f2a.png"),
        ("104549058", "co-iss-n1473461442", "https://panoptes-uploads.zooniverse.org/subject_location/48d33ffd-375c-4cca-92c8-b095ddd9b776.png"),
        ("104549059", "co-iss-n1473462049", "https://panoptes-uploads.zooniverse.org/subject_location/3544e631-ee70-4bd1-98fa-46b50f8c1959.png"),
        ("104549061", "co-iss-n1473462712", "https://panoptes-uploads.zooniverse.org/subject_location/4aab5465-68f2-4fd0-a890-7fae5b34b368.png"),
        ("104549062", "co-iss-n1473463358", "https://panoptes-uploads.zooniverse.org/subject_location/94c6ea41-83eb-4b17-a58f-ba288b112f4f.png"),
        ("104549063", "co-iss-n1473466842", "https://panoptes-uploads.zooniverse.org/subject_location/f55adcc3-5f62-4b4d-94ae-d26d8fc05326.png"),
        ("104549064", "co-iss-n1473467449", "https://panoptes-uploads.zooniverse.org/subject_location/c2a81a73-551a-4850-9c9e-9ad3a8f6d80c.png"),
        ("104549065", "co-iss-n1473468112", "https://panoptes-uploads.zooniverse.org/subject_location/8b2c2c27-4095-452d-8f02-e6cee4da3189.png"),
        ("104549066", "co-iss-n1473468758", "https://panoptes-uploads.zooniverse.org/subject_location/58ebb977-92a5-4714-8d24-4eb561cd4d0f.png"),
        ("104549067", "co-iss-n1473472242", "https://panoptes-uploads.zooniverse.org/subject_location/7808d1da-a96d-46ee-8bdf-5c13405a6c7f.png"),
        ("104549069", "co-iss-n1473472849", "https://panoptes-uploads.zooniverse.org/subject_location/7f56d5f8-c4d9-4ace-a60f-847c898f7c1f.png"),
        ("104549070", "co-iss-n1473473512", "https://panoptes-uploads.zooniverse.org/subject_location/715b9d91-c4f0-46e7-97a8-3a0047ab31cf.png"),
        ("104549071", "co-iss-n1473474158", "https://panoptes-uploads.zooniverse.org/subject_location/6d70ccc2-8aa9-4d98-b230-4c0b2f1494e3.png"),
        ("104549072", "co-iss-n1473477642", "https://panoptes-uploads.zooniverse.org/subject_location/63ef866a-0dae-467f-b2ef-d16cc2a732fa.png"),
        ("104549073", "co-iss-n1473478249", "https://panoptes-uploads.zooniverse.org/subject_location/d7dd39cd-0e64-4a21-a579-c8147bdd0bf7.png"),
        ("104549075", "co-iss-n1473478912", "https://panoptes-uploads.zooniverse.org/subject_location/eb876863-c531-4b3e-8493-f4933f164c21.png"),
        ("104549076", "co-iss-n1473479558", "https://panoptes-uploads.zooniverse.org/subject_location/34af4174-6158-4725-a804-2bab6fbefed3.png"),
        ("104549077", "co-iss-n1473483042", "https://panoptes-uploads.zooniverse.org/subject_location/048cc3ca-c48c-4e2d-940d-f8064a8b9de8.png"),
    ].map { SaturnCandidate(id: "saturn-\($0.0)", subjectId: $0.0, opusId: $0.1, imageURL: URL(string: $0.2)) }

    /// Frames from the shared pool (ids are PocketBase record ids); the static seed uses `saturn-` ids.
    public static func isPoolId(_ id: String) -> Bool { !id.isEmpty && !id.hasPrefix("saturn-") }

    static func hash(_ s: String) -> UInt32 {
        var h: UInt32 = 2166136261
        for u in s.utf16 { h ^= UInt32(u); h = h &* 16777619 }
        return h
    }

    /// Deterministic UTC-daily pick, same FNV-1a convention as the web client.
    public static func daily(_ candidates: [SaturnCandidate], dateKey: String, count: Int = 1) -> [SaturnCandidate] {
        guard !candidates.isEmpty else { return [] }
        let n = min(candidates.count, max(1, count))
        let start = Int(hash(dateKey)) % candidates.count
        var picked: [SaturnCandidate] = []
        var offset = 0
        while picked.count < n && offset < candidates.count {
            let c = candidates[(start + offset) % candidates.count]
            if !picked.contains(where: { $0.id == c.id }) { picked.append(c) }
            offset += 1
        }
        return picked
    }

    public static func dateKey(_ nowMs: Double) -> String {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.timeZone = TimeZone(identifier: "UTC"); f.locale = Locale(identifier: "en_US_POSIX")
        return f.string(from: Date(timeIntervalSince1970: nowMs / 1000))
    }

    /// Today's unresolved frame: the daily pick, or the first frame not yet classified.
    public static func today(candidates: [SaturnCandidate], player: Player, nowMs: Double) -> SaturnCandidate? {
        let key = dateKey(nowMs)
        let pool = candidates.isEmpty ? fallback : candidates
        let todays = daily(pool, dateKey: key)
        return todays.first { player.saturnClassifications[$0.id] == nil } ?? todays.first
    }
}
