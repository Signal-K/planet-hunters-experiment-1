import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// One verdict bound for the shared science backend, in the shape each web collection expects.
public enum SharedClassification: Equatable, Sendable {
    case saturn(frame: String, verdict: SaturnVerdict)
    case tess(subject: String, verdict: TessVerdict, ranges: [TransitRange])
    case asteroid(candidate: String, verdict: AsteroidVerdict)

    /// Whether the web would send this at all (static Saturn seed frames and training subjects stay local).
    public var isUploadable: Bool {
        switch self {
        case .saturn(let f, _): Saturn.isPoolId(f)
        case .tess(let s, _, _): !s.hasPrefix("training-")
        case .asteroid: true
        }
    }

    /// Outbox create against the shared backend. The record id is client generated so a replay is idempotent.
    public func op(sharedUserId user: String, id: String = OutboxPolicy.newRecordId()) -> OutboxOp? {
        guard isUploadable else { return nil }
        switch self {
        case .saturn(let frame, let verdict):
            return .create(collection: "ss_saturn_storm_classifications", id: id,
                           data: ["user": .string(user), "frame": .string(frame), "answer": .string(verdict.rawValue)])
        case .tess(let subject, let verdict, let ranges):
            // subject_classifications.dip_markers holds single x positions: send each range midpoint.
            let markers = ranges.map { JSONValue.number((((($0.x1 + $0.x2) / 2) * 1000).rounded()) / 1000) }
            return .create(collection: "subject_classifications", id: id,
                           data: ["user": .string(user), "subject": .string(subject), "verdict": .string(verdict.rawValue), "dip_markers": .array(markers)])
        case .asteroid(let candidate, let verdict):
            return .create(collection: "asteroid_classifications", id: id,
                           data: ["user": .string(user), "candidate": .string(candidate), "verdict": .string(verdict.rawValue)])
        }
    }
}

/// Reads the shared science pools (mirrors web lib/tess-subjects.ts, asteroid-subjects.ts, saturn-subjects.ts).
public struct SharedFeed: Sendable {
    public var baseURL: URL
    public var session: URLSession
    public var token: @Sendable () -> String?

    public init(baseURL: URL, session: URLSession = .shared, token: @escaping @Sendable () -> String? = { nil }) {
        self.baseURL = baseURL; self.session = session; self.token = token
    }

    public static func tessFilter() -> String { #"subject_type = "transit" && gold_label = "" && (consensus = "" || consensus = "unsure")"# }
    public static let asteroidFilter = "resolved = false"
    public static let saturnFilter = "retired = false"

    /// Every record of a collection, paged. Throws on transport or non-2xx so the screen can say "feed unavailable".
    public func records(_ collection: String, filter: String, sort: String) async throws -> [[String: JSONValue]] {
        var all: [[String: JSONValue]] = []
        var page = 1
        while true {
            var comps = URLComponents(url: baseURL.appendingPathComponent("api/collections/\(collection)/records"), resolvingAgainstBaseURL: false)!
            comps.queryItems = [.init(name: "filter", value: filter), .init(name: "sort", value: sort),
                                .init(name: "perPage", value: "200"), .init(name: "page", value: String(page))]
            var req = URLRequest(url: comps.url!)
            if let t = token() { req.setValue(t, forHTTPHeaderField: "Authorization") }
            let (data, resp) = try await session.data(for: req)
            guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { throw URLError(.badServerResponse) }
            guard case .object(let root) = try JSONDecoder().decode(JSONValue.self, from: data), case .array(let items)? = root["items"] else { throw URLError(.cannotParseResponse) }
            all += items.compactMap { if case .object(let o) = $0 { o } else { nil } }
            let total = Int(root.number("totalPages") ?? 1)
            if page >= total || items.isEmpty { return all }
            page += 1
        }
    }

    public func tess() async throws -> [TessCandidate] {
        try await records("subjects", filter: Self.tessFilter(), sort: "id").filter(TessCandidate.isReviewable).map(TessCandidate.init(record:))
    }
    public func asteroids() async throws -> [AsteroidCandidate] {
        try await records("asteroid_candidates", filter: Self.asteroidFilter, sort: "-created").map(AsteroidCandidate.init(record:)).filter { !$0.resolved }
    }
    /// Pool frames, or the static seed when the pool is unreachable or empty so the imager works offline.
    public func saturn() async -> [SaturnCandidate] {
        guard let rows = try? await records("ss_saturn_storm_frames", filter: Self.saturnFilter, sort: "subject_id") else { return Saturn.fallback }
        let frames = rows.map { r -> SaturnCandidate in
            let subject = r.string("subject_id") ?? r.string("id") ?? ""
            return SaturnCandidate(id: r.string("id") ?? "saturn-\(subject)", subjectId: subject,
                                   opusId: r.string("opus_id") ?? "", imageURL: r.string("image_url").flatMap(URL.init(string:)))
        }.filter { !$0.subjectId.isEmpty && $0.imageURL != nil }
        return frames.isEmpty ? Saturn.fallback : frames
    }
}
