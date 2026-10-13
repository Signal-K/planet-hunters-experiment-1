import Foundation

/// Per-world landscape: tint, terrain arrangement and surface deposit mix (SSL-536).
/// Data lives in `laser-palettes.json` (`palettes.<id>.landscape`). Mirrors `web/lib/mining/landscape.ts`;
/// the hash and PRNG are bit-for-bit the same so a target looks the same on web and native.
enum Landscape {
    static let pieces = ["mountain", "ridge", "strata"]
    static let deposits = ["iron", "nickel", "ice", "cobalt"]
    static let pieceHeight: [String: CGFloat] = ["mountain": 112, "ridge": 48, "strata": 56]
    static let depositHeight: CGFloat = 48

    struct Spec {
        var tint: UInt32 = 0xDCC8B0
        var shade: Double = 1
        var seed: UInt32 = 1
        var density: Double = 1
        var pieces: [String: Double] = ["mountain": 1, "ridge": 2, "strata": 1]
        var deposits: [String: Double] = ["iron": 1, "nickel": 1, "ice": 1, "cobalt": 1]
    }

    struct Piece { var kind: String; var x: Double; var scale: Double; var flip: Bool }
    struct Deposit { var kind: String; var x: Double }
    struct Layout { var tint: UInt32; var shade: Double; var period: Double; var pieces: [Piece]; var deposits: [Deposit] }

    /// Which deposits-v2 art a mineral uses. Mirrors web `depositKindFor`.
    static func depositKind(for mineral: String) -> String {
        let m = mineral.lowercased()
        func has(_ keys: [String]) -> Bool { keys.contains { m.contains($0) } }
        if has(["ice", "water", "ammonia", "methane", "nitrogen", "volatile"]) { return "ice" }
        if has(["cobalt", "titan", "sapph", "lithium"]) { return "cobalt" }
        if has(["iron", "carbon", "copper", "hematite", "regolith", "basalt"]) { return "iron" }
        return "nickel"
    }

    static func parse(_ raw: [String: Any]?) -> Spec? {
        guard let raw else { return nil }
        var s = Spec()
        if let t = raw["tint"] as? String { s.tint = UInt32(t.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? s.tint }
        if let v = raw["shade"] as? NSNumber { s.shade = v.doubleValue }
        if let v = raw["seed"] as? NSNumber { s.seed = v.uint32Value }
        if let v = raw["density"] as? NSNumber { s.density = v.doubleValue }
        if let p = raw["pieces"] as? [String: NSNumber] { s.pieces = p.mapValues(\.doubleValue) }
        if let d = raw["deposits"] as? [String: NSNumber] { s.deposits = d.mapValues(\.doubleValue) }
        return s
    }

    /// FNV-1a over UTF-16 code units (matches JS `charCodeAt`).
    static func hash32(_ s: String) -> UInt32 {
        var h: UInt32 = 0x811C9DC5
        for u in s.utf16 { h ^= UInt32(u); h = h &* 0x01000193 }
        return h
    }

    /// mulberry32.
    struct RNG {
        var a: UInt32
        mutating func next() -> Double {
            a = a &+ 0x6D2B79F5
            var t = a
            t = (t ^ (t >> 15)) &* (t | 1)
            t ^= t &+ ((t ^ (t >> 7)) &* (t | 61))
            return Double(t ^ (t >> 14)) / 4294967296
        }
    }

    private static func pick(_ w: [String: Double], _ keys: [String], _ r: Double) -> String {
        let total = keys.reduce(0) { $0 + max(0, w[$1] ?? 0) }
        guard total > 0 else { return keys[0] }
        var x = r * total
        for k in keys { x -= max(0, w[k] ?? 0); if x < 0 { return k } }
        return keys[keys.count - 1]
    }

    static func layout(_ spec: Spec?, key: String, period: Double = 768) -> Layout {
        let s = spec ?? Spec()
        var rng = RNG(a: s.seed ^ hash32(key))
        let count = max(2, Int((period / 128 * s.density).rounded(.toNearestOrAwayFromZero)))
        let slot = period / Double(count)
        var out: [Piece] = []
        for i in 0..<count {
            let kind = pick(s.pieces, pieces, rng.next())
            let x = (Double(i) * slot + rng.next() * slot * 0.6).rounded(.toNearestOrAwayFromZero)
            let scale = ((0.7 + rng.next() * 0.5) * 100).rounded(.toNearestOrAwayFromZero) / 100
            let flip = rng.next() < 0.5
            out.append(Piece(kind: kind, x: x, scale: scale, flip: flip))
        }
        let dCount = max(1, Int((Double(count) / 2).rounded(.toNearestOrAwayFromZero)))
        var deps: [Deposit] = []
        for i in 0..<dCount {
            let kind = pick(s.deposits, deposits, rng.next())
            deps.append(Deposit(kind: kind, x: ((Double(i) + rng.next()) * (period / Double(dCount))).rounded(.toNearestOrAwayFromZero)))
        }
        return Layout(tint: s.tint, shade: s.shade, period: period, pieces: out, deposits: deps)
    }
}
