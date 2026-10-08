import Foundation

/// Pushes the save to PocketBase `game_states` through the outbox, matching the
/// web record shape: `{ user, state, missions_done }`, one record per account,
/// id = user id so a replayed create is idempotent.
public actor CloudSync {
    private let outbox: Outbox
    private var userId: String?

    public init(outbox: Outbox) { self.outbox = outbox }

    public func setUser(_ id: String?) { userId = id }

    public static func op(userId: String, state: GameState) throws -> OutboxOp {
        let json = try JSONDecoder().decode(JSONValue.self, from: JSONEncoder().encode(state))
        return .upsert(collection: "game_states", id: userId, filter: "user = \"\(userId)\"",
                       data: ["user": .string(userId), "state": json,
                              "missions_done": .number(Double(state.player.missionsDone))])
    }

    /// Latest snapshot per account replaces any queued one, then replays.
    public func save(_ state: GameState) async {
        guard let userId, let op = try? Self.op(userId: userId, state: state) else { return }
        await outbox.enqueue(op)
        await outbox.flush()
    }

    /// Queues a non-save op (e.g. a treasury call) behind the save and replays it; survives offline and relaunch.
    public func enqueue(_ op: OutboxOp) async { await outbox.enqueue(op); await outbox.flush() }

    public func flush() async { await outbox.flush() }
    public func snapshot() async -> OutboxSnapshot { await outbox.snapshot() }
}
