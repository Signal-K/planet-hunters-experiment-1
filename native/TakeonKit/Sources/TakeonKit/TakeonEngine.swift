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
}

/// Placeholder until the Swift port lands; keeps callers compiling.
public final class NullTakeonEngine: TakeonEngine {
    public init() {}
    public func loadWorld(_ seed: TakeonWorldSeed) throws {}
    public func step(dt: TimeInterval) -> [TakeonEvent] { [] }
    public func snapshot() throws -> Data { Data() }
    public func restore(_ snapshot: Data) throws {}
}
