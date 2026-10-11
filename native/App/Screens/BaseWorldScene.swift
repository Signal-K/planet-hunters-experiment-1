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

    private func shaft(width: CGFloat, height: CGFloat) -> some View {
        let portrait = height > width * 1.15
        let ground = height * 0.80
        let sh: CGFloat = height < 500 ? 44 : 56
        let road: CGFloat = height < 500 ? 22 : 30
        let dock = height * 0.10 + 8
        let fromBottom = dock
        return Button(action: onShaft) {
            Art.view("base/kit/underground-window.png")
                .resizable().interpolation(.none).scaledToFit()
                .frame(width: 88, height: sh)
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .position(x: width / 2, y: height - fromBottom - sh / 2)
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
                    Art.view("base/kit/starter-pad-platform.png").resizable().interpolation(.none)
                        .frame(width: padW, height: slabH)
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
        let art = Art.view(sprite).resizable().interpolation(.none).scaledToFit().frame(width: artW, height: artH)
        return AnyView(Button { onStructure(kind) } label: {
            art.frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .position(x: center, y: ground - artH * 0.5)
        .accessibilityLabel(kindLabel(kind)))
    }

    /// Chunky launch stack: a wide white rocket flanked by two stretched gantry towers joined by cross-bracing.
    private func padStack(padW: CGFloat, towerH: CGFloat) -> some View {
        let towerW = padW * 0.25
        let rocketW = padW * 0.32
        let rocketH = towerH * 0.92
        let gap = rocketW * 0.5 + towerW * 0.5 - padW * 0.02
        return ZStack(alignment: .bottom) {
            Art.view("base/kit/pad-rocket.png").resizable().interpolation(.none)
                .frame(width: rocketW, height: rocketH)
            ForEach([-1.0, 1.0], id: \.self) { side in
                Art.view("base/kit/starter-pad-rocket.png").resizable().interpolation(.none)
                    .frame(width: towerW, height: towerH)
                    .scaleEffect(x: CGFloat(side), y: 1)
                    .offset(x: CGFloat(side) * gap)
            }
            Canvas { ctx, size in
                let ink = Color(red: 0.16, green: 0.26, blue: 0.5)
                for i in 0..<5 {
                    let y0 = size.height * (0.12 + 0.17 * CGFloat(i)), y1 = y0 + size.height * 0.17
                    let x0 = size.width * 0.5 - gap + towerW * 0.4, x1 = size.width * 0.5 + gap - towerW * 0.4
                    var path = Path()
                    path.move(to: CGPoint(x: x0, y: y0)); path.addLine(to: CGPoint(x: x1, y: y1))
                    path.move(to: CGPoint(x: x1, y: y0)); path.addLine(to: CGPoint(x: x0, y: y1))
                    path.move(to: CGPoint(x: x0, y: y0)); path.addLine(to: CGPoint(x: x1, y: y0))
                    ctx.stroke(path, with: .color(ink.opacity(0.75)), lineWidth: 3)
                }
            }
            .frame(width: gap * 2 + towerW, height: towerH)
            .allowsHitTesting(false)
            .zIndex(-1)
        }
        .frame(width: padW, height: towerH, alignment: .bottom)
    }

    private func spriteName(_ kind: String) -> String? {
        switch kind {
        case "launchpad": return "base/kit/pad-rocket.png"
        case "hangar", "garage": return "base/kit/starter-hangar.png"
        case "command": return "base/kit/starter-cabin.png"
        case "refinery": return "base/kit/starter-silo.png"
        case "astronaut-academy": return "base/kit/starter-shed.png"
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
