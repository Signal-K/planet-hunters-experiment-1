import SwiftUI
import LandnamCore

/// Geometry of the Earth Base derived from the HUD spec (`HUDZones`): where the dock floats, where the
/// ground line must sit so the dock covers only empty foreground, and the footprint of every structure
/// so terrain outcrops can be kept clear of them.
struct BaseLayout {
    struct Slot {
        let name: String, sprite: String
        let aspect: CGFloat, baseWidth: CGFloat
        let tap: Screen
    }

    /// The three main structures, left to right. The Exchange is the way into the Market.
    static let slots: [Slot] = [
        Slot(name: "Launchpad", sprite: "base/launchpad_flat.png", aspect: 192.0 / 318, baseWidth: 84, tap: .launchpad),
        Slot(name: "Hangar", sprite: "base/hangar_flat.png", aspect: 182.0 / 155, baseWidth: 176, tap: .hangar),
        Slot(name: "Exchange", sprite: "base/exchange_flat.png", aspect: 1153.0 / 461, baseWidth: 210, tap: .market),
    ]
    /// Name pill under each structure (14pt text) and the sprite sits this far below the ground line.
    static let labelWidth: CGFloat = 104, labelBottom: CGFloat = 34, spriteDrop: CGFloat = 5

    let size: CGSize
    let insets: EdgeInsets
    let zones: HUDZones
    /// True when the player has placed structures, which need an apron above the dock in portrait.
    var hasPlaced = false  // memberwise init argument

    var portrait: Bool { size.height > size.width * 1.3 }
    var spec: HUDZones.Scene.Orientation { zones.orientation(portrait: portrait) }
    /// Web authors for a 402pt-wide phone; same scale TerrainScene uses.
    var k: CGFloat { min(max(size.width / 402, 0.8), size.height / 874 * 1.25 + 0.6) }
    var tile: CGFloat { portrait ? zones.dock.tileSize.portrait : zones.dock.tileSize.landscape }

    /// Dock: tile + 4pt + 14pt label row, inside the panel padding.
    var dockSize: CGSize {
        let d = zones.dock
        return CGSize(width: tile * 3 + d.gap * 2 + d.padding * 2, height: tile + 4 + 18 + d.padding * 2)
    }
    var dockRect: CGRect {
        let bottom = insets.bottom + zones.dock.bottomInset
        return CGRect(x: (size.width - dockSize.width) / 2, y: size.height - bottom - dockSize.height, width: dockSize.width, height: dockSize.height)
    }

    /// Road is 22pt tall and centred `roadOffset` below the ground line; its lower edge clears the dock's top.
    var ground: Double {
        let apron = portrait && hasPlaced ? zones.scene.placedApronPortrait : 0
        let roadBottom = dockRect.minY - zones.scene.roadClearance - apron
        let roadCentre = roadBottom - 11
        return Double((size.height - roadCentre) / size.height) + 0.045
    }
    var groundY: CGFloat { size.height * (1 - CGFloat(ground)) }
    /// Structures stand slightly in front of the ground line, on the apron.
    var structureY: CGFloat { groundY + 2 * k }

    func width(_ slot: Slot) -> CGFloat { slot.baseWidth * k * 0.62 * spec.structureScale }
    func centreX(_ index: Int) -> CGFloat { size.width * spec.structureX[index] }

    /// Sprite plus its name pill, plus the outcrop margin.
    func footprint(_ index: Int) -> CGRect {
        let slot = Self.slots[index]
        let w = width(slot), h = w / slot.aspect
        let half = max(w, Self.labelWidth) / 2, m = zones.scene.outcropMargin
        return CGRect(x: centreX(index) - half - m, y: structureY + Self.spriteDrop - h - m,
                      width: half * 2 + m * 2, height: h + Self.labelBottom - Self.spriteDrop + m * 2)
    }

    /// Everything terrain outcrops and foreground rocks must stay out of.
    var exclusions: [CGRect] { Self.slots.indices.map(footprint) + [dockRect.insetBy(dx: -zones.scene.outcropMargin, dy: -zones.scene.outcropMargin)] }

    /// Player-placed structures sit between the road and the dock; never lower than the dock's top.
    func placedGroundY() -> CGFloat { portrait ? dockRect.minY - 48 : min(groundY + 92 * k, dockRect.minY - 44) }
}
