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
                    Art.view("base/kit/space-bands.png").resizable().interpolation(.none)
                        .frame(width: w, height: h)
                    starLayer("stars-far", w: w, h: h, scale: 2, speed: 8, t: t)
                    starLayer("stars-mid", w: w, h: h, scale: 2, speed: 22, t: t)
                    starLayer("stars-near", w: w, h: h, scale: 3, speed: 52, t: t)
                    asteroid(w: w, h: h, t: t)
                    rocket(w: w, h: h, t: t)
                }
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }

    /// Pixel star tile (128x128) scrolled sideways; the tile repeats seamlessly.
    private func starLayer(_ name: String, w: CGFloat, h: CGFloat, scale: CGFloat, speed: Double, t: Double) -> some View {
        let tile = 128 * scale
        let dir: Double = returning ? -1 : 1
        let off = CGFloat((t * speed * dir).truncatingRemainder(dividingBy: Double(tile)))
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

    /// Whole-number pixel scale so the sprites keep the kit's hard pixel grid.
    private func pixelScale(_ target: CGFloat, native: CGFloat) -> CGFloat { max(1, (target / native).rounded(.down)) }

    private func asteroid(w: CGFloat, h: CGFloat, t: Double) -> some View {
        let p = CGFloat(min(1, max(0, progress)))
        let k = pixelScale(min(w * 0.30, h * 0.46) * (0.55 + 0.45 * p), native: 48)
        let side = 48 * k
        let x = w * (1.15 - 0.33 * p)
        return Art.view("base/kit/asteroid-pixel.png")
            .resizable().interpolation(.none)
            .frame(width: side, height: 40 * k)
            .position(x: min(x, w - side * 0.45), y: h * 0.50 + (sin(t * 0.6) * 2).rounded() * k - (h > w ? h * 0.12 : 0))
    }

    private func rocket(w: CGFloat, h: CGFloat, t: Double) -> some View {
        // pad-rocket.png is 22x72, nose up. Rotated 90 degrees clockwise it points right; the flame trails behind.
        let k = pixelScale(min(w * 0.30, 260), native: 72)
        let len = 72 * k, thick = 22 * k
        let frame = reduceMotion ? 0 : Int(t * 12) % 3
        return ZStack {
            Art.view("base/kit/flame-\(frame).png").resizable().interpolation(.none)
                .frame(width: 18 * k, height: 9 * k)
                .offset(x: -len / 2 - 9 * k + k)
            Art.view("base/kit/pad-rocket.png").resizable().interpolation(.none)
                .frame(width: thick, height: len)
                .rotationEffect(.degrees(90))
        }
        .frame(width: len, height: thick)
        .position(x: w * (w > h ? 0.36 : 0.40), y: h * 0.50 + (sin(t * 1.3) * 2).rounded() * k - (h > w ? h * 0.12 : 0))
    }
}
