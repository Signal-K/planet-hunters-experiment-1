import Foundation

/// Transport lesson cargo hand-off (web `DeliveryScreen` with `useTakeonDropoff`): instead of the timed unload, the
/// player drives the Mule rover from the landed ship to the client's depot, dumps the ordered cargo beside it and
/// returns the empty rover before launch. Like web, the run is not saved: reopening the screen starts at the ship.
public struct Dropoff: Equatable, Sendable {
    public enum Stage: Equatable, Sendable { case driving, dumped, returned }
    public enum Refusal: Equatable, Sendable { case notParked, noCargo }

    /// Web `TRANSPORT_LESSON_MISSIONS_DONE` delivery leg only.
    public static func applies(_ p: Player) -> Bool { p.missionsDone == Transitions.transportLessonMissionsDone }

    /// Rover position along the deck, 0 at the ship's cargo door and 1 beside the depot cache.
    public private(set) var rover: Double = 0
    public private(set) var stage: Stage = .driving
    public private(set) var refusal: Refusal?

    public static let step = 0.125
    /// Close enough to the cache to tip the hold into it (web: adjacent to the seeded cache tile).
    public static let parkedFrom = 0.875

    public init() {}

    public var parked: Bool { rover >= Self.parkedFrom }

    /// Drive pad or a tap on the deck. The rover only drives while it still carries the cargo.
    public mutating func drive(to x: Double) {
        guard stage == .driving else { return }
        rover = min(1, max(0, x))
        refusal = nil
    }

    public mutating func drive(by dx: Double) { drive(to: rover + dx) }

    /// Returns whether the cargo left the hold. Refusals carry web's messages (`message(for:)`).
    @discardableResult
    public mutating func dump(cargoUnits: Int) -> Bool { dump(cargoUnits: cargoUnits, nearCache: parked) }

    /// The Takeon field decides reach itself (its deposit moved cargo or not); the lane scene uses `parked`.
    @discardableResult
    public mutating func dump(cargoUnits: Int, nearCache: Bool) -> Bool {
        guard stage == .driving else { return false }
        guard cargoUnits > 0 else { refusal = .noCargo; return false }
        guard nearCache else { refusal = .notParked; return false }
        refusal = nil
        stage = .dumped
        return true
    }

    /// The empty rover drives itself back and redocks; the ship is then ready to launch for Earth.
    public mutating func returnRover() {
        guard stage == .dumped else { return }
        rover = 0
        stage = .returned
    }

    public static func message(for r: Refusal) -> String {
        switch r {
        case .notParked: return "PARK BESIDE THE DEPOT CACHE"
        case .noCargo: return "NO CARGO IN ROVER HOLD"
        }
    }
}
