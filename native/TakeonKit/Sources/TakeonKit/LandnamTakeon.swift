@_exported import TakeonCore

// Only Landnam target aliases live here. Simulation, JSON models and bindings
// are supplied by the shared Takeon source package.
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


public func makeDefaultTakeonEngine() -> TakeonEngine {
#if canImport(Takeon)
    return GoTakeonEngine(bodyResolver: { try TakeonBodies.bodyId(for: $0) })
#else
    return NullTakeonEngine()
#endif
}
