import Foundation

/// Transit Telescope feed (mirrors web lib/data/tess-candidates.ts): a light curve the player
/// marks dips on, then calls Confirm Transit / Mark Noise / Skip.
public enum TessVerdict: String, Codable, CaseIterable, Sendable { case planet, notPlanet = "not_planet", unsure }

public struct LightcurvePoint: Equatable, Sendable { public var x: Double; public var y: Double
    public init(x: Double, y: Double) { self.x = x; self.y = y } }

/// A marked transit region in light curve time (days).
public struct TransitRange: Codable, Equatable, Sendable {
    public var x1: Double, x2: Double
    public init(x1: Double, x2: Double) { self.x1 = x1; self.x2 = x2 }
}

public struct TessCandidate: Equatable, Identifiable, Sendable {
    public let id: String
    public let ticId: String
    public let toi: String
    public let host: String
    public let sector: String
    public let constellation: String
    public let periodDays: Double
    public let transitEpoch: Double
    public let depthPpm: Double
    public let signalToNoise: Double
    public let lightcurve: [LightcurvePoint]?

    public init(id: String, ticId: String = "TIC 0", toi: String, host: String? = nil, sector: String = "TESS sector",
                constellation: String = "TESS field", periodDays: Double = 3, transitEpoch: Double = 0.7,
                depthPpm: Double = 1000, signalToNoise: Double = 0, lightcurve: [LightcurvePoint]? = nil) {
        self.id = id; self.ticId = ticId; self.toi = toi; self.host = host ?? toi; self.sector = sector
        self.constellation = constellation; self.periodDays = periodDays; self.transitEpoch = transitEpoch
        self.depthPpm = depthPpm; self.signalToNoise = signalToNoise; self.lightcurve = lightcurve
    }

    /// Shared `subjects` record (subject_type = transit).
    public init(record r: [String: JSONValue]) {
        let toi = r.string("toi_id") ?? r.string("toi") ?? r.string("id") ?? "candidate"
        let tic = r.string("tic_id") ?? r.string("tid") ?? r.string("id") ?? "TIC"
        let period = r.number("period_days") ?? r.number("pl_orbper") ?? 3
        let depthPct = r.number("depth_pct") ?? 0.1
        let depth = r.number("depth_ppm") ?? r.number("pl_trandep") ?? depthPct * 10000
        self.init(id: r.string("id") ?? "\(tic)-\(toi)",
                  ticId: tic.hasPrefix("TIC") ? tic : "TIC \(tic)",
                  toi: toi.hasPrefix("TOI") ? toi : "TOI \(toi)",
                  host: toi.hasPrefix("TOI") ? toi.replacingOccurrences(of: #"\.\d+$"#, with: "", options: .regularExpression) : "TOI-\(toi)",
                  sector: r.string("sectors") ?? r.string("sector") ?? "TESS sector",
                  constellation: r.string("constellation") ?? "TESS field",
                  periodDays: period > 0 ? period : 3, transitEpoch: r.number("transit_epoch") ?? 0.7,
                  depthPpm: depth > 0 ? depth : 1000, signalToNoise: r.number("signal_to_noise") ?? r.number("snr") ?? 0,
                  lightcurve: Tess.parsePoints(r["lightcurve_points"]))
    }

    /// Reviewable: transit subject, no gold label, open consensus, not a known planet or false positive.
    public static func isReviewable(_ r: [String: JSONValue]) -> Bool {
        guard (r.string("subject_type") ?? "").lowercased() == "transit" else { return false }
        for key in ["consensus", "gold_label"] {
            let v = (r.string(key) ?? "").trimmingCharacters(in: .whitespaces).lowercased()
            if v == "planet" || v == "not_planet" { return false }
        }
        let disposition = (r.string("tfopwg_disp") ?? r.string("disposition") ?? "").uppercased()
        return !["KP", "CP", "FP"].contains(disposition)
    }
}

/// Same wire shape as the web `TessClassification`.
public struct TessClassification: Codable, Equatable, Sendable {
    public var subjectId: String
    public var verdict: TessVerdict
    public var ranges: [TransitRange]
    public var submittedAt: Double
    public init(subjectId: String, verdict: TessVerdict, ranges: [TransitRange], submittedAt: Double) {
        self.subjectId = subjectId; self.verdict = verdict; self.ranges = ranges; self.submittedAt = submittedAt
    }
}

public struct SectorWindow: Equatable, Sendable { public let label: String; public let points: [LightcurvePoint] }

public enum Tess {
    static let syntheticPointCount = 1100

    static func parsePoints(_ v: JSONValue?) -> [LightcurvePoint]? {
        var raw = v
        if case .string(let s)? = v, let d = s.data(using: .utf8) { raw = try? JSONDecoder().decode(JSONValue.self, from: d) }
        guard case .array(let items)? = raw else { return nil }
        let pts = items.compactMap { item -> LightcurvePoint? in
            guard case .object(let o) = item, let x = o.number("x"), let y = o.number("y") else { return nil }
            return LightcurvePoint(x: x, y: y)
        }
        return pts.isEmpty ? nil : pts
    }

    static func noise(seed: UInt32, index: Int) -> Double {
        var h = seed ^ (UInt32(truncatingIfNeeded: index + 1) &* 0x374b9eb9)
        h ^= h >> 16; h = h &* 0x7feb352d; h ^= h >> 15; h = h &* 0x846ca68b; h ^= h >> 16
        return Double(h) / 4294967295.0 - 0.5
    }

    /// Real curve when the subject carries one, otherwise the same seeded synthetic curve the web draws.
    public static func lightcurve(_ c: TessCandidate) -> [LightcurvePoint] {
        if let real = c.lightcurve, !real.isEmpty { return real }
        let seed = Saturn.hash(c.id)
        let span = 27.4, depth = c.depthPpm / 1_000_000
        let width = max(0.045, min(0.16, c.periodDays * 0.018))
        return (0..<syntheticPointCount).map { i in
            let x = Double(i) / Double(syntheticPointCount - 1) * span
            var phase = (x - c.transitEpoch).truncatingRemainder(dividingBy: c.periodDays)
            if phase < 0 { phase += c.periodDays }
            let dist = min(phase, c.periodDays - phase)
            let dip = depth * exp(-0.5 * pow(dist / width, 2))
            let trend = sin(x / span * .pi * 2 + Double(seed % 31)) * 0.00018
            let n = noise(seed: seed, index: i) * 0.00046
            return LightcurvePoint(x: (x * 1000).rounded() / 1000, y: ((1 - dip + trend + n) * 100000).rounded() / 100000)
        }
    }

    static func sectorList(_ text: String) -> [String] {
        let t = text.trimmingCharacters(in: .whitespaces)
        if let m = t.range(of: #"(\d+)\s*-\s*(\d+)"#, options: .regularExpression) {
            let nums = t[m].split(whereSeparator: { !$0.isNumber }).compactMap { Int($0) }
            if nums.count == 2, nums[1] >= nums[0], nums[1] - nums[0] < 40 { return (nums[0]...nums[1]).map(String.init) }
        }
        var seen: [String] = []
        for m in t.split(whereSeparator: { !$0.isNumber }).map(String.init) where !seen.contains(m) { seen.append(m) }
        return seen
    }

    /// One real window per listed sector, or the whole curve when the text lists fewer than two.
    public static func sectorWindows(_ points: [LightcurvePoint], sectorText: String) -> [SectorWindow] {
        let sectors = sectorList(sectorText)
        guard sectors.count >= 2, points.count >= sectors.count * 2 else {
            return [SectorWindow(label: sectors.first.map { "SECTOR \($0)" } ?? "FULL RANGE", points: points)]
        }
        let chunk = points.count / sectors.count
        return sectors.enumerated().map { i, label in
            let end = i == sectors.count - 1 ? points.count : (i + 1) * chunk
            return SectorWindow(label: "SECTOR \(label)", points: Array(points[(i * chunk)..<end]))
        }
    }

    /// Mean gap between marked-range midpoints (nil under two marks).
    public static func periodFromRanges(_ ranges: [TransitRange]) -> Double? {
        guard ranges.count >= 2 else { return nil }
        let c = ranges.map { ($0.x1 + $0.x2) / 2 }.sorted()
        let gaps = zip(c.dropFirst(), c).map { $0 - $1 }
        return gaps.reduce(0, +) / Double(gaps.count)
    }

    /// Mean depth of the marked ranges against the flux floor, nil when nothing sits inside.
    public static func depthFromRanges(_ points: [LightcurvePoint], _ ranges: [TransitRange]) -> Double? {
        let depths = ranges.compactMap { r -> Double? in
            let lo = min(r.x1, r.x2), hi = max(r.x1, r.x2)
            guard let low = points.filter({ $0.x >= lo && $0.x <= hi }).map(\.y).min() else { return nil }
            let d = 1 - low
            return d > 0 ? d : nil
        }
        return depths.isEmpty ? nil : depths.reduce(0, +) / Double(depths.count)
    }

    public static func today(candidates: [TessCandidate], player: Player, dateKey: String, inspect: String? = nil) -> TessCandidate? {
        let open = candidates.filter { player.tessClassifications[$0.id] == nil }
        guard !open.isEmpty else { return nil }
        if let inspect, let focused = open.first(where: { $0.id == inspect }) { return focused }
        return open[Int(Saturn.hash(dateKey)) % open.count]
    }

    /// Rounded and ordered the way the web saves marks.
    public static func normalized(_ ranges: [TransitRange]) -> [TransitRange] {
        ranges.map { TransitRange(x1: ($0.x1 * 1000).rounded() / 1000, x2: ($0.x2 * 1000).rounded() / 1000) }.sorted { $0.x1 < $1.x1 }
    }
}
