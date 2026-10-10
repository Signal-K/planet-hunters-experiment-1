import SwiftUI
import SpriteKit
import LandnamCore

/// Tiny-Space-Program style launch: countdown, ignition and pad smoke, liftoff with camera
/// shake and follow, booster and stage separation, sky fading to space, departure burn.
/// Every visual is a pure function of `elapsed`, so `seek(to:)` renders any beat headlessly
/// and the wall-clock `update` loop only advances `elapsed`.
@MainActor
final class LaunchScene: SKScene {
    private(set) var elapsed: Double = 0
    var reducedMotion = false
    var onTelemetry: ((LaunchTelemetry) -> Void)?
    var onComplete: (() -> Void)?

    private let rows = ["upper-stage", "lower-stage", "booster-l", "booster-r"]
    private let world = SKNode()
    private let spaceOverlay = SKSpriteNode()
    private var stars: [SKSpriteNode] = []
    private var rowSprites: [String: SKSpriteNode] = [:]
    private var puffs: [SKSpriteNode] = []
    private var flash = SKSpriteNode()
    private var mountains = SKNode(), ground = SKNode()
    private var atlas: LaunchAtlas?
    private var fxAtlas: LaunchAtlas?
    private var layout = LaunchPadLayout(width: 402, height: 780)
    private var lastTime: TimeInterval?
    private var lastEmit = -1.0
    private var finished = false
    private var padY: CGFloat { size.height - CGFloat(layout.padDeckY) }
    private let variant: String

    init(size: CGSize, variant: String = "prospector") {
        self.variant = variant
        super.init(size: size)
        scaleMode = .resizeFill
        backgroundColor = Theme.skyTop.sk
    }
    required init?(coder: NSCoder) { fatalError() }

    override func didMove(to view: SKView) {
        removeAllChildren(); world.removeAllChildren(); rowSprites = [:]; stars = []; puffs = []
        layout = LaunchPadLayout(width: size.width, height: size.height)
        atlas = atlas ?? LaunchAtlas(sheet: "\(variant)-launch-sheet", png: "\(variant)-launch-sheet")
        fxAtlas = fxAtlas ?? LaunchAtlas(sheet: "fx-sheet", png: "fx-sheet")
        buildSky(); addChild(world); buildGround(); buildRocket()
        apply()
    }

    override func didChangeSize(_ oldSize: CGSize) {
        guard let view, oldSize != size, oldSize != .zero else { return }
        didMove(to: view)
    }

    // MARK: build
    private func buildSky() {
        let sky = SKSpriteNode(texture: SK.gradient(top: Theme.skyTop, bottom: Theme.horizon))
        sky.size = size; sky.position = CGPoint(x: size.width / 2, y: size.height / 2); sky.zPosition = -30
        addChild(sky)
        spaceOverlay.color = Theme.hex(0x0F2436).sk; spaceOverlay.size = size
        spaceOverlay.position = CGPoint(x: size.width / 2, y: size.height / 2); spaceOverlay.zPosition = -25; spaceOverlay.alpha = 0
        addChild(spaceOverlay)
        var rng = SeededRandom(seed: 11)
        for _ in 0..<46 {
            let s = SKSpriteNode(color: .white, size: CGSize(width: 2, height: 2))
            s.position = CGPoint(x: CGFloat.random(in: 0...size.width, using: &rng), y: CGFloat.random(in: 0...size.height, using: &rng))
            s.zPosition = -24; s.alpha = 0
            addChild(s); stars.append(s)
        }
    }

    /// Layered outlined parts (blueprint style): ice hills, paper ground, ink outlines, offset shade.
    private func buildGround() {
        mountains = SKNode(); ground = SKNode()
        world.addChild(mountains); world.addChild(ground)
        let gh = CGFloat(layout.groundHeight)
        func ridge(_ heights: [CGFloat], fill: Color, z: CGFloat, line: CGFloat) {
            let path = CGMutablePath()
            path.move(to: CGPoint(x: 0, y: gh - 4))
            for (i, h) in heights.enumerated() {
                path.addLine(to: CGPoint(x: size.width * CGFloat(i) / CGFloat(heights.count - 1), y: gh - 4 + h * size.height))
            }
            path.addLine(to: CGPoint(x: size.width, y: gh - 4))
            let n = SKShapeNode(path: path)
            n.fillColor = fill.sk; n.strokeColor = Theme.ink.sk; n.lineWidth = line; n.lineJoin = .round
            n.zPosition = z; mountains.addChild(n)
        }
        ridge([0.09, 0.19, 0.07, 0.22, 0.12, 0.17, 0.08, 0.14, 0.1], fill: Theme.paper2, z: -9, line: 2)
        ridge([0.05, 0.11, 0.04, 0.13, 0.07, 0.1, 0.05], fill: Theme.blueBright.opacity(0.35), z: -8, line: 2.5)
        let g = SKSpriteNode(color: Theme.paper.sk, size: CGSize(width: size.width, height: gh))
        g.anchorPoint = .zero; g.zPosition = -5; ground.addChild(g)
        let lip = SKSpriteNode(color: Theme.ink.sk, size: CGSize(width: size.width, height: 3))
        lip.anchorPoint = .zero; lip.position = CGPoint(x: 0, y: gh - 1); lip.zPosition = -4; ground.addChild(lip)
        let k = CGFloat(layout.rocketScale + 0.4)
        func part(_ w: CGFloat, _ h: CGFloat, x: CGFloat, y: CGFloat, fill: Color, line: CGFloat = 2.5, z: CGFloat) {
            let shade = SKShapeNode(rect: CGRect(x: x - w / 2 + 3, y: y - 3, width: w, height: h))
            shade.fillColor = Theme.blue.opacity(0.4).sk; shade.strokeColor = .clear; shade.zPosition = z - 0.05
            let n = SKShapeNode(rect: CGRect(x: x - w / 2, y: y, width: w, height: h))
            n.fillColor = fill.sk; n.strokeColor = Theme.ink.sk; n.lineWidth = line; n.zPosition = z
            ground.addChild(shade); ground.addChild(n)
        }
        let cx = size.width / 2
        part(190 * k, 12, x: cx, y: padY - 12, fill: Theme.paper, z: -3)
        part(220 * k, 8, x: cx, y: padY - 20, fill: Theme.paper2, z: -3.2)
        for side: CGFloat in [-1, 1] {
            let tx = cx + side * 88 * k
            part(10, 120 * k, x: tx, y: padY - 12, fill: Theme.paper2, line: 2, z: -3.1)
            for i in 1...4 { part(26, 3, x: tx, y: padY - 12 + CGFloat(i) * 30 * k, fill: Theme.blueBright, line: 1.5, z: -3.0) }
            part(36, 5, x: tx - side * 18, y: padY - 12 + 95 * k, fill: Theme.paper2, line: 1.5, z: -3.0)
        }
    }

    private func buildRocket() {
        for row in rows {
            let sp = SKSpriteNode()
            sp.zPosition = ["upper-stage": 1, "lower-stage": 2, "booster-l": 3, "booster-r": 3][row] ?? 1
            world.addChild(sp); rowSprites[row] = sp
        }
        for _ in 0..<8 { let p = SKSpriteNode(); p.zPosition = 6; p.alpha = 0; world.addChild(p); puffs.append(p) }
        flash.zPosition = 7; flash.alpha = 0; world.addChild(flash)
    }

    // MARK: timeline (pure function of elapsed)
    private struct Play { let t: Double; let names: [String] }
    private var plays: [String: [Play]] {
        let ign = LaunchTimeline.ignitionStart, lift = LaunchTimeline.liftoff
        return [
            "booster-l": [Play(t: ign, names: ["ignition", "burn"]), Play(t: lift, names: ["burn"]), Play(t: LaunchTimeline.boosterSep, names: ["separate", "idle"])],
            "booster-r": [Play(t: ign, names: ["ignition", "burn"]), Play(t: lift, names: ["burn"]), Play(t: LaunchTimeline.boosterSep, names: ["separate", "idle"])],
            "lower-stage": [Play(t: ign, names: ["ignition", "burn"]), Play(t: lift, names: ["burn"]), Play(t: LaunchTimeline.stageSep, names: ["separate", "coast"])],
            "upper-stage": [Play(t: 0, names: ["idle"]), Play(t: LaunchTimeline.stageSep, names: ["separate", "relight", "burn"])],
        ]
    }

    func seek(to t: Double) { elapsed = max(0, t); apply() }

    private func apply() {
        guard let atlas, !rowSprites.isEmpty else { return }
        let s = CGFloat(layout.rocketScale), au = atlas.scale
        let alt = LaunchFlight.altitude(at: elapsed)
        // Web follow curve, plus a lock so the stack never rises out of frame.
        let camY = max(CGFloat(LaunchFlight.cameraY(altitude: alt, followStart: layout.followStart)), CGFloat(alt) - size.height * 0.4)
        world.position = CGPoint(x: 0, y: -camY)
        if !reducedMotion, elapsed > LaunchTimeline.ignitionStart, elapsed < LaunchTimeline.liftoff + 1.6 {
            let amp: CGFloat = elapsed < LaunchTimeline.liftoff ? 1.5 : 3 * CGFloat(max(0, 1 - (elapsed - LaunchTimeline.liftoff) / 1.6))
            world.position.x = sin(elapsed * 61) * amp; world.position.y += cos(elapsed * 47) * amp
        }
        let rocket = CGPoint(x: size.width / 2, y: padY + CGFloat(alt))

        // Sky to space.
        let sky = LaunchFlight.skyProgress(altitude: alt)
        spaceOverlay.alpha = CGFloat(sky) * 0.92
        for st in stars { st.alpha = CGFloat(sky * sky) }
        mountains.position.y = 0

        for row in rows {
            guard let sp = rowSprites[row] else { continue }
            guard let list = plays[row], let cur = list.last(where: { elapsed >= $0.t }),
                  let f = SpriteChain.frame(row: row, names: cur.names, counts: atlas.counts, loops: atlas.loops, t: elapsed - cur.t),
                  let e = atlas.entry(f) else { sp.isHidden = true; continue }
            sp.isHidden = elapsed > LaunchTimeline.fadeOut
            sp.texture = e.texture
            sp.size = CGSize(width: e.pixelSize.width * au * s, height: e.pixelSize.height * au * s)
            sp.anchorPoint = e.anchor
            let at = atlas.attach[row] ?? .zero
            var pos = CGPoint(x: rocket.x + at.x * s, y: rocket.y - at.y * s)
            sp.zRotation = 0
            if let d = detach(row: row) {
                let dt = CGFloat(elapsed - d.t)
                let sepAlt = CGFloat(LaunchFlight.altitude(at: d.t))
                let v0 = CGFloat(LaunchFlight.speed(at: d.t))
                pos = CGPoint(x: size.width / 2 + at.x * s + d.vx * dt * s,
                              y: padY + sepAlt - at.y * s + (v0 + d.vy) * dt * s * 0.9 - 0.5 * 160 * dt * dt * s)
                sp.zRotation = -d.spin * dt
            }
            sp.position = pos
        }

        // Pad smoke while the engines build thrust, then trail the pad as the stack clears.
        for (i, p) in puffs.enumerated() {
            let start = LaunchTimeline.ignitionStart + Double(i) * 0.28
            let t = elapsed - start
            if t >= 0, t < 1, let e = fxAtlas?.fx("fx/pad-smoke", index: min(23, Int(t * 24))) {
                p.texture = e.texture; p.anchorPoint = e.anchor
                let k = (0.9 + CGFloat(i % 3) * 0.25) * s * 0.75
                p.size = CGSize(width: e.pixelSize.width * k, height: e.pixelSize.height * k)
                p.position = CGPoint(x: size.width / 2 + (i % 2 == 0 ? -1 : 1) * CGFloat(14 + i * 7) + CGFloat(t) * (i % 2 == 0 ? -22 : 22), y: padY)
                p.alpha = CGFloat(0.85 * (1 - t))
            } else { p.alpha = 0 }
        }
        // Stage separation flash.
        let ft = elapsed - LaunchTimeline.stageSep
        if ft >= 0, ft < 1.0 / 3, let e = fxAtlas?.fx("fx/stage-sep-flash", index: min(7, Int(ft * 24))) {
            flash.texture = e.texture; flash.anchorPoint = e.anchor
            flash.size = CGSize(width: e.pixelSize.width * s * 1.4, height: e.pixelSize.height * s * 1.4)
            flash.position = CGPoint(x: rocket.x, y: rocket.y + 148 * s); flash.alpha = 1
        } else { flash.alpha = 0 }

        emitTelemetry()
    }

    private func detach(row: String) -> (t: Double, vx: CGFloat, vy: CGFloat, spin: CGFloat)? {
        switch row {
        case "booster-l" where elapsed >= LaunchTimeline.boosterSep: (LaunchTimeline.boosterSep, -70, 55, -0.9)
        case "booster-r" where elapsed >= LaunchTimeline.boosterSep: (LaunchTimeline.boosterSep, 70, 55, 0.9)
        case "lower-stage" where elapsed >= LaunchTimeline.stageSep: (LaunchTimeline.stageSep, 12, 90, 0.15)
        default: nil
        }
    }

    private func emitTelemetry() {
        guard elapsed - lastEmit >= 0.1 || elapsed == 0 || elapsed >= LaunchTimeline.done else { return }
        lastEmit = elapsed
        onTelemetry?(LaunchTelemetry(elapsed: elapsed))
    }

    override func update(_ currentTime: TimeInterval) {
        defer { lastTime = currentTime }
        guard let last = lastTime, !finished else { return }
        elapsed += LaunchTimeline.frameDt(currentTime - last)
        if elapsed >= LaunchTimeline.done { elapsed = LaunchTimeline.done; finished = true; apply(); onComplete?(); return }
        apply()
    }

    func skip() {
        guard !finished else { return }
        elapsed = LaunchTimeline.done; finished = true; apply(); onComplete?()
    }
}
