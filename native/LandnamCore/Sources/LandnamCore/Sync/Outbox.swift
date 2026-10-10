import Foundation

/// SSL-321 port: every server write that must not be lost goes through this
/// queue. Items replay in order, survive relaunch via an `OutboxStore`, and
/// carry client-generated ids so a request killed mid-flight can be replayed.
public enum OutboxOp: Codable, Equatable, Sendable {
    case create(collection: String, id: String, data: [String: JSONValue])
    case update(collection: String, id: String, data: [String: JSONValue])
    /// Create-or-update keyed by a PocketBase filter; only the latest per key is kept.
    case upsert(collection: String, id: String, filter: String, data: [String: JSONValue])
    case http(path: String, body: [String: JSONValue])
}

public struct OutboxItem: Codable, Equatable, Identifiable, Sendable {
    public var id: String
    public var op: OutboxOp
    public var createdAt: Double
    public var attempts: Int
    public var nextAttemptAt: Double
    /// Warning threshold only: failed items are still retried at the capped backoff.
    public var failed: Bool
    public var lastError: String?
}

public enum OutboxFailure: Equatable, Sendable {
    case offline
    case alreadyApplied
    case rejected(String)
    case invalid(String)
}

public struct OutboxSnapshot: Equatable, Sendable {
    public var waiting: Int
    public var failed: Int
}

public protocol OutboxStore: Sendable {
    func load() async -> [OutboxItem]
    func save(_ items: [OutboxItem]) async
}

public actor MemoryOutboxStore: OutboxStore {
    private var items: [OutboxItem]
    public init(_ items: [OutboxItem] = []) { self.items = items }
    public func load() -> [OutboxItem] { items }
    public func save(_ items: [OutboxItem]) { self.items = items }
}

public enum OutboxPolicy {
    public static let maxAttempts = 5
    public static func backoff(attempts: Int) -> Double {
        min(300, 2 * pow(2, Double(max(0, attempts - 1))))
    }
    /// PocketBase record ids are 15 lowercase alphanumerics.
    public static func newRecordId() -> String {
        let a = Array("abcdefghijklmnopqrstuvwxyz0123456789")
        return String((0..<15).map { _ in a.randomElement()! })
    }
}

public actor Outbox {
    public typealias Executor = @Sendable (OutboxOp) async -> OutboxFailure?
    private let store: OutboxStore
    private let execute: Executor
    private let now: @Sendable () -> Double
    private var items: [OutboxItem] = []
    private var loaded = false
    private var flushing = false

    public init(store: OutboxStore, now: @escaping @Sendable () -> Double = { Date().timeIntervalSince1970 },
                execute: @escaping Executor) {
        self.store = store; self.now = now; self.execute = execute
    }

    private func ensureLoaded() async {
        guard !loaded else { return }
        loaded = true
        items = await store.load() + items
    }

    public func snapshot() -> OutboxSnapshot {
        OutboxSnapshot(waiting: items.filter { !$0.failed }.count, failed: items.filter(\.failed).count)
    }
    public func pending() -> [OutboxItem] { items }

    public func enqueue(_ op: OutboxOp) async {
        await ensureLoaded()
        if case let .upsert(c, _, f, _) = op {
            items.removeAll { if case let .upsert(c2, _, f2, _) = $0.op { return c == c2 && f == f2 }; return false }
        }
        items.append(OutboxItem(id: OutboxPolicy.newRecordId(), op: op, createdAt: now(), attempts: 0,
                                nextAttemptAt: 0, failed: false, lastError: nil))
        await store.save(items)
    }

    /// Drops everything queued (a different account signed in; the old account's writes must never reach the new one).
    public func clear() async { await ensureLoaded(); items.removeAll(); await store.save(items) }

    @discardableResult
    public func discard(where match: (OutboxOp) -> Bool) async -> Int {
        await ensureLoaded()
        let before = items.count
        items.removeAll { match($0.op) }
        if items.count != before { await store.save(items) }
        return before - items.count
    }

    /// Ordered replay. Stops at the first offline result without burning an attempt. Items
    /// enqueued while a pass is running (a newer save) are picked up by the same flush, so the
    /// latest snapshot never waits for the next trigger.
    public func flush() async {
        await ensureLoaded()
        guard !flushing else { return }
        flushing = true
        defer { flushing = false }
        var tried = Set<String>()
        while let item = items.first(where: { !tried.contains($0.id) && $0.nextAttemptAt <= now() }) {
            tried.insert(item.id)
            let failure = await execute(item.op)
            switch failure {
            case nil, .alreadyApplied?:
                items.removeAll { $0.id == item.id }
            case .offline?:
                return
            case .invalid?:
                items.removeAll { $0.id == item.id }
            case let .rejected(message)?:
                if let i = items.firstIndex(where: { $0.id == item.id }) {
                    items[i].attempts += 1
                    items[i].lastError = message
                    items[i].failed = items[i].attempts >= OutboxPolicy.maxAttempts
                    items[i].nextAttemptAt = now() + OutboxPolicy.backoff(attempts: items[i].attempts)
                }
            }
            await store.save(items)
        }
    }
}
