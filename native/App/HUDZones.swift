import Foundation
import CoreGraphics

/// Base HUD layout spec, read from `shared/layout/base-hud-zones.json` (bundled; web reads the same file).
/// Zone keys match `UI_ZONES` in `web/lib/ui-zones.ts`. Every value is measured from the safe area.
struct HUDZones: Decodable, Sendable {
    struct Zones: Decodable, Sendable {
        struct TopChrome: Decodable, Sendable {
            struct TopLeft: Decodable, Sendable {
                struct Chip: Decodable, Sendable { let height: CGFloat; let glyph: CGFloat; let padding: CGFloat }
                struct Card: Decodable, Sendable { let width: CGFloat; let collapseInPortrait: Bool }
                let inset: CGFloat, gap: CGFloat
                let francsChip: Chip, contractCard: Card
            }
            struct TopRight: Decodable, Sendable {
                struct Pill: Decodable, Sendable { let buttonSize: CGFloat; let buttons: [String] }
                let inset: CGFloat
                let pill: Pill
            }
            let topLeft: TopLeft, topRight: TopRight
        }
        struct BottomNav: Decodable, Sendable {
            struct Tile: Decodable, Sendable { let portrait: CGFloat; let landscape: CGFloat }
            let bottomInset: CGFloat, padding: CGFloat, gap: CGFloat
            let tileSize: Tile
            let tiles: [String]
        }
        let topChrome: TopChrome, bottomNav: BottomNav
        enum CodingKeys: String, CodingKey { case topChrome = "top-chrome", bottomNav = "bottom-nav" }
    }
    /// Where the base scene sits relative to the dock, and where structures and the subsurface marker stand.
    struct Scene: Decodable, Sendable {
        struct Orientation: Decodable, Sendable {
            let structureX: [CGFloat]
            let structureScale: CGFloat
            let subsurfaceX: CGFloat
        }
        /// Gap between the road's lower edge and the dock's top edge.
        let roadClearance: CGFloat
        /// Margin kept clear of outcrops around each structure footprint.
        let outcropMargin: CGFloat
        /// Portrait only: extra strip between road and dock that holds player-placed structures.
        let placedApronPortrait: CGFloat
        let portrait: Orientation, landscape: Orientation
    }
    let zones: Zones
    let scene: Scene

    var topLeft: Zones.TopChrome.TopLeft { zones.topChrome.topLeft }
    var topRight: Zones.TopChrome.TopRight { zones.topChrome.topRight }
    var dock: Zones.BottomNav { zones.bottomNav }
    func orientation(portrait: Bool) -> Scene.Orientation { portrait ? scene.portrait : scene.landscape }

    /// The bundled JSON; the literal below is the same spec so previews and tests never run without one.
    static let standard: HUDZones = {
        if let url = Bundle.main.url(forResource: "base-hud-zones", withExtension: "json"),
           let data = try? Data(contentsOf: url),
           let spec = try? JSONDecoder().decode(HUDZones.self, from: data) { return spec }
        return HUDZones(zones: .init(
            topChrome: .init(
                topLeft: .init(inset: 6, gap: 6, francsChip: .init(height: 36, glyph: 20, padding: 10), contractCard: .init(width: 176, collapseInPortrait: true)),
                topRight: .init(inset: 6, pill: .init(buttonSize: 44, buttons: ["friends", "settings"]))),
            bottomNav: .init(bottomInset: 4, padding: 6, gap: 8, tileSize: .init(portrait: 52, landscape: 44), tiles: ["switch", "build", "hub"])),
            scene: .init(roadClearance: 8, outcropMargin: 12, placedApronPortrait: 92,
                         portrait: .init(structureX: [0.17, 0.46, 0.79], structureScale: 1.0, subsurfaceX: 0.30),
                         landscape: .init(structureX: [0.17, 0.50, 0.80], structureScale: 1.3, subsurfaceX: 0.335)))
    }()
}
