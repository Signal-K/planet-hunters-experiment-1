import Testing
import Foundation
@testable import LandnamCore

/// Opt-in (local PocketBase only): LANDNAM_LIVE_PB / LANDNAM_LIVE_EMAIL / LANDNAM_LIVE_PASSWORD.
/// Plays a whole run offline (launch, mine, fly home, settle), reconnects, and checks PocketBase matches.
@MainActor @Suite struct MissionRunsLiveTests {
    @Test func offlineRunLandsInPocketBaseOnReconnect() async throws {
        let env = ProcessInfo.processInfo.environment
        guard let raw = env["LANDNAM_LIVE_PB"], let email = env["LANDNAM_LIVE_EMAIL"], let pw = env["LANDNAM_LIVE_PASSWORD"] else { return }
        let base = URL(string: raw)!
        try #require(["localhost", "127.0.0.1"].contains(base.host))
        var req = URLRequest(url: base.appendingPathComponent("api/collections/users/auth-with-password"))
        req.httpMethod = "POST"; req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(["identity": email, "password": pw])
        let (d, _) = try await URLSession.shared.data(for: req)
        guard case .object(let o)? = try? JSONDecoder().decode(JSONValue.self, from: d),
              case .string(let token)? = o["token"], case .object(let rec)? = o["record"], case .string(let uid)? = rec["id"] else {
            Issue.record("auth failed"); return
        }

        let online = RunBox<Bool>(false)
        let live = PocketBaseExecutor(baseURL: base, token: { token })
        let outbox = Outbox(store: MemoryOutboxStore()) { op in online.value ? await live.executor(op) : .offline }
        let sync = CloudSync(outbox: outbox)
        await sync.setUser(uid)

        let store = GameStore()
        let ops = RunBox<[OutboxOp]>([])
        playRun(store, into: ops, user: uid)
        for op in ops.value { await sync.enqueue(op) }
        await sync.save(store.state)
        #expect(await sync.snapshot().waiting == ops.value.count + 1)   // all held while offline

        online.value = true
        await sync.flush()
        #expect(await sync.snapshot() == OutboxSnapshot(waiting: 0, failed: 0))
        // Replaying the run create again is a no-op (client id already applied).
        if let create = ops.value.first { await sync.enqueue(create); await sync.flush() }
        #expect(await sync.snapshot().waiting == 0)

        guard case .create(_, let runId, _)? = ops.value.first else { Issue.record("no run"); return }
        var get = URLRequest(url: base.appendingPathComponent("api/collections/mission_runs/records/\(runId)"))
        get.setValue(token, forHTTPHeaderField: "Authorization")
        let (rd, _) = try await URLSession.shared.data(for: get)
        guard case .object(let run)? = try? JSONDecoder().decode(JSONValue.self, from: rd) else { Issue.record("run missing"); return }
        #expect(run["user"] == JSONValue.string(uid))
        #expect(run["status"] == JSONValue.string("completed"))
        #expect(await MissionRuns.fetchOpen(baseURL: base, token: token, userId: uid)?.contains { $0.id == runId } == false)

        let pulled = await CloudPull.fetch(baseURL: base, token: token, userId: uid)
        guard case .found(let remote) = pulled else { Issue.record("no game_states"); return }
        #expect(remote.player.missionsDone == store.player.missionsDone)
        #expect(remote.player.francs == store.player.francs)
        #expect(remote.player.stash == store.player.stash)
        print("LIVE mission_runs \(runId) user \(uid) status completed; missionsDone \(remote.player.missionsDone) francs \(remote.player.francs)")
    }
}
