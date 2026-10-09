import SwiftUI

/// Port of `lib/scene/terrain-kit.ts` + `compositions.ts`: the scene is composed
/// by placing Blender-rendered bricks in depth bands, then hazing by depth.
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

/// Draws sky gradient, ground, road bed and depth-hazed bricks. `ground` is the
/// ground line as a fraction of height from the bottom (web `--hub-ground`).
struct TerrainScene: View {
    var composition: SceneComposition = .earthBasePad
    var ground: Double = 0.28
    /// Footprints (scene coordinates) that outcrops and foreground rocks must stay out of.
    var exclusions: [CGRect] = []

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height
            // Web authors for a 402pt-wide phone; scale bricks to the viewport
            // so a wide Mac window shows the same composition, not a stretched one.
            let k = min(max(w / 402, 0.8), h / 874 * 1.25 + 0.6)
            let groundY = h * (1 - ground)
            ZStack(alignment: .topLeading) {
                LinearGradient(colors: [Theme.skyTop, Theme.skyMid, Theme.horizon], startPoint: .top, endPoint: .init(x: 0.5, y: 1 - ground))
                Rectangle().fill(LinearGradient(colors: [Theme.groundFar, Theme.groundNear], startPoint: .top, endPoint: .bottom))
                    .frame(height: h * ground).position(x: w / 2, y: groundY + h * ground / 2)
                ForEach(Array(composition.bands.enumerated()), id: \.offset) { _, band in
                    bandView(band, w: w, h: h, k: k)
                    if band.id == "ground-detail" { road(w: w, h: h, groundY: groundY) }
                }
            }
        }
        .clipped()
    }

    @ViewBuilder private func bandView(_ band: Band, w: Double, h: Double, k: Double) -> some View {
        ForEach(Array(Self.frames(band, composition: composition, ground: ground, size: CGSize(width: w, height: h), exclusions: exclusions).enumerated()), id: \.offset) { _, f in
            Art.view("terrain/\(f.brick.id).png").resizable().interpolation(.high)
                .frame(width: f.frame.width, height: f.frame.height)
                .scaleEffect(x: f.brick.flip ? -1 : 1, y: 1)
                .shadow(color: Theme.bg.opacity(band.depth >= 0.88 ? 0.42 : 0), radius: 3, y: 4)
                .position(x: f.frame.midX, y: f.frame.midY)
        }
    }

    /// Pieces that read as background rock: no structure may stand in front of them.
    static let outcrops: Set<String> = ["mesa", "bluff", "rock_boulder", "rock_cluster", "scree"]

    /// Bricks of one band with their on-screen frames. Outcrops, and anything in the two ground bands,
    /// that touch an exclusion rect are dropped, so structures and the dock never sit over rock.
    static func frames(_ band: Band, composition: SceneComposition, ground: Double, size: CGSize, exclusions: [CGRect]) -> [(brick: Brick, frame: CGRect)] {
        let w = Double(size.width), h = Double(size.height)
        let k = min(max(w / 402, 0.8), h / 874 * 1.25 + 0.6)
        let pct = band.baseline.ground ? ground * 100 + band.baseline.pct : band.baseline.pct
        let y = h * (1 - pct / 100)
        let guarded = band.id == "foreground" || band.id == "ground-detail"
        return band.bricks.compactMap { p in
            guard let kit = TerrainKit.size[p.id] else { return nil }
            let s = p.scale * band.scale * k
            let bw = kit.w * s, bh = kit.h * s
            let frame = CGRect(x: w * p.x / 100 - bw / 2, y: y - bh - p.lift, width: bw, height: bh)
            if (outcrops.contains(p.id) || guarded) && exclusions.contains(where: { $0.intersects(frame) }) { return nil }
            return (p, frame)
        }
    }

    private func road(w: Double, h: Double, groundY: Double) -> some View {
        let y = h * (1 - (ground * 100 + composition.roadOffset) / 100)
        return Rectangle().fill(Theme.mix(0.40))
            .frame(width: w, height: 22)
            .overlay(alignment: .top) { Rectangle().fill(Theme.groundLip).frame(height: 4) }
            .overlay(alignment: .bottom) { Rectangle().fill(Theme.groundNear).frame(height: 4) }
            .overlay { Rectangle().fill(Theme.chalk.opacity(0.8)).frame(height: 2).mask(
                HStack(spacing: 24) { ForEach(0..<Int(w / 48) + 1, id: \.self) { _ in Rectangle().frame(width: 24) } }
                    .frame(width: w, alignment: .leading)) }
            .position(x: w / 2, y: y)
    }
}

