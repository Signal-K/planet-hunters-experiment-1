import SwiftUI

/// SSL-830 (web components/game/sky/SkyMapBase): the one sky map every sky view is built on, the dark Control Station
/// scope. Near-black navy, a faint cyan grid, a soft Milky Way and seeded cream/warm twinkling stars. Views draw their
/// own marks (reticle, anomalies, field chart) on top.
enum SkyMapBase {
    static let background = Theme.hex(0x050A16)
    static let cream = Theme.hex(0xF4EFE4)
    static let warm = Theme.hex(0xFFE9B8)
    static let cyanSoft = Theme.hex(0x9DE7EF)

    private static let stars: [(x: Double, y: Double, r: Double, warm: Bool, phase: Double)] = {
        var seed: UInt64 = 7
        func next() -> Double { seed = (seed * 16807) % 2147483647; return Double(seed) / 2147483647 }
        return (0..<220).map { _ in (next(), next(), 1 + (next() * 2).rounded(), next() > 0.8, next() * 6.28) }
    }()

    /// Draws the base sky into `ctx`. `pan` swings the stars, in fractions of the frame (SSL-826): they sit on a sky
    /// 1.8 times the frame so a swing never shows an edge.
    static func draw(_ ctx: GraphicsContext, size: CGSize, time t: Double, pan: (x: Double, y: Double) = (0, 0), still: Bool = false, grid: Bool = true, stars showStars: Bool = true) {
        ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .color(background))
        let glow = Gradient(colors: [Theme.hex(0x58D0EA).opacity(0.08), .clear])
        ctx.fill(Path(ellipseIn: CGRect(x: -size.width * 0.31, y: -size.height * 0.12, width: size.width * 1.1, height: size.height * 0.8)),
                 with: .radialGradient(glow, center: CGPoint(x: size.width * 0.24, y: size.height * 0.28), startRadius: 0, endRadius: size.width * 0.4))
        if grid {
            var path = Path()
            for i in 1..<8 { let x = size.width * Double(i) / 8; path.move(to: CGPoint(x: x, y: 0)); path.addLine(to: CGPoint(x: x, y: size.height)) }
            for i in 1..<4 { let y = size.height * Double(i) / 4; path.move(to: CGPoint(x: 0, y: y)); path.addLine(to: CGPoint(x: size.width, y: y)) }
            ctx.stroke(path, with: .color(cyanSoft.opacity(0.06)), lineWidth: 1)
        }
        guard showStars else { return }
        // The Milky Way: a soft diagonal band under the stars, swinging with them.
        var band = Path()
        let ox = (pan.x - 0.4) * size.width, oy = (pan.y - 0.4) * size.height
        band.move(to: CGPoint(x: ox, y: oy + size.height * 1.5)); band.addLine(to: CGPoint(x: ox + size.width * 1.8, y: oy + size.height * 0.3))
        ctx.stroke(band, with: .color(cream.opacity(0.06)), style: StrokeStyle(lineWidth: size.height * 0.22, lineCap: .round))
        for s in stars {
            let a = still ? 0.7 : 0.25 + 0.75 * (0.5 + 0.5 * sin(t * 1.4 + s.phase))
            let x = (s.x * 1.8 - 0.4 + pan.x) * size.width, y = (s.y * 1.8 - 0.4 + pan.y) * size.height
            guard x > -4, x < size.width + 4, y > -4, y < size.height + 4 else { continue }
            ctx.fill(Path(ellipseIn: CGRect(x: x, y: y, width: s.r, height: s.r)), with: .color((s.warm ? warm : cream).opacity(a)))
        }
    }
}
