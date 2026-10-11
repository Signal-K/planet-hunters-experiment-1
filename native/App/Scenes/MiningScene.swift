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
    private var stars: [(node: SKShapeNode, base: CGFloat, phase: CGFloat)] = []
    private var dust: [(node: SKShapeNode, x: CGFloat, y: CGFloat, v: CGFloat)] = []
    private var clouds: [(node: SKShapeNode, x: CGFloat, v: CGFloat)] = []
    private let ground = SKNode()
    private let near = SKNode()
    private let far = SKNode()
    private let beam = SKShapeNode()
    private let spark = SKShapeNode()
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
    private var surfaceY: CGFloat { max(168, size.height * 0.36) }
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

    private func buildSky() {
        let sky = SKSpriteNode(texture: SK.gradient(top: LaserPalette.color(palette.skyTop), bottom: LaserPalette.color(palette.skyHorizon)))
        sky.size = size
        sky.position = CGPoint(x: size.width / 2, y: size.height / 2)
        sky.zPosition = -20
        world.addChild(sky)

        if palette.starAlpha > 0 {
            for i in 0..<64 {
                let r: CGFloat = (i % 9 == 0) ? 1.8 : 1.1
                let star = SKShapeNode(circleOfRadius: r)
                star.fillColor = LaserPalette.sk(0xFFFFFF, palette.starAlpha)
                star.strokeColor = .clear
                star.position = CGPoint(x: CGFloat((i * 97) % Int(max(size.width, 1))), y: size.height * (0.42 + CGFloat((i * 53) % 50) / 100))
                star.zPosition = -16
                world.addChild(star)
                stars.append((star, palette.starAlpha * (0.45 + CGFloat(i % 5) * 0.12), CGFloat(i)))
            }
        }

        if let planet = palette.planet {
            let radius = size.width * planet.radius
            let crop = SKCropNode()
            let mask = SKShapeNode(circleOfRadius: radius)
            mask.fillColor = .white
            crop.maskNode = mask
            let bandH = (radius * 2) / CGFloat(max(planet.bands.count, 1))
            for (i, band) in planet.bands.enumerated() {
                let strip = SKShapeNode(rectOf: CGSize(width: radius * 2.2, height: bandH + 1))
                strip.fillColor = LaserPalette.sk(band)
                strip.strokeColor = .clear
                strip.position = CGPoint(x: 0, y: radius - bandH * (CGFloat(i) + 0.5))
                crop.addChild(strip)
            }
            crop.position = CGPoint(x: size.width * planet.cx, y: size.height * (1 - planet.cy))
            crop.zPosition = -15
            world.addChild(crop)
        }

        if palette.lightAlpha > 0 {
            let sun = SKShapeNode(circleOfRadius: 28)
            sun.fillColor = LaserPalette.sk(palette.light, palette.lightAlpha)
            sun.strokeColor = .clear
            sun.position = CGPoint(x: size.width * 0.62, y: surfaceY + size.height * 0.22)
            sun.zPosition = -14
            world.addChild(sun)
        }

        if palette.clouds {
            for i in 0..<4 {
                let cloud = SKShapeNode(ellipseOf: CGSize(width: 90 + CGFloat(i * 16), height: 22))
                cloud.fillColor = LaserPalette.sk(0xFFFFFF, 0.55)
                cloud.strokeColor = .clear
                cloud.position = CGPoint(x: size.width * CGFloat(i) / 4, y: surfaceY + 90 + CGFloat(i * 12))
                cloud.zPosition = -12
                world.addChild(cloud)
                clouds.append((cloud, cloud.position.x, 8 + CGFloat(i) * 3))
            }
        }

        for i in 0..<18 {
            let mote = SKShapeNode(circleOfRadius: 1.4)
            mote.fillColor = LaserPalette.sk(palette.dust, 0.45)
            mote.strokeColor = .clear
            mote.zPosition = 4
            let x = CGFloat((i * 113) % Int(max(size.width, 1)))
            let y = surfaceY * 0.4 + CGFloat((i * 29) % Int(max(surfaceY, 1)))
            mote.position = CGPoint(x: x, y: y)
            world.addChild(mote)
            dust.append((mote, x, y, 10 + CGFloat(i % 5) * 6))
        }
    }

    private func buildGround() {
        let tile = size.width + 8
        func silhouette(_ color: UInt32, _ lift: CGFloat, _ amp: CGFloat) -> SKShapeNode {
            let path = CGMutablePath()
            path.move(to: CGPoint(x: 0, y: 0))
            let steps = 18
            for i in 0...steps {
                let x = tile * CGFloat(i) / CGFloat(steps)
                let n = CGFloat((i * 17 + Int(palette.skyTop % 20)) % 7)
                let y: CGFloat
                switch palette.terrain {
                case "ice": y = (i % 2 == 0 ? lift + amp + n * 3 : lift * 0.2)
                case "dunes": y = lift * 0.45 + sin(CGFloat(i) * 0.7) * amp
                default: y = n * (amp / 4)
                }
                path.addLine(to: CGPoint(x: x, y: y))
            }
            path.addLine(to: CGPoint(x: tile, y: 0))
            path.closeSubpath()
            let node = SKShapeNode(path: path)
            node.fillColor = LaserPalette.sk(color)
            node.strokeColor = .clear
            return node
        }

        far.zPosition = -8
        near.zPosition = -6
        ground.zPosition = 1
        for copy in 0..<2 {
            let farCopy = silhouette(palette.distant, 28, 18)
            farCopy.position = CGPoint(x: CGFloat(copy) * tile, y: surfaceY - 8)
            far.addChild(farCopy)
            let nearCopy = silhouette(palette.nearRidge, 16, 12)
            nearCopy.position = CGPoint(x: CGFloat(copy) * tile, y: surfaceY - 2)
            near.addChild(nearCopy)
            let dirt = SKShapeNode(rectOf: CGSize(width: tile, height: surfaceY + 40))
            dirt.fillColor = LaserPalette.sk(copy == 0 ? palette.ground : palette.groundDeep)
            dirt.strokeColor = .clear
            dirt.position = CGPoint(x: CGFloat(copy) * tile + tile / 2, y: surfaceY / 2 - 20)
            ground.addChild(dirt)
            for s in 0..<14 {
                let speck = SKShapeNode(circleOfRadius: 3)
                speck.fillColor = LaserPalette.sk(palette.groundSpeck)
                speck.strokeColor = .clear
                speck.position = CGPoint(x: CGFloat(copy) * tile + CGFloat(s) * tile / 14 + 12, y: surfaceY - 18 - CGFloat((s * 13) % 40))
                ground.addChild(speck)
            }
        }
        world.addChild(far)
        world.addChild(near)
        world.addChild(ground)
    }

    private func buildChips() {
        let live = field.nodes.filter { !$0.isDepleted }.sorted { ($0.x + $0.y) < ($1.x + $1.y) }
        let spacing: CGFloat = 118
        track = max(size.width + spacing, CGFloat(live.count) * spacing)
        let avg = (Double((palette.ground >> 16) & 255) + Double((palette.ground >> 8) & 255) + Double(palette.ground & 255)) / 3
        let ink = LaserPalette.sk(avg > 150 ? 0x1A2430 : 0xFFFFFF)
        for (i, n) in live.enumerated() {
            let chip = SKShapeNode(circleOfRadius: 22)
            chip.fillColor = LaserPalette.sk(palette.groundSpeck)
            chip.strokeColor = LaserPalette.sk(palette.groundDeep)
            chip.lineWidth = 3
            let meta = Minerals.byId[n.mineralId]
            let label = SKLabelNode(text: meta?.symbol ?? "?")
            label.fontName = "Oxanium-ExtraBold"
            label.fontSize = 14
            label.fontColor = ink
            label.verticalAlignmentMode = .center
            label.position = CGPoint(x: 0, y: -1)
            chip.addChild(label)
            chip.zPosition = 10
            chip.name = "ore-\(n.id)"
            world.addChild(chip)
            nodeSprites[n.id] = chip
            laneX[n.id] = beamX + 140 + CGFloat(i) * spacing
        }
        placeChips()
    }

    private func buildShip() {
        ship.position = CGPoint(x: beamX, y: shipY)
        ship.zPosition = 20
        let hull = SKShapeNode(path: {
            let p = CGMutablePath()
            p.move(to: CGPoint(x: -28, y: 6))
            p.addLine(to: CGPoint(x: -14, y: -12))
            p.addLine(to: CGPoint(x: 20, y: -10))
            p.addLine(to: CGPoint(x: 34, y: 0))
            p.addLine(to: CGPoint(x: 18, y: 11))
            p.addLine(to: CGPoint(x: -14, y: 11))
            p.closeSubpath()
            return p
        }())
        hull.fillColor = LaserPalette.sk(0xC8C2B8)
        hull.strokeColor = LaserPalette.sk(0x5C584F)
        hull.lineWidth = 1.5
        let window = SKShapeNode(circleOfRadius: 3.5)
        window.fillColor = LaserPalette.sk(0xD7EEF8)
        window.strokeColor = .clear
        window.position = CGPoint(x: 16, y: -1)
        let plume = SKShapeNode(ellipseOf: CGSize(width: 22, height: 8))
        plume.fillColor = LaserPalette.sk(palette.beam, 0.85)
        plume.strokeColor = .clear
        plume.position = CGPoint(x: -36, y: 0)
        plume.name = "plume"
        ship.addChild(plume)
        ship.addChild(hull)
        ship.addChild(window)
        world.addChild(ship)
    }

    private func buildBeam() {
        let h = max(24, shipY - surfaceY)
        beam.path = CGPath(rect: CGRect(x: -3, y: -h, width: 6, height: h), transform: nil)
        beam.fillColor = LaserPalette.sk(palette.beam, 0.9)
        beam.strokeColor = LaserPalette.sk(palette.beamCore, 0.9)
        beam.lineWidth = 1
        beam.position = CGPoint(x: beamX, y: shipY - 8)
        beam.zPosition = 18
        world.addChild(beam)
        spark.path = CGPath(ellipseIn: CGRect(x: -8, y: -8, width: 16, height: 16), transform: nil)
        spark.fillColor = LaserPalette.sk(palette.beamCore, 0.95)
        spark.strokeColor = LaserPalette.sk(palette.beam, 0.7)
        spark.lineWidth = 2
        spark.position = CGPoint(x: beamX, y: surfaceY)
        spark.zPosition = 19
        world.addChild(spark)
    }

    // MARK: play

    func setScroll(_ input: Double) { scrollInput = max(-1, min(1, input)) }

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
        beam.xScale = hit ? 1.8 : 1.3
        beam.fillColor = hit ? LaserPalette.sk(palette.beam) : LaserPalette.sk(palette.beam, 0.45)
        spark.setScale(hit ? 1.7 : 1.15)
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
            node.position = CGPoint(x: x, y: surfaceY + 18)
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
        let tile = size.width + 8
        shift(ground, by: dx, width: tile)
        shift(near, by: dx * 0.45, width: tile)
        shift(far, by: dx * 0.16, width: tile)
        placeChips()

        let pulse = reducedMotion ? 1 : 0.82 + sin(clock * 9) * 0.18
        if clock >= flashUntil {
            beam.alpha = 0.72 + pulse * 0.28
            beam.xScale = 0.9 + pulse * 0.15
            spark.setScale(0.8 + pulse * 0.3)
        }
        if let plume = ship.childNode(withName: "plume") {
            plume.alpha = 0.7 + pulse * 0.3
            plume.xScale = pulse
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
