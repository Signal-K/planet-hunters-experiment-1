import Foundation

/// Typed envelope for the extensible in-game notification tray. New server
/// kinds can be added here without changing the HUD or its polling contract.
public struct PlayerNotification: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var kind: String
    public var title: String
    public var body: String
    public var createdAt: String
    public var action: Action

    public struct Action: Codable, Equatable, Sendable {
        public var friendshipId: String?
    }
}

public struct NotificationsAPI: Sendable {
    public var baseURL: URL
    public var token: String
    public var session: URLSession

    public init(baseURL: URL, token: String, session: URLSession = .shared) {
        self.baseURL = baseURL; self.token = token; self.session = session
    }

    public func list() async throws -> [PlayerNotification] {
        var request = URLRequest(url: baseURL.appendingPathComponent("api/notifications"))
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let data: Data; let response: URLResponse
        do { (data, response) = try await session.data(for: request) }
        catch { throw FriendsAPIError.unavailable }
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { throw FriendsAPIError.unavailable }
        struct Reply: Decodable { var notifications: [PlayerNotification] }
        do { return try JSONDecoder().decode(Reply.self, from: data).notifications }
        catch { throw FriendsAPIError.rejected("Notifications sent an unexpected response.") }
    }
}
