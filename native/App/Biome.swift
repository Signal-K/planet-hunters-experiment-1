import SwiftUI

/// Which landscape the Earth Base stands in. Stored by raw value so an unknown or missing value reads as `.mountains`.
/// There is no picker yet (SSL-502); `-biome <name>` on the launch line overrides it for snapshots and QA.
enum EarthBiome: String, CaseIterable, Codable {
    case mountains, desert, tundra, coast

    static let defaultsKey = "earthBiome"

    static func resolve(arguments: [String] = ProcessInfo.processInfo.arguments, defaults: UserDefaults = .standard) -> EarthBiome {
        if let i = arguments.firstIndex(of: "-biome"), arguments.indices.contains(i + 1), let b = EarthBiome(rawValue: arguments[i + 1]) { return b }
        return defaults.string(forKey: defaultsKey).flatMap { EarthBiome(rawValue: $0) } ?? .mountains
    }

    /// One tiled horizontal band of the background. Pixel sizes are the delivered 2x files (docs/design/biomes/manifest.json).
    struct Band {
        let asset: String
        let size: CGSize
        /// Gentle shared colour grade: 1 leaves the art alone. The coast far layer is more photographic than the rest.
        let saturation: Double
        /// Photographic art with a hard top edge dissolves into the sky instead.
        var fadeTop = false
    }
    struct Prop {
        let asset: String
        let size: CGSize
        /// Bottom-contact point inside the PNG, in file pixels.
        let anchor: CGPoint
    }

    private func band(_ n: String, _ w: Double, _ h: Double, sat: Double = 0.92, fade: Bool = false) -> Band {
        Band(asset: "Biome/\(rawValue)-layer-\(n)", size: CGSize(width: w, height: h), saturation: sat, fadeTop: fade)
    }

    /// Back to front, sitting on the horizon, ending at the verge.
    var backBands: [Band] {
        switch self {
        case .mountains: [band("far", 2332, 368), band("hills", 2344, 350), band("treeline", 2196, 422)]
        case .desert: [band("far", 2332, 416)]
        case .tundra: [band("far", 2352, 316)]
        case .coast: [band("far", 2332, 356, sat: 0.78, fade: true)]
        }
    }
    /// Verge, road and verge again; continues to the bottom of the screen.
    var ground: Band {
        switch self {
        case .mountains: band("ground", 2036, 922)
        case .desert: band("ground", 2148, 1118)
        case .tundra: band("ground", 2202, 1106)
        case .coast: band("ground", 2254, 956)
        }
    }
    /// Where the road centre sits inside the ground band, as a fraction of its height.
    var roadFraction: CGFloat { 0.30 }

    var props: [Prop] {
        guard self == .mountains else { return [] }
        func p(_ n: String, _ w: Double, _ h: Double, _ ax: Double, _ ay: Double) -> Prop {
            Prop(asset: "Biome/mountains-\(n)", size: CGSize(width: w, height: h), anchor: CGPoint(x: ax, y: ay))
        }
        return [p("rock-1", 702, 542, 330.5, 531), p("rock-2", 312, 418, 153, 406), p("rock-3", 420, 330, 191.5, 318),
                p("rock-4", 356, 488, 153.5, 477), p("rock-5", 286, 186, 135.5, 174),
                p("shrub-1", 592, 424, 271.5, 413), p("shrub-2", 650, 394, 331, 383)]
    }
}

/// Pure geometry of the biome background: every band tiled on its own, the ground running to the bottom edge
/// and seeded props on the verge that stay out of the structure, label and dock footprints.
struct BiomeLayout {
    struct Strip { let band: EarthBiome.Band; let frame: CGRect; let tileWidth: CGFloat }
    struct Placed { let asset: String; let frame: CGRect }

    let biome: EarthBiome
    let size: CGSize
    /// Road centre line in scene coordinates (BaseLayout keeps the dock clear of its lower edge).
    let roadY: CGFloat
    var exclusions: [CGRect] = []

    /// Points per delivered 2x pixel: web's 402pt phone shows each band at about 420pt.
    private var unit: CGFloat { 0.18 * min(max(size.width / 402, 0.8), size.height / 874 * 1.25 + 0.6) }

    var groundFrame: CGRect {
        let g = biome.ground
        let height = max(g.size.height * unit, (size.height - roadY) / (1 - biome.roadFraction))
        let top = roadY - biome.roadFraction * height
        return CGRect(x: 0, y: top, width: size.width, height: height)
    }
    private var groundTileWidth: CGFloat { groundFrame.height * biome.ground.size.width / biome.ground.size.height }

    var ground: Strip { Strip(band: biome.ground, frame: groundFrame, tileWidth: groundTileWidth) }

    /// Far to near. Bottoms overlap the next band the way the delivered preview stacks them.
    var strips: [Strip] {
        let bands = biome.backBands, top = groundFrame.minY, gh = groundFrame.height
        // Nearest band first: its bottom sits on the verge; each band behind ends partway up the one in front.
        let step: [CGFloat] = [0.14, 0.62]
        var bottom = top + 0.02 * gh
        var out: [Strip] = []
        for (n, b) in bands.reversed().enumerated() {
            let h = b.size.height * unit
            out.append(Strip(band: b, frame: CGRect(x: 0, y: bottom - h, width: size.width, height: h), tileWidth: b.size.width * unit))
            bottom -= step[min(n, step.count - 1)] * h
        }
        return out.reversed()
    }

    /// Seeded rocks and shrubs along the verge, never over an exclusion.
    var props: [Placed] {
        let kit = biome.props
        guard !kit.isEmpty else { return [] }
        var rng = SeededGenerator(seed: 0xB10_0E)
        let y = groundFrame.minY + 0.07 * groundFrame.height
        let pu = unit * 0.25
        var out: [Placed] = []
        for _ in 0..<16 {
            let p = kit[Int(rng.next() % UInt64(kit.count))]
            let x = CGFloat(Double(rng.next() % 10_000) / 10_000) * size.width
            let frame = CGRect(x: x - p.anchor.x * pu, y: y - p.anchor.y * pu, width: p.size.width * pu, height: p.size.height * pu)
            if exclusions.contains(where: { $0.intersects(frame) }) { continue }
            out.append(Placed(asset: p.asset, frame: frame))
        }
        return out
    }
}

/// Small deterministic generator so the props sit in the same places every launch.
struct SeededGenerator: RandomNumberGenerator {
    var state: UInt64
    init(seed: UInt64) { state = seed &+ 0x9E37_79B9_7F4A_7C15 }
    mutating func next() -> UInt64 {
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }
}

struct BiomeBackdrop: View {
    let layout: BiomeLayout

    var body: some View {
        ZStack(alignment: .topLeading) {
            LinearGradient(colors: [Theme.skyTop, Theme.skyMid, Theme.horizon], startPoint: .top, endPoint: .init(x: 0.5, y: layout.strips.first.map { $0.frame.maxY / layout.size.height } ?? 0.6))
            ForEach(Array(layout.strips.enumerated()), id: \.offset) { _, s in tiled(s) }
            tiled(layout.ground)
            ForEach(Array(layout.props.enumerated()), id: \.offset) { _, p in
                Image(p.asset).resizable().frame(width: p.frame.width, height: p.frame.height).position(x: p.frame.midX, y: p.frame.midY)
            }
        }
        .frame(width: layout.size.width, height: layout.size.height, alignment: .topLeading)
        .clipped()
        .accessibilityHidden(true)
    }

    /// Each band is repeated edge to edge on its own: the delivered art wraps seamlessly, so there is never one big image.
    private func tiled(_ s: BiomeLayout.Strip) -> some View {
        let count = Int((layout.size.width / s.tileWidth).rounded(.up)) + 1
        return HStack(spacing: 0) {
            ForEach(0..<count, id: \.self) { _ in
                Image(s.band.asset).resizable().interpolation(.high).saturation(s.band.saturation).frame(width: s.tileWidth, height: s.frame.height)
            }
        }
        .frame(width: layout.size.width, height: s.frame.height, alignment: .leading)
        .clipped()
        .mask(LinearGradient(stops: s.band.fadeTop ? [.init(color: .clear, location: 0), .init(color: .black, location: 0.35)] : [.init(color: .black, location: 0), .init(color: .black, location: 1)], startPoint: .top, endPoint: .bottom))
        .position(x: layout.size.width / 2, y: s.frame.midY)
    }
}
