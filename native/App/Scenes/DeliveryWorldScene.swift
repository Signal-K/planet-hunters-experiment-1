import SwiftUI
import LandnamCore

/// Cargo hand-off scene (web `DeliveryController`): the ship is docked on the left of the berth deck and crates ride
/// the transfer rail into the client's depot on the right. Progress comes from the persisted clock, so a remount
/// never resets or completes the unload. The sky is the same `SpaceBackdrop` transit flies through.
struct DeliveryWorldScene: View {
    var progress: Double
    var cargoUnits: Int
    /// Width covered by the status plate on the left in landscape; the berth is laid out in what is left.
    var leadingInset: CGFloat = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height
            let deckY = h * (h > w ? 0.62 : 0.72)
            TimelineView(.animation(minimumInterval: 1.0 / 24, paused: reduceMotion)) { ctx in
                let t = reduceMotion ? 0 : ctx.date.timeIntervalSinceReferenceDate
                ZStack {
                    // Docked, so the stars barely drift.
                    SpaceBackdrop(w: w, h: h, t: t * 0.1)
                    Canvas { g, size in
                        drawDeck(&g, size: size, deckY: deckY)
                        drawDepot(&g, size: size, deckY: deckY, t: t)
                        drawShip(&g, size: size, deckY: deckY)
                        drawTransfer(&g, size: size, deckY: deckY, t: t)
                    }
                }
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    /// One unit of the web scene's geometry, scaled so the berth reads on every screen size.
    private func unit(_ size: CGSize) -> CGFloat { max(1.2, min(size.width, size.height) / 320) }

    private func railY(_ size: CGSize, deckY: CGFloat) -> CGFloat { deckY - 34 * unit(size) }
    /// Far enough in that the tail (66 units back) stays on screen.
    private func shipX(_ size: CGSize) -> CGFloat { leadingInset + max((size.width - leadingInset) * 0.23, 74 * unit(size)) }
    private func depotX(_ size: CGSize) -> CGFloat { leadingInset + (size.width - leadingInset) * 0.78 }

    /// The berth deck, shaded toward the viewer, with its lip and raked plating seams.
    private func drawDeck(_ g: inout GraphicsContext, size: CGSize, deckY: CGFloat) {
        let u = unit(size), w = size.width, h = size.height
        g.fill(Path(CGRect(x: 0, y: deckY, width: w, height: h - deckY)),
               with: .linearGradient(Gradient(colors: [Theme.groundFar, Theme.groundNear]),
                                     startPoint: CGPoint(x: 0, y: deckY), endPoint: CGPoint(x: 0, y: h)))
        var seams = Path()
        var x: CGFloat = 0
        while x < w + 18 * u {
            seams.move(to: CGPoint(x: x, y: deckY)); seams.addLine(to: CGPoint(x: x - 18 * u, y: h))
            x += 44 * u
        }
        g.stroke(seams, with: .color(Theme.groundFar), lineWidth: 1)
        g.fill(Path(CGRect(x: 0, y: deckY, width: w, height: 3 * u)), with: .color(Theme.groundLip))
    }

    /// The client's receiving depot standing on the deck: hatch, slats and a lamp that settles when the transfer is done.
    private func drawDepot(_ g: inout GraphicsContext, size: CGSize, deckY: CGFloat, t: Double) {
        let u = unit(size), x = depotX(size)
        let body = Path(roundedRect: CGRect(x: x - 42 * u, y: deckY - 112 * u, width: 84 * u, height: 112 * u), cornerRadius: 4 * u)
        g.fill(body, with: .color(Theme.paper))
        g.stroke(body, with: .color(Theme.ink), lineWidth: 2 * u)
        g.fill(Path(CGRect(x: x - 18 * u, y: deckY - 99 * u, width: 36 * u, height: 7 * u)), with: .color(Theme.blue))
        let hatch = Path(CGRect(x: x - 29 * u, y: deckY - 76 * u, width: 58 * u, height: 60 * u))
        g.fill(hatch, with: .color(Theme.paper2))
        g.stroke(hatch, with: .color(Theme.ink), lineWidth: 2 * u)
        var slats = Path()
        var y = deckY - 68 * u
        while y < deckY - 20 * u {
            slats.move(to: CGPoint(x: x - 23 * u, y: y)); slats.addLine(to: CGPoint(x: x + 23 * u, y: y))
            y += 12 * u
        }
        g.stroke(slats, with: .color(Theme.ink.opacity(0.35)), lineWidth: 1)
        let done = progress >= 1
        let pulse = done ? 1 : 0.45 + sin(t * 4) * 0.25
        g.fill(Path(ellipseIn: CGRect(x: x + 19 * u - 5 * u, y: deckY - 118 * u - 5 * u, width: 10 * u, height: 10 * u)),
               with: .color((done ? Theme.paper : Theme.blueBright).opacity(pulse)))
        g.stroke(Path(ellipseIn: CGRect(x: x + 19 * u - 5 * u, y: deckY - 118 * u - 5 * u, width: 10 * u, height: 10 * u)),
                 with: .color(Theme.ink), lineWidth: 1)
    }

    /// The ship, white panelled hull with blue trim and a navy outline, resting on its wheels on the deck.
    private func drawShip(_ g: inout GraphicsContext, size: CGSize, deckY: CGFloat) {
        let u = unit(size), x = shipX(size)
        // The wheels (radius 8, centred 23 below the hull line) touch the deck lip.
        let y = deckY - 31 * u
        func p(_ dx: CGFloat, _ dy: CGFloat) -> CGPoint { CGPoint(x: x + dx * u, y: y + dy * u) }
        var hull = Path()
        hull.move(to: p(-66, 18)); hull.addLine(to: p(-42, -18)); hull.addLine(to: p(35, -18))
        hull.addLine(to: p(62, 0)); hull.addLine(to: p(35, 18)); hull.closeSubpath()
        g.fill(hull, with: .color(Theme.paper))
        g.stroke(hull, with: .color(Theme.ink), lineWidth: 2 * u)
        var fin = Path()
        fin.move(to: p(-44, -18)); fin.addLine(to: p(-24, -41)); fin.addLine(to: p(9, -18)); fin.closeSubpath()
        g.fill(fin, with: .color(Theme.paper2))
        g.stroke(fin, with: .color(Theme.ink), lineWidth: 1.5 * u)
        g.fill(Path(CGRect(x: x - 50 * u, y: y + 4 * u, width: 80 * u, height: 3 * u)), with: .color(Theme.blue))
        // The open cargo door facing the rail.
        let door = Path(CGRect(x: x + 20 * u, y: y - 11 * u, width: 20 * u, height: 22 * u))
        g.fill(door, with: .color(Theme.ink))
        g.stroke(door, with: .color(Theme.blueBright), lineWidth: 2 * u)
        for wx in [-38.0, 34.0] {
            let wheel = Path(ellipseIn: CGRect(x: x + (wx - 8) * u, y: y + 15 * u, width: 16 * u, height: 16 * u))
            g.fill(wheel, with: .color(Theme.ink))
            g.stroke(wheel, with: .color(Theme.paper2), lineWidth: 2 * u)
        }
    }

    /// The transfer rail from the cargo door to the depot hatch, filling with progress, and the crates riding it in turn.
    private func drawTransfer(_ g: inout GraphicsContext, size: CGSize, deckY: CGFloat, t: Double) {
        let u = unit(size)
        // From the ship's nose to just short of the depot hatch.
        let start = shipX(size) + 62 * u, end = depotX(size) - 39 * u
        let y = railY(size, deckY: deckY)
        let p = min(1, max(0, progress))
        var rail = Path(); rail.move(to: CGPoint(x: start, y: y)); rail.addLine(to: CGPoint(x: end, y: y))
        g.stroke(rail, with: .color(Theme.ink), lineWidth: 5 * u)
        var filled = Path(); filled.move(to: CGPoint(x: start, y: y)); filled.addLine(to: CGPoint(x: start + (end - start) * p, y: y))
        g.stroke(filled, with: .color(Theme.blueBright), lineWidth: 3 * u)
        // Rail posts down to the deck so the rail is held up, not floating.
        var posts = Path()
        for f in [0.0, 0.5, 1.0] {
            let px = start + (end - start) * f
            posts.move(to: CGPoint(x: px, y: y)); posts.addLine(to: CGPoint(x: px, y: deckY))
        }
        g.stroke(posts, with: .color(Theme.ink), lineWidth: 2 * u)

        let count = max(2, min(6, cargoUnits == 0 ? 2 : cargoUnits))
        for i in 0..<count {
            let local = min(1, max(0, (p - Double(i) / Double(count)) * Double(count)))
            let x = start + (end - start) * local
            // Crates bob while riding and sit flat on the rail once stowed or still waiting.
            let moving = local > 0 && local < 1
            // Only the crate on the rail shows: the rest are still in the hold or already stowed in the depot.
            let next = local == 0 && (i == 0 || (p - Double(i - 1) / Double(count)) * Double(count) >= 1)
            guard p < 1, moving || next else { continue }
            let bob = moving ? CGFloat(sin(t * 3 + Double(i)) * 1.4) * u : 0
            // Crate bottom rests on the rail's top edge.
            let crate = Path(CGRect(x: x - 8 * u, y: y - 2.5 * u - 14 * u + bob, width: 16 * u, height: 14 * u))
            g.fill(crate, with: .color(Theme.blue))
            g.stroke(crate, with: .color(Theme.ink), lineWidth: 1.5 * u)
            var band = Path()
            band.move(to: CGPoint(x: x - 7 * u, y: y - 9.5 * u + bob)); band.addLine(to: CGPoint(x: x + 7 * u, y: y - 9.5 * u + bob))
            g.stroke(band, with: .color(Theme.ink.opacity(0.6)), lineWidth: 1)
        }
    }
}
