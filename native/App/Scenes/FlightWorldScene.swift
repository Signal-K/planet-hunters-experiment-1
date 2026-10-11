import SwiftUI
import LandnamCore

/// Side-on flight: pure space to every edge. Three parallax star layers and soft purple dust drift past
/// the base-pad rocket (nose right, animated flame) while the destination asteroid drifts in from the right.
/// `progress` (0...1) comes from the real transit clock.
struct FlightWorldScene: View {
    var progress: Double
    var returning = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private static let stars: [[(x: Double, y: Double, s: Double)]] = {
        var g = SystemRandomNumberGenerator()
        _ = g
        var seed: UInt64 = 0x9E3779B97F4A7C15
        func next() -> Double { seed = seed &* 6364136223846793005 &+ 1442695040888963407; return Double(seed >> 33) / Double(UInt64(1) << 31) }
        return [70, 45, 22].map { n in (0..<n).map { _ in (next(), next(), next()) } }
    }()

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height
            TimelineView(.animation(minimumInterval: 1.0 / 24, paused: reduceMotion)) { ctx in
                let t = reduceMotion ? 0 : ctx.date.timeIntervalSinceReferenceDate
                ZStack {
                    Canvas { c, size in
                        c.fill(Path(CGRect(origin: .zero, size: size)), with: .linearGradient(
                            Gradient(colors: [Color(red: 0.06, green: 0.05, blue: 0.19), Color(red: 0.04, green: 0.03, blue: 0.13)]),
                            startPoint: .zero, endPoint: CGPoint(x: 0, y: size.height)))
                        // Soft purple dust bands, slow drift.
                        for i in 0..<5 {
                            let speed = 6.0 + Double(i) * 3
                            let off = CGFloat((t * speed).truncatingRemainder(dividingBy: Double(size.width * 1.6)))
                            let x = size.width * 1.3 - off, y = size.height * (0.12 + 0.18 * CGFloat(i))
                            let r = CGRect(x: x - size.width * 0.5, y: y, width: size.width * 1.0, height: size.height * 0.10)
                            c.fill(Path(ellipseIn: r), with: .color(Color(red: 0.32, green: 0.16, blue: 0.5).opacity(0.14)))
                        }
                        // Star layers: speed and size grow toward the camera; px-snapped squares.
                        for (li, layer) in Self.stars.enumerated() {
                            let speed = [8.0, 22.0, 52.0][li]
                            let sz: CGFloat = [2, 2, 3][li]
                            for (i, s) in layer.enumerated() {
                                let x = (CGFloat(s.x) * size.width - CGFloat(t * speed * (returning ? -1 : 1))).truncatingRemainder(dividingBy: size.width)
                                let px = x < 0 ? x + size.width : x
                                let tw = 0.55 + 0.45 * sin(t * (1.2 + s.s * 2) + Double(i))
                                let tint = i % 5 == 0 ? Color(red: 0.75, green: 0.7, blue: 1) : Color.white
                                c.fill(Path(CGRect(x: px.rounded(), y: (CGFloat(s.y) * size.height).rounded(), width: sz, height: sz)),
                                       with: .color(tint.opacity([0.45, 0.65, 0.9][li] * tw)))
                            }
                        }
                    }
                    asteroid(w: w, h: h, t: t)
                    rocket(w: w, h: h, t: t)
                }
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }

    private func asteroid(w: CGFloat, h: CGFloat, t: Double) -> some View {
        let p = CGFloat(min(1, max(0, progress)))
        let side = min(w * 0.30, h * 0.46) * (0.55 + 0.45 * p)
        let x = w * (1.15 - 0.33 * p) + side * 0.0
        return Art.view("base/kit/asteroid-grey.png")
            .resizable().interpolation(.none).scaledToFit()
            .frame(width: side, height: side)
            .rotationEffect(.degrees(t * 2.5))
            .position(x: min(x, w - side * 0.45), y: h * 0.50 + CGFloat(sin(t * 0.6)) * 5 - (h > w ? h * 0.12 : 0))
    }

    private func rocket(w: CGFloat, h: CGFloat, t: Double) -> some View {
        // pad-rocket.png is 22x72, nose up. Rotated 90 degrees clockwise it points right.
        let len = min(w * 0.30, 260)
        let thick = len * 22.0 / 72.0
        let flick = 0.85 + 0.25 * sin(t * 38) * sin(t * 23)
        return ZStack {
            Canvas { c, size in
                let base = CGPoint(x: size.width, y: size.height / 2)
                let l = size.width * CGFloat(flick)
                for (k, col) in [(1.0, Color(red: 0.95, green: 0.35, blue: 0.1)), (0.7, Color(red: 1, green: 0.62, blue: 0.15)), (0.4, Color(red: 1, green: 0.92, blue: 0.7))].enumerated().map({ ($0.offset, $0.element.1) }) {
                    let f = [1.0, 0.7, 0.4][k]
                    var p = Path()
                    p.move(to: CGPoint(x: base.x, y: base.y - size.height * 0.5 * f))
                    p.addLine(to: CGPoint(x: base.x - l * f, y: base.y))
                    p.addLine(to: CGPoint(x: base.x, y: base.y + size.height * 0.5 * f))
                    p.closeSubpath()
                    c.fill(p, with: .color(col))
                }
            }
            .frame(width: len * 0.55, height: thick * 0.45)
            .offset(x: -len / 2 - len * 0.55 / 2 + 2)
            Art.view("base/kit/pad-rocket.png").resizable().interpolation(.none)
                .frame(width: thick, height: len)
                .rotationEffect(.degrees(90))
        }
        .frame(width: len, height: thick)
        .position(x: w * (w > h ? 0.36 : 0.40), y: h * 0.50 + CGFloat(sin(t * 1.3)) * 4 - (h > w ? h * 0.12 : 0))
    }
}
