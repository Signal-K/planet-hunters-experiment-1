import Foundation

/// Rover prospecting (mirrors web RoverMiningScreen, SSL-484): drive to an exposed outcrop and drill.
/// Drill one is a trace, two confirms a vein, three always opens a mine site; the first mine rig
/// is then staked and the Prospector can return. The surface itself is rendered by the host.
public struct Outcrop: Equatable, Identifiable, Sendable {
    public let id: String, label: String, mineral: String
    /// Normalised position in the field (0...1, y = 0 is the top), same anchors as the web markers.
    public let x: Double, y: Double
}

public enum DrillKind: String, Equatable, Sendable { case trace, vein, mineSite = "mine-site" }

public struct DrillFinding: Equatable, Identifiable, Sendable {
    public let attempt: Int, markerId: String, label: String, kind: DrillKind
    public var id: String { "\(markerId)-\(attempt)" }
}

public struct Prospecting: Equatable, Sendable {
    public static let outcrops = [
        Outcrop(id: "ore-a", label: "OUTCROP A", mineral: "iron", x: 0.62, y: 0.60),
        Outcrop(id: "ore-b", label: "OUTCROP B", mineral: "copper", x: 0.30, y: 0.46),
        Outcrop(id: "ore-c", label: "OUTCROP C", mineral: "aluminium", x: 0.78, y: 0.40),
    ]
    /// The rover must be this close (field units) to drill.
    public static let drillRange = 0.14
    public static let guaranteedDrills = 3

    public let requirements: Cargo
    public private(set) var rover = (x: 0.5, y: 0.82)
    public private(set) var selected: String?
    public private(set) var drillings: [DrillFinding] = []
    public private(set) var mineSite: String?
    public private(set) var constructionStarted = false
    public private(set) var cargo: Cargo = [:]

    public static func == (a: Prospecting, b: Prospecting) -> Bool {
        a.requirements == b.requirements && a.rover == b.rover && a.selected == b.selected && a.drillings == b.drillings
            && a.mineSite == b.mineSite && a.constructionStarted == b.constructionStarted && a.cargo == b.cargo
    }

    public init(requirements: Cargo) { self.requirements = requirements }

    /// Contract-shaped manifest: the mission's own order, or the target's first three minerals when it has none.
    public static func requirements(for mission: Mission, target: Target) -> Cargo {
        if !mission.requires.minerals.isEmpty { return mission.requires.minerals }
        return Dictionary(uniqueKeysWithValues: target.minerals.prefix(3).enumerated().map { ($1, 2 + $0) })
    }

    public static func finding(attempt: Int, outcrop: Outcrop) -> DrillFinding {
        if attempt >= guaranteedDrills { return DrillFinding(attempt: attempt, markerId: outcrop.id, label: "MINE SITE LOCATED · CLAIM STAKED", kind: .mineSite) }
        if attempt == 2 { return DrillFinding(attempt: attempt, markerId: outcrop.id, label: "VEIN CONFIRMED · ONE MORE DRILL WILL OPEN THE SITE", kind: .vein) }
        return DrillFinding(attempt: attempt, markerId: outcrop.id, label: "TRACE \(outcrop.mineral.uppercased()) · CONTINUE PROSPECTING", kind: .trace)
    }

    public var drillsToSite: Int { max(0, Self.guaranteedDrills - drillings.count) }
    public var selectedOutcrop: Outcrop? { Self.outcrops.first { $0.id == selected } }
    public var inRange: Bool {
        guard let o = selectedOutcrop else { return false }
        return hypot(o.x - rover.x, o.y - rover.y) <= Self.drillRange
    }
    public var canDrill: Bool { selected != nil && inRange && mineSite == nil }
    /// The order is in the hold (the mission requirement is met).
    public var cargoMet: Bool { !requirements.isEmpty && requirements.allSatisfy { cargo[$0.key, default: 0] >= $0.value } }
    /// Return opens once the order is met or drill three has opened the site; the first rig stays optional.
    public var canReturn: Bool { drillings.count >= Self.guaranteedDrills || cargoMet }

    public mutating func select(_ id: String) { if Self.outcrops.contains(where: { $0.id == id }) { selected = id } }

    /// Drive pad step, clamped to the field.
    public mutating func drive(dx: Double, dy: Double) {
        rover = (min(0.96, max(0.04, rover.x + dx)), min(0.96, max(0.3, rover.y + dy)))
    }

    /// Autopilot: park beside the selected outcrop (the web rover routes there on select).
    public mutating func driveToSelected() {
        guard let o = selectedOutcrop else { return }
        rover = (o.x, min(0.96, o.y + 0.11))
    }

    /// Tap on an outcrop: select it, route the rover beside it and drill on arrival.
    @discardableResult public mutating func tapOutcrop(_ id: String) -> DrillFinding? {
        select(id)
        driveToSelected()
        return drill()
    }

    /// One drill at the selected outcrop. Also lands that outcrop's mineral in the hold, up to the order.
    @discardableResult public mutating func drill() -> DrillFinding? {
        guard canDrill, let o = selectedOutcrop else { return nil }
        let f = Self.finding(attempt: drillings.count + 1, outcrop: o)
        drillings.append(f)
        if let need = requirements[o.mineral], cargo[o.mineral, default: 0] < need { cargo[o.mineral, default: 0] += 1 }
        if f.kind == .mineSite { mineSite = o.id }
        return f
    }

    public mutating func startConstruction() { if mineSite != nil { constructionStarted = true } }
}
