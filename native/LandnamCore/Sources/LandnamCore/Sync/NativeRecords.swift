import Foundation

/// Native writes for the remaining web collections (SSL-559), queued in the same outbox as the save:
/// Takeon `voxel_worlds` / `structures` (web lib/takeon/LandnamSync.ts shape), `push_subscriptions` and
/// `scheduled_notifications` (web app/api/push/* shape). Upserts are keyed like web so replays coalesce.
public enum NativeRecords {
    static func q(_ v: String) -> String { v.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "\"", with: "\\\"") }

    /// One Takeon world per user + target. `state` is the engine's render state JSON; `snapshot` is the engine's own
    /// snapshot (base64) so another iOS device can resume exactly; web ignores it.
    public static func voxelWorld(userId: String, targetId: String, seed: UInt64, state: JSONValue, snapshot: Data?) -> [OutboxOp] {
        guard case .object(let st) = state else { return [] }
        let filter = "user = \"\(q(userId))\" && target_id = \"\(q(targetId))\""
        var data: [String: JSONValue] = [
            "user": .string(userId), "target_id": .string(targetId), "body_id": .string(targetId), "rover_name": .string("Rover"),
            "seed": .number(Double(seed)), "schema_version": st["schemaVersion"] ?? .number(0),
            "status": st["status"] ?? .string("active"), "time": st["time"] ?? .number(0),
            "edits": st["edits"] ?? .object([:]), "rover": st["rover"] ?? .null,
            "anomalies": st["anomalies"] ?? .array([]), "photos": st["photos"] ?? .array([]), "weather": st["weather"] ?? .null,
        ]
        if let snapshot { data["snapshot"] = .string(snapshot.base64EncodedString()) }
        var ops: [OutboxOp] = [.upsert(collection: "voxel_worlds", id: OutboxPolicy.newRecordId(), filter: filter, data: data)]
        if case .array(let structures)? = st["structures"] {
            for case .object(let s) in structures {
                guard case .string(let sid)? = s["id"] else { continue }
                var pos: (JSONValue, JSONValue) = (.number(0), .number(0))
                if case .object(let p)? = s["pos"] { pos = (p["x"] ?? .number(0), p["y"] ?? .number(0)) }
                ops.append(.upsert(collection: "structures", id: OutboxPolicy.newRecordId(), filter: "\(filter) && structure_id = \"\(q(sid))\"", data: [
                    "user": .string(userId), "target_id": .string(targetId), "structure_id": .string(sid),
                    "blueprint_slug": s["type"] ?? .string("structure"), "pos_x": pos.0, "pos_y": pos.1,
                    "facing": s["facing"] ?? .number(0), "buffer": s["buffer"] ?? .object([:]),
                    "cooldown_until": s["cooldownUntil"] ?? .number(0), "progress": s["progress"] ?? .null,
                ]))
            }
        }
        return ops
    }

    /// Reads the account's world for a target: (render state, engine snapshot) — nil offline.
    public static func fetchWorld(baseURL: URL, token: String, userId: String, targetId: String, session: URLSession = .shared) async -> (JSONValue, Data?)? {
        var comps = URLComponents(url: baseURL.appendingPathComponent("api/collections/voxel_worlds/records"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [.init(name: "filter", value: "user = \"\(q(userId))\" && target_id = \"\(q(targetId))\""), .init(name: "perPage", value: "1")]
        var req = URLRequest(url: comps.url!); req.setValue(token, forHTTPHeaderField: "Authorization"); req.timeoutInterval = 15
        guard let (d, r) = try? await session.data(for: req), (r as? HTTPURLResponse)?.statusCode == 200,
              case .object(let root)? = try? JSONDecoder().decode(JSONValue.self, from: d),
              case .array(let items)? = root["items"], case .object(let w)? = items.first else { return nil }
        var snap: Data?
        if case .string(let b)? = w["snapshot"] { snap = Data(base64Encoded: b) }
        return (.object(w), snap)
    }

    /// This device's push registration (APNs token when granted, otherwise a local-only marker), keyed by endpoint.
    public static func pushSubscription(userId: String, endpoint: String) -> OutboxOp {
        .upsert(collection: "push_subscriptions", id: OutboxPolicy.newRecordId(), filter: "endpoint = \"\(q(endpoint))\"",
                data: ["endpoint": .string(endpoint), "keys": .object(["platform": .string("ios")]), "user_id": .string(userId)])
    }

    /// One Orionids peak reminder. The record id is stable per device endpoint so a relaunch
    /// is the same PocketBase row (`sent` is true because iOS delivers it via LocalNotifications).
    public static func orionidsPeakReminder(endpoint: String, at: Double) -> OutboxOp {
        .create(collection: "scheduled_notifications", id: reminderRecordId(endpoint), data: [
            "endpoint": .string(endpoint), "keys": .object(["platform": .string("ios")]), "scheduled_for": .number(at.rounded()),
            "title": .string(SkyEvents.orionidsPeakReminderTitle), "body": .string(SkyEvents.orionidsPeakReminderBody), "sent": .bool(true)])
    }

    /// 15-character PocketBase id, stable for one endpoint.
    static func reminderRecordId(_ endpoint: String) -> String {
        var hash: UInt64 = 14_695_981_039_346_656_037
        for byte in endpoint.utf8 {
            hash ^= UInt64(byte)
            hash = hash &* 1_099_511_628_211
        }
        let alphabet = Array("abcdefghijklmnopqrstuvwxyz0123456789")
        var out = ""
        var n = hash
        for _ in 0..<15 {
            out.append(alphabet[Int(n % 36)])
            n /= 36
        }
        return out
    }

    /// Mirror of a locally scheduled iOS notification. `sent` is true because iOS delivers it itself;
    /// the web cron only sends unsent https (Web Push) endpoints.
    public static func scheduledNotification(endpoint: String, title: String, body: String, at: Double) -> OutboxOp {
        .create(collection: "scheduled_notifications", id: OutboxPolicy.newRecordId(), data: [
            "endpoint": .string(endpoint), "keys": .object(["platform": .string("ios")]), "scheduled_for": .number(at.rounded()),
            "title": .string(title), "body": .string(body), "sent": .bool(true)])
    }

    /// Notifications a transition should schedule (web useSurfaceOpsActions): a newly dispatched ferry.
    public static func notifications(old: GameState, new: GameState) -> [(title: String, body: String, at: Double)] {
        new.player.surfaceOps.sites.compactMap { id, site in
            guard let f = site.ferry, f.status == .inFlight, old.player.surfaceOps.sites[id]?.ferry?.id != f.id else { return nil }
            return ("SURFACE CARGO DELIVERED", "\(SurfaceOps.site(id)?.name ?? "Surface site") manifest is ready at Base.", f.arrivesAt)
        }
    }
}
