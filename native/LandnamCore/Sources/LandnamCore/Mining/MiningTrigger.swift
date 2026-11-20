import Foundation

/// One buffered press survives release during cooldown; holding repeats at the same cadence.
public struct MiningTrigger: Equatable, Sendable {
    public static let cooldown = 0.42
    private var held = false
    private var pending = false
    private var nextShotAt = 0.0
    public init() {}
    public mutating func setHeld(_ value: Bool) {
        if value && !held { pending = true }
        held = value
    }
    public mutating func request() { pending = true }
    public mutating func cancelInput() { held = false; pending = false }
    public func charging(at time: Double) -> Bool { time < nextShotAt }
    public mutating func step(at time: Double) -> Bool {
        guard (held || pending) && time >= nextShotAt else { return false }
        pending = false; nextShotAt = time + Self.cooldown
        return true
    }
}
