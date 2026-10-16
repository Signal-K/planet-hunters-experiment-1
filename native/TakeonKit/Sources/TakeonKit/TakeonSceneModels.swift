import Foundation

/// Terrain rectangle from the Go runtime (`takeon.WindowView`): row-major, y outer.
/// `heights` is the top voxel z per column (-1 = void), `mats` the top material id.
public struct TakeonTerrainWindow: Codable, Equatable, Sendable {
    public var x: Int, y: Int, w: Int, h: Int, size: Int
    public var heights: [Int]
    public var mats: [Int]
    /// Depth (1...3) below the top voxel of the first ore in the column; 0 = none.
    public var ore: [Int]

    public func oreDepth(_ tx: Int, _ ty: Int) -> Int {
        guard tx >= x, ty >= y, tx < x + w, ty < y + h, ore.count == w * h else { return 0 }
        return ore[(ty - y) * w + (tx - x)]
    }
    public func height(_ tx: Int, _ ty: Int) -> Int {
        guard tx >= x, ty >= y, tx < x + w, ty < y + h else { return -1 }
        return heights[(ty - y) * w + (tx - x)]
    }
    public func material(_ tx: Int, _ ty: Int) -> Int {
        guard tx >= x, ty >= y, tx < x + w, ty < y + h else { return 0 }
        return mats[(ty - y) * w + (tx - x)]
    }
}

/// Go material ids (`data.go`).
public enum TakeonMaterial {
    public static let air = 0, regolith = 1, rock = 2, basalt = 3, ice = 4, ironOre = 5, silica = 6,
        copperOre = 7, titaniumOre = 8, crystal = 9, dust = 10, sulfur = 11, grass = 12, sand = 13, snow = 14
    public static func isOre(_ m: Int) -> Bool { [ironOre, copperOre, titaniumOre, crystal].contains(m) }
}

/// Decoded subset of `MobileEngine.stateJSON()` the renderer and HUD need.
public struct TakeonRenderState: Decodable, Equatable, Sendable {
    public struct Point: Decodable, Equatable, Sendable { public var x: Int, y: Int; public init(x: Int, y: Int) { self.x = x; self.y = y } }
    public struct Mining: Decodable, Equatable, Sendable { public var pos: Point, remaining: Double, total: Double }
    public struct Rover: Decodable, Equatable, Sendable {
        public var pos: Point
        public var moveFrom: Point?
        public var moveT: Double
        public var facing: Int
        public var battery: Double, durability: Double, cargoUsed: Double
        public var mining: Mining?
    }
    public struct Stats: Decodable, Equatable, Sendable {
        public var batteryCapacity: Double, durabilityMax: Double, cargoCapacity: Double, miningEnergy: Double
    }
    public struct Weather: Decodable, Equatable, Sendable { public var type: String, intensity: Double }
    public var time: Double
    public var rover: Rover
    public var status: String
    public var weather: Weather?
    public var landing: Point
    public var stats: Stats
    public var edits: [String: Int]?

    public static func decode(_ data: Data) throws -> TakeonRenderState { try JSONDecoder().decode(Self.self, from: data) }

    /// Rover tile centre while driving (eased between `moveFrom` and `pos`).
    public var roverPosition: (x: Double, y: Double) {
        guard let f = rover.moveFrom else { return (Double(rover.pos.x), Double(rover.pos.y)) }
        let t = max(0, min(1, rover.moveT))
        return (Double(f.x) + Double(rover.pos.x - f.x) * t, Double(f.y) + Double(rover.pos.y - f.y) * t)
    }
    public var nearBase: Bool { abs(rover.pos.x - landing.x) <= 2 && abs(rover.pos.y - landing.y) <= 2 }
}

#if canImport(Takeon)
public func makeDefaultTakeonEngine() -> TakeonEngine { GoTakeonEngine() }
public let takeonGoRuntimeAvailable = true
#else
public func makeDefaultTakeonEngine() -> TakeonEngine { NullTakeonEngine() }
public let takeonGoRuntimeAvailable = false
#endif
