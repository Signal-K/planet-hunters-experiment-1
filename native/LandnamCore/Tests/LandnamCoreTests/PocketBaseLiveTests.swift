import Testing
import Foundation
@testable import LandnamCore

/// Opt-in: LANDNAM_LIVE_PB=http://localhost:8091 LANDNAM_LIVE_EMAIL/PASSWORD. Local instances only.
@Suite struct PocketBaseLiveTests {
    @Test func outboxReplaysAgainstLocalPocketBase() async throws {
        let env = ProcessInfo.processInfo.environment
        guard let raw = env["LANDNAM_LIVE_PB"], let email = env["LANDNAM_LIVE_EMAIL"], let pw = env["LANDNAM_LIVE_PASSWORD"] else { return }
        let base = URL(string: raw)!
        #expect(["localhost", "127.0.0.1"].contains(base.host))

        var req = URLRequest(url: base.appendingPathComponent("api/collections/users/auth-with-password"))
        req.httpMethod = "POST"; req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(["identity": email, "password": pw])
        let (d, _) = try await URLSession.shared.data(for: req)
        guard case .object(let o)? = try? JSONDecoder().decode(JSONValue.self, from: d),
              case .string(let token)? = o["token"], case .object(let rec)? = o["record"], case .string(let uid)? = rec["id"] else {
            Issue.record("auth failed"); return
        }

        let pb = PocketBaseExecutor(baseURL: base, token: { token })
        let outbox = Outbox(store: MemoryOutboxStore(), execute: pb.executor)
        let id = OutboxPolicy.newRecordId()
        let filter = "user = \"\(uid)\""
        await outbox.enqueue(.upsert(collection: "game_states", id: id, filter: filter, data: ["user": .string(uid), "state": .object(["v": .number(1)]), "missions_done": .number(1)]))
        await outbox.enqueue(.upsert(collection: "game_states", id: id, filter: filter, data: ["user": .string(uid), "state": .object(["v": .number(2)]), "missions_done": .number(2)]))
        await outbox.flush()
        #expect(await outbox.snapshot() == OutboxSnapshot(waiting: 0, failed: 0))
        // Replaying the same create is idempotent (already-applied counts as success).
        await outbox.enqueue(.create(collection: "game_states", id: id, data: ["user": .string(uid), "state": .object([:])]))
        await outbox.flush()
        #expect(await outbox.snapshot().waiting == 0)

        // Server unreachable: waits, does not burn attempts.
        let dead = PocketBaseExecutor(baseURL: URL(string: "http://localhost:1")!, token: { token })
        let off = Outbox(store: MemoryOutboxStore(), execute: dead.executor)
        await off.enqueue(.update(collection: "game_states", id: id, data: ["missions_done": .number(3)]))
        await off.flush()
        #expect(await off.pending().first?.attempts == 0)
    }
}
