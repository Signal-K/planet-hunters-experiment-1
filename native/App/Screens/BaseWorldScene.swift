import SwiftUI
import LandnamCore

/// Layered base: sky, mountain bands, road, grass, a thin dirt strip and a small lift shaft.
/// Structures render only when the player has built them. Level 1 uses the starter sprites.
struct BaseWorldScene: View {
    var placed: [String]
    var plots: [String: Int]
    var levels: [String: Int]
    var onStructure: (String) -> Void
    var onShaft: () -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let portrait = h > w * 1.15
            let ground = h * 0.80
            TimelineView(.animation(minimumInterval: 1.0 / 20, paused: reduceMotion)) { ctx in
                let t = reduceMotion ? 0 : ctx.date.timeIntervalSinceReferenceDate
                ZStack(alignment: .topLeading) {
                    Art.view("base/layers/sky.png")
                        .resizable().interpolation(.none)
                        .frame(width: w, height: h)
                    mountain("base/layers/mountains-far.png", height: ground * 0.58, ground: ground, width: w, drift: t / 140)
                    mountain("base/layers/mountains-mid.png", height: ground * 0.40, ground: ground, width: w, drift: t / 96)
                    cloud(t: t, width: w, height: h, lane: 0.08, scale: 0.18, speed: 92)
                    cloud(t: t, width: w, height: h, lane: 0.16, scale: 0.14, speed: 120)
                    cloud(t: t, width: w, height: h, lane: 0.05, scale: 0.12, speed: 108)
                    groundStack(width: w, height: h, ground: ground)
                    props(width: w, ground: ground, portrait: portrait)
                    if !placed.isEmpty { shaft(width: w, height: h) }
                    ForEach(placed, id: \.self) { kind in
                        if let sprite = spriteName(kind) {
                            structure(kind, sprite: sprite, width: w, height: h, ground: ground, portrait: portrait, level: levels[kind] ?? 1)
                        }
                    }
                    Rectangle().fill(timeWash()).allowsHitTesting(false)
                    Rectangle().fill(seasonWash()).allowsHitTesting(false).blendMode(.softLight)
                }
                .frame(width: w, height: h)
                .clipped()
            }
        }
    }

    private func mountain(_ path: String, height band: CGFloat, ground: CGFloat, width: CGFloat, drift: Double) -> some View {
        let shift = CGFloat(drift.truncatingRemainder(dividingBy: 1)) * width
        // Web: two copies side by side, each as wide as the scene, cover-fit to the bottom edge.
        let copy = Art.view(path).resizable().interpolation(.none).scaledToFill()
            .frame(width: width, height: band, alignment: .bottom).clipped()
        return HStack(spacing: 0) { copy; copy }
            .offset(x: -shift)
            .frame(width: width, height: band, alignment: .leading)
            .clipped()
            .position(x: width / 2, y: ground - band / 2)
            .allowsHitTesting(false)
    }

    private func cloud(t: Double, width: CGFloat, height: CGFloat, lane: CGFloat, scale: CGFloat, speed: Double) -> some View {
        let travel = CGFloat(t.truncatingRemainder(dividingBy: speed) / speed)
        let cw = width * scale
        return Art.view("base/layers/cloud.png")
            .resizable().interpolation(.none).scaledToFit()
            .frame(width: cw)
            .position(x: -cw + travel * (width + cw * 2), y: height * lane)
            .allowsHitTesting(false)
    }

    private func groundStack(width: CGFloat, height: CGFloat, ground: CGFloat) -> some View {
        let grass: CGFloat = height < 500 ? 18 : 28
        let road: CGFloat = height < 500 ? 28 : 36
        return ZStack(alignment: .top) {
            Art.view("base/layers/dirt.png").resizable(resizingMode: .tile).interpolation(.none)
                .padding(.top, grass + road)
            Art.view("base/kit/grass.png").resizable(resizingMode: .tile).interpolation(.none).frame(height: grass)
            Art.view("base/kit/road-a.png").resizable(resizingMode: .tile).interpolation(.none).frame(height: road).offset(y: grass)
        }
        .frame(width: width, height: height - ground, alignment: .top)
        .position(x: width / 2, y: ground + (height - ground) / 2)
        .allowsHitTesting(false)
    }

    private func props(width: CGFloat, ground: CGFloat, portrait: Bool) -> some View {
        let treeH: CGFloat = portrait ? 40 : (ground < 400 ? 36 : 52)
        let midH: CGFloat = portrait ? 34 : (ground < 400 ? 40 : 58)
        return ZStack {
            prop("base/kit/prop-tree-a.png", x: width * (portrait ? 0.31 : 0.015), ground: ground, height: portrait ? 32 : treeH)
            if !portrait {
                prop("base/kit/prop-tree-b.png", x: width * 0.203, ground: ground, height: ground < 400 ? 28 : 36)
            }
            prop("base/kit/prop-rock.png", x: width * (portrait ? 0.68 : 0.788), ground: ground, height: 14)
            if !portrait {
                prop("base/kit/prop-tree-c.png", x: width * 0.904, ground: ground, height: midH)
            }
        }
        .allowsHitTesting(false)
    }

    private func prop(_ path: String, x: CGFloat, ground: CGFloat, height: CGFloat) -> some View {
        Art.view(path)
            .resizable().interpolation(.none).scaledToFit()
            .frame(height: height)
            .position(x: x, y: ground - height / 2)
    }

    /// Silo: underground only, a small cutaway in the dirt strip to the side of the dock.
    private func shaft(width: CGFloat, height: CGFloat) -> some View {
        let portrait = height > width * 1.15
        let ground = height * 0.80
        let grass: CGFloat = height < 500 ? 18 : 28
        let road: CGFloat = height < 500 ? 28 : 36
        let dirtTop = ground + grass + road
        let sh = min(height < 500 ? 56 : 64, max(28, height - dirtTop - 4))
        return Button(action: onShaft) {
            siloCutaway(width: 76, height: sh)
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .position(x: width * (portrait ? 0.88 : 0.82), y: dirtTop + 2 + sh / 2)
        .accessibilityLabel("Open the lift")
    }

    private func structure(_ kind: String, sprite: String, width: CGFloat, height: CGFloat, ground: CGFloat, portrait: Bool, level: Int) -> AnyView {
        let center = width * anchor(kind, plot: plots[kind] ?? 0, portrait: portrait)
        if kind == "launchpad" {
            let padW = width * (portrait ? 0.62 : 0.58)
            let hangarH = width * widthFraction("hangar", portrait: portrait, level: 1) * aspect("hangar")
            // Thick industrial slab about half the hangar's height, tall gantry and rocket on it.
            let slabH = hangarH * 0.55
            let towerH = hangarH * (portrait ? 2.6 : 3.0)
            let stackH = towerH + slabH * 0.5
            return AnyView(Button { onStructure(kind) } label: {
                ZStack(alignment: .bottom) {
                    padStack(padW: padW, towerH: towerH)
                        .offset(y: -slabH * 0.35)
                    padSlab(width: padW, height: slabH)
                }
                .frame(width: padW, height: stackH, alignment: .bottom)
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .position(x: center, y: ground - stackH / 2 + slabH * 0.1)
            .accessibilityLabel(kindLabel(kind)))
        }
        let fraction = widthFraction(kind, portrait: portrait, level: level)
        let ratio = aspect(kind)
        var artW = max(44, width * fraction)
        let maxH = max(48, ground - 64)
        if artW * ratio > maxH { artW = maxH / ratio }
        let artH = max(44, artW * ratio)
        let art = hangarArt(width: artW, height: artH)
        return AnyView(Button { onStructure(kind) } label: {
            art.frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .position(x: center, y: ground - artH * 0.5)
        .accessibilityLabel(kindLabel(kind)))
    }

    /// Launch stack: the slim flight-scene rocket standing between two wide steel towers that are one
    /// connected structure (top and mid cross-beams with walkways, service arms reaching the rocket).
    private func padStack(padW: CGFloat, towerH: CGFloat) -> some View {
        let rocketH = towerH * 0.88
        let rocketW = rocketH * 22.0 / 72.0
        return ZStack(alignment: .bottom) {
            gantry(width: padW, height: towerH, rocketW: rocketW, rocketH: rocketH)
            Art.view("base/kit/pad-rocket.png").resizable().interpolation(.none)
                .frame(width: rocketW, height: rocketH)
        }
        .frame(width: padW, height: towerH, alignment: .bottom)
    }

    /// Pad slab: light concrete with panel seams and a thin blue edge.
    private func padSlab(width: CGFloat, height: CGFloat) -> some View {
        Canvas { ctx, size in
            let top = Color(red: 0.90, green: 0.92, blue: 0.95)
            let side = Color(red: 0.72, green: 0.77, blue: 0.84)
            let blue = Color(red: 0.22, green: 0.42, blue: 0.78)
            ctx.fill(Path(roundedRect: CGRect(x: 0, y: 0, width: size.width, height: size.height), cornerRadius: 4), with: .color(side))
            ctx.fill(Path(roundedRect: CGRect(x: 0, y: 0, width: size.width, height: size.height * 0.45), cornerRadius: 4), with: .color(top))
            ctx.fill(Path(CGRect(x: 0, y: size.height * 0.45, width: size.width, height: 2.5)), with: .color(blue))
            for i in 1..<12 {
                ctx.fill(Path(CGRect(x: size.width * CGFloat(i) / 12, y: size.height * 0.5, width: 1.5, height: size.height * 0.5)), with: .color(top.opacity(0.7)))
            }
        }
        .frame(width: width, height: height)
        .allowsHitTesting(false)
    }

    /// Clean white and light-grey steel with thin blue trim; no texture, no rust.
    private func gantry(width: CGFloat, height: CGFloat, rocketW: CGFloat, rocketH: CGFloat) -> some View {
        Canvas { ctx, size in
            let steel = Color(red: 0.93, green: 0.95, blue: 0.97)
            let shade = Color(red: 0.74, green: 0.78, blue: 0.84)
            let trim = Color(red: 0.22, green: 0.42, blue: 0.78)
            let towerW = size.width * 0.22
            let rail = towerW * 0.16
            let leftX: CGFloat = 0, rightX = size.width - towerW
            for x in [leftX, rightX] {
                ctx.fill(Path(CGRect(x: x, y: 0, width: rail, height: size.height)), with: .color(steel))
                ctx.fill(Path(CGRect(x: x + towerW - rail, y: 0, width: rail, height: size.height)), with: .color(steel))
                let bays = 8, bh = size.height / CGFloat(bays)
                var lattice = Path()
                for i in 0..<bays {
                    let y0 = bh * CGFloat(i), y1 = y0 + bh
                    lattice.move(to: CGPoint(x: x + rail, y: y0)); lattice.addLine(to: CGPoint(x: x + towerW - rail, y: y1))
                    lattice.move(to: CGPoint(x: x + towerW - rail, y: y0)); lattice.addLine(to: CGPoint(x: x + rail, y: y1))
                    lattice.move(to: CGPoint(x: x + rail, y: y1)); lattice.addLine(to: CGPoint(x: x + towerW - rail, y: y1))
                }
                ctx.stroke(lattice, with: .color(shade), lineWidth: 2)
                ctx.fill(Path(CGRect(x: x, y: 0, width: towerW, height: 4)), with: .color(trim))
            }
            // Cross-beams and walkways joining the towers at the top and mid height.
            let beam: CGFloat = 8
            for y in [size.height * 0.04, size.height * 0.50] {
                ctx.fill(Path(CGRect(x: leftX + towerW, y: y, width: rightX - leftX - towerW, height: beam)), with: .color(steel))
                ctx.fill(Path(CGRect(x: leftX + towerW, y: y + beam - 2, width: rightX - leftX - towerW, height: 2)), with: .color(shade))
                ctx.fill(Path(CGRect(x: leftX + towerW, y: y - 2, width: rightX - leftX - towerW, height: 2)), with: .color(trim))
            }
            // Service arms from each tower to the rocket.
            let cx = size.width / 2
            for (y, frac) in [(size.height * 0.30, 0.0), (size.height * 0.68, 1.0)] {
                _ = frac
                ctx.fill(Path(CGRect(x: leftX + towerW, y: y, width: cx - rocketW / 2 - leftX - towerW, height: 5)), with: .color(steel))
                ctx.fill(Path(CGRect(x: cx + rocketW / 2, y: y, width: rightX - cx - rocketW / 2, height: 5)), with: .color(steel))
                ctx.fill(Path(CGRect(x: leftX + towerW, y: y + 5, width: cx - rocketW / 2 - leftX - towerW, height: 1.5)), with: .color(trim))
                ctx.fill(Path(CGRect(x: cx + rocketW / 2, y: y + 5, width: rightX - cx - rocketW / 2, height: 1.5)), with: .color(trim))
            }
        }
        .frame(width: width, height: height)
        .allowsHitTesting(false)
    }

    /// Hangar: clean white panels, blue and orange trim, lit bay door.
    private func hangarArt(width: CGFloat, height: CGFloat) -> some View {
        Canvas { ctx, size in
            let w = size.width, h = size.height
            let white = Color(red: 0.95, green: 0.96, blue: 0.98)
            let panel = Color(red: 0.82, green: 0.86, blue: 0.91)
            let blue = Color(red: 0.22, green: 0.42, blue: 0.78)
            let orange = Color(red: 0.93, green: 0.55, blue: 0.20)
            let dark = Color(red: 0.16, green: 0.22, blue: 0.34)
            let roofY = h * 0.18
            var body = Path()
            body.move(to: CGPoint(x: 0, y: h)); body.addLine(to: CGPoint(x: 0, y: h * 0.42))
            body.addQuadCurve(to: CGPoint(x: w * 0.14, y: roofY), control: CGPoint(x: w * 0.02, y: roofY))
            body.addLine(to: CGPoint(x: w * 0.86, y: roofY))
            body.addQuadCurve(to: CGPoint(x: w, y: h * 0.42), control: CGPoint(x: w * 0.98, y: roofY))
            body.addLine(to: CGPoint(x: w, y: h)); body.closeSubpath()
            ctx.fill(body, with: .color(white))
            ctx.stroke(body, with: .color(panel), lineWidth: 2)
            for i in 1..<6 {
                let x = w * CGFloat(i) / 6
                ctx.fill(Path(CGRect(x: x, y: roofY + 2, width: 1.5, height: h * 0.16)), with: .color(panel))
            }
            ctx.fill(Path(CGRect(x: w * 0.10, y: roofY + h * 0.07, width: w * 0.80, height: h * 0.05)), with: .color(blue))
            ctx.fill(Path(CGRect(x: 0, y: h * 0.90, width: w, height: h * 0.10)), with: .color(blue))
            ctx.fill(Path(CGRect(x: 0, y: h * 0.86, width: w, height: h * 0.025)), with: .color(orange))
            let door = CGRect(x: w * 0.22, y: h * 0.42, width: w * 0.56, height: h * 0.48)
            ctx.fill(Path(roundedRect: door, cornerRadius: 4), with: .color(dark))
            ctx.stroke(Path(roundedRect: door, cornerRadius: 4), with: .color(blue), lineWidth: 3)
            for i in 1..<5 {
                ctx.fill(Path(CGRect(x: door.minX + 3, y: door.minY + door.height * CGFloat(i) / 5, width: door.width - 6, height: 1.5)), with: .color(panel.opacity(0.5)))
            }
            ctx.fill(Path(CGRect(x: door.minX, y: door.minY - h * 0.045, width: door.width, height: h * 0.025)), with: .color(orange))
            for x in [w * 0.08, w * 0.90] {
                ctx.fill(Path(CGRect(x: x - w * 0.015, y: roofY - h * 0.12, width: w * 0.03, height: h * 0.12)), with: .color(panel))
                ctx.fill(Path(CGRect(x: x - w * 0.015, y: roofY - h * 0.12, width: w * 0.03, height: h * 0.025)), with: .color(blue))
            }
        }
        .frame(width: width, height: height)
        .allowsHitTesting(false)
    }

    /// Underground silo: a small cutaway in the dirt with a lift shaft and cage. Opens the Subsurface lift.
    private func siloCutaway(width: CGFloat, height: CGFloat) -> some View {
        Canvas { ctx, size in
            let w = size.width, h = size.height
            let steel = Color(red: 0.88, green: 0.91, blue: 0.95)
            let shade = Color(red: 0.62, green: 0.68, blue: 0.76)
            let blue = Color(red: 0.22, green: 0.42, blue: 0.78)
            let cavity = Color(red: 0.14, green: 0.19, blue: 0.29)
            let room = CGRect(x: 0, y: h * 0.38, width: w, height: h * 0.62)
            ctx.fill(Path(roundedRect: room, cornerRadius: 6), with: .color(cavity))
            ctx.stroke(Path(roundedRect: room, cornerRadius: 6), with: .color(steel), lineWidth: 3)
            let shaftW = w * 0.14, sx = w / 2 - shaftW / 2
            ctx.fill(Path(CGRect(x: sx, y: 0, width: shaftW, height: h * 0.42)), with: .color(cavity))
            ctx.stroke(Path(CGRect(x: sx, y: 0, width: shaftW, height: h * 0.42)), with: .color(steel), lineWidth: 3)
            ctx.fill(Path(CGRect(x: sx + 3, y: h * 0.40, width: shaftW - 6, height: h * 0.26)), with: .color(steel))
            ctx.stroke(Path(CGRect(x: sx + 3, y: h * 0.40, width: shaftW - 6, height: h * 0.26)), with: .color(blue), lineWidth: 2)
            ctx.fill(Path(CGRect(x: w * 0.08, y: h * 0.84, width: w * 0.84, height: 3)), with: .color(shade))
            for x in [w * 0.20, w * 0.74] {
                ctx.fill(Path(CGRect(x: x, y: h * 0.62, width: w * 0.06, height: h * 0.22)), with: .color(blue.opacity(0.85)))
            }
        }
        .frame(width: width, height: height)
    }

    private func spriteName(_ kind: String) -> String? {
        switch kind {
        case "launchpad": return "base/kit/pad-rocket.png"
        case "hangar", "garage": return "base/kit/starter-hangar.png"
        default: return nil
        }
    }

    private func levelled(_ path: String, _ kind: String) -> String { path }

    /// Centres match the web anchors. Kinds without one spread across the remaining plots.
    private func anchor(_ kind: String, plot: Int, portrait: Bool) -> CGFloat {
        switch kind {
        case "hangar", "garage": return portrait ? 0.145 : 0.11
        case "launchpad": return portrait ? 0.50 : 0.50
        case "command": return portrait ? 0.78 : 0.84
        case "refinery": return portrait ? 0.93 : 0.96
        default:
            let slots: [CGFloat] = portrait ? [0.16, 0.38, 0.62, 0.84] : [0.14, 0.36, 0.64, 0.86]
            return slots[min(max(plot, 0), 3)]
        }
    }

    private func widthFraction(_ kind: String, portrait: Bool, level _: Int) -> CGFloat {
        if kind == "launchpad" { return portrait ? 0.30 : 0.55 }
        switch kind {
        case "hangar", "garage": return portrait ? 0.26 : 0.14
        case "command": return portrait ? 0.12 : 0.08
        case "refinery": return portrait ? 0.11 : 0.06
        case "astronaut-academy": return 0.12
        default: return 0.10
        }
    }

    /// Height / width of each starter sprite. */
    private func aspect(_ kind: String) -> CGFloat {
        switch kind {
        case "launchpad": return 48.0 / 145.0
        case "hangar", "garage": return 129.0 / 238.0
        case "command": return 127.0 / 118.0
        case "refinery": return 125.0 / 81.0
        case "astronaut-academy": return 86.0 / 178.0
        default: return 0.7
        }
    }

    private func kindLabel(_ kind: String) -> String {
        switch kind {
        case "launchpad": return "Launchpad"
        case "hangar", "garage": return "Hangar"
        case "command": return "Control"
        case "refinery": return "Tank"
        case "astronaut-academy": return "Academy"
        default: return "Structure"
        }
    }

    private func timeWash() -> Color {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<8: return Color.white.opacity(0.10)
        case 8..<17: return Color.white.opacity(0.16)
        case 17..<20: return Color.white.opacity(0.04)
        default: return Color.black.opacity(0.32)
        }
    }

    private func seasonWash() -> Color {
        switch Calendar.current.component(.month, from: Date()) {
        case 12, 1, 2: return Color.white.opacity(0.22)
        case 3, 4, 5: return Color.white.opacity(0.08)
        default: return Color.white.opacity(0.05)
        }
    }
}
