import Foundation

/// Control Station registry (mirrors web lib/control-station.ts, SSL-496).
/// Equipment, locations and projects are data; a later citizen-science project
/// is a new row, not a new layout.
public enum SignalKind: String, Sendable { case transit, deepSpace = "deep-space", saturn }

public struct InstrumentSignal: Equatable, Sendable {
    public let id: String
    public let kind: SignalKind
    public let title: String
    public init(id: String, kind: SignalKind, title: String) { self.id = id; self.kind = kind; self.title = title }
}

public enum ControlStation {
    /// Structure id a player places to own ground telescopes.
    public static let groundTelescopeStructureId = "ground-telescope"
    public static let mapWidth = 640.0, mapHeight = 320.0

    public struct Body: Sendable, Identifiable { public let id: String, name: String; public let x, y, r: Double; public let ringed: Bool }
    public struct Location: Sendable { let id: String, bodyId: String, groupLabel: String }
    public struct Project: Sendable { public let id: String, label: String; let signalKind: SignalKind }
    enum Flag: Sendable { case always, transit, deepSpace, saturn }
    struct Equipment: Sendable {
        let id: String, name: String, locationId: String
        let projectIds: [String]
        let presence: Flag?          // nil = standing, unless `structureId` says the player must build it
        let structureId: String?     // owned only once this structure is in `player.placed`
        let feed: Flag
        let readyLabel: String
        let x, y: Double
    }

    public static let bodies = [
        Body(id: "earth", name: "Earth", x: 170, y: 150, r: 48, ringed: false),
        Body(id: "saturn", name: "Saturn", x: 490, y: 142, r: 36, ringed: true),
    ]
    static let locations = [
        Location(id: "earth-surface", bodyId: "earth", groupLabel: "Earth · Surface"),
        Location(id: "earth-orbit", bodyId: "earth", groupLabel: "Earth · Orbit"),
        Location(id: "saturn", bodyId: "saturn", groupLabel: "Saturn"),
    ]
    public static let projects = [
        Project(id: "exoplanet-hunters", label: "Exoplanet Hunters", signalKind: .transit),
        Project(id: "asteroid-discovery", label: "Asteroid discovery", signalKind: .deepSpace),
        Project(id: "saturn-storms", label: "Saturn storms", signalKind: .saturn),
    ]
    static let equipment = [
        Equipment(id: "ground-telescopes", name: "Ground telescopes", locationId: "earth-surface", projectIds: ["asteroid-discovery"], presence: nil, structureId: groundTelescopeStructureId, feed: .deepSpace, readyLabel: "Observing", x: 148, y: 172),
        Equipment(id: "transit-telescope", name: "Transit Telescope", locationId: "earth-orbit", projectIds: ["exoplanet-hunters"], presence: .transit, structureId: nil, feed: .transit, readyLabel: "Observing", x: 188, y: 68),
        Equipment(id: "deep-space-telescope", name: "Deep Space Telescope", locationId: "earth-orbit", projectIds: ["asteroid-discovery"], presence: .deepSpace, structureId: nil, feed: .deepSpace, readyLabel: "Observing", x: 252, y: 178),
        Equipment(id: "saturn-imager", name: "Saturn satellite", locationId: "saturn", projectIds: ["saturn-storms"], presence: .saturn, structureId: nil, feed: .saturn, readyLabel: "Frame ready", x: 608, y: 248),
    ]

    public struct Row: Identifiable, Sendable {
        public var id: String { equipmentId }
        public let equipmentId, name, status: String
        public let live: Bool
        public let projects: [String]
        public let readyCount: Int
        public let open: InstrumentSignal?
        /// True for the placeholder shown where the player has not built this equipment yet.
        public let buildPrompt: Bool
        /// World Space Week badges this equipment serves.
        public let wsw: [WorldSpaceWeek.Chip]
    }
    public struct Group: Identifiable, Sendable { public var id: String { label }; public let label: String; public let rows: [Row] }
    public struct Marker: Identifiable, Sendable { public var id: String { equipmentId }; public let equipmentId: String; public let x, y: Double; public let readyCount: Int }
    public struct Model: Sendable {
        public let filters: [(id: String, label: String)]
        public let activeBodyId: String
        public let bodies: [Body]
        public let markers: [Marker]
        public let groups: [Group]
        public let emptyLabel: String?
        /// Every World Space Week sky-event badge with its earned or open state.
        public let skyBadges: [WorldSpaceWeek.Chip]
    }

    static func on(_ f: Flag, _ p: Player) -> Bool {
        switch f {
        case .always: true
        case .transit: (p.transitSatelliteLaunchedAt ?? 0) > 0
        case .deepSpace: p.deepSpaceTelescopeBuilt
        case .saturn: (p.saturnImagerLaunchedAt ?? 0) > 0
        }
    }

    static func built(_ e: Equipment, _ p: Player) -> Bool {
        if let structureId = e.structureId { return p.placed.contains(structureId) }
        guard let pr = e.presence else { return true }
        return on(pr, p)
    }

    /// Equipment the player can build but has not: shown as a prompt, never as a live row.
    static func isBuildPrompt(_ e: Equipment, _ p: Player) -> Bool { p.freeOperations && e.structureId != nil && !built(e, p) }

    static func promptRow(_ e: Equipment) -> Row {
        Row(equipmentId: e.id, name: e.name, status: "None built", live: false,
            projects: e.projectIds.compactMap { id in projects.first { $0.id == id }?.label },
            readyCount: 0, open: nil, buildPrompt: true, wsw: [])
    }

    static func row(_ e: Equipment, _ p: Player, _ signals: [InstrumentSignal], hold: Bool, now: Double) -> Row {
        let live = on(e.feed, p)
        let kinds = e.projectIds.compactMap { id in projects.first { $0.id == id }?.signalKind }
        var seen = Set<String>(), ready: [InstrumentSignal] = []
        if live && !hold {
            for k in kinds { for s in signals where s.kind == k && seen.insert("\(s.kind.rawValue):\(s.id)").inserted { ready.append(s) } }
        }
        let status = !live ? "Standing by" : hold ? "Acquiring" : (ready.isEmpty ? "Observing" : e.readyLabel)
        return Row(equipmentId: e.id, name: e.name, status: status, live: live && !hold,
                   projects: e.projectIds.compactMap { id in projects.first { $0.id == id }?.label },
                   readyCount: ready.count, open: ready.first, buildPrompt: false,
                   wsw: WorldSpaceWeek.eventIds(forEquipment: e.id).compactMap { WorldSpaceWeek.chip($0, badges: p.badges, now: now) })
    }

    public static func build(player p: Player, signals: [InstrumentSignal], bodyId: String, loading: Bool = false,
                             now: Double = Date().timeIntervalSince1970 * 1000) -> Model {
        func listed(_ e: Equipment) -> Bool { p.freeOperations && built(e, p) }
        func body(of e: Equipment) -> String? { locations.first { $0.id == e.locationId }?.bodyId }
        let all = equipment.filter(listed)
        let prompts = equipment.filter { isBuildPrompt($0, p) }
        let ids = Set((all + prompts).compactMap(body(of:)))
        let shown = bodies.filter { ids.contains($0.id) }
        let filters = [(id: "all", label: "All")] + shown.map { (id: $0.id, label: $0.name) }
        let active = filters.contains { $0.id == bodyId } ? bodyId : "all"
        let visible = all.filter { active == "all" || body(of: $0) == active }
        let groups = locations.compactMap { loc -> Group? in
            let asked = prompts.filter { $0.locationId == loc.id && (active == "all" || body(of: $0) == active) }.map(promptRow)
            let rows = asked + visible.filter { $0.locationId == loc.id }.map { row($0, p, signals, hold: loading, now: now) }
            return rows.isEmpty ? nil : Group(label: loc.groupLabel, rows: rows)
        }
        let markers = all.map { Marker(equipmentId: $0.id, x: $0.x, y: $0.y, readyCount: row($0, p, signals, hold: loading, now: now).readyCount) }
        let empty = !groups.isEmpty ? nil : (p.freeOperations ? "No equipment at this location." : "Equipment links once Free Operations is open.")
        let sky = WorldSpaceWeek.eventIds.compactMap { WorldSpaceWeek.chip($0, badges: p.badges, now: now) }
        return Model(filters: filters, activeBodyId: active, bodies: shown, markers: markers, groups: groups, emptyLabel: empty, skyBadges: sky)
    }
}
