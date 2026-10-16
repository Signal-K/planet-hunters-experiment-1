import SwiftUI
import LandnamCore

/// The assembly bay as vector art (web `HangarBay`): back wall, ceiling truss, two gantry towers and the floor.
/// The rocket is drawn only when a vehicle is staged; an empty bay shows an empty cradle.
struct HangarBayArt: View {
    /// Tier of the staged vehicle (1 to 3), or nil when nothing is in the bay.
    let stagedTier: Int?

    private let asphalt = Theme.hex(0x353d4c)

    var body: some View {
        Canvas { ctx, size in
            let scale = max(size.width / 1600, size.height / 900)
            ctx.translateBy(x: (size.width - 1600 * scale) / 2, y: size.height - 900 * scale)
            ctx.scaleBy(x: scale, y: scale)
            let ink = Theme.ink, hull = Theme.paper, blue = Theme.blue, glass = Theme.blueBright

            func shape(_ p: Path, fill: Color, line: CGFloat = 4) {
                ctx.fill(p, with: .color(fill))
                ctx.stroke(p, with: .color(ink), style: StrokeStyle(lineWidth: line, lineJoin: .round))
            }
            func rect(_ r: CGRect, fill: Color, line: CGFloat = 3) { shape(Path(r), fill: fill, line: line) }

            ctx.fill(Path(CGRect(x: 0, y: 0, width: 1600, height: 900)), with: .linearGradient(
                Gradient(colors: [Theme.hex(0x1b3254), Theme.hex(0x244f80)]), startPoint: .zero, endPoint: CGPoint(x: 0, y: 900)))
            for i in 0...16 { ctx.fill(Path(CGRect(x: CGFloat(i) * 100, y: 110, width: 2, height: 590)), with: .color(ink.opacity(0.45))) }
            for x in [20, 420, 820, 1220] { ctx.fill(Path(CGRect(x: CGFloat(x), y: 190, width: 360, height: 26)), with: .color(blue.opacity(0.45))) }
            ctx.fill(Path(ellipseIn: CGRect(x: 160, y: -200, width: 1280, height: 900)), with: .radialGradient(
                Gradient(colors: [glass.opacity(0.4), glass.opacity(0)]), center: CGPoint(x: 800, y: 130), startRadius: 0, endRadius: 560))

            rect(CGRect(x: 0, y: 0, width: 1600, height: 120), fill: asphalt, line: 4)
            for i in 0..<20 {
                var p = Path()
                p.move(to: CGPoint(x: CGFloat(i) * 90, y: 0)); p.addLine(to: CGPoint(x: CGFloat(i) * 90 + 90, y: 120))
                p.move(to: CGPoint(x: CGFloat(i) * 90 + 90, y: 0)); p.addLine(to: CGPoint(x: CGFloat(i) * 90, y: 120))
                ctx.stroke(p, with: .color(ink.opacity(0.8)), lineWidth: 4)
            }
            for x in [260, 600, 1000, 1340] { ctx.fill(Path(roundedRect: CGRect(x: CGFloat(x), y: 120, width: 90, height: 12), cornerRadius: 6), with: .color(glass)) }

            func gantry(x: CGFloat, flip: Bool) {
                for r: CGFloat in [0, 70] { rect(CGRect(x: x + r, y: 150, width: 14, height: 560), fill: asphalt) }
                for i in 0..<8 {
                    let y = 164 + CGFloat(i) * 68
                    var p = Path()
                    p.move(to: CGPoint(x: x + 14, y: y)); p.addLine(to: CGPoint(x: x + 70, y: y + 68))
                    p.move(to: CGPoint(x: x + 70, y: y)); p.addLine(to: CGPoint(x: x + 14, y: y + 68))
                    ctx.stroke(p, with: .color(ink), style: StrokeStyle(lineWidth: 5, lineCap: .round))
                    ctx.stroke(Path(CGRect(x: x, y: y, width: 84, height: 0)), with: .color(ink), lineWidth: 6)
                }
                for y: CGFloat in [300, 470, 600] {
                    let armX = flip ? x - 110 : x + 84
                    rect(CGRect(x: armX, y: y, width: 110, height: 18), fill: hull)
                    rect(CGRect(x: flip ? armX : armX + 92, y: y - 4, width: 18, height: 26), fill: blue)
                }
                rect(CGRect(x: x - 8, y: 140, width: 100, height: 22), fill: blue)
            }
            gantry(x: 470, flip: false)
            gantry(x: 1046, flip: true)

            rect(CGRect(x: 0, y: 700, width: 1600, height: 200), fill: Theme.hex(0x30384a), line: 4)
            var lines = Path()
            lines.move(to: CGPoint(x: 560, y: 700)); lines.addLine(to: CGPoint(x: 420, y: 900))
            lines.move(to: CGPoint(x: 1040, y: 700)); lines.addLine(to: CGPoint(x: 1180, y: 900))
            lines.move(to: CGPoint(x: 800, y: 700)); lines.addLine(to: CGPoint(x: 800, y: 900))
            ctx.stroke(lines, with: .color(hull.opacity(0.5)), lineWidth: 5)
            rect(CGRect(x: 700, y: 676, width: 200, height: 30), fill: hull, line: 4)
            ctx.fill(Path(CGRect(x: 720, y: 684, width: 160, height: 8)), with: .color(blue))

            guard let tier = stagedTier else { return }
            func booster(_ x: CGFloat, _ k: CGFloat) {
                var p = Path()
                p.move(to: CGPoint(x: x, y: 360)); p.addQuadCurve(to: CGPoint(x: x + 36, y: 360), control: CGPoint(x: x + 18, y: 360 - 100 * k))
                p.addLine(to: CGPoint(x: x + 36, y: 650)); p.addLine(to: CGPoint(x: x, y: 650)); p.closeSubpath()
                shape(p, fill: hull)
                rect(CGRect(x: x, y: 470, width: 36, height: 22), fill: blue)
                var n = Path(); n.addLines([CGPoint(x: x + 4, y: 650), CGPoint(x: x + 32, y: 650), CGPoint(x: x + 38, y: 674), CGPoint(x: x - 2, y: 674)]); n.closeSubpath()
                shape(n, fill: asphalt)
            }
            if tier >= 2 { booster(724, tier >= 3 ? 1.3 : 1); booster(840, tier >= 3 ? 1.3 : 1) }
            var body = Path()
            body.move(to: CGPoint(x: 770, y: 208)); body.addQuadCurve(to: CGPoint(x: 830, y: 208), control: CGPoint(x: 800, y: 58))
            body.addLine(to: CGPoint(x: 830, y: 648)); body.addLine(to: CGPoint(x: 770, y: 648)); body.closeSubpath()
            shape(body, fill: hull)
            rect(CGRect(x: 770, y: 300, width: 60, height: 26), fill: blue)
            rect(CGRect(x: 770, y: 560, width: 60, height: 22), fill: blue)
            shape(Path(ellipseIn: CGRect(x: 787, y: 235, width: 26, height: 26)), fill: glass)
            var fins = Path()
            fins.addLines([CGPoint(x: 770, y: 600), CGPoint(x: 736, y: 662), CGPoint(x: 770, y: 648)]); fins.closeSubpath()
            fins.addLines([CGPoint(x: 830, y: 600), CGPoint(x: 864, y: 662), CGPoint(x: 830, y: 648)]); fins.closeSubpath()
            shape(fins, fill: blue)
            var bell = Path(); bell.addLines([CGPoint(x: 778, y: 648), CGPoint(x: 822, y: 648), CGPoint(x: 832, y: 678), CGPoint(x: 768, y: 678)]); bell.closeSubpath()
            shape(bell, fill: asphalt)
        }
        .accessibilityHidden(true)
    }
}
