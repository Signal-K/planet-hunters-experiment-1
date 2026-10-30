import Foundation

/// `shared/layout/base-site.json`: where each structure stands on the 520-unit base strip (SSL-423).
/// Port of web `lib/scene/base-site.ts`; same kit scale, home sites and camera framing on both platforms.
public struct BaseSiteMap: Decodable, Sendable {
    public struct Strip: Decodable, Sendable { public let width: Double }
    public struct KitScale: Decodable, Sendable {
        public let phone: Double, large: Double, largeMinHeight: Double, portraitFit: Double, portraitMin: Double
    }
    public struct Ground: Decodable, Sendable {
        public let lineFromBottom: Double
        public let src: String
        public let left: Double, width: Double, above: Double, below: Double
        public let deep: String
    }
    public struct Mount: Decodable, Sendable { public let x: Double, z: Double }
    public struct Structure: Decodable, Sendable {
        public let site: String
        public let src: String?
        public let body: Double?, left: Double?, width: Double?, height: Double?, foot: Double?
        public let mount: Mount?
        /// Sprite centre minus site centre, in kit units (the sprite carries its shadow on the right).
        public var centerOffset: Double {
            guard let body, let left, let width else { return 0 }
            return left + width / 2 - body / 2
        }
    }
    public struct ApronProp: Decodable, Sendable {
        public let id: String, src: String
        public let x: Double, width: Double, height: Double, lift: Double
    }
    public struct OperationsApron: Decodable, Sendable {
        public let after: String
        public let props: [ApronProp]
    }
    public struct Site: Decodable, Sendable, Identifiable {
        public let id: String
        public let x: Double, half: Double
        public let plot: Int?
        public let label: String
    }
    public struct Luminary: Decodable, Sendable { public let kind: String; public let x: Double, y: Double }
    public struct Grade: Decodable, Sendable {
        public let top: String, mid: String, horizon: String
        public let luminary: Luminary
        public let stars: Double, clouds: Double, shade: Double
    }
    public struct Sky: Decodable, Sendable { public let grades: [String: Grade] }

    public let strip: Strip
    public let kitScale: KitScale
    public let ground: Ground
    public let structures: [String: Structure]
    public let operationsApron: OperationsApron?
    public let sites: [Site]
    public let sky: Sky

    public static func load(_ data: Data) throws -> BaseSiteMap { try JSONDecoder().decode(BaseSiteMap.self, from: data) }

    /// Points per kit unit: portrait fits the hangar and pad across the width (1.5 to 2); landscape 2 under 600 pt tall, else 3.
    public func scale(w: Double, h: Double) -> Double {
        if h > w * 1.15 { return (min(kitScale.phone, max(kitScale.portraitMin, w / kitScale.portraitFit)) * 100).rounded() / 100 }
        let preferred = h < kitScale.largeMinHeight ? kitScale.phone : kitScale.large
        return (min(preferred, w / 460) * 100).rounded() / 100
    }

    public func structure(_ kind: String) -> Structure? { structures[kind == "garage" ? "hangar" : kind] }

    public func site(_ id: String) -> Site? { sites.first { $0.id == id } }

    public func homeSite(_ kind: String) -> Site? { structure(kind).flatMap { site($0.site) } }

    /// Strip x the camera starts centred on: the middle of what is built, or the pad site on a fresh base.
    public func homeCenter(_ kinds: [String], viewUnits: Double) -> Double {
        let built = kinds.compactMap(homeSite).filter { $0.id != "shaft" }
        guard let pad = site("pad") else { return strip.width / 2 }
        guard !built.isEmpty else { return pad.x }
        let l = built.map { $0.x - $0.half }.min()!, r = built.map { $0.x + $0.half }.max()!
        if r - l <= viewUnits { return (l + r) / 2 }
        return min(max((l + r) / 2, pad.x + pad.half - viewUnits / 2), pad.x - pad.half + viewUnits / 2)
    }
}
