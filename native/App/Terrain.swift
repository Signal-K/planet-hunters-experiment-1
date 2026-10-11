import SwiftUI

/// Port of `lib/scene/terrain-kit.ts` + `compositions.ts` + `TerrainScene.tsx`: the scene is composed
/// by placing Blender-rendered bricks in depth bands, then hazing by depth. `earthBaseWide` is the
/// composition the web Earth Base uses; `earthBasePad` is the closer Launchpad shot.
struct Brick {
    let id: String
    let x: Double
    var scale: Double = 1
    var lift: Double = 0
    var flip = false
}

struct Band {
    let id: String
    let depth: Double
    /// Percent of scene height above the bottom edge, as ground + offset.
    let baseline: (ground: Bool, pct: Double)
    var scale: Double = 1
    let bricks: [Brick]
}

struct SceneComposition {
    let bands: [Band]
    let roadOffset: Double
}

enum TerrainKit {
    static let size: [String: (w: Double, h: Double)] = [
        "mtn_peak_tall": (188, 150), "mtn_peak_broad": (232, 132), "mtn_shoulder": (168, 92),
        "mtn_horn": (152, 162), "mtn_saw_ridge": (246, 104), "mesa": (140, 86),
        "hill_round": (150, 62), "hill_long": (206, 54), "bluff": (124, 70),
        "rock_boulder": (44, 34), "rock_cluster": (72, 40), "scree": (88, 20),
        "tree_pine_tall": (30, 64), "tree_pine_short": (26, 44), "tree_pine_cluster": (84, 62),
        "shrub": (26, 16), "pylon": (40, 76), "fence_run": (96, 14),
        "far_dome": (48, 40), "far_silo": (34, 46), "far_mast": (26, 74), "far_dish": (44, 40), "far_block": (40, 38),
        "cloud_bank_a": (120, 38), "cloud_bank_b": (82, 28),
    ]
}

private func g(_ d: Double) -> (ground: Bool, pct: Double) { (true, d) }
private func abs(_ p: Double) -> (ground: Bool, pct: Double) { (false, p) }
private func b(_ id: String, _ x: Double, _ s: Double = 1, lift: Double = 0, flip: Bool = false) -> Brick {
    Brick(id: id, x: x, scale: s, lift: lift, flip: flip)
}

extension SceneComposition {
    static let earthBaseWide = SceneComposition(bands: [
        Band(id: "clouds", depth: 0.05, baseline: abs(62), bricks: [
            b("cloud_bank_a", 8, 1.1), b("cloud_bank_b", 30, 0.85, flip: true), b("cloud_bank_a", 52, 0.8, lift: 26),
            b("cloud_bank_b", 74, 1.05), b("cloud_bank_a", 92, 0.7, lift: 34, flip: true)]),
        Band(id: "range-far", depth: 0.18, baseline: g(7), scale: 1.05, bricks: [
            b("mtn_peak_broad", -2), b("mtn_saw_ridge", 13, 0.82, flip: true), b("mtn_peak_tall", 27, 0.9),
            b("mtn_horn", 38, 0.72, flip: true), b("mtn_peak_broad", 50, 0.98, flip: true), b("mtn_shoulder", 63, 1.0),
            b("mtn_peak_tall", 74, 1.06, flip: true), b("mtn_saw_ridge", 88, 0.88), b("mtn_horn", 99, 0.8)]),
        Band(id: "range-mid", depth: 0.34, baseline: g(3.5), bricks: [
            b("mtn_shoulder", 4, 0.8), b("mesa", 19, 0.78, flip: true), b("mtn_saw_ridge", 34, 0.6, flip: true),
            b("mtn_peak_tall", 50, 0.6), b("mesa", 65, 0.68), b("mtn_shoulder", 80, 0.78), b("mtn_saw_ridge", 95, 0.55)]),
        Band(id: "facilities-far", depth: 0.46, baseline: g(1.2), scale: 0.82, bricks: [
            b("far_block", 6), b("far_silo", 12, 0.9), b("far_mast", 17, 0.8), b("far_dome", 24),
            b("far_block", 31, 0.85, flip: true), b("far_dish", 38, 0.9), b("far_silo", 45), b("far_block", 57, 1.05),
            b("far_mast", 63), b("far_dome", 70, 0.9, flip: true), b("far_silo", 77, 1.05), b("far_block", 84, 0.9),
            b("far_dish", 91, flip: true), b("far_block", 97, 0.8)]),
        Band(id: "treeline", depth: 0.74, baseline: g(-0.5), bricks: [
            b("tree_pine_cluster", 3, 0.8), b("tree_pine_tall", 11, 0.7), b("tree_pine_cluster", 17, 0.62, flip: true),
            b("pylon", 27, 0.72), b("tree_pine_short", 34, 0.8), b("tree_pine_cluster", 40, 0.7), b("pylon", 52, 0.72),
            b("tree_pine_cluster", 62, 0.66, flip: true), b("tree_pine_tall", 70, 0.72), b("pylon", 78, 0.72),
            b("tree_pine_cluster", 86, 0.78), b("tree_pine_short", 95, 0.85), b("tree_pine_cluster", 99, 0.7, flip: true)]),
        Band(id: "ground-detail", depth: 0.88, baseline: g(-4.5), bricks: [
            b("scree", 44, 0.9), b("rock_cluster", 72, 0.75), b("shrub", 90, 1.1)]),
        Band(id: "foreground", depth: 1, baseline: g(-9), scale: 1.25, bricks: [
            b("rock_cluster", 6, 0.9), b("shrub", 17, 1.2), b("scree", 27, 1.1, flip: true), b("rock_boulder", 40, 0.85),
            b("shrub", 52, 1.0, flip: true), b("rock_cluster", 63, 1.05, flip: true), b("scree", 76, 1.0),
            b("shrub", 87, 1.15), b("rock_boulder", 96, 1.0, flip: true)]),
    ], roadOffset: -4.5)

    static let earthBasePad = SceneComposition(bands: [
        Band(id: "clouds", depth: 0.05, baseline: abs(70), bricks: [
            b("cloud_bank_a", 14, 1.5), b("cloud_bank_b", 46, 1.2, flip: true), b("cloud_bank_a", 82, 1.3, lift: 30)]),
        Band(id: "range-far", depth: 0.2, baseline: g(4), scale: 1.55, bricks: [
            b("mtn_peak_broad", -8, 0.95), b("mtn_horn", 14, 0.78), b("mtn_saw_ridge", 32, 0.8, flip: true),
            b("mtn_peak_tall", 52, 0.85, flip: true), b("mtn_shoulder", 72, 0.85), b("mtn_peak_broad", 92, 0.9, flip: true),
            b("mtn_horn", 108, 0.7, flip: true)]),
        Band(id: "hills-near", depth: 0.5, baseline: g(0.5), scale: 1.45, bricks: [
            b("hill_long", 2), b("hill_round", 26, 0.9), b("bluff", 46, 0.85, flip: true),
            b("hill_long", 68, 1.05, flip: true), b("hill_round", 94, 0.95, flip: true)]),
        Band(id: "treeline", depth: 0.68, baseline: g(-0.5), scale: 1.35, bricks: [
            b("tree_pine_cluster", 2, 0.9), b("tree_pine_tall", 16, 0.9), b("tree_pine_cluster", 30, 0.75, flip: true),
            b("pylon", 46, 0.85), b("tree_pine_short", 58), b("tree_pine_cluster", 72, 0.85, flip: true),
            b("tree_pine_tall", 86, 0.85), b("tree_pine_cluster", 98, 0.8)]),
        Band(id: "ground-detail", depth: 0.88, baseline: g(-7), scale: 1.45, bricks: [
            b("fence_run", 30), b("rock_cluster", 43, 0.9), b("fence_run", 70), b("scree", 84), b("rock_boulder", 93)]),
        Band(id: "foreground", depth: 1, baseline: g(-11), scale: 1.8, bricks: [
            b("tree_pine_short", 9, 0.9), b("rock_boulder", 8), b("shrub", 22, 1.2, flip: true), b("scree", 38, 1.15),
            b("tree_pine_cluster", 49, 0.72, flip: true), b("rock_cluster", 58, 1.0, flip: true), b("shrub", 74, 1.1),
            b("tree_pine_short", 84, 0.86), b("rock_boulder", 91, 1.15, flip: true)]),
    ], roadOffset: -7)
}

/// Web `--hub-*` palette tokens (globals.css) that TerrainScene reads.
private enum Hub {
    static let skyTop = Theme.hex(0xD6E8F4), skyMid = Theme.hex(0xE6F2F9), horizon = Theme.hex(0xBFE6EF)
    static let haze = Theme.hex(0xC5D9E7)
    static let groundFar = Theme.hex(0xCFE0EC), groundNear = Theme.hex(0xBCD2E3), groundLip = Theme.hex(0x8FB0C8)
    static let chalk = Theme.hex(0x2B7A4B), void = Theme.hex(0xEEF3F8)
}

/// Draws the web TerrainScene: sky, depth-hazed bricks, ground plane, road bed. Z-order follows the web:
/// a band sits at `1 + round(depth * 10)`, the ground plane and road at 9, so the treeline and everything
/// further stands behind the ground while ground-detail and foreground lie on it. `ground` is the ground
/// line as a fraction of height from the bottom (web `--hub-ground`).
struct TerrainScene: View {
    var composition: SceneComposition = .earthBaseWide
    var ground: Double = 0.28
    /// Footprints (scene coordinates) that outcrops and foreground rocks must stay out of.
    var exclusions: [CGRect] = []
    /// The web shows the outlined planet only on the wide establishing shot.
    var showsPlanet = true

    /// How strongly a band is washed toward the haze colour (web `hazeFor`): most of aerial perspective
    /// happens in the first stretch of distance.
    static func haze(depth: Double) -> Double {
        let t = 1 - min(1, max(0, depth))
        return min(0.92, t * t * 0.95)
    }

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height
            let groundH = h * ground, groundY = h - groundH
            ZStack(alignment: .topLeading) {
                LinearGradient(stops: [.init(color: Hub.skyTop, location: 0), .init(color: Hub.skyMid, location: 0.52), .init(color: Hub.horizon, location: 1)],
                               startPoint: .top, endPoint: .bottom)
                ForEach(Array(composition.bands.enumerated()), id: \.offset) { _, band in
                    bandView(band, w: w, h: h).zIndex(Double(1 + Int((band.depth * 10).rounded())))
                }
                groundPlane(w: w, height: groundH).position(x: w / 2, y: groundY + groundH / 2).zIndex(9)
                road(w: w, h: h).zIndex(9)
                if showsPlanet {
                    let side = min(w * 0.5, 300)
                    Planet().frame(width: side, height: side).position(x: w * 1.12 - side / 2, y: h * 0.16 + side / 2).zIndex(20)
                }
            }
            .frame(width: w, height: h)
        }
        .clipped()
    }

    @ViewBuilder private func bandView(_ band: Band, w: Double, h: Double) -> some View {
        let hazeAmount = Self.haze(depth: band.depth)
        ForEach(Array(Self.frames(band, composition: composition, ground: ground, size: CGSize(width: w, height: h), exclusions: exclusions).enumerated()), id: \.offset) { _, f in
            let sprite = Art.view("terrain/\(f.brick.id).png").resizable().interpolation(.high)
            sprite
                .overlay { if hazeAmount > 0.01 { Rectangle().fill(Hub.haze).opacity(hazeAmount).mask { sprite } } }
                .frame(width: f.frame.width, height: f.frame.height)
                .scaleEffect(x: f.brick.flip ? -1 : 1, y: 1)
                .shadow(color: Hub.void.opacity(band.depth >= 0.88 ? 0.42 : 0), radius: 4, y: 4)
                .position(x: f.frame.midX, y: f.frame.midY)
        }
    }

    /// Pieces that read as background rock: no structure may stand in front of them.
    static let outcrops: Set<String> = ["mesa", "bluff", "rock_boulder", "rock_cluster", "scree"]

    /// Bricks of one band with their on-screen frames. Outcrops, and anything in the two ground bands,
    /// that touch an exclusion rect are dropped, so structures and the dock never sit over rock.
    static func frames(_ band: Band, composition: SceneComposition, ground: Double, size: CGSize, exclusions: [CGRect]) -> [(brick: Brick, frame: CGRect)] {
        let w = Double(size.width), h = Double(size.height)
        // Web authors in CSS px for a 402pt-wide phone; scale with the viewport like BaseLayout does.
        let k = min(max(w / 402, 0.8), h / 874 * 1.25 + 0.6)
        let pct = band.baseline.ground ? ground * 100 + band.baseline.pct : band.baseline.pct
        let y = h * (1 - pct / 100)
        let guarded = band.id == "foreground" || band.id == "ground-detail"
        return band.bricks.compactMap { p in
            guard let kit = TerrainKit.size[p.id] else { return nil }
            let s = p.scale * band.scale * k
            let bw = kit.w * s, bh = kit.h * s
            let frame = CGRect(x: w * p.x / 100 - bw / 2, y: y - bh - p.lift * k, width: bw, height: bh)
            if (outcrops.contains(p.id) || guarded) && exclusions.contains(where: { $0.intersects(frame) }) { return nil }
            return (p, frame)
        }
    }

    /// Lip with glow, then the nearer soil band from 46% of the plane down.
    private func groundPlane(w: Double, height: Double) -> some View {
        ZStack(alignment: .top) {
            Rectangle().fill(Hub.groundFar)
            Rectangle().fill(Hub.groundNear).frame(height: height * 0.54).frame(maxHeight: .infinity, alignment: .bottom)
            Rectangle().fill(Hub.groundLip).frame(height: 9).shadow(color: Hub.groundLip, radius: 8)
        }
        .frame(width: w, height: height)
    }

    /// Continuous service-road bed (web `RoadBed`), centred `roadOffset` percent of height off the ground line.
    private func road(w: Double, h: Double) -> some View {
        let y = h * (1 - (ground * 100 + composition.roadOffset) / 100)
        let bed = Hub.void.mix(Hub.groundNear, 0.22)
        let dash = Hub.groundLip.mix(Hub.chalk, 0.22)
        return Rectangle().fill(bed)
            .frame(width: w, height: 22)
            .overlay(alignment: .top) { Rectangle().fill(Hub.groundLip).frame(height: 4) }
            .overlay(alignment: .bottom) { Rectangle().fill(Hub.groundNear).frame(height: 4) }
            .overlay { Rectangle().fill(dash).opacity(0.82).frame(height: 2).mask(
                HStack(spacing: 0) { ForEach(0..<Int(w / 48) + 1, id: \.self) { _ in Color.clear.frame(width: 24); Rectangle().frame(width: 24) } }
                    .frame(width: w, alignment: .leading)) }
            .position(x: w / 2, y: y)
    }
}

private extension Color {
    /// Opaque sRGB blend toward `other` (CSS `color-mix(in srgb, self, other t)`).
    func mix(_ other: Color, _ t: Double) -> Color {
        #if canImport(UIKit)
        let a = UIColor(self), b = UIColor(other)
        #else
        let a = NSColor(self), b = NSColor(other)
        #endif
        var (r1, g1, b1, a1, r2, g2, b2, a2) = (CGFloat(0), CGFloat(0), CGFloat(0), CGFloat(0), CGFloat(0), CGFloat(0), CGFloat(0), CGFloat(0))
        #if canImport(UIKit)
        a.getRed(&r1, green: &g1, blue: &b1, alpha: &a1); b.getRed(&r2, green: &g2, blue: &b2, alpha: &a2)
        #else
        a.usingColorSpace(.sRGB)?.getRed(&r1, green: &g1, blue: &b1, alpha: &a1); b.usingColorSpace(.sRGB)?.getRed(&r2, green: &g2, blue: &b2, alpha: &a2)
        #endif
        return Color(.sRGB, red: Double(r1 + (r2 - r1) * t), green: Double(g1 + (g2 - g1) * t), blue: Double(b1 + (b2 - b1) * t))
    }
}

/// Web `PlanetBackdrop`: a large outlined planet with three bands (viewBox 100). Built from shapes, not Canvas,
/// so `ImageRenderer` snapshots show it.
private struct Planet: View {
    var body: some View {
        GeometryReader { geo in
            let s = geo.size.width / 100
            ZStack(alignment: .topLeading) {
                Circle().fill(Theme.blue.opacity(0.35)).frame(width: 96 * s, height: 96 * s).offset(x: 5 * s, y: 5 * s)
                Circle().fill(Theme.hex(0xDFE9F3)).frame(width: 96 * s, height: 96 * s).offset(x: 2 * s, y: 2 * s)
                ZStack(alignment: .topLeading) {
                    ForEach([(26.0, 0x42A6DF), (43, 0x168A80), (60, 0x42A6DF)], id: \.0) { y, c in
                        Rectangle().fill(Theme.hex(UInt32(c), 0.45)).frame(width: 100 * s, height: 9 * s).offset(y: y * s)
                    }
                }
                .frame(width: 100 * s, height: 100 * s, alignment: .topLeading)
                .mask { Circle().frame(width: 96 * s, height: 96 * s).offset(x: 2 * s, y: 2 * s).frame(width: 100 * s, height: 100 * s, alignment: .topLeading) }
                Circle().stroke(Theme.hex(0x0F2436), lineWidth: 1.2 * s).frame(width: 96 * s, height: 96 * s).offset(x: 2 * s, y: 2 * s)
            }
        }
        .allowsHitTesting(false)
    }
}
