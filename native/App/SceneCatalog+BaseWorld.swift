import SwiftUI
import LandnamCore

/// Base world fixtures at the web proof sizes (SSL-423): a fresh base in placement mode (one marked pad site, no
/// structures) and a base with the pad built (pad and hangar on their sites), in phone portrait, phone landscape
/// and desktop. `-landnam.time` / `-landnam.sky` force the sky grade and events, as web `?time=` / `?sky=`.
extension SceneCatalog {
    static var baseWorldScenes: [CatalogScene] {
        let sizes: [(String, CGFloat, CGFloat)] = [("phone", 390, 844), ("landscape", 926, 428), ("desktop", 1440, 900)]
        var out: [CatalogScene] = []
        for (name, w, h) in sizes {
            out.append(scene("base-world-fresh-\(name)", h, w: w) {
                var gs = GameState()
                gs.player.placed = []
                gs.player.placementPlots = [:]
                return HubScreen(safeAreaOverride: EdgeInsets(), placing: true).environment(GameStore(state: gs))
            })
            out.append(scene("base-world-pad-\(name)", h, w: w) {
                var gs = GameState()
                gs.player.francs = 150_000_000
                gs.player.placed = ["launchpad"]
                gs.player.placementPlots = ["launchpad": 0]
                return HubScreen(safeAreaOverride: EdgeInsets()).environment(GameStore(state: gs))
            })
        }
        // SSL-844: a ground telescope built from the Data hub but not yet placed waits in the Unplaced tray (web
        // `hub-unplaced`); tap it, then a lit annex slot. Ids are literal so the scene registry check can see them.
        @MainActor func unplaced() -> AnyView {
            var gs = GameState()
            gs.tutorial = false
            gs.player.freeOperations = true
            gs.player.francs = 11_500_000_000
            gs.player.placed = ["launchpad", "market", "control-station", "surface-silo", ControlStation.groundTelescopeStructureId]
            gs.player.placementPlots = ["launchpad": 0, "market": 1, "surface-silo": 2, "control-station": 3]
            return AnyView(HubScreen(safeAreaOverride: EdgeInsets()).environment(GameStore(state: gs)))
        }
        out.append(scene("hub-unplaced-phone", 844, w: 390) { unplaced() })
        out.append(scene("hub-unplaced-landscape", 428, w: 926) { unplaced() })
        out.append(scene("hub-unplaced-desktop", 900, w: 1440) { unplaced() })
        // Each landscape with the pad built, in phone landscape (web `?biome=`).
        for biome in EarthBiome.allCases {
            out.append(scene("base-world-\(biome.rawValue)-landscape", 428, w: 926) {
                var gs = GameState()
                gs.player.francs = 150_000_000
                gs.player.placed = ["launchpad"]
                gs.player.placementPlots = ["launchpad": 0]
                return HubScreen(safeAreaOverride: EdgeInsets(), biome: biome).environment(GameStore(state: gs))
            })
        }
        return out
    }
}
