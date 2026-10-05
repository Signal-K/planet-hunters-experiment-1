import Foundation
import Security
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// A signed-in Landnam player: the native PocketBase token plus profile bits.
public struct AuthSession: Codable, Equatable, Sendable {
    public var token: String
    public var userId: String
    public var email: String?
    public var displayName: String?
    public init(token: String, userId: String, email: String? = nil, displayName: String? = nil) {
        self.token = token; self.userId = userId; self.email = email; self.displayName = displayName
    }
}

public enum AuthError: Error, Equatable, Sendable {
    case rejected          // provider token refused by the server
    case unreachable(String)
    case malformed
}

/// Talks to the Landnam PocketBase `/api/landnam-auth/*` routes
/// (pocketbase/landnam_auth_oidc.go). There is no guest route: a verified
/// Apple identity is required.
public struct AuthAPI: Sendable {
    public var baseURL: URL
    public var session: URLSession

    public init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL; self.session = session
    }

    /// `LANDNAM_PB_URL` env wins, else the local dev instance (web `.env.local`).
    public static func fromEnvironment(session: URLSession = .shared) -> AuthAPI {
        let raw = ProcessInfo.processInfo.environment["LANDNAM_PB_URL"] ?? "http://localhost:8091"
        return AuthAPI(baseURL: URL(string: raw)!, session: session)
    }

    public func signInWithApple(identityToken: String, nonce: String, fullName: String? = nil) async throws -> AuthSession {
        var req = URLRequest(url: baseURL.appendingPathComponent("api/landnam-auth/apple"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        var body: [String: String] = ["identityToken": identityToken, "nonce": nonce]
        if let fullName, !fullName.isEmpty { body["fullName"] = fullName }
        req.httpBody = try JSONEncoder().encode(body)

        let data: Data, resp: URLResponse
        do { (data, resp) = try await session.data(for: req) }
        catch { throw AuthError.unreachable(error.localizedDescription) }
        guard let http = resp as? HTTPURLResponse else { throw AuthError.malformed }
        if http.statusCode == 401 || http.statusCode == 403 { throw AuthError.rejected }
        guard (200..<300).contains(http.statusCode) else { throw AuthError.unreachable("HTTP \(http.statusCode)") }

        struct Reply: Decodable {
            struct Record: Decodable { var id: String; var email: String?; var displayName: String? }
            var token: String; var record: Record
        }
        guard let reply = try? JSONDecoder().decode(Reply.self, from: data) else { throw AuthError.malformed }
        return AuthSession(token: reply.token, userId: reply.record.id,
                           email: reply.record.email?.nilIfEmpty, displayName: reply.record.displayName?.nilIfEmpty)
    }
}

private extension String { var nilIfEmpty: String? { isEmpty ? nil : self } }

public protocol SessionStore: Sendable {
    func load() -> AuthSession?
    func save(_ session: AuthSession)
    func clear()
}

public final class InMemorySessionStore: SessionStore, @unchecked Sendable {
    private let lock = NSLock()
    private var value: AuthSession?
    public init(_ initial: AuthSession? = nil) { value = initial }
    public func load() -> AuthSession? { lock.withLock { value } }
    public func save(_ session: AuthSession) { lock.withLock { value = session } }
    public func clear() { lock.withLock { value = nil } }
}

/// Keychain-backed storage; the token never touches the save file.
public struct KeychainSessionStore: SessionStore {
    private let service: String
    public init(service: String = "com.atlasskyventures.sslandnam.session") { self.service = service }

    private var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: "session"]
    }
    public func load() -> AuthSession? {
        var q = query
        q[kSecReturnData as String] = true; q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let data = out as? Data else { return nil }
        return try? JSONDecoder().decode(AuthSession.self, from: data)
    }
    public func save(_ session: AuthSession) {
        guard let data = try? JSONEncoder().encode(session) else { return }
        SecItemDelete(query as CFDictionary)
        var q = query; q[kSecValueData as String] = data
        SecItemAdd(q as CFDictionary, nil)
    }
    public func clear() { SecItemDelete(query as CFDictionary) }
}
