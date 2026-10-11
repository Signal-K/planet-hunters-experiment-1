#if canImport(Takeon)
import Foundation
import Takeon

/// Maps Landnam target ids to Takeon body ids (the Go runtime's generated bodies).
public enum TakeonBodies {
    public static let table: [String: String] = [
        "moon": "moon", "mars": "mars", "europa": "europa", "ceres": "ceres",
        "bennu": "bennu", "io": "io", "terra": "terra", "kepler-rust": "kepler-rust",
        "frostmoon": "frostmoon", "ironrock": "ironrock", "skyhaven": "skyhaven",
        // Landnam aliases
        "mercury": "ironrock", "luna": "moon",
    ]

    public static func bodyId(for targetId: String) throws -> String {
        guard let id = table[targetId.lowercased()] else { throw TakeonEngineError.unknownTarget(targetId) }
        return id
    }
}

/// Go seeds are int64 but the engine mirrors TS 32-bit bit ops, so seeds are
/// reduced to their low 32 bits (TS `seed >>> 0`) before crossing the binding.
public func clampTakeonSeed(_ seed: UInt64) -> Int64 { Int64(seed & 0xFFFF_FFFF) }

/// `TakeonEngine` backed by the Go runtime via gomobile's `MobileEngine`.
/// NOT thread-safe: the Go engine is not goroutine-safe. Use `TakeonEngineActor`
/// to share it across concurrency domains.
public final class GoTakeonEngine: TakeonEngine {
    private var engine: MobileEngine?
    /// Last error from `step`/`orderMine` (their protocol signatures cannot throw).
    public private(set) var lastError: Error?
    /// Raw events from the most recent `step`, including kinds with no `TakeonEvent` mapping.
    public private(set) var lastRawEvents: [TakeonRawEvent] = []

    public init() {}

    public func loadWorld(_ seed: TakeonWorldSeed) throws {
        let body = try TakeonBodies.bodyId(for: seed.targetId)
        let s = clampTakeonSeed(seed.seed)
        do {
            if let e = engine {
                try e.loadWorld(body, seed: s)
            } else {
                var err: NSError?
                guard let e = MobileNewEngine(s, body, &err) else {
                    throw err ?? TakeonEngineError.runtime("MobileNewEngine returned nil")
                }
                engine = e
            }
        } catch let e as TakeonEngineError {
            throw e
        } catch {
            throw TakeonEngineError.runtime(error.localizedDescription)
        }
    }

    /// Go methods that return a non-optional string report failure only through
    /// the NSError out-parameter (Swift cannot auto-throw those).
    private static func call(_ body: (NSErrorPointer) throws -> String) throws -> String {
        var err: NSError?
        let out = try body(&err)
        if let err { throw err }
        return out
    }

    private func loaded() throws -> MobileEngine {
        guard let e = engine else { throw TakeonEngineError.notLoaded }
        return e
    }

    public func step(dt: TimeInterval) -> [TakeonEvent] {
        do {
            let json = try Self.call { try loaded().step(dt, error: $0) }
            lastError = nil
            let raw = try JSONDecoder().decode([TakeonRawEvent].self, from: Data(json.utf8))
            lastRawEvents = raw
            return raw.compactMap(Self.map)
        } catch {
            lastError = error
            lastRawEvents = []
            return []
        }
    }

    static func map(_ e: TakeonRawEvent) -> TakeonEvent? {
        switch e.kind {
        case "depositMined":
            return .depositMined(mineralId: e.detail ?? "", amount: Int((e.amount ?? 0).rounded()))
        case "structureBuilt":
            return .structureBuilt(kind: e.detail ?? "")
        case "missionComplete":
            return .missionObjectiveMet
        default:
            return nil
        }
    }

    public func snapshot() throws -> Data {
        do { return try loaded().snapshot() } catch let e as TakeonEngineError { throw e } catch {
            throw TakeonEngineError.runtime(error.localizedDescription)
        }
    }

    public func restore(_ snapshot: Data) throws {
        do { try loaded().restore(snapshot) } catch let e as TakeonEngineError { throw e } catch {
            throw TakeonEngineError.runtime(error.localizedDescription)
        }
    }

    public func order(_ kind: String, arg: Int) throws -> Bool {
        var ok: ObjCBool = false
        do { try loaded().order(kind, arg: arg, ret0_: &ok) } catch let e as TakeonEngineError { throw e } catch {
            throw TakeonEngineError.runtime(error.localizedDescription)
        }
        return ok.boolValue
    }

    public func orderMine(x: Int, y: Int) -> Bool {
        // Go packs x | y<<16: only 0..65535 coordinates are representable.
        guard let e = engine, (0...0xFFFF).contains(x), (0...0xFFFF).contains(y) else { return false }
        return e.orderMine(x, y: y)
    }

    public func bank() -> Bool { engine?.bank() ?? false }

    public func missionProgress() throws -> TakeonMissionProgress {
        struct Doc: Decodable { var progress: TakeonMissionProgress }
        do {
            let json = try Self.call { try loaded().missionJSON($0) }
            return try JSONDecoder().decode(Doc.self, from: Data(json.utf8)).progress
        } catch let e as TakeonEngineError { throw e } catch {
            throw TakeonEngineError.runtime(error.localizedDescription)
        }
    }

    public func window(x: Int, y: Int, w: Int, h: Int) throws -> TakeonTerrainWindow {
        do {
            let json = try Self.call { try loaded().windowJSON(x, y: y, w: w, h: h, error: $0) }
            return try JSONDecoder().decode(TakeonTerrainWindow.self, from: Data(json.utf8))
        } catch let e as TakeonEngineError { throw e } catch {
            throw TakeonEngineError.runtime(error.localizedDescription)
        }
    }

    public func state() throws -> Data {
        do { return Data(try Self.call { try loaded().stateJSON($0) }.utf8) } catch let e as TakeonEngineError { throw e } catch {
            throw TakeonEngineError.runtime(error.localizedDescription)
        }
    }
}

/// Serialises all access to a `GoTakeonEngine`. Drive it from a 10 Hz timer or
/// per frame with the accumulated dt (the engine accumulates fractional ticks).
public actor TakeonEngineActor {
    private let engine = GoTakeonEngine()

    public init() {}

    public func loadWorld(_ seed: TakeonWorldSeed) throws { try engine.loadWorld(seed) }
    public func step(dt: TimeInterval) -> [TakeonEvent] { engine.step(dt: dt) }
    public func stepRaw(dt: TimeInterval) -> [TakeonRawEvent] { _ = engine.step(dt: dt); return engine.lastRawEvents }
    public func snapshot() throws -> Data { try engine.snapshot() }
    public func restore(_ snapshot: Data) throws { try engine.restore(snapshot) }
    public func order(_ kind: String, arg: Int) throws -> Bool { try engine.order(kind, arg: arg) }
    public func orderMine(x: Int, y: Int) -> Bool { engine.orderMine(x: x, y: y) }
    public func bank() -> Bool { engine.bank() }
    public func missionProgress() throws -> TakeonMissionProgress { try engine.missionProgress() }
    public func state() throws -> Data { try engine.state() }
    public func window(x: Int, y: Int, w: Int, h: Int) throws -> TakeonTerrainWindow { try engine.window(x: x, y: y, w: w, h: h) }
}
#endif
