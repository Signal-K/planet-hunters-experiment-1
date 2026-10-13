import SwiftUI
import LandnamCore

/// Layered base world: sky, mountain bands, road, grass, props and structures along a strip wider than the screen,
/// with an underground cutaway below (`BaseUnderground`). The camera (`BaseCamera`) pans along the strip and down to the cutaway.
/// Structures render only when the player has built them. Level 1 uses the starter sprites.
struct BaseWorldScene: View {
    var placed: [String]
    var plots: [String: Int]
    var levels: [String: Int]
    var oreFraction: Double = 0
    /// The underground chamber exists only once the subsurface is excavated or has a module built; owning the surface silo alone is not enough.
    var excavated: Bool = false
    /// Extra storage tank (mineral vault) built below; the chamber starts with one tank.
    var secondTank: Bool = false
    /// A rocket stands on the pad only while a build or mission is in progress; an idle pad is empty.
    var padOccupied: Bool = false
    /// The returning core stage (no boosters) stands on the pad; `padLift` raises it for the touchdown animation (SSL-553).
    var padCore: Bool = false
    var padLift: CGFloat = 0
    var insets: EdgeInsets = EdgeInsets()
    var camera: BaseCamera
    var onStructure: (String) -> Void
    var onShaft: () -> Void
    var onBuildSilo: () -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pinchStart: CGFloat?
    @State private var dragStartX: CGFloat?
    @State private var dragVertical: Bool?
    @State private var pulse = false

    private var siloPlaced: Bool { placed.contains("surface-silo") }
    private var siloBuilt: Bool { siloPlaced && excavated }

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let world = BaseWorld(w: w, h: h)
            let portrait = world.portrait
            let ground = world.ground
            let cx = min(max(camera.x, 0), world.maxX)
            let lift = world.shift * camera.depth
            ZStack(alignment: .topLeading) {
                // Cool blue to cream sky ramp (SSL-519): no purple, no orange. Only the top rows show, matching web.
                Art.view("base/layers/sky.png")
                    .resizable().interpolation(.low)
                    .frame(width: w, height: h * 2.82, alignment: .top)
                    .frame(width: w, height: h, alignment: .top)
                    .clipped()
                MeteorShowerWeather().frame(width: w, height: ground * 0.55).offset(y: -lift)
                skyLayers(width: w, height: h, ground: ground).offset(y: -lift)
                ZStack(alignment: .topLeading) {
                    groundStack(width: world.worldW, height: world.worldH, ground: ground)
                    props(width: w, world: world, ground: ground, portrait: portrait)
                    BaseUnderground(world: world, built: siloBuilt, siloPlaced: siloPlaced, secondTank: secondTank, oreFraction: oreFraction, onBuild: onBuildSilo, onOpen: onShaft)
                        .offset(y: ground)
                        .allowsHitTesting(camera.underground)
                    shaftHead(world: world)
                    ForEach(placed, id: \.self) { kind in
                        if let sprite = spriteName(kind) {
                            structure(kind, sprite: sprite, width: w, height: h, ground: ground, portrait: portrait, level: levels[kind] ?? 1)
                        }
                    }
                }
                .frame(width: world.worldW, height: world.worldH, alignment: .topLeading)
                .offset(x: -cx, y: -lift)
                .scaleEffect(camera.zoom, anchor: .center)
                Rectangle().fill(timeWash()).opacity(1 - camera.depth).allowsHitTesting(false)
                Rectangle().fill(seasonWash()).opacity(1 - camera.depth).allowsHitTesting(false).blendMode(.softLight)
                edgeHints(world: world, cx: cx)
                depthButton(world: world)
            }
            .frame(width: w, height: h, alignment: .topLeading)
            .clipped()
            .contentShape(Rectangle())
            .simultaneousGesture(pan(world: world))
            .simultaneousGesture(pinch())
        }
    }

    /// Pinch zooms between the whole-base view and a close-up; releasing near the whole view snaps back to it.
    private func pinch() -> some Gesture {
        MagnifyGesture()
            .onChanged { v in
                if pinchStart == nil { pinchStart = camera.zoom }
                camera.zoom = camera.clampZoom((pinchStart ?? 1) * v.magnification)
            }
            .onEnded { _ in
                pinchStart = nil
                if camera.zoom < 1.08 { withAnimation(.easeOut(duration: 0.25)) { camera.zoom = 1 } }
            }
    }

    /// Drag pans along the base strip; a clear swipe up goes down to the cutaway and a swipe down comes back.
    private func pan(world: BaseWorld) -> some Gesture {
        DragGesture(minimumDistance: 12)
            .onChanged { v in
                if dragVertical == nil { dragVertical = abs(v.translation.height) > abs(v.translation.width); dragStartX = camera.x }
                if dragVertical == false, let start = dragStartX { camera.x = camera.clamp(start - v.translation.width, world) }
            }
            .onEnded { v in
                defer { dragVertical = nil; dragStartX = nil }
                if dragVertical == true {
                    if v.translation.height < -36 { camera.dive(true, world, reduceMotion: reduceMotion) }
                    else if v.translation.height > 36 { camera.dive(false, world, reduceMotion: reduceMotion) }
                } else if let start = dragStartX {
                    let glide = camera.clamp(start - v.predictedEndTranslation.width, world)
                    withAnimation(.easeOut(duration: 0.4)) { camera.x = glide }
                }
            }
    }

    /// Right-edge chevron: down to the cutaway at the surface, up from it underground.
    private func depthButton(world: BaseWorld) -> some View {
        let down = !camera.underground
        return Button { camera.dive(down, world, reduceMotion: reduceMotion) } label: {
            Image(systemName: down ? "chevron.down" : "chevron.up")
                .font(.system(size: 18, weight: .bold)).foregroundStyle(Theme.hudInk)
                .frame(width: 44, height: 44)
                .background(Capsule().fill(Theme.hudPanel))
                .overlay(Capsule().stroke(Theme.hudInk, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(down ? "Go underground" : "Back to the surface")
        .position(x: world.w - insets.trailing - 34, y: world.h * 0.38)
    }

    /// Faint chevrons at the screen edges while more of the base lies offscreen that way.
    private func edgeHints(world: BaseWorld, cx: CGFloat) -> some View {
        ZStack {
            if cx > 2 { hint("chevron.left", x: insets.leading + 22, world: world) }
            if cx < world.maxX - 2 { hint("chevron.right", x: world.w - insets.trailing - 22, world: world) }
        }
        .onAppear { if !reduceMotion { withAnimation(.easeInOut(duration: 1.1).repeatForever(autoreverses: true)) { pulse = true } } }
    }

    private func hint(_ symbol: String, x: CGFloat, world: BaseWorld) -> some View {
        Button { camera.pan(by: symbol == "chevron.left" ? -world.w * 0.55 : world.w * 0.55, world) } label: {
            Image(systemName: symbol).font(.system(size: 16, weight: .bold)).foregroundStyle(Theme.hudInk)
                .frame(width: 28, height: 56)
                .background(Capsule().fill(Theme.hudPanel.opacity(0.55)))
                .opacity(pulse ? 0.9 : 0.45)
                .frame(width: 44, height: 56)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(symbol == "chevron.left" ? "Scroll left" : "Scroll right")
        .position(x: x, y: world.h * 0.38 + 72)
    }

    /// Mountains: they stay with the screen while the strip pans, and ride up with the ground when the camera dives.
    private func skyLayers(width w: CGFloat, height h: CGFloat, ground: CGFloat) -> some View {
        TimelineView(.animation(minimumInterval: 1.0 / 20, paused: reduceMotion)) { ctx in
            let t = reduceMotion ? 0 : ctx.date.timeIntervalSinceReferenceDate
            ZStack(alignment: .topLeading) {
                mountain("base/layers/mountains-far.png", height: ground * 0.58, ground: ground, width: w, drift: t / 140)
                mountain("base/layers/mountains-mid.png", height: ground * 0.40, ground: ground, width: w, drift: t / 96)
            }
            .frame(width: w, height: h, alignment: .topLeading)
        }
        .allowsHitTesting(false)
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

    private func props(width: CGFloat, world: BaseWorld, ground: CGFloat, portrait: Bool) -> some View {
        let treeH: CGFloat = portrait ? 40 : (ground < 400 ? 36 : 52)
        let midH: CGFloat = portrait ? 34 : (ground < 400 ? 40 : 58)
        let w = world.w
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
        // The rest of the strip, past the first screen: trees and rocks around the lift head.
        .overlay(alignment: .topLeading) {
            ZStack {
                prop("base/kit/prop-tree-c.png", x: w * 1.04, ground: ground, height: midH)
                prop("base/kit/prop-rock.png", x: w * 1.12, ground: ground, height: 14)
                prop("base/kit/prop-tree-a.png", x: world.shaftX - 150 * world.u / 2 - 40, ground: ground, height: treeH)
                prop("base/kit/prop-rock.png", x: world.shaftX + 120, ground: ground, height: 14)
                prop("base/kit/prop-tree-b.png", x: world.shaftX + 190, ground: ground, height: ground < 400 ? 28 : 36)
                prop("base/kit/prop-tree-a.png", x: world.worldW - 90, ground: ground, height: treeH)
                prop("base/kit/prop-rock.png", x: world.worldW - 36, ground: ground, height: 14)
            }
            .allowsHitTesting(false)
        }
    }

    private func prop(_ path: String, x: CGFloat, ground: CGFloat, height: CGFloat) -> some View {
        Art.view(path)
            .resizable().interpolation(.none).scaledToFit()
            .frame(height: height)
            .position(x: x, y: ground - height / 2)
    }

    /// Surface marker over the shaft: the lift head once the silo is built, otherwise a dig-site sign and spoil mound.
    private func shaftHead(world: BaseWorld) -> some View {
        let u = world.u
        return ZStack {
            if siloBuilt {
                Button(action: onShaft) {
                    Art.view("base/kit/ug-hatch.png").resizable().interpolation(.none)
                        .frame(width: 26 * u, height: 16 * u)
                        .frame(minWidth: 44, minHeight: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .position(x: world.shaftX, y: world.ground + 5 * u - 8 * u)
                .accessibilityLabel("Open the lift")
            } else {
                Art.view("base/kit/ug-mound.png").resizable().interpolation(.none)
                    .frame(width: 30 * u, height: 9 * u)
                    .position(x: world.shaftX + 14 * u, y: world.ground + 5 * u - 4.5 * u)
                Art.view("base/kit/ug-sign.png").resizable().interpolation(.none)
                    .frame(width: 18 * u, height: 22 * u)
                    .position(x: world.shaftX - 16 * u, y: world.ground + 5 * u - 11 * u)
            }
        }
        .allowsHitTesting(camera.depth < 0.5)
    }

    /// Whole-number pixel scale for base sprites so they keep the kit's pixel grid.
    private func pixelScale(height: CGFloat, portrait: Bool) -> CGFloat { portrait || height < 600 ? 2 : 3 }

    private func structure(_ kind: String, sprite: String, width: CGFloat, height: CGFloat, ground: CGFloat, portrait: Bool, level: Int) -> AnyView {
        let center = width * anchor(kind, plot: plots[kind] ?? 0, portrait: portrait)
        let px = pixelScale(height: height, portrait: portrait)
        if kind == "launchpad" {
            // Pad slab with the connected gantry frame and the rocket only while one is in progress, all kit sprites at one pixel scale.
            let slabW = 120 * px, slabH = 20 * px, stackH = (16 + 92) * px
            return AnyView(Button { onStructure(kind) } label: {
                ZStack(alignment: .bottom) {
                    Art.view("base/kit/pad-gantry-frame.png").resizable().interpolation(.none)
                        .frame(width: 120 * px, height: 92 * px)
                        .offset(y: -17 * px)
                    if padOccupied {
                        ZStack(alignment: .bottom) {
                            if padLift > 0 {
                                Art.view("base/kit/flame-\(Int(padLift / 6) % 3).png").resizable().interpolation(.none)
                                    .frame(width: 9 * px, height: 18 * px).rotationEffect(.degrees(-90))
                                    .offset(y: 14 * px)
                            }
                            Art.view(padCore ? "base/kit/space-rocket.png" : "base/kit/pad-rocket.png").resizable().interpolation(.none)
                                .frame(width: 44 * px, height: 72 * px)
                        }
                        .offset(x: 22 * px, y: -19 * px - padLift)
                    }
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
        // On a phone the hangar drops to 1.5 kit pixels so the pad stays large and clear gaps fit across the screen.
        let sx = portrait && kind != "launchpad" ? px * 0.75 : px
        let artH = 44 * sx
        return AnyView(Button { onStructure(kind) } label: {
            Art.view(sprite).resizable().interpolation(.none)
                .frame(width: 72 * sx, height: artH)
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .position(x: center, y: ground - artH * 0.5 + 2 * sx)
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
        case "hangar", "garage": return portrait ? 0.16 : 0.12
        case "launchpad": return portrait ? 0.68 : 0.52
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
