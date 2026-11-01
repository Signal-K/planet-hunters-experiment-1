import Foundation

/// Control station sky (mirrors web lib/control-station-sky.ts, SSL-730).
/// The station is a sky map you look at through your telescopes. Unexplored anomalies wait to be classified
/// (tapping one opens its tool), explored ones you have classified, catalogue ones are objects you know that are
/// not citizen-science items. A telescope switch filters the map to what that telescope finds.
public enum StationSky {
    public enum SkyView: String, CaseIterable, Sendable, Identifiable {
        case explored, unexplored, all
        public var id: String { rawValue }
        public var label: String { rawValue.capitalized }
    }
    public enum AnomalyState: String, Sendable { case unexplored, explored, catalogue }
    public enum Shape: Sendable { case planet, asteroid, ringed, body }
    public enum Place: String, Sendable { case surface, orbit, offworld, relay }

    struct TelescopeDef: Sendable { let id, name: String; let place: Place; let equipmentIds: [String]; let finds: String }

    /// One row per place: the Space telescope is one telescope with two feeds (SSL-531). ORI-1 and later
    /// shower receivers join as more rows.
    static let telescopeDefs = [
        TelescopeDef(id: "ground", name: "Ground telescope", place: .surface, equipmentIds: ["ground-telescopes"], finds: "Asteroids"),
        TelescopeDef(id: "space", name: "Space telescope", place: .orbit, equipmentIds: ["transit-telescope", "deep-space-telescope"], finds: "Planets · asteroids"),
        TelescopeDef(id: "saturn", name: "Saturn satellite", place: .offworld, equipmentIds: ["saturn-imager"], finds: "Storms"),
    ]
    static let equipmentKinds: [String: [SignalKind]] = [
        "ground-telescopes": [.deepSpace], "transit-telescope": [.transit], "deep-space-telescope": [.deepSpace], "saturn-imager": [.saturn],
    ]

    public struct Telescope: Identifiable, Sendable {
        public let id, name: String
        public let place: Place
        public let finds: String
        public let built, live: Bool
        public let status: String
        public let readyCount: Int
        public let kinds: [SignalKind]
        /// Community instruments (ORI-1, later shower receivers) say whose they are.
        public let community: Bool
    }

    public struct Anomaly: Identifiable, Sendable {
        public let id, label, detail: String
        public let state: AnomalyState
        public let shape: Shape
        public let kind: SignalKind?
        /// 0...1 across and down the map.
        public let x, y: Double
        /// Set for unexplored anomalies: opening it brings up the classify tool.
        public let signal: InstrumentSignal?
    }

    public struct History: Sendable {
        public let total: Int
        public let recent: [(id: String, label: String, detail: String)]
    }

    /// A stable spot in the sky for an id (FNV-1a over UTF-16, as on web), kept off the edges.
    public static func spot(_ id: String) -> (x: Double, y: Double) {
        var h: UInt32 = 2166136261
        for u in id.utf16 { h ^= UInt32(u); h = h &* 16777619 }
        return (0.07 + Double(h & 0xffff) / 65535 * 0.86, 0.12 + Double((h >> 16) & 0xffff) / 65535 * 0.76)
    }

    static func shape(_ k: SignalKind) -> Shape { switch k { case .transit: .planet; case .deepSpace: .asteroid; case .saturn: .ringed } }
    static func noun(_ k: SignalKind) -> String { switch k { case .transit: "Transit"; case .deepSpace: "Asteroid"; case .saturn: "Storm frame" } }
    static let verdictWords = [
        "planet": "Planet candidate", "not_planet": "Not a planet", "likely_real": "Likely real", "likely_artifact": "Artifact",
        "yes": "Storm seen", "no": "No storm", "maybe": "Maybe a storm", "unsure": "Unsure",
    ]
    static func verdict(_ raw: String) -> String { verdictWords[raw].map { "Classified · \($0)" } ?? "Classified" }
    static func shortId(_ id: String) -> String {
        let tail = id.split(separator: "-").last.map(String.init) ?? id
        return tail.count > 10 ? String(tail.suffix(8)) : tail
    }

    static func explored(_ p: Player) -> [(Anomaly, Double)] {
        var out: [(Anomaly, Double)] = []
        func add(_ kind: SignalKind, _ id: String, _ verdictRaw: String, _ at: Double) {
            let key = "\(kind.rawValue):\(id)", s = spot(key)
            out.append((Anomaly(id: key, label: "\(noun(kind)) \(shortId(id))", detail: verdict(verdictRaw), state: .explored, shape: shape(kind), kind: kind, x: s.x, y: s.y, signal: nil), at))
        }
        for (id, c) in p.tessClassifications { add(.transit, id, c.verdict.rawValue, c.submittedAt) }
        for (id, c) in p.asteroidClassifications { add(.deepSpace, id, c.verdict.rawValue, c.submittedAt) }
        for (id, c) in p.saturnClassifications { add(.saturn, id, c.verdict.rawValue, c.submittedAt) }
        return out.sorted { $0.1 > $1.1 }
    }

    static func catalogue(_ p: Player) -> [Anomaly] {
        var out: [Anomaly] = []
        if (p.saturnImagerLaunchedAt ?? 0) > 0 {
            out.append(Anomaly(id: "body:saturn", label: "Saturn", detail: "Watched by your Saturn satellite", state: .catalogue, shape: .ringed, kind: .saturn, x: 0.86, y: 0.24, signal: nil))
        }
        for t in p.discoveredExoplanetTargets.values.sorted(by: { $0.id < $1.id }) {
            let s = spot("exo:\(t.id)")
            out.append(Anomaly(id: "exo:\(t.id)", label: t.name, detail: "Exoplanet you discovered", state: .catalogue, shape: .body, kind: .transit, x: s.x, y: s.y, signal: nil))
        }
        return out
    }

    public static func telescopes(_ model: ControlStation.Model) -> [Telescope] {
        let rows = model.groups.flatMap(\.rows)
        return telescopeDefs.compactMap { def in
            let mine = rows.filter { def.equipmentIds.contains($0.equipmentId) }
            guard let first = mine.first else { return nil }
            let built = mine.contains { !$0.buildPrompt }, live = mine.contains(where: \.live)
            let ready = mine.reduce(0) { $0 + $1.readyCount }
            let status = !built ? "Not built" : ready > 0 ? "\(ready) ready" : live ? "Observing" : first.status
            var kinds: [SignalKind] = []
            for id in def.equipmentIds { for k in equipmentKinds[id] ?? [] where !kinds.contains(k) { kinds.append(k) } }
            return Telescope(id: def.id, name: def.name, place: def.place, finds: def.finds, built: built, live: live, status: status, readyCount: ready, kinds: kinds, community: false)
        }
    }

    /// Community instruments that have launched. ORI-1 joins after Orionids mission 2 (web COMMUNITY_INSTRUMENTS).
    /// iOS has no meteor radio screen yet, so it lists as listening with nothing to open.
    public static func communityTelescopes(_ p: Player) -> [Telescope] {
        guard p.orionidsEventStage >= 2 else { return [] }
        return [Telescope(id: "ori-1", name: "ORI-1", place: .relay, finds: "Meteor echoes", built: true, live: true, status: "Listening", readyCount: 0, kinds: [], community: true)]
    }

    public static func sky(player p: Player, signals: [InstrumentSignal], view: SkyView, telescope: Telescope?) -> [Anomaly] {
        let open = signals.map { s -> Anomaly in
            let key = "\(s.kind.rawValue):\(s.id)", pos = spot(key)
            return Anomaly(id: key, label: s.title, detail: "\(noun(s.kind)) · ready to classify", state: .unexplored, shape: shape(s.kind), kind: s.kind, x: pos.x, y: pos.y, signal: s)
        }
        let done = explored(p).prefix(36).map { $0.0 }
        let shown: [Anomaly]
        switch view {
        case .unexplored: shown = open
        case .explored: shown = Array(done)
        case .all: shown = catalogue(p) + done + open
        }
        guard let kinds = telescope?.kinds else { return shown }
        return shown.filter { $0.kind.map(kinds.contains) ?? false }
    }

    public static func history(_ p: Player) -> History {
        let all = explored(p)
        return History(total: all.count, recent: all.prefix(3).map { (id: $0.0.id, label: $0.0.label, detail: $0.0.detail) })
    }
}
