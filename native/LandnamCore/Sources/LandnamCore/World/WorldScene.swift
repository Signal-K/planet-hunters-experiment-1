import Foundation

/// `shared/scenes/base-world.json`: every background piece of the base as a game object (SSL-423).
/// Web reads the same file (`web/lib/world/world-sim.ts`).
public struct WorldScene: Decodable, Sendable {
    public struct Physics: Decodable, Sendable {
        public let gravity: Double
        public let fixedStep: Double
        public let groundY: Double
        public let windScale: Double
    }

    public struct SpriteDef: Decodable, Sendable {
        public let src: String
        public let w: Double, h: Double, x0: Double, v0: Double
    }

    public struct BodyDef: Decodable, Sendable {
        public var vx: Double?, vy: Double?, ax: Double?, ay: Double?
        public var gravity: Double?, wind: Double?, drag: Double?
        public var ground: String?
        public var impact: String?
        public var bounce: Double?, life: Double?, grow: Double?
        public var fade: Bool?
        public var pitch: Double?
    }

    public struct Emit: Decodable, Sendable {
        public let prefab: String
        public let every: Double
    }

    public struct EntityDef: Decodable, Sendable {
        public var id: String?
        public var sprite: String?
        public var shape: String?
        public var colour: String?
        public var length: Double?, width: Double?, radius: Double?, alpha: Double?, height: Double?
        public var x: Double?, y: Double?, depth: Double?, layer: Double?, scale: Double?
        public var sky: Bool?
        public var body: BodyDef?
        public var wrap: [Double]?
        public var emit: Emit?

        public init(shape: String, colour: String, layer: Double, depth: Double = 0, sky: Bool = true, alpha: Double? = nil, length: Double? = nil, radius: Double? = nil, height: Double? = nil) {
            self.shape = shape; self.colour = colour; self.layer = layer; self.depth = depth; self.sky = sky
            self.alpha = alpha; self.length = length; self.radius = radius; self.height = height
        }
    }

    public let physics: Physics
    public let sprites: [String: SpriteDef]
    public let entities: [EntityDef]
    /// Each landscape's own horizon, far ground, plants and drifts, added to `entities`.
    public let biomes: [String: [EntityDef]]
    public let prefabs: [String: EntityDef]

    public static func load(_ data: Data) throws -> WorldScene { try JSONDecoder().decode(WorldScene.self, from: data) }
}
