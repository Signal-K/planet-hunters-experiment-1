import Foundation

/// Seam between Landnam and the Takeon surface-ops sim. The web build hosts a
/// vendored JS engine; native will port world gen, rover, structures and recipes
/// to Swift behind this protocol and render with SpriteKit.
public struct TakeonWorldSeed: Codable, Equatable, Sendable {
    public var targetId: String
    public var seed: UInt64
    public init(targetId: String, seed: UInt64) { self.targetId = targetId; self.seed = seed }
}

public enum TakeonEvent: Equatable, Sendable {
    case depositMined(mineralId: String, amount: Int)
    case structureBuilt(kind: String)
    case missionObjectiveMet
}

public protocol TakeonEngine: AnyObject {
    /// Load or generate the world for a target. Must be deterministic per seed.
    func loadWorld(_ seed: TakeonWorldSeed) throws
    /// Advance the simulation by `dt` seconds and return events raised.
    func step(dt: TimeInterval) -> [TakeonEvent]
    /// Opaque, versioned save blob so the web client can round-trip it.
    func snapshot() throws -> Data
    func restore(_ snapshot: Data) throws

    /// Issue a rover order: "move" (arg = direction 0...3), "drill", "cancel".
    /// Returns whether the order was accepted.
    func order(_ kind: String, arg: Int) throws -> Bool
    /// Autopilot: drive next to (x, y), face it and mine it down.
    func orderMine(x: Int, y: Int) -> Bool
    /// Bank held mission yield (must be near the landing site).
    func bank() -> Bool
    /// Derived progress of the active mission.
    func missionProgress() throws -> TakeonMissionProgress
    /// Read-only rover/world state as JSON, for the renderer.
    func state() throws -> Data
}

public struct TakeonObjectiveProgress: Codable, Equatable, Sendable {
    public var kind: String
    public var label: String
    public var target: Double
    public var current: Double
    public var complete: Bool
}

public struct TakeonMissionProgress: Codable, Equatable, Sendable {
    public var missionId: String
    public var name: String
    public var objectives: [TakeonObjectiveProgress]
    public var complete: Bool
}

public enum TakeonEngineError: Error, Equatable {
    case unknownTarget(String)
    case notLoaded
    case runtime(String)
}

/// Placeholder until the Swift port lands; keeps callers compiling.
public final class NullTakeonEngine: TakeonEngine {
    public init() {}
    public func loadWorld(_ seed: TakeonWorldSeed) throws {}
    public func step(dt: TimeInterval) -> [TakeonEvent] { [] }
    public func snapshot() throws -> Data { Data() }
    public func restore(_ snapshot: Data) throws {}
    public func order(_ kind: String, arg: Int) throws -> Bool { false }
    public func orderMine(x: Int, y: Int) -> Bool { false }
    public func bank() -> Bool { false }
    public func missionProgress() throws -> TakeonMissionProgress {
        TakeonMissionProgress(missionId: "", name: "", objectives: [], complete: false)
    }
    public func state() throws -> Data { Data() }
}
