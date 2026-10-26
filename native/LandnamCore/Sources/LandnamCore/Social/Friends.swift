import Foundation

/// The small, server-authoritative social surface shared with web. Friendship
/// requests and gift claims intentionally never enter the general save outbox:
/// both require a live authenticated account and PocketBase enforces the daily
/// limit atomically.
public struct FriendPublicUser: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var username: String
}

public struct FriendEntry: Codable, Equatable, Sendable, Identifiable {
    public var id: String { friendshipId }
    public var friendshipId: String
    public var userId: String
    public var username: String
    public var giftSentToday: Bool?
    public var online: Bool?

    enum CodingKeys: String, CodingKey { case friendshipId, userId = "id", username, giftSentToday, online }
}

public struct FriendsList: Codable, Equatable, Sendable {
    public var me: FriendPublicUser
    public var friends: [FriendEntry]
    public var incoming: [FriendEntry]
    public var outgoing: [FriendEntry]
}

public enum FriendGiftKind: String, Codable, CaseIterable, Sendable {
    case currency, resource, blueprint
}

public struct FriendGiftPayload: Codable, Equatable, Sendable {
    public var amount: Int?
    public var mineral: String?
    public var slug: String?
}

public struct FriendGift: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var from: String
    public var kind: FriendGiftKind
    public var payload: FriendGiftPayload
    public var receivedAt: String
}

public enum FriendsAPIError: LocalizedError, Sendable {
    case unavailable
    case sessionExpired
    case rejected(String)

    public var errorDescription: String? {
        switch self {
        case .unavailable: return "Friends are unavailable right now. Check your connection and try again."
        case .sessionExpired: return "Your session timed out. Reconnecting now, try again in a moment."
        case .rejected(let message): return message
        }
    }
}

public struct FriendsAPI: Sendable {
    public var baseURL: URL
    public var token: String
    public var session: URLSession
    /// Fired on a 401/403 so the app can renew the token; the caller sees `sessionExpired`, never the server's wording.
    public var onUnauthorized: (@Sendable () -> Void)?

    public init(baseURL: URL, token: String, session: URLSession = .shared, onUnauthorized: (@Sendable () -> Void)? = nil) {
        self.baseURL = baseURL
        self.token = token
        self.session = session
        self.onUnauthorized = onUnauthorized
    }

    public func list() async throws -> FriendsList { try await request("list") }
    public func heartbeat() async throws { let _: Empty = try await request("presence", method: "POST") }
    public func inbox() async throws -> [FriendGift] { let reply: GiftInbox = try await request("gift/inbox"); return reply.gifts }
    public func search(callsign: String) async throws -> [FriendPublicUser] {
        let reply: SearchReply = try await request("search", query: [URLQueryItem(name: "q", value: callsign)])
        return reply.results
    }
    public func setUsername(_ username: String) async throws { let _: FriendPublicUser = try await request("username", method: "POST", body: ["username": username]) }
    public func sendRequest(to username: String) async throws { let _: Empty = try await request("request", method: "POST", body: ["username": username]) }
    public func respond(to friendshipId: String, accept: Bool) async throws { let _: Empty = try await request("respond", method: "POST", body: ["friendshipId": friendshipId, "accept": accept]) }
    public func remove(_ friendshipId: String) async throws { let _: Empty = try await request(friendshipId, method: "DELETE") }
    public func sendGift(to recipientId: String, kind: FriendGiftKind) async throws { let _: Empty = try await request("gift/send", method: "POST", body: ["recipientId": recipientId, "kind": kind.rawValue]) }
    public func claim(_ giftId: String) async throws -> (FriendGiftKind, FriendGiftPayload) {
        struct Reply: Decodable { var kind: FriendGiftKind; var payload: FriendGiftPayload }
        let reply: Reply = try await request("gift/claim", method: "POST", body: ["giftId": giftId])
        return (reply.kind, reply.payload)
    }

    private struct Empty: Decodable {}
    private struct GiftInbox: Decodable { var gifts: [FriendGift] }
    private struct SearchReply: Decodable { var results: [FriendPublicUser] }
    private func request<T: Decodable>(_ path: String, method: String = "GET", query: [URLQueryItem] = [], body: [String: Any]? = nil) async throws -> T {
        var components = URLComponents(url: baseURL.appendingPathComponent("api/friends/\(path)"), resolvingAgainstBaseURL: false)!
        components.queryItems = query.isEmpty ? nil : query
        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        if let body { request.setValue("application/json", forHTTPHeaderField: "Content-Type"); request.httpBody = try? JSONSerialization.data(withJSONObject: body) }
        let data: Data; let response: URLResponse
        do { (data, response) = try await session.data(for: request) }
        catch { throw FriendsAPIError.unavailable }
        guard let http = response as? HTTPURLResponse else { throw FriendsAPIError.unavailable }
        guard (200..<300).contains(http.statusCode) else {
            if http.statusCode == 401 || http.statusCode == 403 { onUnauthorized?(); throw FriendsAPIError.sessionExpired }
            let message = (try? JSONDecoder().decode(ErrorReply.self, from: data))?.message ?? "Friends request failed."
            throw FriendsAPIError.rejected(message)
        }
        do { return try JSONDecoder().decode(T.self, from: data) }
        catch { throw FriendsAPIError.rejected("Friends sent an unexpected response.") }
    }
}

private struct ErrorReply: Decodable { var message: String?; var error: String? }
