import SpriteKit
import LandnamCore

/// Tap-to-laser mining: chunky ore nodes float over a blueprint-light surface, the rover
/// fires a beam at whatever you tap, nodes crack and pop into pickups that fly to cargo.
/// All rules live in `MiningField`; this scene only renders it and forwards input.
@MainActor
final class MiningScene: SKScene {
    private(set) var field: MiningField
    var onChange: ((MiningField) -> Void)?
    var onFeedback: ((String) -> Void)?

    private var nodeSprites: [Int: SKSpriteNode] = [:]
    private let world = SKNode()
    private let beam = SKShapeNode()
    private var rover = SKSpriteNode()
    private var lastRecharge: TimeInterval = 0

    init(field: MiningField, size: CGSize) {
        self.field = field
        super.init(size: size)
        scaleMode = .resizeFill
        backgroundColor = Theme.skyTop.sk
    }
    required init?(coder: NSCoder) { fatalError() }

    override func didMove(to view: SKView) {
        removeAllChildren(); world.removeAllChildren(); nodeSprites = [:]
        addChild(world)
        buildBackdrop(); buildNodes(); buildRover()
        beam.strokeColor = Theme.blueBright.sk; beam.lineWidth = 4; beam.lineCap = .round; beam.zPosition = 30; beam.alpha = 0
        world.addChild(beam)
    }

    override func didChangeSize(_ oldSize: CGSize) {
        guard view != nil, oldSize != size, oldSize != .zero else { return }
        didMove(to: view!)
    }

    // MARK: layout
    private var groundY: CGFloat { size.height * 0.18 }

    private func buildBackdrop() {
        let sky = SKSpriteNode(texture: SK.gradient(top: Theme.skyTop, bottom: Theme.horizon))
        sky.size = size; sky.position = CGPoint(x: size.width / 2, y: size.height / 2); sky.zPosition = -10
        world.addChild(sky)

        // Depth-hazed terrain bricks, same kit as the hub.
        let ranges: [(id: String, x: CGFloat, s: CGFloat, haze: CGFloat)] = [
            ("mtn_peak_broad", 0.12, 1.3, 0.55), ("mtn_horn", 0.38, 1.0, 0.55), ("mtn_peak_tall", 0.66, 1.2, 0.55),
            ("mtn_saw_ridge", 0.92, 1.1, 0.55), ("mesa", 0.25, 0.9, 0.3), ("mtn_shoulder", 0.78, 0.9, 0.3),
        ]
        for (i, r) in ranges.enumerated() {
            guard let tex = SK.texture("terrain/\(r.id).png") else { continue }
            let sp = SKSpriteNode(texture: tex)
            let k = TerrainKit.size[r.id] ?? (100, 80)
            let w = CGFloat(k.w) * r.s * max(1, size.width / 600)
            sp.size = CGSize(width: w, height: w * CGFloat(k.h / k.w))
            sp.anchorPoint = CGPoint(x: 0.5, y: 0)
            sp.position = CGPoint(x: size.width * r.x, y: groundY - 4)
            sp.zPosition = -8 + CGFloat(i) * 0.1
            sp.color = Theme.mix(0.5).sk; sp.colorBlendFactor = r.haze
            world.addChild(sp)
        }
        let ground = SKSpriteNode(color: Theme.groundNear.sk, size: CGSize(width: size.width, height: groundY))
        ground.anchorPoint = .zero; ground.zPosition = -5
        world.addChild(ground)
        let lip = SKSpriteNode(color: Theme.groundLip.sk, size: CGSize(width: size.width, height: 4))
        lip.anchorPoint = .zero; lip.position = CGPoint(x: 0, y: groundY); lip.zPosition = -4
        world.addChild(lip)
    }

    private func spriteY(_ ny: Double) -> CGFloat { size.height - CGFloat(ny) * (size.height - groundY - 40) - 40 }

    private func buildNodes() {
        for n in field.nodes where !n.isDepleted {
            let sp = makeOre(n)
            sp.position = CGPoint(x: CGFloat(n.x) * size.width, y: spriteY(n.y))
            sp.zPosition = 10
            world.addChild(sp); nodeSprites[n.id] = sp
            let bob = SKAction.moveBy(x: 0, y: CGFloat.random(in: 3...6), duration: Double.random(in: 1.2...2))
            sp.run(.repeatForever(.sequence([bob, bob.reversed()])))
        }
    }

    private func makeOre(_ n: OreNode) -> SKSpriteNode {
        let meta = Minerals.byId[n.mineralId]
        let tint = SK.hex(meta?.colorHex ?? "#ffffff")
        let artName = ["iron", "carbon", "cobalt", "gold", "ice", "nickel", "rare", "silicon"].contains(n.mineralId) ? n.mineralId : nil
        let sp: SKSpriteNode
        if let artName, let tex = SK.texture("ores/ore_\(artName).png") {
            sp = SKSpriteNode(texture: tex, size: CGSize(width: 46, height: 46))
        } else {
            // Minerals without bespoke art get their web mineral shape in their colour.
            let path = CGMutablePath()
            switch meta?.shape ?? .circle {
            case .circle: path.addEllipse(in: CGRect(x: -18, y: -18, width: 36, height: 36))
            case .diamond: path.addLines(between: [CGPoint(x: 0, y: 22), CGPoint(x: 18, y: 0), CGPoint(x: 0, y: -22), CGPoint(x: -18, y: 0)]); path.closeSubpath()
            case .rect: path.addRoundedRect(in: CGRect(x: -16, y: -16, width: 32, height: 32), cornerWidth: 4, cornerHeight: 4)
            case .triangle: path.addLines(between: [CGPoint(x: 0, y: 20), CGPoint(x: 20, y: -16), CGPoint(x: -20, y: -16)]); path.closeSubpath()
            }
            let shape = SKShapeNode(path: path)
            shape.fillColor = tint; shape.strokeColor = Theme.ink.sk.withAlphaComponent(0.55); shape.lineWidth = 2
            let tex = SKView().texture(from: shape)
            sp = SKSpriteNode(texture: tex)
        }
        let label = SKLabelNode(text: meta?.symbol ?? "?")
        label.fontName = "Oxanium-ExtraBold"; label.fontSize = 10; label.fontColor = Theme.ink.sk
        label.verticalAlignmentMode = .center; label.zPosition = 1; label.position = CGPoint(x: 0, y: -sp.size.height / 2 - 9)
        sp.addChild(label)
        return sp
    }

    private func buildRover() {
        rover = SKSpriteNode(texture: SK.texture("actors/rover.png"), size: CGSize(width: 96, height: 72))
        rover.anchorPoint = CGPoint(x: 0.5, y: 0.1)
        rover.position = CGPoint(x: size.width / 2, y: groundY - 6); rover.zPosition = 20
        world.addChild(rover)
        let idle = SKAction.moveBy(x: 0, y: 2, duration: 0.5)
        rover.run(.repeatForever(.sequence([idle, idle.reversed()])))
    }

    // MARK: input
    private func point(_ p: CGPoint) -> CGPoint { world.convert(p, from: self) }

    func fire(at p: CGPoint) {
        let hit = nodeSprites.first { $0.value.frame.insetBy(dx: -10, dy: -10).contains(p) }
        let outcome = field.strike(nodeId: hit?.key)
        let muzzle = CGPoint(x: rover.position.x, y: rover.position.y + 52)
        switch outcome {
        case .noCharge: onFeedback?("Laser charging"); shake()
        case .cargoFull: onFeedback?("Cargo hold full")
        case .tooHard(let tier): onFeedback?("Needs a tier \(tier) laser"); shake(hit?.value)
        case .miss: shootBeam(from: muzzle, to: p, hit: false)
        case .hit(let id, _): if let sp = nodeSprites[id] { shootBeam(from: muzzle, to: sp.position, hit: true); crack(sp, id: id) }
        case .mined(let id, let mineral): if let sp = nodeSprites[id] { shootBeam(from: muzzle, to: sp.position, hit: true); pop(sp, id: id, mineral: mineral) }
        }
        onChange?(field)
    }

    private func shootBeam(from a: CGPoint, to b: CGPoint, hit: Bool) {
        let path = CGMutablePath(); path.move(to: a); path.addLine(to: b)
        beam.path = path
        beam.strokeColor = hit ? Theme.blueBright.sk : Theme.crimson.sk.withAlphaComponent(0.7)
        beam.removeAllActions(); beam.alpha = 1
        beam.run(.fadeOut(withDuration: 0.12))
        if hit { SK.burst(at: b, color: Theme.blueBright.sk, count: 4, speed: 40, in: world) }
        rover.run(.sequence([.scaleX(to: 1.06, duration: 0.04), .scaleX(to: 1, duration: 0.06)]))
    }

    private func crack(_ sp: SKSpriteNode, id: Int) {
        let node = field.nodes.first { $0.id == id }
        let frac = CGFloat(node?.hp ?? 1) / CGFloat(max(1, node?.maxHp ?? 1))
        sp.run(.sequence([.scale(to: 0.78 + 0.22 * frac, duration: 0.05), .scale(to: 0.88 + 0.12 * frac, duration: 0.1)]))
        sp.color = .white; sp.colorBlendFactor = 0.8
        sp.run(.sequence([.wait(forDuration: 0.06), .colorize(withColorBlendFactor: 0, duration: 0.1)]))
    }

    private func pop(_ sp: SKSpriteNode, id: Int, mineral: String) {
        nodeSprites[id] = nil
        let tint = SK.hex(Minerals.byId[mineral]?.colorHex ?? "#ffffff")
        SK.burst(at: sp.position, color: tint, count: 12, speed: 90, in: world)
        sp.removeAllActions()
        let chip = SKSpriteNode(texture: sp.texture, size: CGSize(width: 24, height: 24))
        chip.position = sp.position; chip.zPosition = 40
        world.addChild(chip)
        let home = CGPoint(x: rover.position.x, y: rover.position.y + 30)
        chip.run(.sequence([
            .group([.moveBy(x: 0, y: 26, duration: 0.18), .scale(to: 1.3, duration: 0.18)]),
            .group([.move(to: home, duration: 0.35), .scale(to: 0.4, duration: 0.35)]),
            .removeFromParent(),
        ]))
        sp.run(.sequence([.group([.scale(to: 1.5, duration: 0.12), .fadeOut(withDuration: 0.12)]), .removeFromParent()]))
    }

    private func shake(_ n: SKNode? = nil) {
        let target = n ?? rover
        target.run(.sequence([.moveBy(x: 5, y: 0, duration: 0.03), .moveBy(x: -10, y: 0, duration: 0.06), .moveBy(x: 5, y: 0, duration: 0.03)]))
    }

    override func update(_ currentTime: TimeInterval) {
        if currentTime - lastRecharge > 0.6 { lastRecharge = currentTime; if field.charge < field.chargeCap { field.recharge(); onChange?(field) } }
    }

    #if canImport(UIKit)
    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        if let t = touches.first { fire(at: t.location(in: world)) }
    }
    #else
    override func mouseDown(with event: NSEvent) { fire(at: event.location(in: world)) }
    #endif
}
