import SpriteKit
import LandnamCore

/// Side-on ship laser. The ship stays put; the ground and ore chips scroll under a vertical beam.
/// Rules stay in `MiningField`. A hit is a chip whose wrapped x sits on the beam.
@MainActor
final class MiningScene: SKScene {
    private(set) var field: MiningField
    var onChange: ((MiningField) -> Void)?
    var onFeedback: ((String) -> Void)?
    var reducedMotion = false

    private let palette: LaserPalette.Spec
    private var scrollInput = 0.0
    private var scrollX: CGFloat = 0
    private var clock: TimeInterval = 0
    private var lastTime: TimeInterval?
    private var nodeSprites: [Int: SKNode] = [:]
    private var laneX: [Int: CGFloat] = [:]
    private var track: CGFloat = 800
    private let world = SKNode()
    private var stars: [(node: SKSpriteNode, base: CGFloat, phase: CGFloat)] = []
    private var dust: [(node: SKSpriteNode, x: CGFloat, y: CGFloat, v: CGFloat)] = []
    private var clouds: [(node: SKSpriteNode, x: CGFloat, v: CGFloat)] = []
    private let ground = SKNode()
    private let near = SKNode()
    private let far = SKNode()
    private let beam = SKNode()
    private lazy var spark = sprite("spark-0")
    private let px: CGFloat = 2
    private lazy var flameFrames = (0..<2).map { SK.texture("laser/flame-\($0).png") }
    private var ridgeTile: CGFloat { 128 * px }
    private var soilTile: CGFloat { 32 * px }
    private let ship = SKNode()
    private var flashUntil: TimeInterval = 0

    init(field: MiningField, size: CGSize, palette: LaserPalette.Spec = LaserPalette.bennu) {
        self.field = field
        self.palette = palette
        super.init(size: size)
        scaleMode = .resizeFill
        backgroundColor = LaserPalette.sk(palette.skyTop)
    }
    required init?(coder: NSCoder) { fatalError() }

    private var beamX: CGFloat { min(96, max(72, size.width * 0.18)) }
    private var surfaceY: CGFloat { max(200, size.height * 0.5) }
    private var shipY: CGFloat { min(size.height * 0.72, surfaceY + min(210, size.height * 0.28)) }

    override func didMove(to view: SKView) {
        removeAllChildren()
        world.removeAllChildren()
        nodeSprites = [:]
        laneX = [:]
        stars = []
        dust = []
        clouds = []
        addChild(world)
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
            let radius = size.width * planet.radius
            let scale = max(1, (radius * 2 / 48).rounded())
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
        let ridgeName = "ridge-" + (palette.terrain == "ice" || palette.terrain == "dunes" ? palette.terrain : "rubble")
        let copies = Int((size.width / ridgeTile).rounded(.up)) + 2
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
        let cols = Int((size.width / soilTile).rounded(.up)) + 2
        let rows = Int((surfaceY / soilTile).rounded(.up)) + 1
        let crustH = 8 * px
        for c in 0..<cols {
            let lip = sprite("crust", tint: palette.groundSpeck, blend: 0.45)
            lip.anchorPoint = CGPoint(x: 0, y: 0)
            lip.position = CGPoint(x: CGFloat(c) * soilTile, y: surfaceY - crustH)
            ground.addChild(lip)
            for r in 0..<rows {
                let soil = sprite("soil", tint: r == 0 ? palette.ground : palette.groundDeep, blend: 0.55)
                soil.anchorPoint = CGPoint(x: 0, y: 0)
                soil.position = CGPoint(x: CGFloat(c) * soilTile, y: surfaceY - crustH - CGFloat(r + 1) * soilTile)
                ground.addChild(soil)
            }
        }
        world.addChild(far)
        world.addChild(near)
        world.addChild(ground)
    }

    /// Deposits sit buried in the soil under the beam line, far apart so one pass shows one or two.
    private func buildChips() {
        let live = field.nodes.filter { !$0.isDepleted }.sorted { ($0.x + $0.y) < ($1.x + $1.y) }
        let spacing: CGFloat = 280
        track = max(size.width + spacing, CGFloat(live.count) * spacing)
        let avg = (Double((palette.ground >> 16) & 255) + Double((palette.ground >> 8) & 255) + Double(palette.ground & 255)) / 3
        let ink = LaserPalette.sk(avg > 150 ? 0x1A2430 : 0xFFFFFF)
        for (i, n) in live.enumerated() {
            let chip = sprite("deposit-0")
            if let a = SK.texture("laser/deposit-0.png"), let b = SK.texture("laser/deposit-1.png") {
                chip.run(.repeatForever(.animate(with: [a, b], timePerFrame: 0.6)))
            }
            let meta = Minerals.byId[n.mineralId]
            let label = SKLabelNode(text: meta?.symbol ?? "?")
            label.fontName = "Oxanium-ExtraBold"
            label.fontSize = 14
            label.fontColor = ink
            label.verticalAlignmentMode = .top
            label.setScale(1 / px)
            label.position = CGPoint(x: 0, y: -8)
            chip.addChild(label)
            chip.zPosition = 10
            chip.name = "ore-\(n.id)"
            world.addChild(chip)
            nodeSprites[n.id] = chip
            laneX[n.id] = beamX + 160 + CGFloat(i) * spacing
        }
        placeChips()
    }

    private func buildShip() {
        ship.position = CGPoint(x: beamX, y: shipY)
        ship.zPosition = 20
        let plume = sprite("flame-0")
        plume.anchorPoint = CGPoint(x: 1, y: 0.5)
        plume.position = CGPoint(x: -19 * px, y: 0)
        plume.name = "plume"
        ship.addChild(plume)
        ship.addChild(sprite("ship"))
        world.addChild(ship)
    }

    private func buildBeam() {
        let h = max(24, shipY - 14 * px - surfaceY)
        beam.removeAllChildren()
        for k in 0..<Int((h / (8 * px)).rounded(.up)) {
            let seg = sprite("beam")
            seg.anchorPoint = CGPoint(x: 0.5, y: 1)
            seg.position = CGPoint(x: 0, y: -CGFloat(k) * 8 * px)
            beam.addChild(seg)
        }
        beam.position = CGPoint(x: beamX, y: shipY - 8 * px)
        beam.zPosition = 18
        world.addChild(beam)
        spark.position = CGPoint(x: beamX, y: surfaceY)
        spark.zPosition = 19
        world.addChild(spark)
    }

    // MARK: play

    func setScroll(_ input: Double) { scrollInput = max(-1, min(1, input)) }

    /// Dock arrows: a short burst of faster or slower scroll.
    func nudge(_ dir: Double) {
        setScroll(dir)
        run(.sequence([.wait(forDuration: 0.5), .run { [weak self] in self?.setScroll(0) }]), withKey: "nudge")
    }

    func refill() {
        field.recharge(field.chargeCap)
        onChange?(field)
    }

    func fireLaser() { fire(at: CGPoint(x: beamX, y: surfaceY)) }

    func fire(at _: CGPoint) {
        let hit = nodeSprites.first { abs($0.value.position.x - beamX) < 40 }
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
        case .hit(let id, _): if let sp = nodeSprites[id] { crack(sp) }
        case .mined(let id, let mineral):
            if let sp = nodeSprites[id] { pop(sp, id: id, mineral: mineral) }
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

    private func crack(_ sp: SKNode) {
        sp.run(.sequence([.scale(to: 0.86, duration: 0.05), .scale(to: 1, duration: 0.1)]))
    }

    private func pop(_ sp: SKNode, id: Int, mineral: String) {
        nodeSprites[id] = nil
        laneX[id] = nil
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

    private func placeChips() {
        let span = max(track, 1)
        for (id, node) in nodeSprites {
            guard let lane = laneX[id] else { continue }
            var x = (lane - scrollX).truncatingRemainder(dividingBy: span)
            if x < -36 { x += span }
            node.position = CGPoint(x: x, y: surfaceY - 8 * px - 4 * px - 14 * px)
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
        let base: CGFloat = 48
        let speed = base + CGFloat(scrollInput) * (scrollInput > 0 ? 48 : 32)
        let dx = speed * CGFloat(dt)
        scrollX += dx
        shift(ground, by: dx, width: soilTile)
        shift(near, by: dx * 0.45, width: ridgeTile)
        shift(far, by: dx * 0.16, width: ridgeTile)
        placeChips()

        let pulse = reducedMotion ? 1 : 0.82 + sin(clock * 9) * 0.18
        if clock >= flashUntil {
            beam.alpha = 0.72 + pulse * 0.28
            beam.xScale = 1
            spark.setScale(px)
        }
        if let plume = ship.childNode(withName: "plume") {
            plume.alpha = 0.7 + pulse * 0.3
            if let sprite = plume as? SKSpriteNode, !reducedMotion { sprite.texture = flameFrames[Int(clock * 10) % 2] }
        }
        ship.position.y = shipY + (reducedMotion ? 0 : sin(clock * 2.2) * 2)

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

    #if canImport(UIKit)
    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard touches.first != nil else { return }
        fireLaser()
    }
    #else
    override func mouseUp(with event: NSEvent) { fireLaser() }
    override func keyDown(with event: NSEvent) {
        if event.keyCode == 49 || event.keyCode == 3 { fireLaser() } // space, F
        if event.keyCode == 123 || event.keyCode == 0 { setScroll(-1) }
        if event.keyCode == 124 || event.keyCode == 2 { setScroll(1) }
    }
    override func keyUp(with event: NSEvent) { setScroll(0) }
    #endif
}
