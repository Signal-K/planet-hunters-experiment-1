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

    /// Silo: underground only, a small cutaway sprite in the dirt strip to the side of the dock.
    private func shaft(width: CGFloat, height: CGFloat) -> some View {
        let portrait = height > width * 1.15
        let ground = height * 0.80
        let grass: CGFloat = height < 500 ? 18 : 28
        let road: CGFloat = height < 500 ? 28 : 36
        let dirtTop = ground + grass + road
        let k = portrait ? 1 : max(1, min(2, ((height - dirtTop - 4) / 36).rounded(.down)))
        let sh = 36 * k
        return Button(action: onShaft) {
            Art.view("base/kit/silo-cutaway.png").resizable().interpolation(.none)
                .frame(width: 44 * k, height: sh)
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .position(x: width * (portrait ? 0.94 : 0.82), y: dirtTop + 2 + sh / 2)
        .accessibilityLabel("Open the lift")
    }

    /// Whole-number pixel scale for base sprites so they keep the kit's pixel grid.
    private func pixelScale(height: CGFloat, portrait: Bool) -> CGFloat { portrait || height < 600 ? 2 : 3 }

    private func structure(_ kind: String, sprite: String, width: CGFloat, height: CGFloat, ground: CGFloat, portrait: Bool, level: Int) -> AnyView {
        let center = width * anchor(kind, plot: plots[kind] ?? 0, portrait: portrait)
        let px = pixelScale(height: height, portrait: portrait)
        if kind == "launchpad" {
            // Pad slab with the connected gantry frame and the rocket standing on it, all kit sprites at one pixel scale.
            let slabW = 120 * px, slabH = 20 * px, stackH = (16 + 92) * px
            return AnyView(Button { onStructure(kind) } label: {
                ZStack(alignment: .bottom) {
                    Art.view("base/kit/pad-gantry-frame.png").resizable().interpolation(.none)
                        .frame(width: 120 * px, height: 92 * px)
                        .offset(y: -16 * px)
                    Art.view("base/kit/pad-rocket.png").resizable().interpolation(.none)
                        .frame(width: 44 * px, height: 72 * px)
                        .offset(x: 22 * px, y: -22 * px)
                    Art.view("base/kit/pad-slab-concrete.png").resizable().interpolation(.none)
                        .frame(width: slabW, height: slabH)
                }
                .frame(width: slabW, height: stackH, alignment: .bottom)
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .position(x: center, y: ground - stackH / 2 + 4 * px)
            .accessibilityLabel(kindLabel(kind)))
        }
        let artH = 44 * px
        return AnyView(Button { onStructure(kind) } label: {
            Art.view(sprite).resizable().interpolation(.none)
                .frame(width: 72 * px, height: artH)
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .position(x: center, y: ground - artH * 0.5 + 2 * px)
        .accessibilityLabel(kindLabel(kind)))
    }

    private func spriteName(_ kind: String) -> String? {
        switch kind {
        case "launchpad": return "base/kit/pad-rocket.png"
        case "hangar", "garage": return "base/kit/hangar-white.png"
        default: return nil
        }
    }


    /// Centres match the web anchors. Kinds without one spread across the remaining plots.
    private func anchor(_ kind: String, plot: Int, portrait: Bool) -> CGFloat {
        switch kind {
        case "hangar", "garage": return portrait ? 0.19 : 0.12
        case "launchpad": return portrait ? 0.66 : 0.52
        default:
            let slots: [CGFloat] = portrait ? [0.16, 0.38, 0.62, 0.84] : [0.14, 0.36, 0.64, 0.86]
            return slots[min(max(plot, 0), 3)]
        }
    }

    private func kindLabel(_ kind: String) -> String {
        switch kind {
        case "launchpad": return "Launchpad"
        case "hangar", "garage": return "Hangar"
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
