import SwiftUI

/// The cutaway under the base, in pixel-art kit sprites (`base/kit/ug-*`). Origin is the ground line.
/// Built: lit chamber with the lift shaft, silo tanks, ore crates, console and pipes, all animated.
/// Not built: an empty dig site with a drill rig and a Build silo action.
struct BaseUnderground: View {
    let world: BaseWorld
    let built: Bool
    let excavated: Bool
    var siloPlaced: Bool = false
    var secondTank: Bool = false
    /// 0...1 of the silo's capacity currently holding ore.
    let oreFraction: Double
    var onBuild: () -> Void
    var onBuildDeep: () -> Void = {}
    var onExcavate: () -> Void
    var onOpen: () -> Void
    /// False while the camera is at the surface and the cutaway is off-screen: its animations pause.
    var active: Bool = true
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private var still: Bool { reduceMotion || !active }

    private var u: CGFloat { world.u }
    private var d: CGFloat { world.dirtDepth }

    /// Chamber-relative pixel slots for ore crates: two by the tanks, five on the right.
    private static let slots: [CGFloat] = [98, 114, 200, 216, 232, 248, 262]

    var body: some View {
        ZStack(alignment: .topLeading) {
            tiled("ug-soil", 64, width: world.worldW, height: world.worldH - world.ground - d).offset(y: d)
            tiled("ug-flecks", 64, width: world.worldW, height: world.worldH - world.ground - d).offset(y: d)
            if built { chamber } else if excavated { construction } else { dig }
        }
        .frame(width: world.worldW, height: world.worldH - world.ground, alignment: .topLeading)
    }

    // MARK: Built

    private var chamber: some View {
        let x0 = world.shaftX - 140 * u
        let top = d + 12 * u
        let filled = oreFraction <= 0 ? 0 : min(Self.slots.count, max(1, Int((oreFraction * Double(Self.slots.count)).rounded(.up))))
        return ZStack(alignment: .topLeading) {
            tiled("ug-wall", 16, width: 280 * u, height: 70 * u).offset(x: x0, y: top + 6 * u)
            tiled("ug-ceiling", 16, width: 280 * u, height: 6 * u).offset(x: x0, y: top)
            tiled("ug-pipe", 16, width: 118 * u, height: 6 * u).offset(x: x0, y: top + 30 * u)
            tiled("ug-pipe", 16, width: 130 * u, height: 6 * u).offset(x: x0 + 150 * u, y: top + 36 * u)
            tiled("ug-floor", 16, width: 280 * u, height: 8 * u).offset(x: x0, y: top + 76 * u)
            tiled("ug-shaft", 16, width: 16 * u, height: top + 72 * u).offset(x: world.shaftX - 8 * u, y: 4 * u)
            Button(action: onOpen) {
                sprite("ug-tank-big", 40, 56).frame(minWidth: 44, minHeight: 44)
            }
            .buttonStyle(.plain).accessibilityLabel("Open the silo")
            .offset(x: x0 + 14 * u, y: top + (76 - 56) * u)
            if secondTank { sprite("ug-tank-small", 30, 44).offset(x: x0 + 62 * u, y: top + (76 - 44) * u) }
            ForEach(Array(Self.slots.enumerated()), id: \.offset) { i, px in
                sprite("ug-crate", 16, 8).offset(x: x0 + px * u, y: top + 68 * u)
                if i < filled { ore(slot: i).offset(x: x0 + px * u, y: top + 63 * u) }
            }
            console.offset(x: x0 + 158 * u, y: top + 48 * u)
            Text("CRAFTING BAY\nNEXT CYCLE")
                .font(AppFont.mono(8))
                .multilineTextAlignment(.center)
                .foregroundStyle(Theme.blue.opacity(0.9))
                .padding(4)
                .background(Theme.hudPanel.opacity(0.9), in: RoundedRectangle(cornerRadius: 4))
                .offset(x: x0 + 166 * u, y: top + 22 * u)
            ForEach(Array([22, 84, 172, 214, 262].enumerated()), id: \.offset) { i, px in
                lamp(i).offset(x: x0 + CGFloat(px) * u, y: top + 6 * u)
            }
            lift(top: top)
        }
    }

    private func lamp(_ i: Int) -> some View {
        TimelineView(.animation(minimumInterval: 1.0 / 10, paused: still)) { ctx in
            let t = reduceMotion ? 0 : ctx.date.timeIntervalSinceReferenceDate
            sprite((Int(t * 1.6) + i * 3) % 7 == 0 ? "ug-lamp-0" : "ug-lamp-1", 9, 12)
        }
    }

    private var console: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 6, paused: still)) { ctx in
            let t = reduceMotion ? 0 : ctx.date.timeIntervalSinceReferenceDate
            sprite(Int(t * 1.1) % 2 == 0 ? "ug-console-0" : "ug-console-1", 36, 28)
        }
    }

    private func ore(slot: Int) -> some View {
        TimelineView(.animation(minimumInterval: 1.0 / 6, paused: still)) { ctx in
            let t = reduceMotion ? 0 : ctx.date.timeIntervalSinceReferenceDate
            sprite((Int(t * 1.2) + slot) % 2 == 0 ? "ug-ore-0" : "ug-ore-1", 16, 8)
        }
    }

    /// The lift cabin rides the shaft from the surface hatch to the chamber floor and back, easing at both ends.
    private func lift(top: CGFloat) -> some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30, paused: still)) { ctx in
            let t = reduceMotion ? 3 : ctx.date.timeIntervalSinceReferenceDate
            let phase = (1 - cos(2 * .pi * t / 11)) / 2
            let lo = 6 * u, hi = top + 76 * u - 18 * u
            sprite("ug-lift", 10, 18).offset(x: world.shaftX - 5 * u, y: lo + (hi - lo) * CGFloat(phase))
        }
    }

    // MARK: Empty dig site

    private var construction: some View {
        let x0 = world.shaftX - 72 * u
        let top = d + 16 * u
        return ZStack(alignment: .topLeading) {
            tiled("ug-soil", 64, width: 144 * u, height: 76 * u).offset(x: x0, y: top)
            sprite("ug-console-0", 36, 28).offset(x: world.shaftX - 18 * u, y: top + 18 * u)
            DockButton(title: "Build mineral silo", symbol: "shippingbox.fill", action: onBuild)
                .position(x: world.shaftX, y: top + 78 * u + 28)
            if !secondTank {
                DockButton(title: "Build deep silo", symbol: "shippingbox.fill", action: onBuildDeep)
                    .position(x: world.shaftX, y: top + 78 * u + 78)
            }
        }
    }

    private var dig: some View {
        let x0 = world.shaftX - 48 * u
        let top = d + 16 * u
        return ZStack(alignment: .topLeading) {
            // Before excavation this is uninterrupted soil and bedrock, not a
            // pre-built concrete chamber. The drill is the sole affordance.
            tiled("ug-soil", 64, width: 96 * u, height: 70 * u).offset(x: x0, y: top)
            drill.offset(x: world.shaftX - 13 * u, y: top + 34 * u)
            DockButton(title: siloPlaced ? "Excavate bedrock" : "Build silo", symbol: "hammer.fill", action: siloPlaced ? onExcavate : onBuild)
                .position(x: world.shaftX, y: top + 70 * u + 30)
        }
    }

    private var drill: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 8, paused: still)) { ctx in
            let t = reduceMotion ? 0 : ctx.date.timeIntervalSinceReferenceDate
            sprite(Int(t * 4) % 2 == 0 ? "ug-drill-0" : "ug-drill-1", 26, 26)
        }
    }

    // MARK: Sprite helpers

    private func sprite(_ name: String, _ w: Int, _ h: Int) -> some View {
        Art.view("base/kit/\(name).png").resizable().interpolation(.none)
            .frame(width: CGFloat(w) * u, height: CGFloat(h) * u)
    }

    private func tiled(_ name: String, _ px: Int, width: CGFloat, height: CGFloat) -> some View {
        Art.tiled("base/kit/\(name).png", scale: u).resizable(resizingMode: .tile).interpolation(.none)
            .frame(width: width, height: height)
    }
}
