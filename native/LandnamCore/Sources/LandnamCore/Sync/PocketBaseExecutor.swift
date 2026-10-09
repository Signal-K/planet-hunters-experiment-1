import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Replays outbox ops against PocketBase over REST. Failure mapping mirrors
/// web/lib/offline/pbOutbox.ts (`classifyPbError`, `classifyHttpStatus`).
public struct PocketBaseExecutor: Sendable {
    public var baseURL: URL
    public var session: URLSession
    public var token: @Sendable () -> String?
    /// Fired when the server answers 401 so the app can renew the session (the op itself waits and is retried).
    public var onUnauthorized: (@Sendable () -> Void)?

    public init(baseURL: URL, session: URLSession = .shared, token: @escaping @Sendable () -> String?) {
        self.baseURL = baseURL; self.session = session; self.token = token
    }

    public var executor: Outbox.Executor { { op in await self.run(op) } }

    public static func classify(status: Int, body: Data?, isCreate: Bool) -> OutboxFailure? {
        if (200..<300).contains(status) { return nil }
        // Session not ready, throttled or server side down: wait without burning attempts.
        if [401, 403, 408, 429].contains(status) || status >= 502 || status == 0 { return .offline }
        if isCreate, status == 400 || status == 409, let body,
           let json = try? JSONDecoder().decode(JSONValue.self, from: body),
           case .object(let root) = json, case .object(let data)? = root["data"],
           case .object(let idField)? = data["id"], case .string("validation_not_unique")? = idField["code"] {
            return .alreadyApplied
        }
        let text = body.flatMap { String(data: $0, encoding: .utf8) } ?? ""
        if status == 400 { return .invalid("\(status) \(text)") }
        return .rejected("\(status) \(text)")
    }

    private func send(_ method: String, _ path: String, query: [URLQueryItem] = [], body: [String: JSONValue]?, auth: String) async -> (Int, Data?) {
        var comps = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { comps.queryItems = query }
        var req = URLRequest(url: comps.url!)
        req.httpMethod = method
        req.setValue(auth, forHTTPHeaderField: "Authorization")
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try? JSONEncoder().encode(body)
        }
        do {
            let (data, resp) = try await session.data(for: req)
            let status = (resp as? HTTPURLResponse)?.statusCode ?? 0
            if status == 401 { onUnauthorized?() }
            return (status, data)
        } catch {
            return (0, nil)  // transport failure: offline, aborted or backgrounded
        }
    }

    func run(_ op: OutboxOp) async -> OutboxFailure? {
        // No session yet (exchange pending): wait rather than burn an attempt on a guaranteed 401.
        guard let auth = token() else { return .offline }
        switch op {
        case .http(let path, let body):
            let (s, d) = await send("POST", path, body: body, auth: auth)
            return Self.classify(status: s, body: d, isCreate: false)
        case .create(let c, let id, let data):
            let (s, d) = await send("POST", "api/collections/\(c)/records", body: data.merging(["id": .string(id)]) { a, _ in a }, auth: auth)
            return Self.classify(status: s, body: d, isCreate: true)
        case .update(let c, let id, let data):
            let (s, d) = await send("PATCH", "api/collections/\(c)/records/\(id)", body: data, auth: auth)
            return Self.classify(status: s, body: d, isCreate: false)
        case .upsert(let c, let id, let filter, let data):
            let (ls, ld) = await send("GET", "api/collections/\(c)/records",
                                      query: [.init(name: "filter", value: filter), .init(name: "perPage", value: "1")], body: nil, auth: auth)
            if let f = Self.classify(status: ls, body: ld, isCreate: false) { return f }
            if let ld, case .object(let root)? = try? JSONDecoder().decode(JSONValue.self, from: ld),
               case .array(let items)? = root["items"], case .object(let first)? = items.first, case .string(let existing)? = first["id"] {
                let (s, d) = await send("PATCH", "api/collections/\(c)/records/\(existing)", body: data, auth: auth)
                return Self.classify(status: s, body: d, isCreate: false)
            }
            let (s, d) = await send("POST", "api/collections/\(c)/records", body: data.merging(["id": .string(id)]) { a, _ in a }, auth: auth)
            return Self.classify(status: s, body: d, isCreate: true)
        }
    }
}
