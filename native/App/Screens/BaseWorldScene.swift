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
            let ground = h * (h < 500 ? 0.68 : 0.78)
            TimelineView(.animation(minimumInterval: 1.0 / 20, paused: reduceMotion)) { ctx in
                let t = reduceMotion ? 0 : ctx.date.timeIntervalSinceReferenceDate
                ZStack(alignment: .topLeading) {
                    Art.view("base/layers/sky.png")
                        .resizable().interpolation(.none).scaledToFill()
                        .frame(width: w, height: h).clipped()
                    mountain("base/layers/mountains-far.png", height: h * 0.46, ground: ground, width: w, drift: t / 140)
                    mountain("base/layers/mountains-mid.png", height: h * 0.32, ground: ground, width: w, drift: t / 96)
                    mountain("base/layers/mountains-near.png", height: h * 0.24, ground: ground, width: w, drift: t / 64)
                    cloud(t: t, width: w, height: h, lane: 0.08, scale: 0.18, speed: 92)
                    cloud(t: t, width: w, height: h, lane: 0.16, scale: 0.14, speed: 120)
                    cloud(t: t, width: w, height: h, lane: 0.05, scale: 0.12, speed: 108)
                    groundStack(width: w, height: h, ground: ground)
                    shaft(width: w, height: h)
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
        return Art.view(path)
            .resizable().interpolation(.none).scaledToFill()
            .frame(width: width * 2, height: band, alignment: .bottom)
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
            Art.view("base/kit/trees.png").resizable(resizingMode: .tile).interpolation(.none).frame(height: 48).offset(y: -28)
            Art.view("base/kit/grass.png").resizable(resizingMode: .tile).interpolation(.none).frame(height: grass)
            Art.view("base/kit/road-a.png").resizable(resizingMode: .tile).interpolation(.none).frame(height: road).offset(y: grass - 6)
        }
        .frame(width: width, height: height - ground, alignment: .top)
        .position(x: width / 2, y: ground + (height - ground) / 2)
        .allowsHitTesting(false)
    }

    private func shaft(width: CGFloat, height: CGFloat) -> some View {
        let dock = height * 0.10
        let sh: CGFloat = height < 500 ? 44 : 56
        return Button(action: onShaft) {
            Art.view("base/kit/underground-window.png")
                .resizable().interpolation(.none).scaledToFit()
                .frame(width: 88, height: sh)
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .position(x: width / 2, y: height - dock - 8 - sh / 2)
        .accessibilityLabel("Open the lift")
    }

    private func structure(_ kind: String, sprite: String, width: CGFloat, height: CGFloat, ground: CGFloat, portrait: Bool, level: Int) -> some View {
        let center = width * anchor(kind, plot: plots[kind] ?? 0, portrait: portrait)
        if kind == "launchpad" {
            let padW = width * (portrait ? 0.42 : 0.55)
            let padH: CGFloat = portrait ? 40 : 48
            let hangH = max(44, width * 0.14) * (129.0 / 238.0)
            let rocketH = min(hangH * 2, max(64, ground - 72))
            let rocketW = rocketH * (65.0 / 93.0)
            let stackH = padH + rocketH * 0.82
            return Button { onStructure(kind) } label: {
                ZStack(alignment: .bottom) {
                    Art.view("base/kit/starter-pad-platform.png")
                        .resizable(resizingMode: .tile).interpolation(.none)
                        .frame(width: padW, height: padH)
                    Art.view(sprite)
                        .resizable().interpolation(.none).scaledToFit()
                        .frame(width: rocketW, height: rocketH)
                        .padding(.bottom, 16)
                }
                .frame(width: padW, height: stackH, alignment: .bottom)
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .position(x: center, y: ground - stackH / 2)
            .accessibilityLabel(kindLabel(kind))
        }
        let fraction = widthFraction(kind, portrait: portrait, level: level)
        let ratio = aspect(kind)
        var artW = max(44, width * fraction)
        let maxH = max(48, ground - 64)
        if artW * ratio > maxH { artW = maxH / ratio }
        let artH = max(44, artW * ratio)
        let art = Art.view(sprite).resizable().interpolation(.none).scaledToFit().frame(width: artW, height: artH)
        return Button { onStructure(kind) } label: {
            art.frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .position(x: center, y: ground - artH * 0.5)
        .accessibilityLabel(kindLabel(kind))
    }

    private func spriteName(_ kind: String) -> String? {
        switch kind {
        case "launchpad": return "base/kit/starter-pad-rocket.png"
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
        case "hangar", "garage": return 0.11
        case "launchpad": return 0.50
        case "command": return 0.84
        case "refinery": return 0.96
        default:
            let slots: [CGFloat] = portrait ? [0.16, 0.38, 0.62, 0.84] : [0.14, 0.36, 0.64, 0.86]
            return slots[min(max(plot, 0), 3)]
        }
    }

    private func widthFraction(_ kind: String, portrait: Bool, level _: Int) -> CGFloat {
        if kind == "launchpad" { return portrait ? 0.42 : 0.55 }
        switch kind {
        case "hangar", "garage": return 0.14
        case "command": return 0.08
        case "refinery": return 0.06
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
