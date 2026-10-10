import SpriteKit
import LandnamCore

/// Side-view flight in the Tiny Space Program spirit: the ship holds centre while parallax
/// bands stream past, the origin world shrinks behind and the destination grows ahead.
/// `progress` (0...1) is driven by the real transit clock, so it is wall-clock honest.
@MainActor
final class FlightScene: SKScene {
    var progress: Double = 0 { didSet { applyProgress() } }
    let returning: Bool
    let targetName: String
    let shipArt: String

    private let ship = SKNode()
    private let origin = SKNode()
    private let dest = SKNode()
    private var streaks: [SKSpriteNode] = []
    private var puffTimer: TimeInterval = 0

    init(size: CGSize, returning: Bool, targetName: String, shipArt: String = "ships/ship_sr1.png") {
        self.returning = returning; self.targetName = targetName; self.shipArt = shipArt
        super.init(size: size)
        scaleMode = .resizeFill
        backgroundColor = Theme.skyMid.sk
    }
    required init?(coder: NSCoder) { fatalError() }

    override func didMove(to view: SKView) {
        removeAllChildren(); streaks = []
        for n in [ship, origin, dest] { n.removeAllChildren() }
        let sky = SKSpriteNode(texture: SK.gradient(top: Theme.mix(0.55), bottom: Theme.skyTop))
        sky.size = size; sky.position = CGPoint(x: size.width / 2, y: size.height / 2); sky.zPosition = -20
        addChild(sky)

        // Drifting dust streaks + cloud banks give speed and depth (3 parallax layers).
        for layer in 0..<3 {
            let speed = [40.0, 90.0, 180.0][layer]
            for i in 0..<(6 + layer * 4) {
                let w = CGFloat([5, 14, 30][layer])
                let s = SKSpriteNode(color: Theme.hex(0xFFFFFF, [0.35, 0.5, 0.7][layer]).sk, size: CGSize(width: w, height: layer == 0 ? 3 : 2))
                s.position = CGPoint(x: .random(in: 0...size.width), y: .random(in: 0...size.height))
                s.zPosition = -10 + CGFloat(layer)
                addChild(s); streaks.append(s)
                s.userData = ["speed": speed + Double(i)]
            }
        }
        for (i, id) in ["cloud_bank_a", "cloud_bank_b", "cloud_bank_a"].enumerated() {
            guard let tex = SK.texture("terrain/\(id).png") else { continue }
            let c = SKSpriteNode(texture: tex, size: CGSize(width: 150, height: 48))
            c.alpha = 0.55; c.zPosition = -15
            c.position = CGPoint(x: CGFloat(i) * size.width / 2.2, y: size.height * [0.75, 0.3, 0.55][i])
            c.userData = ["speed": 25.0 + Double(i) * 8]
            addChild(c); streaks.append(c)
        }

        for (node, color) in [(origin, Theme.blue), (dest, Theme.teal)] {
            let planet = SKSpriteNode(texture: SK.planet(radius: 70, color: color))
            planet.size = CGSize(width: 164, height: 164)
            node.addChild(planet); node.zPosition = -12
            addChild(node)
            planet.run(.repeatForever(.sequence([.moveBy(x: 0, y: 4, duration: 3), .moveBy(x: 0, y: -4, duration: 3)])))
        }
        let label = SKLabelNode(text: targetName.uppercased())
        label.fontName = "Oxanium-Bold"; label.fontSize = 10; label.fontColor = Theme.ink.sk
        label.position = CGPoint(x: 0, y: -92); dest.addChild(label)

        ship.zPosition = 5
        let body = SKSpriteNode(texture: SK.texture(shipArt), size: CGSize(width: 132, height: 50))
        ship.addChild(body)
        // Engine flame flickers behind the nozzle; scales with a quick random pulse.
        let flame = SKShapeNode(path: { let p = CGMutablePath(); p.move(to: .zero); p.addLine(to: CGPoint(x: 34, y: 7)); p.addLine(to: CGPoint(x: 34, y: -7)); p.closeSubpath(); return p }())
        flame.fillColor = Theme.hex(0x36C6E2).sk; flame.strokeColor = Theme.ink.sk; flame.lineWidth = 1.5
        flame.position = CGPoint(x: 64, y: 0); flame.zPosition = -1
        flame.run(.repeatForever(.sequence([.scaleX(to: 1.35, duration: 0.07), .scaleX(to: 0.8, duration: 0.09), .scaleX(to: 1.1, duration: 0.06)])))
        body.addChild(flame)
        addChild(ship)
        let bob = SKAction.moveBy(x: 0, y: 5, duration: 1.1); bob.timingMode = .easeInEaseOut
        body.run(.repeatForever(.sequence([bob, bob.reversed()])))
        // Art faces left; outbound flies right toward the destination.
        ship.xScale = returning ? 1 : -1
        applyProgress()
    }

    private func applyProgress() {
        guard view != nil else { return }
        let p = CGFloat(min(1, max(0, progress)))
        ship.position = CGPoint(x: size.width * 0.5, y: size.height * 0.52)
        // Origin recedes left and shrinks; destination rises from the right and grows.
        let (a, b) = returning ? (dest, origin) : (origin, dest)
        a.position = CGPoint(x: size.width * (0.1 - 0.5 * p), y: size.height * (0.3 - 0.05 * p)); a.setScale(1.2 - 1.0 * p)
        b.position = CGPoint(x: size.width * (1.12 - 0.45 * p), y: size.height * (0.78 - 0.14 * p)); b.setScale(0.3 + 1.1 * p)
    }

    override func didChangeSize(_ oldSize: CGSize) { if view != nil, oldSize != size, oldSize != .zero { didMove(to: view!) } }

    private var last: TimeInterval = 0
    override func update(_ t: TimeInterval) {
        let dt = last == 0 ? 0 : t - last; last = t
        for s in streaks {
            let sp = (s.userData?["speed"] as? Double) ?? 40
            s.position.x -= CGFloat(sp * dt) * (returning ? -1 : 1)
            if s.position.x < -s.size.width { s.position.x = size.width + s.size.width; s.position.y = .random(in: 0...size.height) }
            if s.position.x > size.width + s.size.width { s.position.x = -s.size.width; s.position.y = .random(in: 0...size.height) }
        }
        puffTimer += dt
        if puffTimer > 0.07 {
            puffTimer = 0
            let dir: CGFloat = returning ? 1 : -1
            let p = CGPoint(x: ship.position.x + dir * 70, y: ship.position.y + .random(in: -4...4))
            SK.burst(at: p, color: [Theme.blueBright.sk, .white, Theme.teal.sk].randomElement()!, count: 1, speed: 30, in: self, z: 4)
        }
    }
}
