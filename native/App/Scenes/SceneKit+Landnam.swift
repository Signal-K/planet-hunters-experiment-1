import SpriteKit
import SwiftUI
import LandnamCore

#if canImport(UIKit)
typealias PlatformColor = UIColor
#else
typealias PlatformColor = NSColor
#endif

extension Color {
    var sk: PlatformColor { PlatformColor(self) }
}

@MainActor
enum SK {
    static func texture(_ path: String) -> SKTexture? {
        Art.image(path).map { t in
            let tex = SKTexture(image: t)
            tex.filteringMode = .nearest   // chunky pixels, Crashlands-style
            return tex
        }
    }

    static func hex(_ s: String) -> PlatformColor {
        let v = UInt32(s.dropFirst(), radix: 16) ?? 0xFFFFFF
        return Theme.hex(v).sk
    }

    /// Vertical gradient texture for skies (SpriteKit has no native gradient node).
    static func gradient(top: Color, bottom: Color, height: Int = 256) -> SKTexture {
        let size = CGSize(width: 2, height: height)
        let renderer = ImageRenderer(content: LinearGradient(colors: [top, bottom], startPoint: .top, endPoint: .bottom).frame(width: size.width, height: size.height))
        renderer.scale = 1
        #if canImport(UIKit)
        if let img = renderer.uiImage { return SKTexture(image: img) }
        #else
        if let img = renderer.nsImage { return SKTexture(image: img) }
        #endif
        return SKTexture()
    }

    /// Chunky square spark burst used for hits, pops and engine puffs.
    static func burst(at p: CGPoint, color: PlatformColor, count: Int = 8, speed: CGFloat = 70, in parent: SKNode, z: CGFloat = 50) {
        for _ in 0..<count {
            let s = SKSpriteNode(color: color, size: CGSize(width: 5, height: 5))
            s.position = p; s.zPosition = z
            parent.addChild(s)
            let a = CGFloat.random(in: 0...(2 * .pi)), d = CGFloat.random(in: 0.4...1) * speed
            s.run(.sequence([
                .group([.moveBy(x: cos(a) * d, y: sin(a) * d, duration: 0.45), .fadeOut(withDuration: 0.45), .scale(to: 0.2, duration: 0.45)]),
                .removeFromParent(),
            ]))
        }
    }
}
