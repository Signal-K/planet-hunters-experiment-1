import SwiftUI

/// Where everything sits in the base world, which is wider than the screen (pan along it) and taller than the screen
/// (pan down to the underground cutaway). Surface coordinates match the screen at camera x 0, depth 0.
/// The surface is the 520-unit strip from `shared/layout/base-site.json` at `px` points per unit (web uses the same map).
struct BaseWorld {
    let w: CGFloat, h: CGFloat

    var portrait: Bool { h > w * 1.15 }
    /// Points per kit unit (web `kitScale`).
    var px: CGFloat { CGFloat(WorldAssets.site?.scale(w: Double(w), h: Double(h)) ?? 2) }
    var ground: CGFloat { h * CGFloat(1 - (WorldAssets.site?.ground.lineFromBottom ?? 0.2)) }
    /// Distance from the ground line to the top of the soil: at the surface the paving fills the screen to its
    /// bottom edge (as web); the soil and cutaway only show when the camera dives.
    var dirtDepth: CGFloat { max(h - ground, 20 * px) }
    var dirtTop: CGFloat { ground + dirtDepth }
    /// Underground pixel scale: whole numbers so sprites keep the kit's pixel grid.
    var u: CGFloat { h >= 600 ? 3 : 2 }
    var stripW: CGFloat { CGFloat(WorldAssets.site?.strip.width ?? 520) * px }
    var shaftX: CGFloat { CGFloat(WorldAssets.site?.site("shaft")?.x ?? 466) * px }
    var worldW: CGFloat { max(stripW, shaftX + 164 * u) }
    /// Camera x that centres what is built (the pad site on a fresh base), as web `homeCenter`.
    func homeX(_ kinds: [String]) -> CGFloat {
        let units = Double(w / px)
        let centre = WorldAssets.site?.homeCenter(kinds, viewUnits: units) ?? 190
        return min(max(CGFloat(centre) * px - w / 2, 0), maxX)
    }
    var maxX: CGFloat { max(0, worldW - w) }
    var chamberTop: CGFloat { dirtTop + 12 * u }
    /// How far the world moves up when the camera is fully underground: centres the chamber between the HUD and the dock.
    var shift: CGFloat { max(0, chamberTop + 42 * u - (h / 2 - 10)) }
    var worldH: CGFloat { h + shift }
    /// Camera x that puts the lift shaft in the middle of the screen.
    var shaftFocusX: CGFloat { min(max(shaftX - w / 2, 0), maxX) }
}

/// Camera for the base scene: horizontal pan `x` along the strip and vertical `depth` from 0 (surface) to 1 (underground).
@MainActor @Observable
final class BaseCamera {
    var x: CGFloat
    var depth: CGFloat
    /// Pinch zoom: 1 is the whole-base view, `maxZoom` a close-up of one structure.
    var zoom: CGFloat = 1
    /// Set once the camera has been framed on what is built, so it does not jump back when the player pans.
    var homed = false
    static let maxZoom: CGFloat = 2.6
    static let minZoom: CGFloat = 0.1
    private var returnX: CGFloat = 0
    private(set) var diving: Bool

    init(x: CGFloat = 0, depth: CGFloat = 0) {
        self.x = x; self.depth = depth; diving = depth > 0.5
    }

    var underground: Bool { diving }

    func clamp(_ value: CGFloat, _ world: BaseWorld) -> CGFloat { min(max(value, 0), world.maxX) }

    func clampZoom(_ value: CGFloat) -> CGFloat { min(max(value, Self.minZoom), Self.maxZoom) }

    func fitZoom(_ world: BaseWorld) -> CGFloat { min(1, world.w / max(world.worldW, world.w)) }

    func overview(_ world: BaseWorld) {
        withAnimation(.easeInOut(duration: 0.35)) {
            zoom = fitZoom(world)
            x = 0
        }
    }

    var position: CGFloat { x }

    func setPosition(_ value: CGFloat, _ world: BaseWorld) {
        let clamped = min(max(value, 0), 1)
        x = world.maxX * clamped
    }

    func pan(by delta: CGFloat, _ world: BaseWorld, animated: Bool = true) {
        let target = clamp(x + delta, world)
        if animated { withAnimation(.easeInOut(duration: 0.45)) { x = target } } else { x = target }
    }

    /// Smooth pan down to the underground (centred on the shaft) or back up to where the player was.
    func dive(_ down: Bool, _ world: BaseWorld, reduceMotion: Bool = false) {
        guard down != diving else { return }
        diving = down
        if down { returnX = x }
        let tx = down ? world.shaftFocusX : clamp(returnX, world)
        let anim: Animation? = reduceMotion ? nil : .easeInOut(duration: 0.85)
        withAnimation(anim) { depth = down ? 1 : 0; x = tx }
    }
}
