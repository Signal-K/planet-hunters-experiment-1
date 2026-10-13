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
    /// SSL-559: fired with the merged save after an optimistic `game_states` write folded in another device's progress.
    public var onMerged: (@Sendable (GameState) -> Void)?

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

    static func decodeState(_ v: JSONValue?) -> GameState? {
        guard let v, let raw = try? JSONEncoder().encode(v) else { return nil }
        return try? JSONDecoder().decode(GameState.self, from: raw)
    }
    static func encodeState(_ s: GameState) -> JSONValue? {
        guard let raw = try? JSONEncoder().encode(s) else { return nil }
        return try? JSONDecoder().decode(JSONValue.self, from: raw)
    }

    /// Optimistic concurrency (web `casUpdateGameState`): read, merge the server copy in, write with version + 1,
    /// re-read; if another device wrote in between, merge again and retry.
    func casWrite(recordId: String, user: String, local: JSONValue, auth: String) async -> OutboxFailure? {
        guard var mine = Self.decodeState(local) else { return .invalid("undecodable save") }
        let original = mine
        for _ in 0..<4 {
            let (gs, gd) = await send("GET", "api/collections/game_states/records/\(recordId)", body: nil, auth: auth)
            if let f = Self.classify(status: gs, body: gd, isCreate: false) { return f }
            var remote: GameState?
            if let gd, case .object(let rec)? = try? JSONDecoder().decode(JSONValue.self, from: gd) { remote = Self.decodeState(rec["state"]) }
            let merged = remote.map { CloudMerge.merge(local: mine, remote: $0) } ?? mine
            let version = (remote.map(Ledger.version) ?? 0) + 1
            let toWrite = Ledger.withVersion(merged, version)
            guard let json = Self.encodeState(toWrite) else { return .invalid("unencodable save") }
            let (s, d) = await send("PATCH", "api/collections/game_states/records/\(recordId)", body: [
                "user": .string(user), "state": json, "missions_done": .number(Double(toWrite.player.missionsDone))], auth: auth)
            if let f = Self.classify(status: s, body: d, isCreate: false) { return f }
            let (cs, cd) = await send("GET", "api/collections/game_states/records/\(recordId)", body: nil, auth: auth)
            if Self.classify(status: cs, body: cd, isCreate: false) == nil, let cd,
               case .object(let rec)? = try? JSONDecoder().decode(JSONValue.self, from: cd),
               let check = Self.decodeState(rec["state"]), Ledger.version(check) == version {
                if !Self.sameContent(toWrite, original) { onMerged?(toWrite) }
                return nil
            }
            mine = toWrite
        }
        return nil
    }

    /// Equal apart from the ledger version and `updatedAt`: feeding such a result back would
    /// only re-trigger a save and loop writes forever.
    static func sameContent(_ a: GameState, _ b: GameState) -> Bool {
        var x = Ledger.withVersion(a, 0), y = Ledger.withVersion(b, 0)
        x.updatedAt = nil; y.updatedAt = nil
        return x == y
    }

    /// DEBUG test switch (`-landnam.forceOffline YES`): every write waits as if the network were down.
    nonisolated(unsafe) public static var forceOffline = false

    /// Collections whose prod rules are superuser-only (web reaches them through Next routes).
    /// A 403 there drops the op instead of stalling the queue behind it, so game_states and
    /// mission_runs keep flowing.
    static let bestEffort: Set<String> = ["push_subscriptions", "scheduled_notifications"]

    func run(_ op: OutboxOp) async -> OutboxFailure? {
        if Self.forceOffline { return .offline }
        // No session yet (exchange pending): wait rather than burn an attempt on a guaranteed 401.
        guard let auth = token() else { return .offline }
        switch op {
        case .http(let path, let body):
            let (s, d) = await send("POST", path, body: body, auth: auth)
            return Self.classify(status: s, body: d, isCreate: false)
        case .create(let c, let id, let data):
            let (s, d) = await send("POST", "api/collections/\(c)/records", body: data.merging(["id": .string(id)]) { a, _ in a }, auth: auth)
            if s == 403, Self.bestEffort.contains(c) { return .invalid("forbidden: \(c)") }
            return Self.classify(status: s, body: d, isCreate: true)
        case .update(let c, let id, let data):
            let (s, d) = await send("PATCH", "api/collections/\(c)/records/\(id)", body: data, auth: auth)
            return Self.classify(status: s, body: d, isCreate: false)
        case .upsert(let c, let id, let filter, let data):
            let (ls, ld) = await send("GET", "api/collections/\(c)/records",
                                      query: [.init(name: "filter", value: filter), .init(name: "perPage", value: "1")], body: nil, auth: auth)
            if ls == 403, Self.bestEffort.contains(c) { return .invalid("forbidden: \(c)") }
            if let f = Self.classify(status: ls, body: ld, isCreate: false) { return f }
            if let ld, case .object(let root)? = try? JSONDecoder().decode(JSONValue.self, from: ld),
               case .array(let items)? = root["items"], case .object(let first)? = items.first, case .string(let existing)? = first["id"] {
                if c == "game_states", let local = data["state"], case .string(let user)? = data["user"] {
                    return await casWrite(recordId: existing, user: user, local: local, auth: auth)
                }
                let (s, d) = await send("PATCH", "api/collections/\(c)/records/\(existing)", body: data, auth: auth)
                return Self.classify(status: s, body: d, isCreate: false)
            }
            let (s, d) = await send("POST", "api/collections/\(c)/records", body: data.merging(["id": .string(id)]) { a, _ in a }, auth: auth)
            return Self.classify(status: s, body: d, isCreate: true)
        }
    }
}
