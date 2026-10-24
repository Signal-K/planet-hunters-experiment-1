import Foundation

/// Rover survey (mirrors web RoverSurveyScreen): drive the starter Mule to an exposed outcrop and log one observation.
/// The rover never extracts cargo; the ship laser is the only mining. The surface itself is rendered by the host.
public struct Outcrop: Equatable, Identifiable, Sendable {
    public let id: String, label: String, mineral: String
    /// Normalised position in the field (0...1, y = 0 is the top), same anchors as the web markers.
    public let x: Double, y: Double
}

public struct Prospecting: Equatable, Sendable {
    public static let outcrops = [
        Outcrop(id: "ore-a", label: "OUTCROP A", mineral: "iron", x: 0.62, y: 0.60),
        Outcrop(id: "ore-b", label: "OUTCROP B", mineral: "copper", x: 0.30, y: 0.46),
        Outcrop(id: "ore-c", label: "OUTCROP C", mineral: "aluminium", x: 0.78, y: 0.40),
    ]

    public private(set) var rover = (x: 0.5, y: 0.82)
    public private(set) var logged: String?
    /// Every outcrop logged so far, in order. `logged` is the latest.
    public private(set) var observations: [String] = []
    /// Formations the survey needs. The Orionids survey asks for three and the rover has to be driven within scanner range of each (web parity), which keeps it near a minute.
    public var goal: Int
    public static let scanRange = 0.2

    public static func == (a: Prospecting, b: Prospecting) -> Bool { a.rover == b.rover && a.logged == b.logged && a.observations == b.observations }

    public init(goal: Int = 1) { self.goal = goal }

    public var loggedOutcrop: Outcrop? { Self.outcrops.first { $0.id == logged } }
    /// Continuing needs `goal` logged observations.
    public var canContinue: Bool { observations.count >= goal }

    /// Drive pad step, clamped to the field.
    public mutating func drive(dx: Double, dy: Double) {
        rover = (min(0.96, max(0.04, rover.x + dx)), min(0.96, max(0.3, rover.y + dy)))
    }

    /// Outcrop within scanner range of the rover right now.
    public func inRange(_ o: Outcrop) -> Bool { ((rover.x - o.x) * (rover.x - o.x) + (rover.y - o.y) * (rover.y - o.y)).squareRoot() <= Self.scanRange }

    /// Tap on an outcrop. A single-formation survey parks the rover beside it and logs it. A multi-formation survey only logs what the rover has been driven up to, and never the same one twice. Returns whether it logged.
    @discardableResult
    public mutating func observe(_ id: String) -> Bool {
        guard let o = Self.outcrops.first(where: { $0.id == id }), !observations.contains(o.id), observations.count < goal else { return false }
        if goal > 1 && !inRange(o) { return false }
        if goal == 1 { rover = (o.x, min(0.96, o.y + 0.11)) }
        logged = o.id
        observations.append(o.id)
        return true
    }
}
