import Testing
import Foundation
@testable import LandnamCore

final class Log: @unchecked Sendable {
    private let lock = NSLock(); private var _ops: [OutboxOp] = []
    var ops: [OutboxOp] { lock.withLock { _ops } }
    func add(_ o: OutboxOp) { lock.withLock { _ops.append(o) } }
}
final class Clock: @unchecked Sendable { var t = 1000.0 }

@Suite struct OutboxTests {
    func create(_ id: String) -> OutboxOp { .create(collection: "runs", id: id, data: [:]) }

    @Test func replaysInOrderAndClears() async {
        let log = Log()
        let box = Outbox(store: MemoryOutboxStore()) { op in log.add(op); return nil }
        await box.enqueue(create("a")); await box.enqueue(.update(collection: "runs", id: "a", data: [:]))
        await box.flush()
        #expect(log.ops.count == 2)
        #expect(await box.pending().isEmpty)
    }

    @Test func offlineStopsWithoutBurningAttempts() async {
        let box = Outbox(store: MemoryOutboxStore()) { _ in .offline }
        await box.enqueue(create("a")); await box.enqueue(create("b"))
        await box.flush()
        let p = await box.pending()
        #expect(p.count == 2 && p.allSatisfy { $0.attempts == 0 })
    }

    @Test func rejectedBacksOffThenFlagsFailedButKeeps() async {
        let clock = Clock()
        let box = Outbox(store: MemoryOutboxStore(), now: { clock.t }) { _ in .rejected("500") }
        await box.enqueue(create("a"))
        for _ in 0..<OutboxPolicy.maxAttempts {
            await box.flush(); clock.t += 400
        }
        let p = await box.pending()
        #expect(p.count == 1 && p[0].failed && p[0].lastError == "500")
        #expect(await box.snapshot() == OutboxSnapshot(waiting: 0, failed: 1))
    }

    @Test func invalidIsDroppedAlreadyAppliedCounts() async {
        let box = Outbox(store: MemoryOutboxStore()) { op in
            if case let .create(_, id, _) = op, id == "bad" { return .invalid("400") }
            return .alreadyApplied
        }
        await box.enqueue(create("bad")); await box.enqueue(create("dup"))
        await box.flush()
        #expect(await box.pending().isEmpty)
    }

    @Test func upsertKeepsOnlyLatestPerFilter() async {
        let box = Outbox(store: MemoryOutboxStore()) { _ in .offline }
        await box.enqueue(.upsert(collection: "w", id: "1", filter: "t=1", data: ["v": .number(1)]))
        await box.enqueue(.upsert(collection: "w", id: "2", filter: "t=1", data: ["v": .number(2)]))
        await box.enqueue(.upsert(collection: "w", id: "3", filter: "t=2", data: [:]))
        #expect(await box.pending().count == 2)
    }

    @Test func survivesRelaunchViaStore() async {
        let store = MemoryOutboxStore()
        let a = Outbox(store: store) { _ in .offline }
        await a.enqueue(create("a"))
        let log = Log()
        let b = Outbox(store: store) { op in log.add(op); return nil }
        await b.flush()
        #expect(log.ops == [create("a")])
        #expect(OutboxPolicy.backoff(attempts: 20) == 300)
    }
}
