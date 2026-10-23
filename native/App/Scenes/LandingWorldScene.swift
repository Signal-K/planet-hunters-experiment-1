import SwiftUI
import LandnamCore

/// Lander leg scene (web `LandingController`): the ship holds orbit up top and the lander rides a rail down to the
/// target's pad (descent) or back up to the ship (ascent). Progress comes from the persisted clock, so a remount never
/// resets it. The sky is the same `SpaceBackdrop` transit flies through.
struct LandingWorldScene: View {
    var progress: Double
    var mode: Landing.Mode
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height
            let tall = h > w
            let orbitY = h * (tall ? 0.16 : 0.18)
            let groundY = h * (tall ? 0.64 : 0.74)
            TimelineView(.animation(minimumInterval: 1.0 / 24, paused: reduceMotion)) { ctx in
                let t = reduceMotion ? 0 : ctx.date.timeIntervalSinceReferenceDate
                ZStack {
                    // The ship is in orbit now, so the stars barely drift.
                    SpaceBackdrop(w: w, h: h, t: t * 0.15)
                    Canvas { g, size in
                        drawGround(&g, size: size, groundY: groundY)
                        drawLander(&g, size: size, orbitY: orbitY, groundY: groundY, t: t)
                    }
                    let k = SpaceRocketSprite.scale(length: min(w * 0.18, h * 0.22))
                    SpaceRocketSprite(k: k, t: t, burning: false)
                        .position(x: w / 2, y: orbitY + (sin(t * 1.3) * 2).rounded() * k)
                }
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    /// One unit of the web scene's geometry, scaled so the lander reads on every screen size.
    private func unit(_ size: CGSize) -> CGFloat { max(1.5, min(size.width, size.height) / 200) }

    /// The target's surface band, shaded toward the viewer, with craters, its lip, hatching and the landing pad ring.
    private func drawGround(_ g: inout GraphicsContext, size: CGSize, groundY: CGFloat) {
        let u = unit(size), w = size.width, h = size.height
        g.fill(Path(CGRect(x: 0, y: groundY, width: w, height: h - groundY)),
               with: .linearGradient(Gradient(colors: [Theme.groundFar, Theme.groundNear]),
                                     startPoint: CGPoint(x: 0, y: groundY), endPoint: CGPoint(x: 0, y: h)))
        // Fixed crater field (fractions of the width, depth into the band, size): flatter the nearer the horizon.
        for (fx, fy, r) in [(0.12, 0.18, 18.0), (0.31, 0.46, 26.0), (0.68, 0.24, 14.0), (0.86, 0.55, 30.0), (0.47, 0.78, 22.0)] {
            let cy = groundY + (h - groundY) * fy, rx = CGFloat(r) * u, ry = rx * (0.25 + 0.3 * fy)
            g.fill(Path(ellipseIn: CGRect(x: w * fx - rx, y: cy - ry, width: rx * 2, height: ry * 2)), with: .color(Theme.horizon))
            g.stroke(Path(ellipseIn: CGRect(x: w * fx - rx, y: cy - ry, width: rx * 2, height: ry * 2)), with: .color(Theme.groundLip), lineWidth: 1)
        }
        var hatch = Path()
        var x: CGFloat = 0
        while x < w + 16 * u {
            hatch.move(to: CGPoint(x: x, y: groundY)); hatch.addLine(to: CGPoint(x: x - 16 * u, y: h))
            x += 40 * u
        }
        g.stroke(hatch, with: .color(Theme.groundFar), lineWidth: 1)
        g.fill(Path(CGRect(x: 0, y: groundY, width: w, height: 3 * u)), with: .color(Theme.groundLip))
        // The pad ring lies on the lip, not above it.
        let pad = CGRect(x: w / 2 - 20 * u, y: groundY - 4 * u, width: 40 * u, height: 8 * u)
        g.stroke(Path(ellipseIn: pad), with: .color(mode == .descend ? Theme.blueBright : Theme.paper2), lineWidth: 2 * u)
    }

    /// The rail from the ship to the pad, the lander on it, its burn while moving and a pulse where it ends up.
    private func drawLander(_ g: inout GraphicsContext, size: CGSize, orbitY: CGFloat, groundY: CGFloat, t: Double) {
        let u = unit(size), cx = size.width / 2
        // At the bottom of the rail the legs (16 units below the lander's centre) stand on the ground line.
        let railStart = orbitY + 16 * u, railEnd = groundY - 16 * u
        var rail = Path(); rail.move(to: CGPoint(x: cx, y: railStart)); rail.addLine(to: CGPoint(x: cx, y: groundY))
        g.stroke(rail, with: .color(Theme.paper2.opacity(0.5)), style: StrokeStyle(lineWidth: 2 * u, dash: [6 * u, 4 * u]))

        let p = min(1, max(0, progress))
        let local = mode == .descend ? p : 1 - p
        // It only bobs while flying; parked on the pad or docked it holds still.
        let flying = p > 0 && p < 1
        let bob = flying ? CGFloat(sin(t * 3) * 1.4) * u : 0
        let y = railStart + (railEnd - railStart) * local + bob

        // Arrived: a pulse where it ended up, under the lander.
        if p >= 1 {
            let pulse = 0.5 + sin(t * 4) * 0.3
            let destY = mode == .descend ? groundY : railStart
            g.fill(Path(ellipseIn: CGRect(x: cx - 6 * u, y: destY - 6 * u, width: 12 * u, height: 12 * u)),
                   with: .color(Theme.blueBright.opacity(pulse)))
        }

        // White panelled hull with a navy outline and blue trim, legs out.
        var legs = Path()
        legs.move(to: CGPoint(x: cx - 10 * u, y: y + 10 * u)); legs.addLine(to: CGPoint(x: cx - 15 * u, y: y + 16 * u))
        legs.move(to: CGPoint(x: cx + 10 * u, y: y + 10 * u)); legs.addLine(to: CGPoint(x: cx + 15 * u, y: y + 16 * u))
        g.stroke(legs, with: .color(Theme.ink), lineWidth: 2 * u)
        var hull = Path()
        hull.move(to: CGPoint(x: cx - 10 * u, y: y + 10 * u))
        hull.addLine(to: CGPoint(x: cx, y: y - 10 * u))
        hull.addLine(to: CGPoint(x: cx + 10 * u, y: y + 10 * u))
        hull.closeSubpath()
        g.fill(hull, with: .color(Theme.paper))
        g.stroke(hull, with: .color(Theme.ink), lineWidth: 2 * u)
        g.fill(Path(CGRect(x: cx - 6 * u, y: y + 4 * u, width: 12 * u, height: 2 * u)), with: .color(Theme.blue))

        // The burn under the hull while it flies.
        if p < 1 {
            let flicker = 0.4 + sin(t * 8) * 0.25
            g.fill(Path(ellipseIn: CGRect(x: cx - 3 * u, y: y + 11 * u, width: 6 * u, height: 6 * u)),
                   with: .color(Theme.blueBright.opacity(flicker)))
        }
    }
}
