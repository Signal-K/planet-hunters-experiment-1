import SwiftUI
import LandnamCore

/// Side-on flight, all pixel art (docs/STYLE.md): banded dusk sky and three parallax star tiles drift past
/// the base-pad rocket (nose right, animated flame) while the destination asteroid drifts in from the right.
/// `progress` (0...1) comes from the real transit clock.
struct FlightWorldScene: View {
    var progress: Double
    var returning = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height
            TimelineView(.animation(minimumInterval: 1.0 / 24, paused: reduceMotion)) { ctx in
                let t = reduceMotion ? 0 : ctx.date.timeIntervalSinceReferenceDate
                ZStack {
                    SpaceBackdrop(w: w, h: h, t: t, direction: returning ? -1 : 1)
                    asteroid(w: w, h: h, t: t)
                    rocket(w: w, h: h, t: t)
                }
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }

    /// Whole-number pixel scale so the sprites keep the kit's hard pixel grid.
    private func pixelScale(_ target: CGFloat, native: CGFloat) -> CGFloat { max(1, (target / native).rounded(.down)) }

    private func asteroid(w: CGFloat, h: CGFloat, t: Double) -> some View {
        let p = CGFloat(min(1, max(0, progress)))
        let k = pixelScale(min(w * 0.32, h * 0.34) * (0.6 + 0.4 * p), native: 48)
        let side = 48 * k
        let x = w * (1.15 - 0.33 * p)
        return Art.view("base/kit/asteroid-pixel.png")
            .resizable().interpolation(.none)
            .frame(width: side, height: 40 * k)
            // SSL-534: the whole body stays on screen (a clamp at 0.45 of its width cut it off); on a tall screen it sits low so the space is used.
            .position(x: min(x, w - side * 0.5 - w * 0.06), y: h * (h > w ? 0.64 : 0.50) + (sin(t * 0.6) * 2).rounded() * k)
    }

    private func rocket(w: CGFloat, h: CGFloat, t: Double) -> some View {
        let k = SpaceRocketSprite.scale(length: min(w * 0.22, h * 0.38))
        return SpaceRocketSprite(k: k, t: t)
            .position(x: w * (w > h ? 0.36 : 0.40), y: h * (h > w ? 0.32 : 0.50) + (sin(t * 1.3) * 2).rounded() * k)
    }
}

/// The flight sky shared by transit and the lander leg: banded space under three pixel star layers drifting sideways.
struct SpaceBackdrop: View {
    let w: CGFloat, h: CGFloat
    /// Seconds of drift; a fraction of real time slows the stars down.
    let t: Double
    var direction: Double = 1

    var body: some View {
        ZStack {
            Art.view("base/kit/space-bands.png").resizable().interpolation(.none)
                .frame(width: w, height: h)
            starLayer("stars-far", scale: 2, speed: 8)
            starLayer("stars-mid", scale: 2, speed: 22)
            starLayer("stars-near", scale: 3, speed: 52)
        }
    }

    /// Pixel star tile (128x128) scrolled sideways; the tile repeats seamlessly.
    private func starLayer(_ name: String, scale: CGFloat, speed: Double) -> some View {
        let tile = 128 * scale
        let off = CGFloat((t * speed * direction).truncatingRemainder(dividingBy: Double(tile)))
        let cols = Int(ceil(w / tile)) + 2, rows = Int(ceil(h / tile)) + 1
        return VStack(spacing: 0) {
            ForEach(0..<rows, id: \.self) { _ in
                HStack(spacing: 0) {
                    ForEach(0..<cols, id: \.self) { _ in
                        Art.view("base/kit/\(name).png").resizable().interpolation(.none).frame(width: tile, height: tile)
                    }
                }
            }
        }
        .offset(x: -off - tile)
        .frame(width: w, height: h, alignment: .topLeading)
        .clipped()
    }
}

/// The flight ship: space-rocket.png is 44x72, nose up, the core stage without side boosters (they stay on Earth).
/// Rotated 90 degrees clockwise it points right; the flame trails behind while it burns.
struct SpaceRocketSprite: View {
    /// Whole-number pixel scale so the sprite keeps the kit's hard pixel grid.
    let k: CGFloat
    let t: Double
    var burning = true
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    static func scale(length: CGFloat) -> CGFloat { max(1, (length / 72).rounded(.down)) }

    var body: some View {
        let len = 72 * k, thick = 44 * k
        let frame = reduceMotion ? 0 : Int(t * 12) % 3
        ZStack {
            if burning {
                Art.view("base/kit/flame-\(frame).png").resizable().interpolation(.none)
                    .frame(width: 18 * k, height: 9 * k)
                    .offset(x: -len / 2 - 9 * k + k)
            }
            Art.view("base/kit/space-rocket.png").resizable().interpolation(.none)
                .frame(width: thick, height: len)
                .rotationEffect(.degrees(90))
        }
        .frame(width: len, height: thick)
    }
}
