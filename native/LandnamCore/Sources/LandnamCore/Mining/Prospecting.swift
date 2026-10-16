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

    public static func == (a: Prospecting, b: Prospecting) -> Bool { a.rover == b.rover && a.logged == b.logged }

    public init() {}

    public var loggedOutcrop: Outcrop? { Self.outcrops.first { $0.id == logged } }
    /// Continuing to the ship laser needs one logged observation.
    public var canContinue: Bool { logged != nil }

    /// Drive pad step, clamped to the field.
    public mutating func drive(dx: Double, dy: Double) {
        rover = (min(0.96, max(0.04, rover.x + dx)), min(0.96, max(0.3, rover.y + dy)))
    }

    /// Tap on an outcrop: the rover parks beside it and logs a surface observation.
    public mutating func observe(_ id: String) {
        guard let o = Self.outcrops.first(where: { $0.id == id }) else { return }
        rover = (o.x, min(0.96, o.y + 0.11))
        logged = o.id
    }
}
