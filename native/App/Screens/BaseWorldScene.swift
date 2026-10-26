import SwiftUI
import LandnamCore

/// The base: the world as game objects (`BaseWorldCanvas`: sky, steppe, escarpments, paved ground, weather and sky
/// events) with the player's structures standing on their home sites from `shared/layout/base-site.json`, and the
/// underground cutaway below (`BaseUnderground`). The camera (`BaseCamera`) pans along the strip and down to the
/// cutaway. A fresh base has no structures; in placement mode the picked structure's one site is marked.
struct BaseWorldScene: View {
    var biome: EarthBiome = .mountains
    /// Fixes the sky grade (the intro stays on deep dusk); nil follows the local clock.
    var grade: String? = nil
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
    /// 0...1: the rocket is taken apart from the top down, in pixel steps (settling a haul).
    var padDismantle: CGFloat = 0
    var insets: EdgeInsets = EdgeInsets()
    var camera: BaseCamera
    /// Off for backdrop use (the mission board): no edge chevrons or depth button over the scene.
    var showsControls: Bool = true
    var onStructure: (String) -> Void
    var onShaft: () -> Void
    var onBuildSilo: () -> Void
    /// Placement mode: the picked structure's home site is marked while it is free.
    var placing: Bool = false
    var pickedKind: String? = nil
    var onSlot: (Int) -> Void = { _ in }
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pinchStart: CGFloat?
    @State private var dragStartX: CGFloat?
    @State private var dragVertical: Bool?
    private let pulse = true

    private var shownKinds: [String] { placed }

    private var siloPlaced: Bool { placed.contains("surface-silo") }
    private var siloBuilt: Bool { siloPlaced && excavated }

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let world = BaseWorld(w: w, h: h)
            let ground = world.ground
            let cx = min(max(camera.x, 0), world.maxX)
            let lift = world.shift * camera.depth
            ZStack(alignment: .topLeading) {
                ZStack(alignment: .topLeading) {
                    // The world rides inside the camera container (so it dives and zooms with the structures) but
                    // counter-offsets the pan: it draws its own parallax from `camX`.
                    BaseWorldCanvas(px: world.px, camX: 0, zoom: 1, biome: biome.rawValue, grade: grade ?? WorldAssets.grade())
                        .frame(width: world.worldW, height: h)
                    BaseUnderground(world: world, built: siloBuilt, siloPlaced: siloPlaced, secondTank: secondTank, oreFraction: oreFraction, onBuild: onBuildSilo, onOpen: onShaft, active: camera.depth > 0)
                        .offset(y: ground)
                        .allowsHitTesting(camera.underground)
                    shaftHead(world: world)
                    ForEach(shownKinds, id: \.self) { kind in
                        structure(kind, world: world)
                    }
                    if h > 640 {
                        ForEach(shownKinds, id: \.self) { kind in
                            nameTag(kind, world: world)
                        }
                    }
                    if placing { siteMarker(world: world) }
                }
                .frame(width: world.worldW, height: world.worldH, alignment: .topLeading)
                .offset(x: -cx, y: -lift)
                .scaleEffect(x: camera.zoom, y: camera.zoom < 1 ? 1 : camera.zoom, anchor: .topLeading)
                if showsControls {
                    depthButton(world: world)
                }
            }
            .frame(width: w, height: h, alignment: .topLeading)
            .clipped()
            .contentShape(Rectangle())
            .simultaneousGesture(pan(world: world))
            .simultaneousGesture(pinch())
            .onAppear {
                // Frame what is built (the pad site on a fresh base) once; the player pans from there.
                if !camera.homed && camera.x == 0 && camera.depth == 0 { camera.x = world.homeX(shownKinds) }
                camera.homed = true
            }
            .onChange(of: placed) { old, now in
                if now.contains("launchpad") && !old.contains("launchpad") { withAnimation(.easeInOut(duration: 0.5)) { camera.x = world.homeX(now) } }
            }
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

    /// Surface marker over the shaft: the lift head once the silo is built. Nothing stands there before (the world starts empty).
    private func shaftHead(world: BaseWorld) -> some View {
        let u = world.u
        return ZStack {
            if siloBuilt {
                Button(action: onShaft) {
                    Art.view("base/kit/ug-hatch.png").resizable().interpolation(.none)
                        .frame(width: 26 * u, height: 16 * u)
                        .frame(minWidth: 44, minHeight: 44)
                        .contentShape(Rectangle())
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .strokeBorder(Theme.blue, style: StrokeStyle(lineWidth: 2, dash: [5, 3]))
                                .background(Theme.blue.opacity(0.14), in: RoundedRectangle(cornerRadius: 6))
                                .shadow(color: Theme.blue.opacity(0.55), radius: 7)
                                .modifier(ShaftPulse())
                        )
                }
                .buttonStyle(.plain)
                .position(x: world.shaftX, y: world.ground + 5 * u - 8 * u)
                .accessibilityLabel("Open the lift")
            }
        }
        .allowsHitTesting(camera.depth < 0.5)
    }

    private func kindLabel(_ kind: String) -> String {
        switch kind {
        case "launchpad": return "Launchpad"
        case "hangar", "garage": return "Hangar"
        case "market": return "Exchange"
        case "control-station": return "Control station"
        default: return "Structure"
        }
    }

    /// A built structure on its home site (v7 sprite, shadow included). The rocket stands on the launch mount only
    /// while a build or mission is in progress; the idle pad is empty (web `PixelStructure`).
    private func structure(_ kind: String, world: BaseWorld) -> AnyView {
        guard let map = WorldAssets.site, let site = map.homeSite(kind), let sprite = map.structure(kind),
              let src = sprite.src, let sw = sprite.width, let sh = sprite.height else { return AnyView(EmptyView()) }
        let px = world.px
        let width = CGFloat(sw) * px, height = CGFloat(sh) * px
        let centerX = CGFloat(site.x + sprite.centerOffset) * px
        let bottom = world.ground - CGFloat(sprite.foot ?? 0) * px
        return AnyView(Button { onStructure(kind) } label: {
            ZStack(alignment: .bottomLeading) {
                Art.view(src).resizable().interpolation(.high)
                    .frame(width: width, height: height)
                if kind == "launchpad", padOccupied, let mount = sprite.mount {
                    ZStack(alignment: .bottom) {
                        if padLift > 0 {
                            Art.view("base/kit/flame-\(Int(padLift / 6) % 3).png").resizable().interpolation(.none)
                                .frame(width: 9 * px, height: 18 * px).rotationEffect(.degrees(-90))
                                .offset(y: 14 * px)
                        }
                        Art.view(padCore ? "base/kit/space-rocket.png" : "base/kit/pad-rocket.png").resizable().interpolation(.none)
                            .frame(width: 44 * px, height: 72 * px)
                            .mask(alignment: .bottom) { Rectangle().frame(height: 72 * px * (1 - (padDismantle * 8).rounded(.down) / 8)) }
                    }
                    .offset(x: CGFloat(mount.x - 22) * px, y: -CGFloat(mount.z + 2) * px - padLift)
                }
            }
            .frame(width: width, height: height, alignment: .bottomLeading)
            .frame(minWidth: 44, minHeight: 44)
            .contentShape(Rectangle())
            .scaleEffect(kind == "launchpad" ? 0.82 : 1, anchor: .bottom)
        }
        .buttonStyle(.plain)
        .position(x: centerX, y: bottom - height / 2)
        .accessibilityLabel(kindLabel(kind)))
    }

    /// Name tag just below a structure's footing, so every building is labelled (web `hub-building-name`).
    private func nameTag(_ kind: String, world: BaseWorld) -> AnyView {
        guard let map = WorldAssets.site, let site = map.homeSite(kind), let sprite = map.structure(kind) else { return AnyView(EmptyView()) }
        let px = world.px
        let centerX = CGFloat(site.x + sprite.centerOffset) * px
        let bottom = world.ground - CGFloat(sprite.foot ?? 0) * px
        return AnyView(Text(kindLabel(kind).uppercased())
            .font(AppFont.display(14)).tracking(1.1)
            .foregroundStyle(Theme.hudInk)
            .padding(.horizontal, 10).padding(.vertical, 2)
            .background(Capsule().fill(Theme.hudPanel))
            .overlay(Capsule().stroke(Theme.hudInk, lineWidth: 1))
            .fixedSize()
            .position(x: centerX, y: bottom + 14)
            .allowsHitTesting(false)
            .accessibilityHidden(true))
    }

    /// The picked structure's one site, marked on the ground at its real footprint while it is free (web `SiteMarker`).
    /// A fresh base shows exactly this, on the pad site: the first build has an obvious place.
    @ViewBuilder private func siteMarker(world: BaseWorld) -> some View {
        if let map = WorldAssets.site, let kind = pickedKind, let site = map.homeSite(kind), let plot = site.plot,
           !shownKinds.contains(kind), !plots.values.contains(plot) {
            let px = world.px
            let width = max(44, CGFloat(site.half * 2) * px)
            Button { onSlot(plot) } label: {
                VStack(spacing: 8) {
                    HStack(spacing: 8) {
                        Text("+").font(AppFont.display(16)).foregroundStyle(Theme.hudPanel)
                            .frame(width: 22, height: 22).background(Circle().fill(Theme.blue))
                        Text("PLACE \(kindLabel(kind).uppercased())").font(AppFont.display(14)).tracking(1.6).foregroundStyle(Theme.hudInk)
                    }
                    .padding(.horizontal, 16).frame(minHeight: 44)
                    .background(Capsule().fill(Theme.hudPanel))
                    .overlay(Capsule().stroke(Theme.hudInk, lineWidth: 2))
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Theme.hudPanel.opacity(0.3))
                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.hudPanel, style: StrokeStyle(lineWidth: 2, dash: [6, 4])))
                        .frame(width: width, height: 6 * px)
                        .opacity(pulse ? 1 : 0.65)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            // Keep the placement affordance above its footprint. The former
            // centre-line anchor let the wide Control Station pill intrude
            // into the neighbouring structure on compact landscape screens.
            .position(x: CGFloat(site.x) * px, y: world.ground - 54 - 3 * px)
            .accessibilityLabel("Place \(kindLabel(kind)) here")
        }
    }
}


/// Slow opacity pulse on the lift-head highlight, matching the web shaft button.
private struct ShaftPulse: ViewModifier {
    @State private var on = false
    func body(content: Content) -> some View {
        content.opacity(on ? 1 : 0.55)
            .onAppear { withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true)) { on = true } }
    }
}
