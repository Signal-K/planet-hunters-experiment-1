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
        return out
    }
}
