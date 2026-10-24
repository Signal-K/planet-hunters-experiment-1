import Foundation

/// Conflict-free progress ledger (SSL-559), the Swift twin of web `lib/sync/ledger.ts`.
/// value(key) = base[key] + Σ_device (plus[key] - minus[key]); each device only grows its own entry and seq,
/// merges keep the higher seq per device, so concurrent offline devices both count and replays never double count.
/// Stored in the save's top-level `syncLedger` (kept in `GameState.extras`), so web and native share it.
public struct SyncLedger: Codable, Equatable, Sendable {
    public struct Device: Codable, Equatable, Sendable { public var seq: Int; public var plus: [String: Double]; public var minus: [String: Double] }
    public var v: Int = 1
    public var base: [String: Double]
    public var devices: [String: Device]
    public var version: Int
}

public enum Ledger {
    public static let key = "syncLedger"
    static let scalars = ["francs", "researchXP", "researchAnnotations", "missionsDone"]

    public static func get(_ s: GameState) -> SyncLedger? {
        guard let raw = s.extras[key], let data = try? JSONEncoder().encode(raw) else { return nil }
        return try? JSONDecoder().decode(SyncLedger.self, from: data)
    }
    public static func set(_ s: inout GameState, _ l: SyncLedger?) {
        guard let l, let data = try? JSONEncoder().encode(l), let json = try? JSONDecoder().decode(JSONValue.self, from: data) else { s.extras[key] = nil; return }
        s.extras[key] = json
    }

    public static func counters(_ p: Player) -> [String: Double] {
        var c: [String: Double] = [
            "francs": Double(p.francs), "researchXP": Double(p.researchXP),
            "researchAnnotations": Double(p.researchAnnotations), "missionsDone": Double(p.missionsDone),
        ]
        for (k, v) in p.stash { c["stash.\(k)"] = Double(v) }
        for (k, v) in p.refinedGoods { c["refinedGoods.\(k)"] = Double(v) }
        return c
    }

    public static func values(_ l: SyncLedger) -> [String: Double] {
        var out = l.base
        for d in l.devices.values {
            for (k, v) in d.plus { out[k, default: 0] += v }
            for (k, v) in d.minus { out[k, default: 0] -= v }
        }
        return out
    }

    static func write(_ p: inout Player, _ v: [String: Double]) {
        func i(_ k: String) -> Int? { v[k].map { Int($0.rounded()) } }
        if let x = i("francs") { p.francs = x }
        if let x = i("researchXP") { p.researchXP = x }
        if let x = i("researchAnnotations") { p.researchAnnotations = x }
        if let x = i("missionsDone") { p.missionsDone = x }
        func rec(_ prefix: String) -> [String: Int] {
            var r: [String: Int] = [:]
            for (k, x) in v where k.hasPrefix(prefix + ".") { let n = max(0, Int(x.rounded())); if n > 0 { r[String(k.dropFirst(prefix.count + 1))] = n } }
            return r
        }
        p.stash = rec("stash"); p.refinedGoods = rec("refinedGoods")
    }

    /// Records local changes on this device's entry (live value vs ledger value). Idempotent.
    public static func stamp(_ s: GameState, device: String) -> GameState {
        let live = counters(s.player)
        var n = s
        guard let l = get(s) else { set(&n, SyncLedger(base: live, devices: [:], version: 0)); return n }
        let cur = values(l)
        var mine = l.devices[device] ?? .init(seq: 0, plus: [:], minus: [:])
        var changed = false
        for k in Set(live.keys).union(cur.keys) {
            let d = (live[k] ?? 0) - (cur[k] ?? 0)
            guard d != 0 else { continue }
            changed = true
            if d > 0 { mine.plus[k, default: 0] += d } else { mine.minus[k, default: 0] -= d }
        }
        guard changed else { return s }
        mine.seq += 1
        var nl = l; nl.devices[device] = mine
        set(&n, nl)
        return n
    }

    public static func merge(_ a: SyncLedger?, _ b: SyncLedger?) -> SyncLedger? {
        guard let a else { return b }; guard let b else { return a }
        var base = a.base
        for (k, v) in b.base { base[k] = max(base[k] ?? 0, v) }
        var devices = a.devices
        for (id, e) in b.devices where (devices[id]?.seq ?? -1) < e.seq { devices[id] = e }
        return SyncLedger(base: base, devices: devices, version: max(a.version, b.version))
    }

    public static func weight(_ s: GameState) -> Int { get(s)?.devices.values.reduce(0) { $0 + $1.seq } ?? 0 }
    public static func untouched(_ s: GameState) -> Bool { weight(s) == 0 && s.player.missionsDone == 0 && s.player.placed.isEmpty }

    /// Applies the merged ledger totals onto a field-merged save.
    public static func apply(_ merged: GameState, local: GameState, remote: GameState) -> GameState {
        var n = merged
        func from(_ s: GameState) -> GameState {
            var m = n; write(&m.player, get(s).map(values) ?? counters(s.player)); set(&m, get(s)); return m
        }
        if untouched(remote) && !untouched(local) { return from(local) }
        if untouched(local) && !untouched(remote) { return from(remote) }
        let l = merge(get(local) ?? SyncLedger(base: counters(local.player), devices: [:], version: 0),
                      get(remote) ?? SyncLedger(base: counters(remote.player), devices: [:], version: 0))!
        write(&n.player, values(l)); set(&n, l)
        return n
    }

    /// Stable per-install id for this device's ledger entry.
    public static func deviceId(_ defaults: UserDefaults = .standard) -> String {
        if let id = defaults.string(forKey: "landnam.deviceId") { return id }
        let id = "ios-" + OutboxPolicy.newRecordId()
        defaults.set(id, forKey: "landnam.deviceId")
        return id
    }

    public static func version(_ s: GameState) -> Int { get(s)?.version ?? 0 }
    public static func withVersion(_ s: GameState, _ v: Int) -> GameState { var n = s; if var l = get(s) { l.version = v; set(&n, l) }; return n }
}
