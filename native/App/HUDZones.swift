import Foundation
import CoreGraphics

/// Base HUD layout spec, read from `shared/layout/base-hud-zones.json` (bundled; web reads the same file).
/// Zone keys match `UI_ZONES` in `web/lib/ui-zones.ts`. Every value is measured from the safe area.
struct HUDZones: Decodable, Sendable {
    struct Zones: Decodable, Sendable {
        struct TopChrome: Decodable, Sendable {
            struct TopLeft: Decodable, Sendable {
                struct Chip: Decodable, Sendable { let height: CGFloat }
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
        struct BottomNav: Decodable, Sendable { let bottomInset: CGFloat; let tileSize: CGFloat; let tiles: [String] }
        let topChrome: TopChrome, bottomNav: BottomNav
        enum CodingKeys: String, CodingKey { case topChrome = "top-chrome", bottomNav = "bottom-nav" }
    }
    let zones: Zones

    var topLeft: Zones.TopChrome.TopLeft { zones.topChrome.topLeft }
    var topRight: Zones.TopChrome.TopRight { zones.topChrome.topRight }
    var dock: Zones.BottomNav { zones.bottomNav }

    /// The bundled JSON; the literal below is the same spec so previews and tests never run without one.
    static let standard: HUDZones = {
        if let url = Bundle.main.url(forResource: "base-hud-zones", withExtension: "json"),
           let data = try? Data(contentsOf: url),
           let spec = try? JSONDecoder().decode(HUDZones.self, from: data) { return spec }
        return HUDZones(zones: .init(
            topChrome: .init(
                topLeft: .init(inset: 12, gap: 8, francsChip: .init(height: 44), contractCard: .init(width: 200, collapseInPortrait: true)),
                topRight: .init(inset: 12, pill: .init(buttonSize: 44, buttons: ["friends", "settings"]))),
            bottomNav: .init(bottomInset: 8, tileSize: 64, tiles: ["switch", "build", "hub"])))
    }()
}
