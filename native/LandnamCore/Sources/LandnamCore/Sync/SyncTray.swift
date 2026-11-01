import Foundation

/// SSL-729: what the sync tray says (web `lib/offline/syncTray.ts`). Each waiting change is named in plain
/// words, and the tray says where progress is right now: this device or the account.
public enum SyncTray {
    public enum State: Equatable, Sendable { case offline, waiting, problem, synced }

    public static func state(online: Bool, pending: Int, failed: Int) -> State {
        if !online { return .offline }
        if failed > 0 { return .problem }
        if pending > 0 { return .waiting }
        return .synced
    }

    public static func copy(_ state: State, waiting: Int) -> (title: String, body: String) {
        let changes = "\(waiting) \(waiting == 1 ? "change" : "changes")"
        let verb = waiting == 1 ? "is" : "are"
        switch state {
        case .offline:
            return ("Offline", waiting > 0
                ? "Keep playing. \(changes) \(verb) saved on this device and upload to your account when you reconnect."
                : "Keep playing. Everything is saved on this device and uploads to your account when you reconnect.")
        case .waiting: return ("Waiting to upload", "\(changes) saved on this device \(verb) queued for your account.")
        case .problem: return ("Not synced yet", "Your progress is safe on this device. The server has not accepted it yet; it keeps retrying, or tap Upload now.")
        case .synced: return ("All synced", "Everything you have done is saved to your account.")
        }
    }

    public static func describe(_ item: OutboxItem) -> String {
        switch item.op {
        case .http(let path, _): return path.contains("community") ? "Community research" : "Shared record"
        case .create(let collection, _, _): return collection == "mission_runs" ? "Mission started" : name(collection)
        case .update(let collection, _, _), .upsert(let collection, _, _, _): return name(collection)
        }
    }

    private static func name(_ collection: String) -> String {
        switch collection {
        case "game_states": return "Base and progress"
        case "mission_runs": return "Mission record"
        case "voxel_worlds": return "Rover terrain"
        case "onboarding_feedback": return "Feedback"
        default: return "Game change"
        }
    }
}
