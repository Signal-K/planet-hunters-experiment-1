import Foundation

/// Global "someone confirmed a planet" signal (mirrors web useConfirmedDiscoveryPoll + fetchLastConfirmed).
public struct LastConfirmed: Equatable, Sendable {
    public var lastConfirmedAt: String?
    public var subjectId: String?
    public init(lastConfirmedAt: String? = nil, subjectId: String? = nil) { self.lastConfirmedAt = lastConfirmedAt; self.subjectId = subjectId }

    /// Parses `{ lastConfirmedAt: string | null, subjectId?: string }`.
    public static func parse(_ data: Data) throws -> LastConfirmed {
        guard case .object(let root) = try JSONDecoder().decode(JSONValue.self, from: data) else { throw URLError(.cannotParseResponse) }
        return LastConfirmed(lastConfirmedAt: root.string("lastConfirmedAt"), subjectId: root.string("subjectId"))
    }
}

public enum ConfirmedDiscovery {
    public static let pollSeconds: Double = 90

    /// A new timestamp flags a re-point. The first sighting after load is recorded silently so historical
    /// confirmations never announce; only a change from a known value does.
    public static func apply(_ s: GameState, lastConfirmedAt: String?) -> (GameState, announce: Bool) {
        guard let at = lastConfirmedAt, at != s.player.lastSeenConfirmedAt else { return (s, false) }
        var n = s
        let alreadyKnew = s.player.lastSeenConfirmedAt != nil
        n.player.lastSeenConfirmedAt = at
        n.player.pendingRepick = true
        return (n, alreadyKnew)
    }
}

public extension SharedFeed {
    /// GET /api/ss/subjects/last-confirmed. Without a shared login there is nothing to ask.
    func lastConfirmed() async throws -> LastConfirmed {
        guard let t = token() else { return LastConfirmed() }
        var req = URLRequest(url: baseURL.appendingPathComponent("api/ss/subjects/last-confirmed"))
        req.setValue(t, forHTTPHeaderField: "Authorization")
        let (data, resp) = try await session.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { throw URLError(.badServerResponse) }
        return try LastConfirmed.parse(data)
    }
}

/// Treasury site-deed call (mirrors web POST /api/treasury/site-deed with `{ siteId }`).
/// The server derives price and idempotency; the client only names the site, so a replay is safe.
public enum SiteDeed {
    public static let path = "api/treasury/site-deed"
    public static func op(siteId: String) -> OutboxOp { .http(path: path, body: ["siteId": .string(siteId)]) }
}
