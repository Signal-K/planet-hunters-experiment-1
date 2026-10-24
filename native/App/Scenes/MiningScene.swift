import SpriteKit
import LandnamCore

/// Side-on ship laser. The ship flies level (nose right, parallel to the ground) and the beam drops from its belly; it stays put; the ground and ore chips scroll under a vertical beam.
/// Rules stay in `MiningField`. A hit is a chip whose wrapped x sits on the beam.
@MainActor
final class MiningScene: SKScene {
    private(set) var field: MiningField
    var onChange: ((MiningField) -> Void)?
    var onFeedback: ((String) -> Void)?
    var onTargetCue: ((String?) -> Void)?
    var onObstacleAhead: ((Bool) -> Void)?
    var reducedMotion = false
    /// Sky-fed fragments: resource and spawn rate per minute. Nil means no rain.
    var fragmentRain: (resourceId: String, perMinute: Double)?
    private var rainAccumulator = 0.0
    /// Bracket on the ground under the ship: fragments landing inside it bank (web catch zone).
    private lazy var catchZone: SKNode = {
        let r = CGFloat(OrionidsRun.catchRadius), n = SKNode()
        let bar = SKShapeNode(rect: CGRect(x: -r, y: -5, width: r * 2, height: 10))
        bar.fillColor = PlatformColor(red: 0.5, green: 0.85, blue: 1, alpha: 0.85); bar.strokeColor = .clear
        n.addChild(bar)
        for x in [-r, r - 3] {
            let tick = SKShapeNode(rect: CGRect(x: x, y: -10, width: 4, height: 34))
            tick.fillColor = PlatformColor(red: 0.75, green: 0.94, blue: 1, alpha: 0.9); tick.strokeColor = .clear
            n.addChild(tick)
        }
        n.zPosition = 29; n.isHidden = true
        world.addChild(n)
        return n
    }()
    private var falling: [(node: SKNode, vy: CGFloat)] = []

    private let palette: LaserPalette.Spec
    private var scrollInput = 0.0
    private var climbInput = 0.0
    private var altitude: CGFloat = 0
    private var bumpCooldown: TimeInterval = 0
    var onBump: (() -> Void)?
    /// True while the laser recharges between shots (drives the gauge sweep).
    var onCharging: ((Bool) -> Void)?
    private var triggerHeld = false
    private var nextShotAt: TimeInterval = 0
    private var wasCharging = false
    private static let fireCooldown: TimeInterval = 0.42
    private var scrollX: CGFloat = 0
    private var clock: TimeInterval = 0
    private var lastTime: TimeInterval?
    private var nodeSprites: [Int: SKNode] = [:]
    private var laneX: [Int: CGFloat] = [:]
    private var labelBaseY: [Int: CGFloat] = [:]
    private var lastTargetCue: String?
    private var lastObstacleAhead: Bool?
    private var track: CGFloat = 800
    private let world = SKNode()
    private var stars: [(node: SKSpriteNode, base: CGFloat, phase: CGFloat)] = []
    private var dust: [(node: SKSpriteNode, x: CGFloat, y: CGFloat, v: CGFloat)] = []
    private var clouds: [(node: SKSpriteNode, x: CGFloat, v: CGFloat)] = []
    private let ground = SKNode()
    private let near = SKNode()
    private let far = SKNode()
    private let mid = SKNode()
    /// Surface deposits: scroll with the ground, sit on the surface line (SSL-538).
    private let surfaceDeposits = SKNode()
    private var midW: CGFloat = 1
    private let landscapeKey: String
    private let beam = SKNode()
    private lazy var spark = sprite("spark-0")
    private let opsBrackets = SKShapeNode()
    var showsOpsBrackets = false
    private let px: CGFloat = 2
    private lazy var flameFrames = (0..<2).map { SK.texture("laser/flame-\($0).png") }
    private var ridgeTile: CGFloat { 128 * px }
    private var groundSpan: CGFloat = 1
    private let ship = SKNode()
    private let hull = SKNode()
    private var flashUntil: TimeInterval = 0

    init(field: MiningField, size: CGSize, palette: LaserPalette.Spec = LaserPalette.bennu, landscapeKey: String? = nil) {
        self.field = field
        self.palette = palette
        self.landscapeKey = landscapeKey ?? palette.id
        super.init(size: size)
        scaleMode = .resizeFill
        backgroundColor = LaserPalette.sk(palette.skyTop)
    }
    required init?(coder: NSCoder) { fatalError() }

    private var baseBeamX: CGFloat { min(96, max(72, size.width * 0.18)) }
    /// d-pad left/right slides the ship (and its beam) along the sky; the ground keeps scrolling at its own pace.
    private var shipShift: CGFloat = 0
    private var steerInput = 0.0
    private var maxShift: CGFloat { max(0, min(260, size.width * 0.34)) }
    private var beamX: CGFloat { baseBeamX + shipShift }
    /// Ship centre limits: under the top HUD row, and a belly's clearance above the ground, so up and down always have room (phones included).
    private var ceilingCenterY: CGFloat { size.height - 64 }
    private var floorCenterY: CGFloat { surfaceY + 34 }
    private var didSeedAltitude = false
    /// Ground is the bottom third (min 150pt) so there is sky to fly in (SSL-536).
    /// Ground line. Phones keep a clear control strip under the deposits so the d-pad and gauge never cover them (SSL-538).
    private var surfaceY: CGFloat {
        if size.height > size.width { return max(330, size.height * 0.33) }
        return max(size.height < 520 ? 215 : 150, size.height * 0.33)
    }
    private var shipY: CGFloat { min(size.height * 0.72, surfaceY + min(210, size.height * 0.28)) }

    override func didMove(to view: SKView) {
        removeAllChildren()
        world.removeAllChildren()
        nodeSprites = [:]
        laneX = [:]
        labelBaseY = [:]
        stars = []
        dust = []
        clouds = []
        addChild(world)
        if !didSeedAltitude {
            didSeedAltitude = true
            altitude = (floorCenterY + ceilingCenterY) / 2 - shipY
        }
        buildSky()
        buildGround()
        buildChips()
        buildShip()
        buildBeam()
    }

    override func didChangeSize(_ oldSize: CGSize) {
        guard view != nil, oldSize != size, oldSize != .zero else { return }
        didMove(to: view!)
    }


    // MARK: pixel art

    private func pixelTexture(width: Int, height: Int, _ pixel: (Int, Int) -> UInt32?) -> SKTexture {
        var data = [UInt8](repeating: 0, count: width * height * 4)
        for y in 0..<height {
            for x in 0..<width {
                guard let c = pixel(x, y) else { continue }
                let i = (y * width + x) * 4
                data[i] = UInt8((c >> 16) & 255); data[i + 1] = UInt8((c >> 8) & 255); data[i + 2] = UInt8(c & 255); data[i + 3] = 255
            }
        }
        let cg = CGDataProvider(data: Data(data) as CFData).flatMap {
            CGImage(width: width, height: height, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(),
                    bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue), provider: $0, decode: nil, shouldInterpolate: false, intent: .defaultIntent)
        }
        let tex = cg.map { SKTexture(cgImage: $0) } ?? SKTexture()
        tex.filteringMode = .nearest
        return tex
    }

    /// Deterministic hash noise in 0..<1.
    private func hash(_ a: Int, _ b: Int, _ seed: Int) -> CGFloat {
        var h = UInt64(truncatingIfNeeded: a &* 374761393 &+ b &* 668265263 &+ seed &* 2246822519)
        h = (h ^ (h >> 13)) &* 1274126177
        h ^= h >> 16
        return CGFloat(h % 10007) / 10007
    }

    /// Smooth 1D noise that wraps at `period` cells, so the strip joins its own copy without a seam.
    private func wrapNoise(_ x: CGFloat, cell: CGFloat, period: Int, seed: Int) -> CGFloat {
        let u = x / cell
        let i = Int(u.rounded(.down))
        let f = u - CGFloat(i)
        let t = f * f * (3 - 2 * f)
        let a = hash(((i % period) + period) % period, 0, seed), b = hash((((i + 1) % period) + period) % period, 0, seed)
        return a + (b - a) * t
    }

    private func strataTexture() -> SKTexture {
        let cell = 24
        let cells = max(8, Int((size.width * 3 / px) / CGFloat(cell)))
        let w = cells * cell
        let h = Int((surfaceY / px).rounded(.up)) + 2
        let seed = palette.id.unicodeScalars.reduce(7) { ($0 &* 31 &+ Int($1.value)) & 0xFFFF }
        // Layer boundaries: uneven thicknesses, each with its own wavy edge.
        var tops: [CGFloat] = [], cursor: CGFloat = 5
        var k = 0
        while cursor < CGFloat(h) + 20 {
            tops.append(cursor)
            cursor += 9 + hash(k, 1, seed) * 26
            k += 1
        }
        let waves = tops.indices.map { (amp: 2 + hash($0, 2, seed) * 6, cellW: CGFloat(14 + Int(hash($0, 3, seed) * 40))) }
        let periods = waves.map { max(2, Int((CGFloat(w) / $0.cellW).rounded())) }
        func edge(_ layer: Int, _ x: Int) -> CGFloat {
            let p = periods[layer]
            return tops[layer] + wrapNoise(CGFloat(x), cell: CGFloat(w) / CGFloat(p), period: p, seed: seed + layer * 7) * waves[layer].amp
        }
        var cols: [[CGFloat]] = (0..<tops.count).map { l in (0..<w).map { edge(l, $0) } }
        for l in 1..<max(cols.count, 1) { for x in 0..<w { cols[l][x] = max(cols[l][x], cols[l - 1][x] + 3) } }   // layers never invert
        let tone = tops.indices.map { hash($0, 4, seed) - 0.5 }
        let topP = max(2, w / 18)
        return pixelTexture(width: w, height: h) { x, y in
            // Uneven crust: slow swells plus a ragged 3-column jitter, so the surface is never a ruler edge.
            let rim = 1 + wrapNoise(CGFloat(x), cell: CGFloat(w) / CGFloat(topP), period: topP, seed: seed + 91) * 8 + hash(x / 3, 5, seed) * 3
            let fy = CGFloat(y)
            if fy < rim { return nil }
            var layer = 0
            for l in cols.indices where cols[l][x] <= fy { layer = l }
            let depth = min(1, fy / CGFloat(h))
            var c = LaserPalette.mix(palette.ground, palette.groundDeep, depth * 0.85 + tone[layer] * 0.8)
            if fy < rim + 3 { return LaserPalette.mix(c, palette.groundSpeck, 0.55) }          // crust lip
            let into = fy - cols[layer][x]
            if into < 1 { c = LaserPalette.mix(c, palette.groundSpeck, 0.3) }                  // lit upper edge
            else if into >= 1, layer + 1 < cols.count, cols[layer + 1][x] - fy < 1.5 { c = LaserPalette.mix(c, palette.groundDeep, 0.5) }   // shadowed lower edge
            let n = hash(x, y, seed)
            if n < 0.03 { c = LaserPalette.mix(c, palette.groundDeep, 0.45) }
            else if n > 0.975 { c = LaserPalette.mix(c, palette.groundSpeck, 0.4) }
            // Embedded rock fragments and cracks, scattered irregularly (cell hash, not a grid pattern).
            let gx = x / 17, gy = y / 13
            if hash(gx, gy, seed + 5) > 0.72 {
                let cx = gx * 17 + 3 + Int(hash(gx, gy, seed + 6) * 10), cy = gy * 13 + 3 + Int(hash(gx, gy, seed + 8) * 6)
                let rx = 2 + Int(hash(gx, gy, seed + 9) * 3), ry = 1 + Int(hash(gx, gy, seed + 10) * 2)
                let dx = CGFloat(x - cx) / CGFloat(rx), dy = CGFloat(y - cy) / CGFloat(ry)
                if dx * dx + dy * dy < 1 { return LaserPalette.mix(c, palette.groundSpeck, dy < 0 ? 0.35 : -0.0 + 0.1) }
            }
            if hash(gx, gy, seed + 12) > 0.86 {
                let x0 = gx * 17 + 2, y0 = gy * 13 + 2
                if x - x0 >= 0, x - x0 < 8, y - y0 == (x - x0) / 2 { return LaserPalette.mix(c, palette.groundDeep, 0.65) }
            }
            return c
        }
    }

    /// Ore deposit: a dark pocket in the rock holding a cluster of faceted crystals in the mineral's colour.
    private func depositTexture(colorHex: String, variant: Int, glint: Bool) -> SKTexture {
        let base = UInt32(colorHex.dropFirst(), radix: 16) ?? 0xCCCCCC
        let lit = LaserPalette.mix(base, 0xFFFFFF, 0.5), dark = LaserPalette.mix(base, 0x10151C, 0.45)
        let pocket = LaserPalette.mix(palette.groundDeep, 0x10151C, 0.5), rim = LaserPalette.mix(palette.groundDeep, 0x10151C, 0.25)
        let w = 24, h = 18
        // Crystal columns: (x, base y, width, height) per variant, chosen so each deposit reads differently.
        let sets: [[(Int, Int, Int, Int)]] = [
            [(5, 15, 5, 9), (10, 15, 5, 12), (15, 15, 4, 7)],
            [(4, 15, 4, 6), (8, 15, 6, 11), (14, 15, 5, 8), (18, 15, 3, 5)],
            [(6, 15, 4, 8), (11, 15, 4, 13), (16, 15, 4, 6)],
        ]
        let crystals = sets[variant % sets.count]
        return pixelTexture(width: w, height: h) { x, y in
            let dx = CGFloat(x) - 11.5, dy = CGFloat(y) - 9.5
            let inPocket = (dx * dx) / 132 + (dy * dy) / 62 < 1
            for (cx, by, cw, ch) in crystals {
                let top = by - ch
                guard x >= cx, x < cx + cw, y <= by, y >= top else { continue }
                let tip = y - top < 2 && (x == cx || x == cx + cw - 1)
                if tip { break }
                if glint && x == cx + 1 && y == top + 2 { return 0xFFFFFF }
                if x == cx || y == top { return lit }
                if x == cx + cw - 1 || y == by { return dark }
                return base
            }
            if !inPocket { return nil }
            return (dx * dx) / 132 + (dy * dy) / 62 > 0.72 ? rim : pocket
        }
    }

    // MARK: layers

    /// Pixel sprite from the laser kit (`Art/laser`), nearest-filtered. Parts authored in neutral grey take their world colour here.
    private func sprite(_ name: String, tint: UInt32? = nil, alpha: CGFloat = 1, blend: CGFloat = 1) -> SKSpriteNode {
        let node = SKSpriteNode(texture: SK.texture("laser/\(name).png"))
        node.size = CGSize(width: node.texture?.size().width ?? 0, height: node.texture?.size().height ?? 0)
        node.setScale(px)
        if let tint { node.color = LaserPalette.sk(tint); node.colorBlendFactor = blend }
        node.alpha = alpha
        return node
    }

    private func buildSky() {
        let sky = SKSpriteNode(texture: SK.gradient(top: LaserPalette.color(palette.skyTop), bottom: LaserPalette.color(palette.skyHorizon)))
        sky.size = size
        sky.position = CGPoint(x: size.width / 2, y: size.height / 2)
        sky.zPosition = -20
        world.addChild(sky)

        // Dithered bands across the gradient, each lighter than the sky behind it, so the sky reads as pixel steps.
        let bandH = 4 * px
        let zones = 6
        for z in 0..<zones {
            let t = (CGFloat(z) + 0.5) / CGFloat(zones)
            let bandY = surfaceY + (size.height - surfaceY) * (1 - t)
            let mix = LaserPalette.mix(palette.skyTop, palette.skyHorizon, 1 - t + 0.12)
            let level = min(2, z / 2)
            for c in 0..<Int((size.width / (16 * px)).rounded(.up)) {
                let strip = sprite("sky-dither-\(level)", tint: mix, alpha: 0.4)
                strip.anchorPoint = .zero
                strip.position = CGPoint(x: CGFloat(c) * 16 * px, y: bandY - bandH / 2)
                strip.zPosition = -19
                world.addChild(strip)
            }
        }

        if palette.starAlpha > 0 {
            for i in 0..<64 {
                let star = sprite("star", tint: 0xFFFFFF)
                if i % 9 != 0 { star.setScale(px / 2) }
                star.alpha = palette.starAlpha
                star.position = CGPoint(x: CGFloat((i * 97) % Int(max(size.width, 1))), y: size.height * (0.42 + CGFloat((i * 53) % 50) / 100))
                star.zPosition = -16
                world.addChild(star)
                stars.append((star, palette.starAlpha * (0.45 + CGFloat(i % 5) * 0.12), CGFloat(i)))
            }
        }

        if let planet = palette.planet {
            // Soft and whole in the sky: capped by the sky band, not the screen width (SSL-538).
            let sky = max(80, size.height - surfaceY)
            let radius = min(96, min(size.width, sky) * planet.radius * 0.65)
            let scale = max(1, (radius * 2 / 48).rounded())
            let halo = SKSpriteNode(texture: SK.texture("laser/disc-48.png"))
            halo.setScale(scale * 1.12)
            halo.color = LaserPalette.sk(planet.bands.first ?? 0x9FB7D0)
            halo.colorBlendFactor = 1
            halo.alpha = 0.16
            halo.position = CGPoint(x: size.width * planet.cx, y: size.height * (1 - planet.cy))
            halo.zPosition = -16
            world.addChild(halo)
            let crop = SKCropNode()
            let mask = SKSpriteNode(texture: SK.texture("laser/disc-48.png"))
            mask.setScale(scale)
            crop.maskNode = mask
            let bandH = (48 * scale) / CGFloat(max(planet.bands.count, 1))
            for (i, band) in planet.bands.enumerated() {
                let strip = SKSpriteNode(color: LaserPalette.sk(band), size: CGSize(width: 48 * scale, height: bandH + 1))
                strip.position = CGPoint(x: 0, y: 24 * scale - bandH * (CGFloat(i) + 0.5))
                crop.addChild(strip)
            }
            crop.position = CGPoint(x: size.width * planet.cx, y: size.height * (1 - planet.cy))
            crop.zPosition = -15
            crop.alpha = 0.9
            world.addChild(crop)
        }

        if palette.lightAlpha > 0 {
            let sun = sprite("disc-24", tint: palette.light, alpha: palette.lightAlpha)
            sun.position = CGPoint(x: size.width * 0.62, y: surfaceY + size.height * 0.22)
            sun.zPosition = -14
            world.addChild(sun)
        }

        if palette.clouds {
            for i in 0..<4 {
                let cloud = SKSpriteNode(texture: SK.texture("base/layers/cloud.png"))
                cloud.size = CGSize(width: 48, height: 18)
                cloud.setScale(px + CGFloat(i % 2))
                cloud.alpha = 0.7
                cloud.position = CGPoint(x: size.width * CGFloat(i) / 4, y: surfaceY + 90 + CGFloat(i * 12))
                cloud.zPosition = -12
                world.addChild(cloud)
                clouds.append((cloud, cloud.position.x, 8 + CGFloat(i) * 3))
            }
        }

        for i in 0..<18 {
            let mote = sprite("mote", tint: palette.dust, alpha: 0.6)
            mote.zPosition = 4
            let x = CGFloat((i * 113) % Int(max(size.width, 1)))
            let y = surfaceY * 0.4 + CGFloat((i * 29) % Int(max(surfaceY, 1)))
            mote.position = CGPoint(x: x, y: y)
            world.addChild(mote)
            dust.append((mote, x, y, 10 + CGFloat(i % 5) * 6))
        }
    }

    private func buildGround() {
        // ridge-ice carries snow pines; barren bodies get no plants, so ice reuses the rubble ridge (SSL-536).
        let ridgeName = palette.terrain == "dunes" ? "ridge-dunes" : "ridge-rubble"
        let copies = Int((size.width / ridgeTile).rounded(.up)) + 2
        far.removeAllChildren(); mid.removeAllChildren(); surfaceDeposits.removeAllChildren(); near.removeAllChildren(); ground.removeAllChildren()   // a resize rebuilds the scene; drop the old layers
        far.zPosition = -8
        near.zPosition = -6
        ground.zPosition = 1
        for copy in 0..<copies {
            let farCopy = sprite(ridgeName, tint: palette.distant)
            farCopy.anchorPoint = CGPoint(x: 0, y: 0)
            farCopy.position = CGPoint(x: CGFloat(copy) * ridgeTile, y: surfaceY - 8)
            far.addChild(farCopy)
            let nearCopy = sprite(ridgeName, tint: palette.nearRidge)
            nearCopy.anchorPoint = CGPoint(x: 0, y: 0)
            nearCopy.xScale = -px
            nearCopy.position = CGPoint(x: CGFloat(copy + 1) * ridgeTile, y: surfaceY - 2 - 8 * px)
            near.addChild(nearCopy)
        }
        // One wide, seeded strata strip (three screens across) so no band repeats on screen; two copies wrap the scroll.
        let strip = strataTexture()
        groundSpan = strip.size().width * px
        for copy in 0..<2 {
            let slab = SKSpriteNode(texture: strip)
            slab.size = strip.size()
            slab.setScale(px)
            slab.anchorPoint = CGPoint(x: 0, y: 1)
            slab.position = CGPoint(x: CGFloat(copy) * groundSpan, y: surfaceY)
            ground.addChild(slab)
        }
        buildLandscape()
        world.addChild(far)
        world.addChild(mid)
        surfaceDeposits.zPosition = 2
        surfaceDeposits.alpha = 0.3   // scenery: dimmed so only the labelled seams read as targets
        world.addChild(surfaceDeposits)
        world.addChild(near)
        world.addChild(ground)
    }

    private var obstacles: [(x: CGFloat, halfW: CGFloat, height: CGFloat, kind: String)] = []

    /// Landscape height above the surface at a screen x (0 when clear). Mirrors web `obstacleHeightAt`.
    private func obstacleHeight(_ x: CGFloat) -> CGFloat {
        let local = x - mid.position.x
        var best: CGFloat = 0
        for o in obstacles {
            for shift in [-midW, 0, midW] {
                let dx = abs(local - (o.x + shift))
                guard dx < o.halfW else { continue }
                let t = dx / o.halfW
                let h: CGFloat = o.kind == "mountain" ? o.height * (1 - t) : o.kind == "ridge" ? o.height * (1 - t * t) : (t < 0.85 ? o.height : 0)
                best = max(best, h)
            }
        }
        return best
    }

    /// Seeded terrain pieces and surface deposits, tinted per world, between the far and near ridges (SSL-536).
    private func buildLandscape() {
        let layout = Landscape.layout(palette.landscape, key: landscapeKey)
        midW = CGFloat(layout.period) * px
        // Short (phone landscape) skies get lower terrain so the ship can clear it under the HUD.
        var ts: CGFloat = size.height < 520 ? 0.6 : 1
        // Every obstacle must be climbable: its top stays a ship-length under the ceiling.
        let rawMax = layout.pieces.map { p in (Landscape.pieceHeight[p.kind] ?? 48) * px * CGFloat(p.scale) * 0.92 }.max() ?? 1
        let climbable = max(24, ceilingCenterY - 14 - surfaceY - 14 - 18)
        ts = min(ts, climbable / max(1, rawMax))
        obstacles = layout.pieces.map { p in
            let h = Landscape.pieceHeight[p.kind] ?? 48
            return (CGFloat(p.x) * px, 64 * px * CGFloat(p.scale) * ts * 0.9, (h * px * CGFloat(p.scale) * 0.92 - h * 0.04 * px - 4) * ts, p.kind)
        }
        mid.zPosition = -7
        let copies = Int((size.width / midW).rounded(.up)) + 1
        for c in 0..<copies {
            for p in layout.pieces {
                guard let tex = SK.texture("mining/terrain_\(p.kind).png") else { continue }
                let node = SKSpriteNode(texture: tex)
                node.size = tex.size()
                node.anchorPoint = CGPoint(x: 0.5, y: 0)
                node.xScale = px * CGFloat(p.scale) * ts * (p.flip ? -1 : 1)
                node.yScale = px * CGFloat(p.scale) * ts
                node.position = CGPoint(x: CGFloat(c) * midW + CGFloat(p.x) * px, y: surfaceY - 4 - (Landscape.pieceHeight[p.kind] ?? 48) * 0.04 * px)
                node.color = LaserPalette.sk(Self.legible(layout.tint))
                node.colorBlendFactor = max(CGFloat(layout.shade), 0.55)
                mid.addChild(node)
            }
            for d in layout.deposits {
                guard let tex = SK.texture("mining/deposit_\(d.kind).png") else { continue }
                tex.filteringMode = .nearest
                let node = SKSpriteNode(texture: tex)
                node.size = tex.size()
                node.anchorPoint = CGPoint(x: 0.5, y: 0)
                node.setScale(px)   // terrain pixel scale, nearest-neighbour
                // Anchored on the ground surface, about a third embedded; never on the ridges.
                let x = CGFloat(c) * midW + CGFloat(d.x) * px
                node.position = CGPoint(x: x, y: surfaceY - (tex.size().height * 0.35).rounded() * px)
                surfaceDeposits.addChild(node)
            }
        }
    }

    /// Obstacles must read against a dark sky: lift near-black tints toward a pale stone so the silhouette shows.
    private static func legible(_ hex: UInt32) -> UInt32 {
        let r = Double((hex >> 16) & 255), g = Double((hex >> 8) & 255), b = Double(hex & 255)
        let lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
        guard lum < 0.5 else { return hex }
        let k = 0.55 * (0.5 - lum) / 0.5 + 0.2
        func mix(_ c: Double, _ t: Double) -> UInt32 { UInt32(max(0, min(255, c + (t - c) * k))) }
        return (mix(r, 150) << 16) | (mix(g, 160) << 8) | mix(b, 175)
    }

    /// Deposits sit buried in the soil under the beam line, far apart so one pass shows one or two.
    private func buildChips() {
        let live = field.nodes.filter { !$0.isDepleted }.sorted { ($0.x + $0.y) < ($1.x + $1.y) }
        // Sparse during the shower run so labelled ore does not crowd the falling fragments (web depositGap).
        let spacing: CGFloat = fragmentRain == nil ? 280 : 640
        track = max(size.width + spacing, CGFloat(live.count) * spacing)
        for (i, n) in live.enumerated() {
            let hex = Minerals.byId[n.mineralId]?.colorHex ?? "#C8CCD2"
            let kind = Landscape.depositKind(for: n.mineralId)
            let art = SK.texture("mining/deposit_\(kind).png")
            let a = art ?? depositTexture(colorHex: hex, variant: n.id, glint: false)
            let chip = SKSpriteNode(texture: a)
            a.filteringMode = .nearest
            chip.size = a.size()
            chip.setScale(px * 0.7)   // compact seam markers; labels remain at full size
            let tag = Self.depositTag("\(Minerals.byId[n.mineralId]?.name ?? n.mineralId) · \(Minerals.byId[n.mineralId]?.symbol ?? "") ×1")
            tag.setScale(1 / px)
            tag.name = "ore-label"
            // Keep names above the ore, away from phone controls below the terrain.
            let labelRise = CGFloat(96) / px
            tag.position = CGPoint(x: 0, y: a.size().height * 0.35 + labelRise)
            labelBaseY[n.id] = tag.position.y
            chip.addChild(tag)
            if art == nil {
                let b = depositTexture(colorHex: hex, variant: n.id, glint: true)
                chip.run(.repeatForever(.animate(with: [a, a, a, b], timePerFrame: 0.5 + Double(n.id % 3) * 0.12)))
            }
            chip.zPosition = 10
            chip.name = "ore-\(n.id)"
            world.addChild(chip)
            nodeSprites[n.id] = chip
            laneX[n.id] = beamX + 160 + CGFloat(i) * spacing
        }
        placeChips()
    }

    /// Slim cream-and-blue rocket, nose up, built from shapes so it stays upright and crisp at any scale.
    private func buildShip() {
        ship.removeAllChildren()
        hull.removeAllChildren()
        hull.zRotation = -.pi / 2   // nose right, flying parallel to the ground; plume trails left
        ship.addChild(hull)
        ship.position = CGPoint(x: beamX, y: shipY)
        ship.zPosition = 20
        let outline = LaserPalette.sk(0x16293B)
        let cream = LaserPalette.sk(0xECE8DF)
        let blue = LaserPalette.sk(0x2F6FA8)
        func part(_ path: CGPath, _ fill: PlatformColor, z: CGFloat) {
            let n = SKShapeNode(path: path)
            n.fillColor = fill
            n.strokeColor = outline
            n.lineWidth = 2
            n.lineJoin = .round
            n.zPosition = z
            hull.addChild(n)
        }
        func poly(_ pts: [(CGFloat, CGFloat)]) -> CGPath {
            let p = CGMutablePath()
            p.move(to: CGPoint(x: pts[0].0, y: pts[0].1))
            for q in pts.dropFirst() { p.addLine(to: CGPoint(x: q.0, y: q.1)) }
            p.closeSubpath()
            return p
        }
        // Local origin sits mid-hull; beam leaves from the nozzle at y = -22.
        let plume = SKSpriteNode(texture: flameFrames[0])
        plume.name = "plume"
        plume.anchorPoint = CGPoint(x: 1, y: 0.5)
        plume.zRotation = .pi / 2
        plume.setScale(px)
        plume.position = CGPoint(x: 0, y: -24)
        plume.zPosition = -1
        hull.addChild(plume)
        part(poly([(-9, -8), (-19, -22), (-9, -18)]), blue, z: 0)
        part(poly([(9, -8), (19, -22), (9, -18)]), blue, z: 0)
        part(poly([(-6, -20), (6, -20), (4, -26), (-4, -26)]), LaserPalette.sk(0x4B4F57), z: 0)
        part(poly([(-9, -20), (9, -20), (9, 12), (-9, 12)]), cream, z: 1)
        part(poly([(-9, 12), (9, 12), (5, 24), (0, 32), (-5, 24)]), blue, z: 1)
        part(poly([(-9, -12), (9, -12), (9, -7), (-9, -7)]), blue, z: 2)
        let win = SKShapeNode(circleOfRadius: 4)
        win.fillColor = LaserPalette.sk(0x9FD6E4)
        win.strokeColor = outline
        win.lineWidth = 2
        win.position = CGPoint(x: 0, y: 3)
        win.zPosition = 3
        hull.addChild(win)
        // Laser cannon on the belly: the beam leaves from here, straight down.
        let gun = SKShapeNode(path: poly([(-4, -17), (4, -17), (3, -24), (-3, -24)]))
        gun.fillColor = LaserPalette.sk(0x4B4F57)
        gun.strokeColor = outline
        gun.lineWidth = 2
        gun.zPosition = 4
        ship.addChild(gun)
        world.addChild(ship)
    }

    private func buildBeam() {
        let h = max(24, shipY - 26 - surfaceY + 3)
        beam.removeAllChildren()
        for k in 0..<Int((h / (8 * px)).rounded(.up)) {
            let seg = sprite("beam")
            seg.anchorPoint = CGPoint(x: 0.5, y: 1)
            seg.position = CGPoint(x: 0, y: -CGFloat(k) * 8 * px)
            beam.addChild(seg)
        }
        beam.position = CGPoint(x: beamX, y: shipY - 24)
        beam.zPosition = 18
        world.addChild(beam)
        spark.position = CGPoint(x: beamX, y: surfaceY)
        spark.zPosition = 19
        world.addChild(spark)
        opsBrackets.removeFromParent()
        guard showsOpsBrackets else { return }
        let rect = CGRect(x: beamX - 30, y: surfaceY - 22, width: 60, height: 44)
        let corner: CGFloat = 12
        let path = CGMutablePath()
        path.move(to: CGPoint(x: rect.minX, y: rect.minY + corner)); path.addLine(to: CGPoint(x: rect.minX, y: rect.minY)); path.addLine(to: CGPoint(x: rect.minX + corner, y: rect.minY))
        path.move(to: CGPoint(x: rect.maxX - corner, y: rect.minY)); path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY)); path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY + corner))
        path.move(to: CGPoint(x: rect.minX, y: rect.maxY - corner)); path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY)); path.addLine(to: CGPoint(x: rect.minX + corner, y: rect.maxY))
        path.move(to: CGPoint(x: rect.maxX - corner, y: rect.maxY)); path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY)); path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - corner))
        opsBrackets.path = path
        opsBrackets.strokeColor = LaserPalette.sk(palette.beamCore)
        opsBrackets.lineWidth = 3
        opsBrackets.lineCap = .square
        opsBrackets.fillColor = .clear
        opsBrackets.zPosition = 21
        addChild(opsBrackets)
    }

    // MARK: play

    func setScroll(_ input: Double) { scrollInput = max(-1, min(1, input)) }
    /// d-pad / keys: -1 left, 0 hold, 1 right. Moves the ship; it never changes ground speed.
    func setSteer(_ input: Double) { steerInput = max(-1, min(1, input)) }
    /// d-pad / keys: -1 climb, 0 hold, 1 descend. The ship stays level.
    func setClimb(_ input: Double) { climbInput = max(-1, min(1, input)) }
    var isFiring: Bool { clock < flashUntil }
    /// Press-and-hold trigger: fires on press, then again each time the laser recharges, until release.
    func setTrigger(_ held: Bool) { triggerHeld = held }

    /// Dock arrows: a short burst of faster or slower scroll.
    func nudge(_ dir: Double) {
        setScroll(dir)
        run(.sequence([.wait(forDuration: 0.5), .run { [weak self] in self?.setScroll(0) }]), withKey: "nudge")
    }

    /// Drop cargo overboard so a wrong pick-up never leaves the hold stuck full. `all` empties that mineral.
    func jettison(_ mineralId: String, all: Bool = false) {
        guard field.jettison(mineralId, all: all) > 0 else { return }
        onFeedback?("Jettisoned \(Minerals.byId[mineralId]?.name ?? mineralId)")
        onChange?(field)
    }

    func refill() {
        field.recharge(field.chargeCap)
        onChange?(field)
    }

    func fireLaser() { fire(at: CGPoint(x: beamX, y: surfaceY)) }

    func fire(at _: CGPoint) {
        let hit = nodeSprites.min { abs($0.value.position.x - beamX) < abs($1.value.position.x - beamX) }.flatMap { abs($0.value.position.x - beamX) < 56 ? $0 : nil }
        let outcome = field.strike(nodeId: hit?.key)
        flashBeam(hit: {
            switch outcome {
            case .hit, .mined: return true
            default: return false
            }
        }())
        switch outcome {
        case .noCharge: onFeedback?("Laser empty")
        case .cargoFull: onFeedback?("Cargo hold full")
        case .tooHard(let tier): onFeedback?("Needs a tier \(tier) laser")
        case .outOfRange: onFeedback?("Not on the beam")
        case .miss: onFeedback?("Miss")
        case .hit(let id, _): if let sp = nodeSprites[id] { crack(sp); hitFeedback(sp) }
        case .mined(let id, let mineral):
            if let sp = nodeSprites[id] { hitFeedback(sp); pop(sp, id: id, mineral: mineral) }
        }
        onChange?(field)
    }

    private func flashBeam(hit: Bool) {
        flashUntil = clock + 0.18
        beam.alpha = 1
        beam.xScale = hit ? 1.5 : 1
        spark.setScale(px * (hit ? 1.5 : 1))
        if hit { SK.burst(at: spark.position, color: LaserPalette.sk(palette.beam), count: 6, speed: 50, in: world) }
    }

    /// Hit feedback: impact sparks, a brief deposit flash, a subtle screen pulse, and a light haptic on iOS.
    private func hitFeedback(_ sp: SKNode) {
        SK.burst(at: sp.position, color: LaserPalette.sk(palette.beamCore), count: 8, speed: 70, in: world)
        if let s = sp as? SKSpriteNode {
            s.color = .white
            s.run(.sequence([.colorize(withColorBlendFactor: 0.6, duration: 0.03), .colorize(withColorBlendFactor: 0, duration: 0.14)]))
        }
        if !reducedMotion {
            world.run(.sequence([.scale(to: 1.01, duration: 0.05), .scale(to: 1, duration: 0.12)]), withKey: "pulse")
        }
        #if os(iOS)
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        #endif
    }

    /// Readable cream-on-navy label pill (mineral name + amount). No orange.
    static func depositTag(_ text: String) -> SKNode {
        let label = SKLabelNode(text: text)
        label.fontName = "Oxanium-SemiBold"
        label.fontSize = 14
        label.fontColor = LaserPalette.sk(0xF4F1EA)
        label.verticalAlignmentMode = .center
        let w = label.frame.width + 14
        let pill = SKShapeNode(rectOf: CGSize(width: w, height: 24), cornerRadius: 12)
        pill.userData = NSMutableDictionary()
        pill.userData?["labelWidth"] = NSNumber(value: Double(w))
        pill.fillColor = LaserPalette.sk(0x1A2A3C, 0.82)
        pill.strokeColor = LaserPalette.sk(0x9FB7D0, 0.5)
        pill.lineWidth = 1
        pill.addChild(label)
        pill.zPosition = 30
        return pill
    }

    /// Keep the requested mineral's timing legible without requiring the player to infer the beam window.
    private func updateTargetCue() {
        let needed = field.nodes.filter { !$0.isDepleted && field.required[$0.mineralId, default: 0] > field.cargo[$0.mineralId, default: 0] }
        let candidates = needed.isEmpty ? field.nodes.filter { !$0.isDepleted } : needed
        let nearest = candidates.compactMap { node -> (String, CGFloat)? in
            guard let sprite = nodeSprites[node.id] else { return nil }
            return (node.mineralId, abs(sprite.position.x - beamX))
        }.min { $0.1 < $1.1 }
        let cue: String?
        if let (mineralId, distance) = nearest {
            let name = Minerals.byId[mineralId]?.name ?? mineralId.capitalized
            cue = distance < 56 ? "\(name.uppercased()) · FIRE NOW" : "\(name.uppercased()) · WAIT"
        } else {
            cue = nil
        }
        guard cue != lastTargetCue else { return }
        lastTargetCue = cue
        onTargetCue?(cue)
    }

    private func crack(_ sp: SKNode) {
        sp.run(.sequence([.scale(to: 0.86, duration: 0.05), .scale(to: 1, duration: 0.1)]))
    }

    private func pop(_ sp: SKNode, id: Int, mineral: String) {
        nodeSprites[id] = nil
        laneX[id] = nil
        labelBaseY[id] = nil
        SK.burst(at: sp.position, color: LaserPalette.sk(palette.beamCore), count: 10, speed: 80, in: world)
        sp.run(.sequence([.group([.scale(to: 1.4, duration: 0.12), .fadeOut(withDuration: 0.12)]), .removeFromParent()]))
        let tag = SKLabelNode(text: "+1 \(Minerals.byId[mineral]?.symbol ?? "")")
        tag.fontName = "Oxanium-ExtraBold"
        tag.fontSize = 14
        tag.fontColor = LaserPalette.sk(palette.beamCore)
        tag.position = CGPoint(x: sp.position.x, y: sp.position.y + 24)
        tag.zPosition = 40
        world.addChild(tag)
        tag.run(.sequence([.group([.moveBy(x: 0, y: 28, duration: 0.6), .fadeOut(withDuration: 0.6)]), .removeFromParent()]))
    }

    /// Fragments fall with the shower, drift with the ground, and bank themselves on touching the surface.
    private func updateRain(dt: TimeInterval, dx: CGFloat) {
        catchZone.isHidden = fragmentRain == nil
        catchZone.position = CGPoint(x: beamX, y: surfaceY)
        guard let rain = fragmentRain else { return }
        rainAccumulator += rain.perMinute / 60 * dt
        if falling.count == 0 && rainAccumulator < 1 && clock < 1 { rainAccumulator = 1 }   // first fragment shows up straight away
        while rainAccumulator >= 1 {
            rainAccumulator -= 1
            guard falling.count < 3 else { continue }   // web MAX_RAIN
            let hex = Minerals.byId[rain.resourceId]?.colorHex ?? "#7fd8ff"
            let node = SKSpriteNode(texture: depositTexture(colorHex: hex, variant: falling.count, glint: true))
            node.setScale(px * 0.7)   // web draws shower fragments at 0.45
            node.texture?.filteringMode = .nearest
            node.zPosition = 30
            // Aim near the ship, shifted by the ground scroll during the fall, spread wide so the player has to weave.
            let fallTime = (size.height + 20 - surfaceY) / 68
            let aim = beamX + 36 * fallTime + CGFloat.random(in: -300...300)
            // Not clamped to the right edge: on a narrow phone the aim sits past the screen and the fragment drifts in (web parity).
            node.position = CGPoint(x: max(40, aim), y: size.height + 20)
            world.addChild(node)
            falling.append((node, CGFloat.random(in: 64...72)))
        }
        var landed: [Int] = []
        for i in falling.indices {
            falling[i].node.position.x -= dx
            falling[i].node.position.y -= falling[i].vy * CGFloat(dt)
            if falling[i].node.position.y <= surfaceY - 6 || falling[i].node.position.x < -40 { landed.append(i) }
        }
        for i in landed.reversed() {
            let (node, _) = falling.remove(at: i)
            if abs(node.position.x - beamX) <= CGFloat(OrionidsRun.catchRadius) {
                field.catchFragment(rain.resourceId)
                SK.burst(at: node.position, color: LaserPalette.sk(palette.beamCore), count: 12, speed: 90, in: world)
                let tag = SKLabelNode(text: "+1 \(Minerals.byId[rain.resourceId]?.symbol ?? "")")
                tag.fontName = "Oxanium-ExtraBold"
                tag.fontSize = 14
                tag.fontColor = LaserPalette.sk(palette.beamCore)
                tag.position = CGPoint(x: node.position.x, y: node.position.y + 24)
                tag.zPosition = 40
                world.addChild(tag)
                tag.run(.sequence([.group([.moveBy(x: 0, y: 28, duration: 0.6), .fadeOut(withDuration: 0.6)]), .removeFromParent()]))
                onChange?(field)
            }
            else { SK.burst(at: node.position, color: LaserPalette.sk(palette.groundDeep), count: 6, speed: 50, in: world) }   // missed: breaks up on the surface
            node.run(.sequence([.group([.scale(to: 0.2, duration: 0.15), .fadeOut(withDuration: 0.15)]), .removeFromParent()]))
        }
    }

    private func placeChips() {
        let span = max(track, 1)
        var labels: [(id: Int, tag: SKNode, x: CGFloat, center: CGFloat, halfWidth: CGFloat)] = []
        for (id, node) in nodeSprites {
            guard let lane = laneX[id] else { continue }
            var x = (lane - scrollX).truncatingRemainder(dividingBy: span)
            if x < -36 { x += span }
            // SSL-344: whole-pixel x so pixelated chips do not shimmer as the field scrolls (matches web).
            node.position = CGPoint(x: x.rounded(), y: surfaceY - 15 * px)
            if let tag = node.childNode(withName: "ore-label") {
                let labelWidth = (tag.userData?["labelWidth"] as? NSNumber)?.doubleValue ?? Double(tag.frame.width)
                let halfWidth = max(32, CGFloat(labelWidth) * 0.58)
                guard x >= -halfWidth, x <= size.width + halfWidth else { tag.alpha = 0; continue }
                tag.alpha = 1
                let center = size.width >= halfWidth * 2 + 40
                    ? min(max(x, halfWidth + 20), size.width - halfWidth - 20)
                    : size.width / 2
                labels.append((id, tag, x, center, halfWidth))
            }
        }
        labels.sort { $0.center < $1.center }
        var laneEnds: [CGFloat] = []
        for label in labels {
            var lane = 0
            while lane < laneEnds.count && label.center - label.halfWidth < laneEnds[lane] + 8 { lane += 1 }
            if lane == laneEnds.count { laneEnds.append(-.infinity) }
            laneEnds[lane] = label.center + label.halfWidth
            label.tag.position.x = (label.center - label.x) / px
            label.tag.position.y = (labelBaseY[label.id] ?? label.tag.position.y) + CGFloat(lane * 26) / px
        }
    }

    private func shift(_ node: SKNode, by dx: CGFloat, width: CGFloat) {
        node.position.x -= dx
        if node.position.x <= -width { node.position.x += width }
    }

    override func update(_ currentTime: TimeInterval) {
        let dt = min(0.05, lastTime.map { currentTime - $0 } ?? 0)
        lastTime = currentTime
        clock += dt
        let base: CGFloat = 36
        let speed = base + CGFloat(scrollInput) * (scrollInput > 0 ? 36 : 24)
        let dx = speed * CGFloat(dt)
        scrollX += dx
        shift(ground, by: dx, width: groundSpan)
        shift(near, by: dx * 0.45, width: ridgeTile)
        shift(far, by: dx * 0.16, width: ridgeTile)
        shift(mid, by: dx * 0.3, width: midW)
        shift(surfaceDeposits, by: dx, width: midW)
        placeChips()
        updateTargetCue()
        updateRain(dt: dt, dx: dx)

        let pulse = reducedMotion ? 1 : 0.82 + sin(clock * 9) * 0.18
        if clock >= flashUntil {
            // Beam shows only while the trigger is held; no idle stream.
            beam.alpha = 0
            spark.alpha = 0
            beam.xScale = 1
            spark.setScale(px)
        } else { spark.alpha = 1 }
        if let plume = ship.childNode(withName: "//plume") {
            plume.alpha = 0.7 + pulse * 0.3
            plume.xScale = px * (0.8 + pulse * 0.3)
            if let sprite = plume as? SKSpriteNode, !reducedMotion { sprite.texture = flameFrames[Int(clock * 10) % 2] }
        }
        // Altitude (SpriteKit is y-up: positive climbs). Clamp between sky ceiling and just above ground.
        altitude += CGFloat(-climbInput) * 110 * CGFloat(dt)
        let ceiling = ceilingCenterY - shipY   // stay under the HUD
        altitude = max(floorCenterY - shipY, min(ceiling, altitude))
        shipShift = max(0, min(maxShift, shipShift + CGFloat(steerInput) * 90 * CGFloat(dt)))
        ship.position.x = beamX
        beam.position.x = beamX
        spark.position.x = beamX
        opsBrackets.position.x = shipShift
        if bumpCooldown > 0 { bumpCooldown -= dt }
        if triggerHeld, clock >= nextShotAt {
            nextShotAt = clock + Self.fireCooldown
            fireLaser()
        }
        let charging = clock < nextShotAt
        if charging != wasCharging { wasCharging = charging; onCharging?(charging) }
        let clear = [beamX - 30, beamX, beamX + 30].map(obstacleHeight).max() ?? 0
        let obstacleAhead = [beamX + 80, beamX + 120, beamX + 160].map(obstacleHeight).max() ?? 0
        let shouldClimb = obstacleAhead > 18 && shipY + altitude - 14 < surfaceY + obstacleAhead + 12
        if shouldClimb != lastObstacleAhead {
            lastObstacleAhead = shouldClimb
            onObstacleAhead?(shouldClimb)
        }
        let belly = shipY + altitude - 14
        if clear > 0, belly < surfaceY + clear {
            altitude = min(ceiling, surfaceY + clear + 14 + 18 - shipY)
            if bumpCooldown <= 0 {
                bumpCooldown = 1.6
                field.bump()
                onBump?()
                onChange?(field)
                world.run(.sequence([.moveBy(x: 4, y: -3, duration: 0.04), .moveBy(x: -8, y: 4, duration: 0.06), .moveBy(x: 4, y: -1, duration: 0.05)]))
            }
        }
        ship.position.y = shipY + altitude + (reducedMotion ? 0 : sin(clock * 2.2) * 1.5)
        beam.position.y = ship.position.y - 24
        beam.yScale = max(0.05, (ship.position.y - 24 - surfaceY) / max(24, shipY - 24 - surfaceY))

        if !reducedMotion {
            for star in stars {
                star.node.alpha = star.base * (0.55 + 0.45 * abs(sin(clock * 2.4 + star.phase)))
            }
            for i in dust.indices {
                dust[i].x -= dust[i].v * CGFloat(dt)
                if dust[i].x < -8 { dust[i].x = size.width + 8 }
                dust[i].node.position = CGPoint(x: dust[i].x, y: dust[i].y + sin(clock + dust[i].v) * 3)
            }
            for i in clouds.indices {
                clouds[i].x += clouds[i].v * CGFloat(dt)
                if clouds[i].x > size.width + 80 { clouds[i].x = -80 }
                clouds[i].node.position.x = clouds[i].x
            }
        }
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard touches.first != nil else { return }
        fireLaser()
    }
}
