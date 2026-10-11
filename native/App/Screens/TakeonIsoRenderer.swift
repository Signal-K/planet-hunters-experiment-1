import SwiftUI
import TakeonKit

/// Isometric 3/4 painterly voxel renderer for the Go engine's terrain window.
/// Deep purples/blues, glowing teal ore, no sky. Pure drawing + picking: no game state.
struct TakeonIsoRenderer {
    static let tw: CGFloat = 88      // tile diamond width
    static let th: CGFloat = 44
    static let zh: CGFloat = 22      // one voxel level, in points

    let terrain: TakeonTerrainWindow
    let state: TakeonRenderState
    let selected: TakeonRenderState.Point?
    let time: Double

    /// Screen offset (relative to view centre) of a ground point, before camera.
    static func project(_ x: Double, _ y: Double, _ z: Double) -> CGPoint {
        CGPoint(x: (x - y) * tw / 2, y: (x + y) * th / 2 - z * zh)
    }

    func origin(in size: CGSize) -> CGPoint {
        let r = state.roverPosition
        let p = Self.project(r.x, r.y, Double(terrain.height(state.rover.pos.x, state.rover.pos.y)) + 1)
        return CGPoint(x: size.width / 2 - p.x, y: size.height * 0.46 - p.y)
    }

    // MARK: palette
    private struct Tone { var top: UInt32, left: UInt32, right: UInt32 }
    private static func tone(_ m: Int) -> Tone {
        switch m {
        case TakeonMaterial.regolith: Tone(top: 0x6B4E9E, left: 0x3F2D6B, right: 0x2F2556)
        case TakeonMaterial.rock: Tone(top: 0x59508F, left: 0x362F63, right: 0x282552)
        case TakeonMaterial.basalt: Tone(top: 0x45407C, left: 0x2A2755, right: 0x1F1E48)
        case TakeonMaterial.ice, TakeonMaterial.snow: Tone(top: 0x8FB4E8, left: 0x5779B8, right: 0x42609E)
        case TakeonMaterial.silica: Tone(top: 0x8A78C2, left: 0x574890, right: 0x433878)
        case TakeonMaterial.dust, TakeonMaterial.sand: Tone(top: 0x7C5C9C, left: 0x4C3670, right: 0x3A2A5C)
        case TakeonMaterial.sulfur: Tone(top: 0x9A7A86, left: 0x624A66, right: 0x4C3A56)
        case TakeonMaterial.grass: Tone(top: 0x4F7F9A, left: 0x2F536E, right: 0x264260)
        default: Tone(top: 0x5E4A94, left: 0x372B66, right: 0x2A2358)
        }
    }
    private static func color(_ hex: UInt32, shade: Double = 1, a: Double = 1) -> Color {
        Color(.sRGB, red: min(1, Double((hex >> 16) & 0xFF) / 255 * shade), green: min(1, Double((hex >> 8) & 0xFF) / 255 * shade),
              blue: min(1, Double(hex & 0xFF) / 255 * shade), opacity: a)
    }
    private static func hash(_ x: Int, _ y: Int) -> Double {
        var h = UInt32(truncatingIfNeeded: x &* 73856093 ^ y &* 19349663)
        h = (h ^ (h >> 13)) &* 1274126177
        return Double(h & 0xFFFF) / 65535
    }

    // MARK: drawing
    func draw(_ ctx: inout GraphicsContext, size: CGSize) {
        let o = origin(in: size)
        let (tw, th) = (Self.tw, Self.th)
        // Deep violet void behind and beyond the terrain, with a soft vignette.
        ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .linearGradient(
            Gradient(colors: [Self.color(0x1A1240), Self.color(0x2A1A5C), Self.color(0x120C2E)]),
            startPoint: .zero, endPoint: CGPoint(x: size.width * 0.3, y: size.height)))

        let rp = state.roverPosition
        let roverKey = Int((rp.x + rp.y).rounded(.up))
        var roverDrawn = false

        // Visible column range: invert the projection of the screen corners.
        let pad: CGFloat = 3
        let screenCorners = [CGPoint.zero, CGPoint(x: size.width, y: 0), CGPoint(x: 0, y: size.height), CGPoint(x: size.width, y: size.height)]
        var minS = Int.max, maxS = Int.min, minD = Int.max, maxD = Int.min
        for c in screenCorners {
            let a = (c.x - o.x) / (tw / 2), b = (c.y - o.y) / (th / 2)   // a = x-y, b = x+y (at z=0)
            let s = Int(b.rounded()), d = Int(a.rounded())
            minS = min(minS, s); maxS = max(maxS, s); minD = min(minD, d); maxD = max(maxD, d)
        }
        minS -= Int(pad) + 4; maxS += Int(pad) + 4; minD -= Int(pad); maxD += Int(pad)

        let lo = max(terrain.x + terrain.y, minS), hi = min(terrain.x + terrain.w + terrain.y + terrain.h - 2, maxS)
        guard lo <= hi else { return }
        for s in lo...hi {
            for x in max(terrain.x, s - (terrain.y + terrain.h - 1))...min(terrain.x + terrain.w - 1, s - terrain.y) {
                let y = s - x
                if x - y < minD || x - y > maxD { continue }
                let h = terrain.height(x, y)
                if h < 0 { continue }
                drawColumn(&ctx, x: x, y: y, h: h, o: o)
            }
            if !roverDrawn && s > roverKey {
                roverDrawn = true
                drawRover(&ctx, o: o)
            }
        }
        if !roverDrawn { drawRover(&ctx, o: o) }
        if let sel = selected {
            let h = terrain.height(sel.x, sel.y)
            if h >= 0 {
                let c = corners(sel.x, sel.y, z: Double(h + 1), o: o)
                var top = Path(); top.addLines([c.n, c.e, c.s, c.w]); top.closeSubpath()
                ctx.fill(top, with: .color(Theme.hudMint.opacity(0.28)))
                ctx.stroke(top, with: .color(Theme.hudInk), lineWidth: 5)
                ctx.stroke(top, with: .color(Theme.hudMint), lineWidth: 3)
            }
        }
        // Edge vignette keeps the eye on the rover.
        ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .radialGradient(
            Gradient(stops: [.init(color: .clear, location: 0.55), .init(color: Self.color(0x0A0620, a: 0.55), location: 1)]),
            center: CGPoint(x: size.width / 2, y: size.height * 0.46), startRadius: 0, endRadius: max(size.width, size.height) * 0.75))
    }

    private func corners(_ x: Int, _ y: Int, z: Double, o: CGPoint) -> (n: CGPoint, e: CGPoint, s: CGPoint, w: CGPoint) {
        func p(_ px: Int, _ py: Int) -> CGPoint { let q = Self.project(Double(px), Double(py), z); return CGPoint(x: o.x + q.x, y: o.y + q.y) }
        return (p(x, y), p(x + 1, y), p(x + 1, y + 1), p(x, y + 1))
    }

    private func drawColumn(_ ctx: inout GraphicsContext, x: Int, y: Int, h: Int, o: CGPoint) {
        let m = terrain.material(x, y)
        let hv = Self.hash(x &* 3, y &* 7)
        var tone = Self.tone(m)
        if !TakeonMaterial.isOre(m), hv > 0.80 { // some blocks lean blue, others magenta: painterly variety
            let blue = hv > 0.90
            tone = Tone(top: blue ? 0x40529E : 0x7A4A96, left: blue ? 0x27336A : 0x4E2E62, right: blue ? 0x1D2757 : 0x3C2552)
        }
        let ore = TakeonMaterial.isOre(m)
        let jitter = (0.80 + Double(min(h, 10)) * 0.045) * (0.9 + hv * 0.22)
        let ztop = Double(h + 1)
        let c = corners(x, y, z: ztop, o: o)
        // Side faces: down to the lower neighbour (at least one level, at most four) so the blocks read as cubes.
        let southDepth = max(1, min(4, h - terrain.height(x, y + 1)))
        let eastDepth = max(1, min(4, h - terrain.height(x + 1, y)))
        let dz = Self.zh
        var left = Path(); left.addLines([c.w, c.s, CGPoint(x: c.s.x, y: c.s.y + CGFloat(southDepth) * dz), CGPoint(x: c.w.x, y: c.w.y + CGFloat(southDepth) * dz)]); left.closeSubpath()
        var right = Path(); right.addLines([c.s, c.e, CGPoint(x: c.e.x, y: c.e.y + CGFloat(eastDepth) * dz), CGPoint(x: c.s.x, y: c.s.y + CGFloat(eastDepth) * dz)]); right.closeSubpath()
        var top = Path(); top.addLines([c.n, c.e, c.s, c.w]); top.closeSubpath()
        let edge = Self.color(0x0B0724, a: 0.55)
        ctx.fill(left, with: .linearGradient(Gradient(colors: [Self.color(tone.left, shade: jitter), Self.color(tone.left, shade: jitter * 0.72)]),
                                            startPoint: c.w, endPoint: CGPoint(x: c.w.x, y: c.w.y + CGFloat(southDepth) * dz)))
        ctx.fill(right, with: .linearGradient(Gradient(colors: [Self.color(tone.right, shade: jitter), Self.color(tone.right, shade: jitter * 0.7)]),
                                             startPoint: c.s, endPoint: CGPoint(x: c.s.x, y: c.s.y + CGFloat(eastDepth) * dz)))
        ctx.fill(top, with: .linearGradient(Gradient(colors: [Self.color(tone.top, shade: jitter * 1.12), Self.color(tone.top, shade: jitter * 0.92)]),
                                           startPoint: c.n, endPoint: c.s))
        // Painterly flecks on the top face.
        let fx = Self.hash(x &+ 5, y &+ 9), fy = Self.hash(x &+ 11, y &+ 3)
        let mid = CGPoint(x: (c.n.x + c.s.x) / 2, y: (c.n.y + c.s.y) / 2)
        ctx.fill(Path(ellipseIn: CGRect(x: mid.x - 14 + fx * 20, y: mid.y - 5 + fy * 8, width: 9, height: 4)),
                 with: .color(Self.color(0xFFFFFF, a: 0.07 + 0.06 * fx)))
        ctx.stroke(top, with: .color(edge), lineWidth: 0.8)
        ctx.stroke(left, with: .color(edge), lineWidth: 0.8)
        ctx.stroke(right, with: .color(edge), lineWidth: 0.8)
        if ore { drawOre(&ctx, centre: mid, seed: Self.hash(x, y), scale: 1) }
        else if (1...3).contains(terrain.oreDepth(x, y)) {
            let d = terrain.oreDepth(x, y)
            drawOre(&ctx, centre: mid, seed: Self.hash(x, y), scale: d == 1 ? 0.55 : 0.0, glowOnly: d > 1)
        }
    }

    private func drawOre(_ ctx: inout GraphicsContext, centre: CGPoint, seed: Double, scale: CGFloat, glowOnly: Bool = false) {
        let pulse = (0.75 + 0.25 * sin(time * 2.4 + seed * 9)) * (glowOnly ? 0.45 : 1)
        let glow = Path(ellipseIn: CGRect(x: centre.x - 34, y: centre.y - 22, width: 68, height: 44))
        ctx.fill(glow, with: .radialGradient(Gradient(colors: [Self.color(0x4DF5DA, a: 0.55 * pulse), .clear]),
                                            center: centre, startRadius: 0, endRadius: 34))
        if glowOnly { return }
        var ctx = ctx
        ctx.translateBy(x: centre.x, y: centre.y); ctx.scaleBy(x: scale, y: scale); ctx.translateBy(x: -centre.x, y: -centre.y)
        // Three crystal shards.
        let shards: [(CGFloat, CGFloat, CGFloat)] = [(-9, 4, 20), (3, 6, 28), (13, 3, 16)]
        for (i, s) in shards.enumerated() {
            let b = CGPoint(x: centre.x + s.0, y: centre.y + s.1)
            let w: CGFloat = 8 + CGFloat(i == 1 ? 3 : 0)
            var p = Path(); p.addLines([CGPoint(x: b.x - w / 2, y: b.y), CGPoint(x: b.x - w / 4, y: b.y - s.2 * 0.8), CGPoint(x: b.x + 1, y: b.y - s.2),
                                         CGPoint(x: b.x + w / 2, y: b.y - s.2 * 0.7), CGPoint(x: b.x + w / 2, y: b.y)]); p.closeSubpath()
            ctx.fill(p, with: .linearGradient(Gradient(colors: [Self.color(0xBFFFF2), Self.color(0x1FC9B0), Self.color(0x0B7F8C)]),
                                             startPoint: CGPoint(x: b.x - w / 2, y: b.y - s.2), endPoint: CGPoint(x: b.x + w / 2, y: b.y)))
            ctx.stroke(p, with: .color(Self.color(0x06323A, a: 0.8)), lineWidth: 0.8)
        }
    }

    // MARK: rover (stylised, no people)
    private func drawRover(_ outer: inout GraphicsContext, o: CGPoint) {
        var ctx = outer
        let rp = state.roverPosition
        let rx = Int(rp.x.rounded()), ry = Int(rp.y.rounded())
        let z = Double(terrain.height(rx, ry)) + 1 + (state.rover.moveFrom != nil ? 0 : 0)
        let q = Self.project(rp.x + 0.5, rp.y + 0.5, z)
        let c = CGPoint(x: o.x + q.x, y: o.y + q.y)
        ctx.translateBy(x: c.x, y: c.y); ctx.scaleBy(x: 1.4, y: 1.4); ctx.translateBy(x: -c.x, y: -c.y)
        // Shadow.
        ctx.fill(Path(ellipseIn: CGRect(x: c.x - 36, y: c.y - 10, width: 72, height: 28)), with: .color(Self.color(0x08051A, a: 0.5)))
        // Wheels (rear pair first).
        func wheel(_ dx: CGFloat, _ dy: CGFloat) {
            let r = CGRect(x: c.x + dx - 9, y: c.y + dy - 9, width: 18, height: 20)
            ctx.fill(Path(roundedRect: r, cornerRadius: 7), with: .color(Self.color(0x15121F)))
            ctx.stroke(Path(roundedRect: r, cornerRadius: 7), with: .color(Self.color(0x4A4566)), lineWidth: 1.2)
            ctx.fill(Path(ellipseIn: r.insetBy(dx: 5, dy: 6)), with: .color(Self.color(0x7D7A96)))
        }
        wheel(-30, 2); wheel(-6, -8)
        // Body: iso slab.
        func slab(_ cx: CGFloat, _ cy: CGFloat, w: CGFloat, hgt: CGFloat, top: UInt32, left: UInt32, right: UInt32) {
            let hw = w / 2, hh = w / 4
            let n = CGPoint(x: cx, y: cy - hh - hgt), e = CGPoint(x: cx + hw, y: cy - hgt), s = CGPoint(x: cx, y: cy + hh - hgt), wv = CGPoint(x: cx - hw, y: cy - hgt)
            var l = Path(); l.addLines([wv, s, CGPoint(x: s.x, y: s.y + hgt), CGPoint(x: wv.x, y: wv.y + hgt)]); l.closeSubpath()
            var r = Path(); r.addLines([s, e, CGPoint(x: e.x, y: e.y + hgt), CGPoint(x: s.x, y: s.y + hgt)]); r.closeSubpath()
            var t = Path(); t.addLines([n, e, s, wv]); t.closeSubpath()
            ctx.fill(l, with: .color(Self.color(left))); ctx.fill(r, with: .color(Self.color(right))); ctx.fill(t, with: .color(Self.color(top)))
            for p in [l, r, t] { ctx.stroke(p, with: .color(Self.color(0x0B0724, a: 0.8)), lineWidth: 1) }
        }
        slab(c.x - 4, c.y + 2, w: 76, hgt: 18, top: 0xB8B6D6, left: 0x7C7AA0, right: 0x5E5C86)
        slab(c.x - 8, c.y - 12, w: 38, hgt: 12, top: 0x9CF2E4, left: 0x3FB8A8, right: 0x2A8F86)
        wheel(-14, 14); wheel(22, 4)
        // Mast + lamp.
        ctx.stroke(Path { p in p.move(to: CGPoint(x: c.x - 8, y: c.y - 30)); p.addLine(to: CGPoint(x: c.x - 8, y: c.y - 48)) }, with: .color(Self.color(0x2A2744)), lineWidth: 2.4)
        let lamp = state.rover.mining != nil ? 0xFFB347 : 0x5EDBA8
        ctx.fill(Path(ellipseIn: CGRect(x: c.x - 12, y: c.y - 54, width: 8, height: 8)), with: .color(Self.color(UInt32(lamp))))
        // Drill arm + beam toward the target tile.
        if let m = state.rover.mining {
            let t = Self.project(Double(m.pos.x) + 0.5, Double(m.pos.y) + 0.5, Double(terrain.height(m.pos.x, m.pos.y)) + 0.6)
            let tp = CGPoint(x: o.x + t.x, y: o.y + t.y)
            let arm = CGPoint(x: c.x + 6, y: c.y - 20)
            ctx.stroke(Path { p in p.move(to: arm); p.addLine(to: tp) }, with: .color(Self.color(0xFFC857, a: 0.35)), lineWidth: 9)
            ctx.stroke(Path { p in p.move(to: arm); p.addLine(to: tp) }, with: .color(Self.color(0xFFF1B8)), lineWidth: 3)
            for i in 0..<7 {
                let a = time * 9 + Double(i) * 1.7
                let r = CGFloat(6 + 8 * abs(sin(a)))
                ctx.fill(Path(ellipseIn: CGRect(x: tp.x + CGFloat(cos(a * 1.3)) * r - 2, y: tp.y + CGFloat(sin(a)) * r * 0.7 - 6 - CGFloat(i), width: 3.5, height: 3.5)), with: .color(Self.color(0xFFC857)))
            }
        }
        // Facing marker.
        let d = [(1.0, 0.0), (0.0, 1.0), (-1.0, 0.0), (0.0, -1.0)][max(0, min(3, state.rover.facing))]
        let f = Self.project(d.0 * 0.9, d.1 * 0.9, 0)
        ctx.fill(Path(ellipseIn: CGRect(x: c.x + f.x * 0.9 - 4, y: c.y + f.y * 0.9 + 6, width: 8, height: 5)), with: .color(Theme.hudMint))
    }

    // MARK: picking
    /// Column under a screen point, testing front-to-back against the visible top faces.
    func pick(_ point: CGPoint, size: CGSize) -> TakeonRenderState.Point? {
        let o = origin(in: size)
        var best: (Int, TakeonRenderState.Point)?
        // Brute-force over a window around the ground-plane guess, taller columns shift the face upward.
        let a = (point.x - o.x) / (Self.tw / 2), b = (point.y - o.y) / (Self.th / 2)
        let gx = Int(((a + b) / 2).rounded()), gy = Int(((b - a) / 2).rounded())
        for y in (gy - 7)...(gy + 7) { for x in (gx - 7)...(gx + 7) {
            let h = terrain.height(x, y); if h < 0 { continue }
            let c = corners(x, y, z: Double(h + 1), o: o)
            var t = Path(); t.addLines([c.n, c.e, c.s, c.w]); t.closeSubpath()
            if t.contains(point) {
                let key = x + y
                if best == nil || key > best!.0 { best = (key, .init(x: x, y: y)) }
            }
        } }
        return best?.1
    }

    /// Top-face centre of a column in view coordinates (for floating cards).
    func anchor(_ p: TakeonRenderState.Point, size: CGSize) -> CGPoint {
        let o = origin(in: size)
        let q = Self.project(Double(p.x) + 0.5, Double(p.y) + 0.5, Double(terrain.height(p.x, p.y) + 1))
        return CGPoint(x: o.x + q.x, y: o.y + q.y)
    }
}
