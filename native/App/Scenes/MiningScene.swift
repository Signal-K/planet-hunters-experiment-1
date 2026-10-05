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
    var onDash: ((Double) -> Void)?       // dash recharge 0...1 for the HUD
    var reducedMotion = false

    private var motion = RoverMotion(x: 0, minX: 40, maxX: 360)
    private var driveInput = 0.0
    private var wantsDash = false
    private var facing: CGFloat = 1
    private var holdRemaining = 0.0
    private var lastShot: TimeInterval = -1
    private var lastDashEmit = -1.0
    private var dustTimer = 0.0
    private var clock: TimeInterval = 0
    private var lastTime: TimeInterval?

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
        removeAllChildren(); world.removeAllChildren(); nodeSprites = [:]; parallaxLayers = []
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
    private var groundY: CGFloat { max(size.height * 0.30, 200) }
    private var parallaxLayers: [(node: SKNode, base: CGFloat, factor: CGFloat)] = []

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
            parallaxLayers.append((sp, sp.position.x, r.haze < 0.4 ? 0.12 : 0.05))
        }
        let ground = SKSpriteNode(texture: SK.gradient(top: Theme.groundFar, bottom: Theme.groundNear))
        ground.size = CGSize(width: size.width, height: groundY); ground.anchorPoint = .zero; ground.zPosition = -5
        world.addChild(ground)
        // Ground props scroll faster than the mountains, so driving reads as real travel.
        let props = ["rock_boulder", "rock_cluster", "scree", "shrub", "rock_boulder", "scree"]
        for (i, id) in props.enumerated() {
            guard let tex = SK.texture("terrain/\(id).png") else { continue }
            let k = TerrainKit.size[id] ?? (40, 30)
            let w = CGFloat(k.w) * (1.4 + CGFloat(i % 3) * 0.5)
            let sp = SKSpriteNode(texture: tex, size: CGSize(width: w, height: w * CGFloat(k.h / k.w)))
            sp.anchorPoint = CGPoint(x: 0.5, y: 0)
            let y = groundY - 6 - CGFloat(i % 3) * groundY * 0.22
            sp.position = CGPoint(x: size.width * (0.08 + CGFloat(i) * 0.17), y: y)
            sp.zPosition = -3 + CGFloat(i % 3) * 0.1 - y / 1000
            sp.color = Theme.mix(0.6).sk; sp.colorBlendFactor = 0.25
            world.addChild(sp)
            parallaxLayers.append((sp, sp.position.x, 0.25 + CGFloat(i % 3) * 0.12))
        }
        let lip = SKSpriteNode(color: Theme.groundLip.sk, size: CGSize(width: size.width, height: 4))
        lip.anchorPoint = .zero; lip.position = CGPoint(x: 0, y: groundY); lip.zPosition = -4
        world.addChild(lip)
    }

    private func spriteY(_ ny: Double) -> CGFloat {
        let top = size.height - 110, bottom = groundY + 60
        let ys = field.nodes.map(\.y)
        let lo = ys.min() ?? 0, hi = ys.max() ?? 1
        let t = hi > lo ? (ny - lo) / (hi - lo) : 0.5
        return top - CGFloat(t) * max(60, top - bottom)
    }

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
            sp = SKSpriteNode(texture: tex, size: CGSize(width: 48, height: 48))
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
        rover = SKSpriteNode(texture: SK.texture("actors/rover.png"), size: CGSize(width: 132, height: 99))
        rover.anchorPoint = CGPoint(x: 0.5, y: 0.1)
        let startX = motion.x == 0 ? Double(size.width / 2) : min(max(motion.x, 40), Double(size.width) - 40)
        motion = RoverMotion(x: startX, minX: 40, maxX: Double(size.width) - 40)
        rover.position = CGPoint(x: CGFloat(motion.x), y: groundY - 6); rover.zPosition = 20
        world.addChild(rover)
    }

    // MARK: input
    private func point(_ p: CGPoint) -> CGPoint { world.convert(p, from: self) }

    func fire(at p: CGPoint) {
        let hit = nodeSprites.first { $0.value.frame.insetBy(dx: -10, dy: -10).contains(p) }
        let outcome = field.strike(nodeId: hit?.key, roverX: motion.x / Double(size.width))
        let muzzle = CGPoint(x: rover.position.x, y: rover.position.y + 72)
        switch outcome {
        case .noCharge: onFeedback?("Laser charging"); shake()
        case .cargoFull: onFeedback?("Cargo hold full")
        case .tooHard(let tier): onFeedback?("Needs a tier \(tier) laser"); shake(hit?.value)
        case .outOfRange:
            onFeedback?("Out of range, drive closer")
            if let sp = hit?.value { shootBeam(from: muzzle, to: CGPoint(x: muzzle.x + (sp.position.x - muzzle.x) * 0.35, y: muzzle.y + (sp.position.y - muzzle.y) * 0.35), hit: false) }
        case .miss: shootBeam(from: muzzle, to: p, hit: false)
        case .hit(let id, _): if let sp = nodeSprites[id] { shootBeam(from: muzzle, to: sp.position, hit: true); crack(sp, id: id); impact(.hit, toward: sp.position) }
        case .mined(let id, let mineral): if let sp = nodeSprites[id] { shootBeam(from: muzzle, to: sp.position, hit: true); pop(sp, id: id, mineral: mineral); impact(.collect, toward: sp.position) }
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
        lastShot = clock
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
        let tag = SKLabelNode(text: "+1 \(Minerals.byId[mineral]?.symbol ?? "")")
        tag.fontName = "Oxanium-ExtraBold"; tag.fontSize = 17; tag.fontColor = tint
        tag.position = CGPoint(x: sp.position.x, y: sp.position.y + 20); tag.zPosition = 60
        let outline = SKLabelNode(text: tag.text); outline.fontName = tag.fontName; outline.fontSize = 17; outline.fontColor = Theme.ink.sk
        outline.position = CGPoint(x: 1.5, y: -1.5); outline.zPosition = -1; tag.addChild(outline)
        world.addChild(tag)
        tag.setScale(0.4)
        tag.run(.sequence([.scale(to: 1.15, duration: 0.1), .group([.moveBy(x: 0, y: 36, duration: 0.7), .sequence([.wait(forDuration: 0.4), .fadeOut(withDuration: 0.3)])]), .removeFromParent()]))
    }

    private func shake(_ n: SKNode? = nil) {
        let target = n ?? rover
        target.run(.sequence([.moveBy(x: 5, y: 0, duration: 0.03), .moveBy(x: -10, y: 0, duration: 0.06), .moveBy(x: 5, y: 0, duration: 0.03)]))
    }

    // MARK: juice
    /// Hit-pause plus a small camera kick toward the impact, like Crashlands' chunky strikes.
    private func impact(_ kind: Juice.HitKind, toward p: CGPoint) {
        let hold = Juice.hitStopSeconds(kind, reducedMotion: reducedMotion)
        guard hold > 0 else { return }
        holdRemaining = hold
        world.isPaused = true
        let k: CGFloat = kind == .collect ? 6 : 3
        let dx = p.x - rover.position.x, dy = p.y - rover.position.y
        let len = max(1, hypot(dx, dy))
        world.removeAction(forKey: "kick")
        world.position = .zero
        world.run(.sequence([.moveBy(x: dx / len * k, y: dy / len * k, duration: 0.03), .move(to: .zero, duration: 0.12)]), withKey: "kick")
    }

    func drive(_ input: Double) { driveInput = max(-1, min(1, input)) }
    func dash() { wantsDash = true }

    override func update(_ currentTime: TimeInterval) {
        let dt = min(0.05, lastTime.map { currentTime - $0 } ?? 0)
        lastTime = currentTime; clock += dt

        let step = Juice.stepHitStop(remaining: holdRemaining, dt: dt)
        holdRemaining = step.remaining
        if holdRemaining <= 0, world.isPaused { world.isPaused = false }
        let simDt = step.simDt

        if simDt > 0 {
            let started = motion.step(dt: simDt, input: driveInput, wantsDash: wantsDash)
            wantsDash = false
            if started { dashBurst() }
            if abs(motion.velocity) > 8 { facing = motion.velocity > 0 ? 1 : -1 }
            dustTimer += simDt
            if abs(motion.velocity) > 60, dustTimer > (motion.isDashing ? 0.025 : 0.12) {
                dustTimer = 0
                SK.burst(at: CGPoint(x: rover.position.x - facing * 30, y: groundY + 2), color: Theme.hex(0xFFFFFF, 0.8).sk, count: motion.isDashing ? 3 : 1, speed: 26, in: world, z: 19)
            }
        }
        let stretch: CGFloat = motion.isDashing ? 1.22 : 1
        rover.xScale = facing * stretch
        rover.yScale = motion.isDashing ? 0.9 : 1
        let recoil = CGFloat(Juice.recoil(at: clock - lastShot, kick: reducedMotion ? 0 : 5))
        rover.position.x = CGFloat(motion.x) - facing * recoil
        rover.position.y = groundY - 6 + (abs(motion.velocity) > 20 ? CGFloat(abs(sin(clock * 22))) * 1.5 : CGFloat(sin(clock * 4)))

        // Parallax: layers slide opposite the rover so travel has depth.
        let mid = size.width / 2
        for l in parallaxLayers { l.node.position.x = l.base - (CGFloat(motion.x) - mid) * l.factor }
        if clock - lastDashEmit > 0.05 { lastDashEmit = clock; onDash?(motion.dashCharge) }
        if simDt > 0, currentTime - lastRecharge > 0.6 { lastRecharge = currentTime; if field.charge < field.chargeCap { field.recharge(); onChange?(field) } }
    }

    private func dashBurst() {
        SK.burst(at: CGPoint(x: rover.position.x - facing * 34, y: groundY + 4), color: Theme.hex(0xFFFFFF, 0.9).sk, count: reducedMotion ? 3 : 9, speed: 70, in: world, z: 19)
        guard !reducedMotion else { return }
        world.removeAction(forKey: "kick")
        world.run(.sequence([.moveBy(x: -facing * 4, y: 0, duration: 0.04), .move(to: .zero, duration: 0.14)]), withKey: "kick")
    }

    /// The ground strip steers the rover (analog, toward the finger); anything above fires.
    private func isDriveZone(_ p: CGPoint) -> Bool { p.y < groundY + 30 }
    private func steer(to p: CGPoint) { drive((p.x - CGFloat(motion.x)) / 70) }

    #if canImport(UIKit)
    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let t = touches.first else { return }
        let p = t.location(in: world)
        if isDriveZone(p) { steer(to: p) } else { fire(at: p) }
    }
    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let t = touches.first else { return }
        let p = t.location(in: world)
        if isDriveZone(p) { steer(to: p) }
    }
    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) { drive(0) }
    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) { drive(0) }
    #else
    private var keys = Set<UInt16>()
    override func mouseDown(with event: NSEvent) {
        let p = event.location(in: world)
        if isDriveZone(p) { steer(to: p) } else { fire(at: p) }
    }
    override func mouseDragged(with event: NSEvent) { let p = event.location(in: world); if isDriveZone(p) { steer(to: p) } }
    override func mouseUp(with event: NSEvent) { drive(0) }
    override func keyDown(with event: NSEvent) {
        if event.keyCode == 49 || event.keyCode == 56 { dash(); return }   // space, shift
        keys.insert(event.keyCode); syncKeys()
    }
    override func keyUp(with event: NSEvent) { keys.remove(event.keyCode); syncKeys() }
    private func syncKeys() {
        let left = keys.contains(123) || keys.contains(0), right = keys.contains(124) || keys.contains(2)
        drive(right ? 1 : left ? -1 : 0)
    }
    #endif
}
